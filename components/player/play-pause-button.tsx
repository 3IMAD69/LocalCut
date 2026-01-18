import type MediaFox from "@mediafox/core";
import React, { useCallback, useEffect } from "react";
import { PausedIcon, PlayingIcon } from "./icons";

export const PlayPauseButton: React.FC<{
  readonly playerRef: MediaFox;
}> = ({ playerRef }) => {
  const [playing, setPlaying] = React.useState(!playerRef.paused);

  useEffect(() => {
    const onPlay = () => {
      setPlaying(true);
    };

    const onPause = () => {
      setPlaying(false);
    };

    playerRef.on("play", onPlay);
    playerRef.on("pause", onPause);

    return () => {
      playerRef.off("play", onPlay);
      playerRef.off("pause", onPause);
    };
  }, [playerRef]);

  const onToggle = useCallback(() => {
    if (playerRef.paused) {
      playerRef.play();
    } else {
      playerRef.pause();
    }
  }, [playerRef]);

  const playPauseIconStyle: React.CSSProperties = {
    width: 15,
    color: "white",
  };

  return (
    <button
      type="button"
      className="appearance-none border-none rounded-none bg-none flex justify-center items-center px-3 md:px-5 cursor-pointer h-12 text-black hover:bg-black/5 transition-colors"
      onClick={onToggle}
    >
      {playing ? (
        <PlayingIcon style={playPauseIconStyle} />
      ) : (
        <PausedIcon style={playPauseIconStyle} />
      )}
    </button>
  );
};
