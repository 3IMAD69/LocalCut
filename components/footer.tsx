"use client";
import { SiGithub, SiX } from "@icons-pack/react-simple-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // Don't render footer on project pages
  if (pathname.includes("/projects/")) {
    return null;
  }

  return (
    <footer className="border-t border-border py-8">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-2xl font-semibold">LocalCut</span>
          <p className="text-sm text-muted-foreground">
            Built with{" "}
            <a
              href="https://mediabunny.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4 hover:text-foreground transition-colors"
            >
              MediaBunny
            </a>{" "}
            — Browser-based media processing powered by WebCodecs
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="https://github.com/3IMAD69"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-md hover:bg-accent transition-colors"
              aria-label="GitHub"
            >
              <SiGithub className="size-5" />
            </Link>
            <a
              href="https://x.com/3IMXXD"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-md hover:bg-accent transition-colors"
              aria-label="X (Twitter)"
            >
              <SiX className="size-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
