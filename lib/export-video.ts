"use client";

import type { Compositor } from "@mediafox/core";
import {
  AudioBufferSink,
  AudioBufferSource,
  type AudioCodec,
  BufferTarget,
  CanvasSource,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  Output,
  QUALITY_HIGH,
  type VideoCodec,
} from "mediabunny";

import {
  buildCompositorComposition,
  type LoadedSource,
  type TimelineTrackData,
} from "@/components/editor/preview/timeline-player-context";
import type { ImportedMediaAsset } from "@/lib/media-import";
import type { OutputContainer } from "@/lib/mediabunny";
import { getFileExtension, getMediabunnyOutput } from "@/lib/mediabunny";

const CompositorWorkerUrl = new URL(
  "@mediafox/core/compositor-worker",
  import.meta.url,
).href;

export type ExportTimelineOptions = {
  tracks: TimelineTrackData[];
  width?: number;
  height?: number;
  fps?: number;
  backgroundColor?: string;
  container?: OutputContainer;
  filenameBase?: string;
  onProgress?: (progress: number) => void;
  abortSignal?: AbortSignal;
};

function getTimelineDurationSeconds(tracks: TimelineTrackData[]): number {
  return Math.max(
    ...tracks.flatMap((t) =>
      t.hidden || t.clips.length === 0
        ? [0]
        : t.clips.map((c) => c.startTime + c.duration),
    ),
    0,
  );
}

async function renderMixedAudio(
  tracks: TimelineTrackData[],
  durationSeconds: number,
  options?: { sampleRate?: number; channels?: number },
): Promise<AudioBuffer | null> {
  const sampleRate = options?.sampleRate ?? 48_000;
  const channels = options?.channels ?? 2;

  if (durationSeconds <= 0) return null;

  const frameCount = Math.ceil(durationSeconds * sampleRate);
  const offline = new OfflineAudioContext(channels, frameCount, sampleRate);
  const masterGain = offline.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(offline.destination);

  let scheduledAnything = false;

  for (const track of tracks) {
    if (track.hidden || track.muted) continue;
    for (const clip of track.clips) {
      const asset = clip.asset;
      if (!asset || !asset.input) continue;

      // Match preview behavior: audio can come from video clips and audio clips.
      const audioTrack = await asset.input.getPrimaryAudioTrack();
      if (!audioTrack) continue;

      const canDecode = await audioTrack.canDecode();
      if (!canDecode) continue;

      const sink = new AudioBufferSink(audioTrack);

      const sourceStart = clip.trimStart;
      const sourceEnd = clip.trimStart + clip.duration;

      for await (const { buffer, timestamp } of sink.buffers(
        sourceStart,
        sourceEnd,
      )) {
        const when = clip.startTime + (timestamp - sourceStart);
        const node = offline.createBufferSource();
        node.buffer = buffer;
        node.connect(masterGain);

        const offset = when < 0 ? -when : 0;
        const startAt = Math.max(0, when);
        const playDuration = Math.max(0, buffer.duration - offset);
        if (playDuration <= 0) continue;

        node.start(startAt, offset, playDuration);
        scheduledAnything = true;
      }
    }
  }

  if (!scheduledAnything) return null;
  return offline.startRendering();
}

async function createExportCompositor(params: {
  width: number;
  height: number;
  backgroundColor: string;
}): Promise<{ compositor: Compositor; canvas: HTMLCanvasElement }> {
  const { width, height, backgroundColor } = params;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const { Compositor: CompositorClass } = await import("@mediafox/core");
  const compositor = new CompositorClass({
    canvas,
    width,
    height,
    backgroundColor,
    worker: {
      enabled: true,
      url: CompositorWorkerUrl,
      type: "module",
    },
  });

  return { compositor, canvas };
}

async function loadExportSources(params: {
  compositor: Compositor;
  tracks: TimelineTrackData[];
}): Promise<Map<string, LoadedSource>> {
  const { compositor, tracks } = params;

  const assetsToLoad = new Map<string, ImportedMediaAsset>();
  for (const track of tracks) {
    if (track.hidden) continue;
    for (const clip of track.clips) {
      if (track.type !== "video" && track.type !== "image") continue;
      const asset = clip.asset;
      if (!asset) continue;
      if (asset.type !== "video" && asset.type !== "image") continue;
      assetsToLoad.set(asset.id, asset);
    }
  }

  const loaded = new Map<string, LoadedSource>();
  for (const asset of assetsToLoad.values()) {
    const source =
      asset.type === "image"
        ? await compositor.loadImage(asset.file)
        : await compositor.loadSource(asset.file);
    loaded.set(asset.id, {
      id: `source-${asset.id}`,
      source,
      assetId: asset.id,
      duration: asset.type === "image" ? asset.duration : source.duration,
      width: source.width ?? 1920,
      height: source.height ?? 1080,
    });
  }

  return loaded;
}

