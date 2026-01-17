"use client";

import {
  ClipboardPaste,
  Copy,
  Magnet,
  Redo2,
  SplitSquareHorizontal,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { ScissorsIcon } from "@/components/animate-ui/icons/scissors";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onSplit?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleSnap?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
  snapEnabled?: boolean;
  className?: string;
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: "default" | "danger";
}

function ToolButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  variant = "default",
}: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9",
            active && "bg-primary text-primary-foreground",
            variant === "danger" &&
              "hover:bg-destructive hover:text-destructive-foreground",
            disabled && "opacity-40",
          )}
          onClick={onClick}
          disabled={disabled}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-1" />;
}

export function Toolbar({
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  onSplit,
  onZoomIn,
  onZoomOut,
  onToggleSnap,
  canUndo = false,
  canRedo = false,
  hasSelection = false,
  snapEnabled = true,
  className,
}: ToolbarProps) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex items-center gap-1 px-3 py-2 rounded-lg",
          "border border-border bg-muted",
          className,
        )}
      >
        {/* History */}
        <div className="flex items-center gap-1">
          <ToolButton
            icon={<Undo2 className="h-4 w-4" />}
            label="Undo (Ctrl+Z)"
            onClick={onUndo}
            disabled={!canUndo}
          />
          <ToolButton
            icon={<Redo2 className="h-4 w-4" />}
            label="Redo (Ctrl+Y)"
            onClick={onRedo}
            disabled={!canRedo}
          />
        </div>

        <ToolbarDivider />

        {/* Clipboard */}
        <div className="flex items-center gap-1">
          <ToolButton
            icon={<ScissorsIcon animateOnHover />}
            label="Cut (Ctrl+X)"
            onClick={onCut}
            disabled={!hasSelection}
          />
          <ToolButton
            icon={<Copy className="h-4 w-4" />}
            label="Copy (Ctrl+C)"
            onClick={onCopy}
            disabled={!hasSelection}
          />
          <ToolButton
            icon={<ClipboardPaste className="h-4 w-4" />}
            label="Paste (Ctrl+V)"
            onClick={onPaste}
          />
        </div>

        <ToolbarDivider />

        {/* Edit Actions */}
        <div className="flex items-center gap-1">
          <ToolButton
            icon={<SplitSquareHorizontal className="h-4 w-4" />}
            label="Split at Playhead (S)"
            onClick={onSplit}
            disabled={!hasSelection}
          />
          <ToolButton
            icon={<Trash2 className="h-4 w-4" />}
            label="Delete (Del)"
            onClick={onDelete}
            disabled={!hasSelection}
            variant="danger"
          />
        </div>

        <ToolbarDivider />

        {/* View Controls */}
        <div className="flex items-center gap-1">
          <ToolButton
            icon={<ZoomOut className="h-4 w-4" />}
            label="Zoom Out (-)"
            onClick={onZoomOut}
          />
          <ToolButton
            icon={<ZoomIn className="h-4 w-4" />}
            label="Zoom In (+)"
            onClick={onZoomIn}
          />
        </div>

        <ToolbarDivider />

        {/* Snap Toggle */}
        <ToolButton
          icon={<Magnet className="h-4 w-4" />}
          label="Toggle Snap (N)"
          onClick={onToggleSnap}
          active={snapEnabled}
        />
      </div>
    </TooltipProvider>
  );
}
