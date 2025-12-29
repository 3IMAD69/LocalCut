"use client";

import {
  Download,
  Film,
  FolderOpen,
  HelpCircle,
  Save,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface EditorHeaderProps {
  projectName?: string;
  onNewProject?: () => void;
  onOpenProject?: () => void;
  onSaveProject?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
  onHelp?: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  className?: string;
}

export function EditorHeader({
  projectName = "Untitled Project",
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExport,
  onSettings,
  onHelp,
  isSaving = false,
  hasUnsavedChanges = false,
  className,
}: EditorHeaderProps) {
  return (
    <TooltipProvider>
      <header
        className={cn(
          "flex items-center justify-between h-14",
          "px-4 border-b-2 border-border bg-main",
          className,
        )}
      >
        {/* Left: Logo & Project Name */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 border-2 border-border bg-secondary-background",
                "flex items-center justify-center",
              )}
            >
              <Film className="h-5 w-5 text-main-foreground" />
            </div>
            <span className="font-heading text-lg text-main-foreground hidden sm:block">
              LocalCut
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border hidden sm:block" />

          {/* Project Name */}
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm text-main-foreground truncate max-w-[200px]">
              {projectName}
            </span>
            {hasUnsavedChanges && (
              <span
                className="w-2 h-2 rounded-full bg-chart-3"
                title="Unsaved changes"
              />
            )}
          </div>
        </div>

        {/* Center: File Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="noShadow"
                size="sm"
                className="h-8 bg-secondary-background"
                onClick={onNewProject}
              >
                <Film className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">New</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>New Project</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="noShadow"
                size="sm"
                className="h-8 bg-secondary-background"
                onClick={onOpenProject}
              >
                <FolderOpen className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">Open</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open Project</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="noShadow"
                size="sm"
                className="h-8 bg-secondary-background"
                onClick={onSaveProject}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">
                  {isSaving ? "Saving..." : "Save"}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save Project (Ctrl+S)</TooltipContent>
          </Tooltip>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-2" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="h-8"
                onClick={onExport}
              >
                <Download className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">Export</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export Video</TooltipContent>
          </Tooltip>
        </div>

        {/* Right: Settings & Help */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="noShadow"
                size="icon"
                className="h-8 w-8 bg-secondary-background"
                onClick={onHelp}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Help</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="noShadow"
                size="icon"
                className="h-8 w-8 bg-secondary-background"
                onClick={onSettings}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}
