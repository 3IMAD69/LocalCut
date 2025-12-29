"use client";

import {
  Maximize,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VideoPreviewProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause?: () => void;
  onSeek?: (time: number) => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  onFullscreen?: () => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  className?: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

export function VideoPreview({
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onSeek,
  onSkipBack,
  onSkipForward,
  onFullscreen,
  volume = 1,
  onVolumeChange,
  className,
}: VideoPreviewProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-col border-2 border-border bg-background",
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b-2 border-border bg-secondary-background">
          <span className="text-xs font-heading uppercase tracking-wide">
            Preview
          </span>
          <div className="flex items-center gap-2 text-xs font-heading">
            <span className="text-chart-1">{formatTime(currentTime)}</span>
            <span className="text-foreground/40">/</span>
            <span className="text-foreground/60">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Video Canvas Area */}
        <div className="relative flex-1 bg-black min-h-[300px] flex items-center justify-center">
          {/* Placeholder for video canvas - MediaBunny will render here */}
          <div
            className={cn(
              "aspect-video w-full max-w-full max-h-full",
              "bg-gradient-to-br from-zinc-900 to-zinc-800",
              "flex items-center justify-center",
              "border-2 border-border",
            )}
          >
            <div className="text-center text-foreground/30">
              <div className="text-4xl mb-2">🎬</div>
              <p className="text-sm font-heading">Video Preview</p>
              <p className="text-xs">Add media to see preview</p>
            </div>
          </div>

          {/* Center Play Button Overlay */}
          <button
            type="button"
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              "bg-black/20 opacity-0 hover:opacity-100 transition-opacity",
              "cursor-pointer",
            )}
            onClick={onPlayPause}
          >
            <div
              className={cn(
                "w-16 h-16 rounded-full",
                "border-4 border-white bg-black/50",
                "flex items-center justify-center",
              )}
            >
              {isPlaying ? (
                <Pause className="h-8 w-8 text-white" />
              ) : (
                <Play className="h-8 w-8 text-white ml-1" />
              )}
            </div>
          </button>
        </div>

        {/* Seek Bar */}
        <div className="px-3 py-2 border-t-2 border-border bg-secondary-background">
          <Slider
            value={[currentTime]}
            onValueChange={([value]) => onSeek?.(value)}
            min={0}
            max={duration || 100}
            step={0.01}
            className="w-full"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-3 py-2 border-t-2 border-border bg-secondary-background">
          {/* Left: Transport Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="noShadow"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onSkipBack}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous Frame (←)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="h-10 w-10"
                  onClick={onPlayPause}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Play/Pause (Space)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="noShadow"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onSkipForward}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next Frame (→)</TooltipContent>
            </Tooltip>
          </div>

          {/* Right: Volume & Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Volume Control */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="noShadow"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Volume</TooltipContent>
            </Tooltip>

            {showVolumeSlider && (
              <div className="flex items-center gap-2 px-2">
                <Slider
                  value={[volume * 100]}
                  onValueChange={([value]) => onVolumeChange?.(value / 100)}
                  min={0}
                  max={100}
                  className="w-20"
                />
                <span className="text-xs w-8">{Math.round(volume * 100)}%</span>
              </div>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="noShadow"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onFullscreen}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fullscreen (F)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
