import {
  Mp4OutputFormat,
  WebMOutputFormat,
  WavOutputFormat,
  AdtsOutputFormat,
  MkvOutputFormat,
  MovOutputFormat,
  Mp3OutputFormat,
  type OutputFormat,
} from "mediabunny";

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

export const getMediabunnyOutput = (container: OutputContainer): OutputFormat => {
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

  throw new Error("Unsupported container type: " + (container satisfies never));
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
