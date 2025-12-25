import { Film } from "lucide-react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <header className="border-b">
            <div className="container mx-auto px-4 py-4 flex items-center justify-center gap-8">
              <div className="flex items-center gap-2">
                <Film className="h-6 w-6" />
                <span className="text-xl font-semibold font-mono">
                  LocalCut
                </span>
              </div>
              <nav className="flex gap-6">
                <Link
                  prefetch={true}
                  href="/convert"
                  className="text-sm font-medium hover:underline underline-offset-4"
                >
                  Convert
                </Link>
                <Link
                  prefetch={true}
                  href="/editor"
                  className="text-sm font-medium hover:underline underline-offset-4"
                >
                  Editor
                </Link>
              </nav>
            </div>
          </header>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
