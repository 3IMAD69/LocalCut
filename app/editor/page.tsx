"use client";

import { Book, FolderArchive, Plus } from "lucide-react";
import { nanoid } from "nanoid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HeroIcon } from "@/components/hero-icon";
import { Button } from "@/components/ui/button";

interface RecentProject {
  id: string;
  name: string;
  lastOpened: Date;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export default function EditorDashboard() {
  const router = useRouter();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  // Load recent projects from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("localcut-recent-projects");
    if (stored) {
      try {
        const projects = JSON.parse(stored) as Array<{
          id: string;
          name: string;
          lastOpened: string;
        }>;
        setRecentProjects(
          projects.map((p) => ({
            ...p,
            lastOpened: new Date(p.lastOpened),
          })),
        );
      } catch {
        // Invalid data, ignore
      }
    }
  }, []);

  const handleNewProject = () => {
    const projectId = nanoid(21);
    // Add to recent projects
    const newProject: RecentProject = {
      id: projectId,
      name: "Untitled Project",
      lastOpened: new Date(),
    };
    const updated = [newProject, ...recentProjects.slice(0, 9)];
    localStorage.setItem(
      "localcut-recent-projects",
      JSON.stringify(
        updated.map((p) => ({ ...p, lastOpened: p.lastOpened.toISOString() })),
      ),
    );
    router.push(`/projects/${projectId}`);
  };

  const handleOpenProject = (projectId: string) => {
    // Update last opened time
    const updated = recentProjects.map((p) =>
      p.id === projectId ? { ...p, lastOpened: new Date() } : p,
    );
    // Move to front
    const project = updated.find((p) => p.id === projectId);
    if (project) {
      const others = updated.filter((p) => p.id !== projectId);
      const reordered = [project, ...others];
      localStorage.setItem(
        "localcut-recent-projects",
        JSON.stringify(
          reordered.map((p) => ({
            ...p,
            lastOpened: p.lastOpened.toISOString(),
          })),
        ),
      );
    }
    router.push(`/projects/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo and Title */}
        <div className="flex items-center gap-4 mb-2">
          <HeroIcon />
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              LocalCut
            </h1>
            <p className="text-sm text-foreground/60">
              v0.1.0 •{" "}
              <span className="text-red-500 hover:underline cursor-pointer">
                Public Beta
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8 mb-10">
          <Button
            variant="outline"
            className="w-36 h-24 flex flex-col items-start justify-between p-4"
            onClick={handleNewProject}
          >
            <Plus className="size-5" />
            <span className="text-sm font-medium">New Project</span>
          </Button>

          <Button
            variant="outline"
            className="w-36 h-24 flex flex-col items-start justify-between p-4"
            onClick={() => console.log("Backup folder")}
          >
            <FolderArchive className="size-5" />
            <span className="text-sm font-medium">Backup Folder</span>
          </Button>

          <Button
            variant="outline"
            asChild
            className="w-36 h-24 flex flex-col items-start justify-between p-4"
          >
            <Link href="https://github.com/imadselka/LocalCut" target="_blank">
              <Book className="size-5" />
              <span className="text-sm font-medium">Documentation</span>
            </Link>
          </Button>
        </div>

        {/* Recent Projects */}
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Recent Projects
            </h2>
            {recentProjects.length > 0 && (
              <button
                type="button"
                className="text-sm text-foreground/50 hover:text-foreground/80"
                onClick={() => console.log("View all projects")}
              >
                View all ({recentProjects.length})
              </button>
            )}
          </div>

          {recentProjects.length === 0 ? (
            <p className="text-sm text-foreground/50 text-center py-8">
              No recent projects. Click &quot;New Project&quot; to get started.
            </p>
          ) : (
            <div className="space-y-1">
              {recentProjects.slice(0, 5).map((project) => (
                <button
                  type="button"
                  key={project.id}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent transition-colors text-left"
                  onClick={() => handleOpenProject(project.id)}
                >
                  <span className="text-sm text-foreground">
                    {project.name}{" "}
                    <span className="text-foreground/50">
                      {formatDate(project.lastOpened)}
                    </span>
                  </span>
                  <span className="text-xs text-foreground/50">
                    {formatRelativeTime(project.lastOpened)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
