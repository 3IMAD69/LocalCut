import {
  AlertTriangle,
  Code,
  HardDrive,
  Lock,
  Monitor,
  Shield,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { HeroIcon } from "@/components/hero-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="border-b-4 border-border bg-main">
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="flex flex-col items-center text-center">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
              <HeroIcon />
              <h1 className="text-6xl md:text-8xl font-heading text-main-foreground tracking-tight">
                LocalCut
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-main-foreground max-w-2xl mb-4 font-base">
              A video & audio converter / editor that runs{" "}
              <span className="font-heading underline decoration-4 underline-offset-4">
                entirely in your browser
              </span>
            </p>
            <p className="text-lg text-main-foreground/80 mb-12 font-base">
              Powered by <span className="font-heading">WebCodecs</span> using
              the <span className="font-heading">MediaBunny</span> library
            </p>

            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <Button size="lg" asChild className="text-lg px-10 py-6 h-auto">
                <Link href="/convert" prefetch={true}>
                  Convert
                </Link>
              </Button>
              <div className="flex flex-col items-center">
                <Button
                  size="lg"
                  variant="neutral"
                  asChild
                  className="text-lg px-10 py-6 h-auto"
                >
                  <Link href="/editor" prefetch={true}>
                    Editor
                  </Link>
                </Button>
                <span className="mt-3 text-sm text-main-foreground flex items-center gap-1.5">
                  <AlertTriangle className="size-4" />
                  Editor is still in progress
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-heading text-center mb-16">
            Why LocalCut?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* 100% Local Processing */}
            <Card className="bg-secondary-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-3 bg-main border-2 border-border">
                    <HardDrive className="size-6 text-main-foreground" />
                  </div>
                  100% Local Processing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">
                  All media processing happens{" "}
                  <span className="font-heading">on your device</span>. No
                  uploads, no backend processing. Your files never leave your
                  computer.
                </p>
              </CardContent>
            </Card>

            {/* Privacy-First */}
            <Card className="bg-secondary-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-3 bg-main border-2 border-border">
                    <Shield className="size-6 text-main-foreground" />
                  </div>
                  Privacy-First
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-lg space-y-2">
                  <li className="flex items-center gap-2">
                    <Lock className="size-5" />
                    Files never leave the browser
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-5 flex items-center justify-center font-heading">
                      ✕
                    </span>
                    No accounts required
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-5 flex items-center justify-center font-heading">
                      ✕
                    </span>
                    No tracking or data collection
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Fast by Design */}
            <Card className="bg-secondary-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-3 bg-main border-2 border-border">
                    <Zap className="size-6 text-main-foreground" />
                  </div>
                  Fast by Design
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">
                  <span className="font-heading">
                    Faster than traditional web editors
                  </span>{" "}
                  like CapCut. No upload or download delays. Uses native{" "}
                  <span className="font-heading">WebCodecs</span> for
                  high-performance processing.
                </p>
              </CardContent>
            </Card>

            {/* Built with Modern Web APIs */}
            <Card className="bg-secondary-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-3 bg-main border-2 border-border">
                    <Code className="size-6 text-main-foreground" />
                  </div>
                  Modern Web APIs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">
                  Powered by{" "}
                  <a
                    href="https://mediabunny.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-heading underline underline-offset-4 hover:bg-main hover:text-main-foreground transition-colors px-1"
                  >
                    MediaBunny
                  </a>
                  , demonstrating real-world usage of{" "}
                  <span className="font-heading">WebCodecs</span> in the
                  browser.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-28 border-t-4 border-border bg-secondary-background">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-heading text-center mb-16">
            How It Works
          </h2>

          <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto">
            <div className="flex-1 border-4 border-border bg-background p-8 shadow-shadow">
              <div className="text-5xl font-heading mb-4 text-main">01</div>
              <h3 className="text-2xl font-heading mb-3">Drop Your Files</h3>
              <p className="text-lg">
                Drag and drop your video or audio files directly into the
                browser.
              </p>
            </div>

            <div className="flex-1 border-4 border-border bg-background p-8 shadow-shadow">
              <div className="text-5xl font-heading mb-4 text-main">02</div>
              <h3 className="text-2xl font-heading mb-3">Edit or Convert</h3>
              <p className="text-lg">
                Choose your desired format or make edits — all processing
                happens locally.
              </p>
            </div>

            <div className="flex-1 border-4 border-border bg-background p-8 shadow-shadow">
              <div className="text-5xl font-heading mb-4 text-main">03</div>
              <h3 className="text-2xl font-heading mb-3">Download Result</h3>
              <p className="text-lg">
                Get your processed file instantly. No waiting for uploads or
                server processing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20 md:py-28 border-t-4 border-border">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block border-4 border-border bg-main p-3 mb-8">
              <Monitor className="size-12 text-main-foreground" />
            </div>
            <h2 className="text-4xl md:text-5xl font-heading mb-6">
              Built for the Modern Web
            </h2>
            <p className="text-xl mb-8">
              Leveraging the power of{" "}
              <span className="font-heading">WebCodecs</span> through{" "}
              <a
                href="https://mediabunny.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="font-heading underline underline-offset-4 hover:bg-main hover:text-main-foreground transition-colors px-1"
              >
                MediaBunny
              </a>
              , LocalCut brings professional-grade media processing directly to
              your browser — no plugins, no installs, no compromises.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="border-2 border-border px-4 py-2 bg-secondary-background font-heading">
                WebCodecs
              </span>
              <span className="border-2 border-border px-4 py-2 bg-secondary-background font-heading">
                MediaBunny
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 border-t-4 border-border bg-main">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-heading text-main-foreground mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-main-foreground/80 mb-10 max-w-xl mx-auto">
              No sign-up required. No uploads. Just fast, private media
              processing in your browser.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                variant="neutral"
                asChild
                className="text-lg px-10 py-6 h-auto"
              >
                <Link href="/convert" prefetch={true}>
                  Start Converting
                </Link>
              </Button>
              <Button
                size="lg"
                variant="neutral"
                asChild
                className="text-lg px-10 py-6 h-auto"
              >
                <Link href="/editor" prefetch={true}>
                  Open Editor
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
