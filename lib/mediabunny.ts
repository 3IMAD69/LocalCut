import {
  AdtsOutputFormat,
  type AudioCodec,
  MkvOutputFormat,
  MovOutputFormat,
  Mp3OutputFormat,
  Mp4OutputFormat,
  type OutputFormat,
  type VideoCodec,
  WavOutputFormat,
  WebMOutputFormat,
} from "mediabunny";

// Video codec labels for display
export const VIDEO_CODEC_LABELS: Record<VideoCodec, string> = {
  avc: "H.264 (AVC)",
  hevc: "H.265 (HEVC)",
  vp8: "VP8",
  vp9: "VP9",
  av1: "AV1",
};

// Audio codec labels for display
export const AUDIO_CODEC_LABELS: Record<AudioCodec, string> = {
  aac: "AAC",
  opus: "Opus",
  mp3: "MP3",
  vorbis: "Vorbis",
  flac: "FLAC",
  "pcm-s16": "PCM 16-bit",
  "pcm-s16be": "PCM 16-bit BE",
  "pcm-s24": "PCM 24-bit",
  "pcm-s24be": "PCM 24-bit BE",
  "pcm-s32": "PCM 32-bit",
  "pcm-s32be": "PCM 32-bit BE",
  "pcm-f32": "PCM Float 32-bit",
  "pcm-f32be": "PCM Float 32-bit BE",
  "pcm-f64": "PCM Float 64-bit",
  "pcm-f64be": "PCM Float 64-bit BE",
  "pcm-u8": "PCM 8-bit Unsigned",
  "pcm-s8": "PCM 8-bit Signed",
  ulaw: "μ-law",
  alaw: "A-law",
};

// Get supported video codecs for an output container
export const getSupportedVideoCodecs = (
  container: OutputContainer,
): VideoCodec[] => {
  const format = getMediabunnyOutput(container);
  return format.getSupportedVideoCodecs();
};

// Get supported audio codecs for an output container
export const getSupportedAudioCodecs = (
  container: OutputContainer,
): AudioCodec[] => {
  const format = getMediabunnyOutput(container);
  return format.getSupportedAudioCodecs();
};

// Common audio codecs to show (exclude obscure PCM variants)
export const COMMON_AUDIO_CODECS: AudioCodec[] = [
  "aac",
  "opus",
  "mp3",
  "vorbis",
  "flac",
  "pcm-s16",
  "pcm-s24",
  "pcm-f32",
];

// Filter to only common audio codecs for better UX
export const getCommonAudioCodecs = (
  container: OutputContainer,
): AudioCodec[] => {
  const supported = getSupportedAudioCodecs(container);
  return COMMON_AUDIO_CODECS.filter((codec) => supported.includes(codec));
};

export const inputContainers = ["mp4", "webm", "mov", "mkv"] as const;
export const outputContainers = [
  "mp4",
  "webm",
  "mov",
  "wav",
  "mkv",
  "aac",
  "mp3",
] as const;

export type InputContainer = (typeof inputContainers)[number];
export type OutputContainer = (typeof outputContainers)[number];

export const getMediabunnyOutput = (
  container: OutputContainer,
): OutputFormat => {
  if (container === "mp4") {
    return new Mp4OutputFormat();
  }

  if (container === "webm") {
    return new WebMOutputFormat();
  }

  if (container === "wav") {
    return new WavOutputFormat();
  }

  if (container === "aac") {
    return new AdtsOutputFormat();
  }

  if (container === "mkv") {
    return new MkvOutputFormat();
  }

  if (container === "mov") {
    return new MovOutputFormat();
  }

  if (container === "mp3") {
    return new Mp3OutputFormat();
  }

  throw new Error(`Unsupported container type: ${container satisfies never}`);
};

export const isAudioOnlyFormat = (container: OutputContainer): boolean => {
  return ["wav", "aac", "mp3"].includes(container);
};

export const getMimeType = (container: OutputContainer): string => {
  const mimeTypes: Record<OutputContainer, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mkv: "video/x-matroska",
    wav: "audio/wav",
    aac: "audio/aac",
    mp3: "audio/mpeg",
  };
  return mimeTypes[container];
};

export const getFileExtension = (container: OutputContainer): string => {
  return container;
};
