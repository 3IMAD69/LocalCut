"use client";

import { useEffect, useState } from "react";

export function BrowserWarning() {
  const [isChrome, setIsChrome] = useState(true);

  useEffect(() => {
    // Check if browser is Chrome
    const isChromeBrowser =
      /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    setIsChrome(isChromeBrowser);
  }, []);

  // Don't show warning in development
  if (process.env.NODE_ENV === "development") return null;

  // Don't show warning if browser is Chrome
  if (isChrome) return null;

  return (
    <div className="border-b border-destructive/50 bg-destructive/10 px-6 py-3">
      <div className="container mx-auto flex items-start gap-3">
        <div className="text-destructive mt-0.5">⊘</div>
        <div>
          <p className="text-destructive font-medium text-sm">
            Compatibility Warning
          </p>
          <p className="text-destructive/80 text-sm">
            For a seamless experience with LocalCut, please use Google Chrome.
          </p>
        </div>
      </div>
    </div>
  );
}
