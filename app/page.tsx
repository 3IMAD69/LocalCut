import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  HardDrive,
  Shield,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Abstract Background Element */}
      <div className="absolute top-0 left-0 right-0 h-[600px] overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[120%] bg-primary/5 rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[100%] bg-blue-500/5 rounded-full blur-[100px] opacity-40" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-sm font-medium text-primary">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              v0.7 Beta Available
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Professional Media Tools,
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/20">
              Right in Your Browser
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Convert, edit, and process video & audio locally. No uploads, no
            waiting, no privacy compromise.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-105"
            >
              <Link href="/convert" prefetch={true}>
                Start Converting <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-8 h-12 text-base border-primary/20 bg-background/50 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/40 transition-all"
            >
              <Link href="/editor" prefetch={true}>
                Launch Editor
              </Link>
            </Button>
          </div>

          {/* Trust/Tech Badges */}
          <div className="pt-12 flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-medium text-muted-foreground/60 animate-in fade-in duration-1000 delay-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <span>100% Client-Side</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <span>Powered by WebCodecs</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <span>No File Uploads</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why LocalCut - Modern Bento Grid */}
      <section className="py-24 bg-gradient-to-b from-background via-muted/20 to-background">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              Why LocalCut?
            </h2>
            <p className="text-muted-foreground text-lg">
              We leverage cutting-edge browser capabilities to bring
              desktop-class performance to the web.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Speed Card - Large */}
            <div className="group rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-8 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Zap className="size-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Blazing Fast Performance
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    By using WebAssembly and WebCodecs, LocalCut processes media
                    at native speeds directly on your device. Say goodbye to
                    queue times and server delays.
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-muted/50 border border-border/50 p-6 font-mono text-sm text-muted-foreground">
                <span className="text-muted-foreground/60">&gt;</span>{" "}
                processing_speed: <span className="text-primary">native</span>
              </div>
            </div>

            {/* Privacy Card */}
            <div className="group rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-8 hover:border-emerald-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                  <Shield className="size-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Privacy First</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Your files never leave your computer. We believe your
                    personal media should stay personal. No cloud storage, no
                    data mining.
                  </p>
                </div>
              </div>
            </div>

            {/* Offline Card */}
            <div className="group rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-8 hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                  <HardDrive className="size-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Works Offline</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Once loaded, LocalCut works entirely without an internet
                    connection. Perfect for travel or low-bandwidth
                    environments.
                  </p>
                </div>
              </div>
            </div>

            {/* Modern Tech Card - Large */}
            <div className="group rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-8 hover:border-violet-500/30 transition-all duration-300">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 shrink-0">
                  <Cpu className="size-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Modern Web Architecture
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Built on the bleeding edge of web technology. We use simple,
                    standard APIs to deliver robust application performance.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs font-mono text-muted-foreground">
                  WebCodecs
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs font-mono text-muted-foreground">
                  WebAssembly
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs font-mono text-muted-foreground">
                  MediaBunny
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 container mx-auto px-6 max-w-6xl">
        <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center tracking-tight">
          Seamless Workflow
        </h2>
        <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
          {[
            {
              step: "01",
              title: "Drop",
              desc: "Drag your media files directly into the browser window.",
            },
            {
              step: "02",
              title: "Process",
              desc: "Edit, trim, or convert using our instant local tools.",
            },
            {
              step: "03",
              title: "Save",
              desc: "Download the processed file instantly to your device.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex-1 flex flex-col items-center text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors duration-300"
            >
              <span className="text-6xl font-black text-muted-foreground mb-4 font-sans">
                {item.step}
              </span>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-24 mt-auto">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="relative rounded-3xl overflow-hidden bg-primary px-6 py-16 md:px-16 text-center text-primary-foreground shadow-2xl shadow-primary/20">
            <div className="absolute top-0 right-0 h-64 w-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-64 w-64 bg-black/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

            <h2 className="relative text-3xl md:text-5xl font-bold mb-6 tracking-tight">
              Ready to transform your media?
            </h2>
            <p className="relative text-primary-foreground/80 text-lg md:text-xl max-w-2xl mx-auto mb-10">
              Join thousands of users converting and editing files faster than
              ever before.
            </p>

            <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="rounded-full px-8 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <Link href="/convert">Get Started for Free</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
