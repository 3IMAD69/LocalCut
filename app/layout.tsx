import { SiGithub, SiX } from "@icons-pack/react-simple-icons";
import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import { BrowserWarning } from "@/components/browser-warning";
import { ThemeProvider } from "@/components/theme-provider";
import { ClapIcon } from "@/components/ui/clap";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LocalCut - Your Local Media Converter / Editor",
  description:
    "LocalCut is a free and open-source web application that allows you to convert and edit videos and audios directly in your browser without uploading them to any server. It leverages the power of WebCodecs API to provide fast and efficient video processing on the client side.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* <head>
        <Script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        />
      </head> */}
      <body className={`${archivo.variable} antialiased`}>
        <Analytics />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <BrowserWarning />
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
          {children}
          {/* Footer */}
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
        </ThemeProvider>
      </body>
    </html>
  );
}
