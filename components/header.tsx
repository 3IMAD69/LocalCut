"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClapIcon } from "@/components/ui/clap";

export default function Header() {
  const pathname = usePathname();

  // Don't render footer on project pages
  if (pathname.includes("/projects/")) {
    return null;
  }

  return (
    <header className="border-b border-border bg-background">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          prefetch={true}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <ClapIcon size={25} className="text-primary" />
          <span className="text-xl font-semibold">LocalCut</span>
        </Link>
        <nav className="flex gap-2">
          <Link
            prefetch={true}
            href="/convert"
            className="px-4 py-2 text-sm font-medium rounded-md bg-transparent hover:bg-accent transition-colors"
          >
            Convert
          </Link>
          <Link
            prefetch={true}
            href="/editor"
            className="px-4 py-2 text-sm font-medium rounded-md bg-transparent hover:bg-accent transition-colors"
          >
            Editor
          </Link>
        </nav>
      </div>
    </header>
  );
}
