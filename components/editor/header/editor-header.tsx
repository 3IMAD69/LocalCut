import { ChevronLeft, PanelLeft, Redo2, Undo2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditorHeaderProps {
  projectName?: string;
  onUndo?: () => void;
  onRedo?: () => void;
  onExport?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onToggleMediaPanel?: () => void;
  isMediaPanelOpen?: boolean;
  className?: string;
}

export function EditorHeader({
  projectName = "Untitled Project",
  onUndo,
  onRedo,
  onExport,
  canUndo = false,
  canRedo = false,
  onToggleMediaPanel,
  isMediaPanelOpen = true,
  className,
}: EditorHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between h-12 px-4 bg-background border-b border-border select-none",
        className,
      )}
    >
      {/* Left Section: Back & History Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
          asChild
        >
          <Link href="/projects">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="w-px h-4 bg-border mx-2" />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
            onClick={onRedo}
            disabled={!canRedo}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Center Section: Project Name */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="text-xs font-medium text-foreground/90">
          {projectName}
        </span>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 text-muted-foreground hover:text-foreground rounded-md",
            !isMediaPanelOpen && "bg-muted text-foreground",
          )}
          onClick={onToggleMediaPanel}
          title="Toggle Media Panel"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        <div className="w-px h-4 bg-border mx-2" />

        <Button
          size="sm"
          onClick={onExport}
          className="h-8 px-4 text-xs font-medium bg-white text-black hover:bg-white/90 rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          Export
          <span className="ml-2 text-[10px] opacity-60 bg-black/10 px-1.5 py-0.5 rounded-full">
            ⌘E
          </span>
        </Button>
      </div>
    </header>
  );
}
