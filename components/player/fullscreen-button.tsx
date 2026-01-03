"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MaximizeIcon } from "../animate-ui/icons/maximize";
import { MinimizeIcon } from "../animate-ui/icons/minimize";

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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Button
      onClick={onClick}
      variant="default"
      size="icon"
      className="h-12 w-12 hover:bg-gray-100"
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isFullscreen ? (
        <MinimizeIcon animate={isHovered} size={30} />
      ) : (
        <MaximizeIcon animate={isHovered} size={30} />
      )}
    </Button>
  );
}