async function pickExportCodecs(params: {
  containerPreference?: OutputContainer;
  width: number;
  height: number;
  needsAudio: boolean;
}): Promise<{
  container: OutputContainer;
  videoCodec: VideoCodec;
  audioCodec: AudioCodec | null;
}> {
  const { containerPreference, width, height, needsAudio } = params;

  const candidates: OutputContainer[] = containerPreference
    ? [containerPreference]
    : ["mp4", "webm"];

  // First pass: require audio if needed.
  for (const container of candidates) {
    const format = getMediabunnyOutput(container);

    const videoCodec = await getFirstEncodableVideoCodec(
      format.getSupportedVideoCodecs(),
      { width, height, bitrate: 8e6 },
    );
    if (!videoCodec) continue;

    const audioCodec = needsAudio
      ? await getFirstEncodableAudioCodec(format.getSupportedAudioCodecs(), {
          numberOfChannels: 2,
          sampleRate: 48_000,
          bitrate: 192e3,
        })
      : null;

    if (needsAudio && !audioCodec) continue;

    return {
      container,
      videoCodec,
      audioCodec,
    };
  }

  // Second pass: video-only.
  for (const container of candidates) {
    const format = getMediabunnyOutput(container);
    const videoCodec = await getFirstEncodableVideoCodec(
      format.getSupportedVideoCodecs(),
      { width, height, bitrate: 8e6 },
    );
    if (!videoCodec) continue;
    return {
      container,
      videoCodec,
      audioCodec: null,
    };
  }

  throw new Error(
    "No encodable video codec found for the requested containers (mp4/webm).",
  );
}

export async function exportTimelineToBlob(
  options: ExportTimelineOptions,
): Promise<{ blob: Blob; fileName: string }> {
  const width = options.width ?? 1920;
  const height = options.height ?? 1080;
  const fps = options.fps ?? 30;
  const backgroundColor = options.backgroundColor ?? "#000000";

  const durationSeconds = getTimelineDurationSeconds(options.tracks);
  if (durationSeconds <= 0) {
    throw new Error("Nothing to export: timeline duration is 0 seconds.");
  }

  // Mix audio first (smaller footprint than video), matching preview layering rules.
  const mixedAudio = await renderMixedAudio(options.tracks, durationSeconds);
  const needsAudio = mixedAudio !== null;

  const { container, videoCodec, audioCodec } = await pickExportCodecs({
    containerPreference: options.container,
    width,
    height,
    needsAudio,
  });

  const { compositor, canvas } = await createExportCompositor({
    width,
    height,
    backgroundColor,
  });

  try {
    const loadedSources = await loadExportSources({
      compositor,
      tracks: options.tracks,
    });

    const output = new Output({
      format: getMediabunnyOutput(container),
      target: new BufferTarget(),
    });

    const videoSource = new CanvasSource(canvas, {
      codec: videoCodec,
      bitrate: QUALITY_HIGH,
    });
    output.addVideoTrack(videoSource, { frameRate: fps });

    let audioSource: AudioBufferSource | null = null;
    if (mixedAudio && audioCodec) {
      audioSource = new AudioBufferSource({
        codec: audioCodec,
        bitrate: QUALITY_HIGH,
      });
      output.addAudioTrack(audioSource);
    }

    await output.start();

    if (audioSource && mixedAudio) {
      await audioSource.add(mixedAudio);
      audioSource.close();
    }

    const frameDuration = 1 / fps;
    const frameCount = Math.ceil(durationSeconds * fps);
    const keyFrameEvery = Math.max(1, Math.floor(fps * 5));
    for (let i = 0; i < frameCount; i++) {
      // Check for abort signal before each frame
      if (options.abortSignal?.aborted) {
        throw new DOMException("Export cancelled", "AbortError");
      }

      const t = i * frameDuration;
      const composition = buildCompositorComposition({
        time: t,
        tracks: options.tracks,
        loadedSources,
        width,
        height,
      });

      await compositor.render({
        time: composition.time,
        layers: composition.layers,
      });

      await videoSource.add(t, frameDuration, {
        keyFrame: i % keyFrameEvery === 0,
      });

      options.onProgress?.(i / frameCount);
    }

    videoSource.close();
    await output.finalize();

    const buffer = output.target.buffer;
    if (!buffer) throw new Error("Export failed: output buffer is empty.");

    const mimeType = await output
      .getMimeType()
      .catch(() => output.format.mimeType);
    const blob = new Blob([buffer], { type: mimeType });
    const base = options.filenameBase ?? "localcut-export";
    const fileName = `${base}.${getFileExtension(container)}`;

    options.onProgress?.(1);
    return { blob, fileName };
  } finally {
    compositor.dispose();
  }
}
