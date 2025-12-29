"use client";

import { Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FullscreenButtonProps {
  isFullscreen: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function FullscreenButton({
  isFullscreen,
  onClick,
  disabled = false,
}: FullscreenButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant="default"
      size="icon"
      className="h-12 w-12 hover:bg-gray-100"
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      disabled={disabled}
    >
      {isFullscreen ? (
        <Minimize className="h-6 w-6" />
      ) : (
        <Maximize className="h-6 w-6" />
      )}
    </Button>
  );
}
