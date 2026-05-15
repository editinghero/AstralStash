import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, Link2, FileText, Tag, Search, Moon, Pin, Download, Sparkles, Star, Github, Lightbulb, Clipboard, Plus,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ParallaxBackground } from "@/components/ParallaxBackground";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { icon: Link2, title: "Save Links", body: "Auto-grab title, image and description from any URL. Paste anywhere to save instantly." },
  { icon: FileText, title: "Markdown Notes", body: "Full markdown editor with live preview and color choices. Write beautifully formatted notes." },
  { icon: Tag, title: "Tags & Collections", body: "Color tags and smart filters keep things tidy. Organize with custom collections." },
  { icon: Search, title: "Instant Search", body: "Real-time search across titles, content and tags. Find anything in milliseconds." },
  { icon: Moon, title: "Dark Mode", body: "Easy on the eyes, day or night. Your preference, remembered across devices." },
  { icon: Clipboard, title: "Quick Capture", body: "Paste a URL anywhere in the app to save it instantly. Keyboard shortcuts for everything." },
  { icon: Pin, title: "Pin Important Items", body: "Keep your favorites at the top, always within reach. Never lose important stuff." },
  { icon: Download, title: "Export Your Data", body: "Download all your stash as JSON whenever you want. Your data, your control." },
  { icon: Sparkles, title: "Beautiful UI", body: "Carefully crafted interface with smooth animations. A joy to use every day." },
  { icon: Github, title: "Open Source", body: "Built in the open. Contribute, fork, or run your own instance. MIT licensed." },
];

const Index = () => {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  const heroContainerRef = useRef<HTMLDivElement>(null);
  const heroBadgeRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroDescRef = useRef<HTMLParagraphElement>(null);
  const heroButtonsRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline();

    // Initial state: blur and opacity 0
    gsap.set([heroBadgeRef.current, heroTitleRef.current, heroDescRef.current, heroButtonsRef.current], {
      opacity: 0,
      filter: "blur(10px)",
      y: 20,
    });

    // Animate badge
    tl.to(heroBadgeRef.current, {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      duration: 0.8,
      ease: "power2.out",
    })
    // Animate title
    .to(heroTitleRef.current, {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      duration: 1,
      ease: "power3.out",
    }, "-=0.4")
    // Animate description
    .to(heroDescRef.current, {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      duration: 0.8,
      ease: "power2.out",
    }, "-=0.6")
    // Animate buttons
    .to(heroButtonsRef.current, {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      duration: 0.8,
      ease: "power2.out",
    }, "-=0.6");
  }, { scope: heroContainerRef });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="container flex items-center justify-between h-16">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-secondary transition-colors">Features</a>
            <a href="#how" className="hover:text-secondary transition-colors">How it works</a>
            <a href="#love" className="hover:text-secondary transition-colors">Love</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {showInstall && (
              <Button onClick={handleInstall} variant="ghost" className="rounded-full hidden sm:inline-flex">
                <Plus className="w-4 h-4 mr-1" />
                Install
              </Button>
            )}
            <Button asChild className="rounded-full gradient-primary text-primary-foreground shadow-pink hover:opacity-95 text-sm sm:text-base px-4 sm:px-6">
              <Link to={user ? "/app" : "/auth"}>
                {user ? "Open App" : "Sign Up"} <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" ref={heroContainerRef}>
        <ParallaxBackground />

        <div className="container relative z-10 pt-10 pb-16 sm:pt-14 sm:pb-20 md:pt-20 md:pb-28 text-center px-4 sm:px-6">
          <div
            ref={heroBadgeRef}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6 sm:mb-8"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            ✦ A nicer home for the things you love
          </div>

          <h1
            ref={heroTitleRef}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] font-semibold text-secondary leading-[1.1] sm:leading-[1.05] text-balance max-w-5xl mx-auto px-4"
          >
            Save every good thing<br className="hidden sm:block" />
            you find online{" "}
            <span className="text-primary italic">in one beautiful place.</span>
          </h1>

          <p
            ref={heroDescRef}
            className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4"
          >
            From research to inspiration — links, notes, ideas and more. <br className="hidden sm:block" />
            All yours. Secure, private, and beautifully organized.
          </p>

          <div
            ref={heroButtonsRef}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 px-4"
          >
            <Button asChild size="lg" className="w-full sm:w-auto rounded-full gradient-primary text-primary-foreground shadow-pink hover:opacity-95 px-6 sm:px-8 h-12 sm:h-14 text-base">
              <Link to={user ? "/app" : "/auth"}>
                {user ? "Open App" : "Start Saving Free"} <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-6 sm:px-8 h-12 sm:h-14 text-base border-secondary/20 hover:bg-secondary hover:text-secondary-foreground bg-background/50 backdrop-blur-sm">
              <a href="#how">See how it works</a>
            </Button>
          </div>

          <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1.5 flex-wrap px-4 relative z-10">
            <kbd className="px-2 py-0.5 rounded-md border bg-card text-secondary text-xs font-mono">Ctrl</kbd>
            +
            <kbd className="px-2 py-0.5 rounded-md border bg-card text-secondary text-xs font-mono">V</kbd>
            to save anything, anywhere
          </p>

          {/* Masonry preview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-12 sm:mt-16 md:mt-20 max-w-6xl mx-auto relative px-4"
          >
            {/* Floating badges */}
            <span className="hidden md:inline-flex absolute -top-4 left-6 z-10 px-3 py-1.5 rounded-full bg-card shadow-card text-xs font-medium text-secondary rotate-[-4deg]">
              Movies 🎬
            </span>
            <span className="hidden md:inline-flex absolute -top-3 right-12 z-10 px-3 py-1.5 rounded-full bg-card shadow-card text-xs font-medium text-secondary rotate-[3deg]">
              Articles 📄
            </span>
            <span className="hidden md:inline-flex absolute top-1/3 -left-6 z-10 px-3 py-1.5 rounded-full bg-card shadow-card text-xs font-medium text-secondary rotate-[-6deg]">
              Ideas 💡
            </span>
            <span className="hidden md:inline-flex absolute bottom-12 -right-4 z-10 px-3 py-1.5 rounded-full bg-card shadow-card text-xs font-medium text-secondary rotate-[5deg]">
              Notes 📝
            </span>

            <div className="rounded-3xl bg-card shadow-lift p-5 md:p-7 border border-border/60">
              <div className="masonry-preview">
                <PreviewLink color="FFD6D6" title="The Quiet Power of Slow Web" domain="essays.cafe" tags={["reading", "design"]} />
                <PreviewNote bg="#FFF0F3" title="Reading list — design systems"
                  body="Tokens, typography, spacing, motion. The fundamentals never go out of style." />
                <PreviewLink color="D6E4FF" title="Playfair Display on Google Fonts" domain="fonts.google.com" tags={["typography"]} />
                <PreviewIdea bg="#F0FFF4" body="Build the thing you wish existed." />
                <PreviewLink color="FFE0C2" title="A Pattern Language for the Web" domain="patternlang.dev" tags={["architecture"]} />
                <PreviewNote bg="#F5F0FF" title="Tea, not coffee ☕"
                  body="Switching after lunch. Better focus, no jitters. Try **matcha** next." />
                <PreviewLink color="E8D6FF" title="On Collecting Beautiful Things" domain="kottke.org" />
                <PreviewIdea bg="#FFFBF0" body="A weekend zine made entirely from my saves." />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-20 md:py-24 lg:py-32">
        <div className="container px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold text-secondary text-balance">
              Everything you need.{" "}
              <span className="italic text-primary">Nothing you don't.</span>
            </h2>
            <p className="mt-3 sm:mt-4 text-muted-foreground text-base sm:text-lg">
              Built for the way you actually collect ideas online.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="bg-card rounded-2xl p-5 sm:p-6 shadow-soft hover-lift"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-accent flex items-center justify-center mb-4 sm:mb-5">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-base sm:text-lg text-secondary mb-2">{f.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Simple by design */}
      <section id="how" className="pb-16 sm:pb-20 md:pb-24 lg:pb-32">
        <div className="container px-4 sm:px-6">
          <div className="rounded-2xl sm:rounded-3xl gradient-mint p-6 sm:p-10 md:p-16 lg:p-20" style={{ color: "#1A2B3C" }}>
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold">
                Simple by design
              </h2>
              <p className="mt-2 sm:mt-3 opacity-70 text-sm sm:text-base">
                Three steps to a perfectly organized collection.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {[
                { n: 1, t: "Capture", b: "Press Ctrl+V anywhere or write directly. AstralStash recognizes what you're saving." },
                { n: 2, t: "Organize", b: "Everything appears as beautiful cards. Search, filter, and tag however you like." },
                { n: 3, t: "Retrieve", b: "Find anything instantly. Your collection grows without the chaos." },
              ].map((s) => (
                <div key={s.n} className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center shadow-soft" style={{ color: "#1A2B3C" }}>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full gradient-primary text-primary-foreground font-display text-lg sm:text-xl flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-pink">
                    {s.n}
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl mb-2">{s.t}</h3>
                  <p className="text-xs sm:text-sm opacity-70 leading-relaxed">{s.b}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section id="love" className="pb-16 sm:pb-20 md:pb-24 lg:pb-32">
        <div className="container max-w-4xl px-4 sm:px-6">
          <div className="rounded-2xl sm:rounded-3xl gradient-warm p-6 sm:p-10 md:p-16 text-center" style={{ color: "#1A2B3C" }}>
            <div className="flex justify-center gap-1 mb-4 sm:mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-primary text-primary" />
              ))}
            </div>
            <blockquote className="font-display italic text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-snug text-balance">
              "So much better than my old bookmark folders. I can finally collect inspiration
              from anywhere and find it again — beautifully."
            </blockquote>
            <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full gradient-primary" />
              <div className="text-left">
                <div className="font-medium text-sm sm:text-base">A Visual Thinker</div>
                <div className="text-xs opacity-70">Designer, freelance</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16 sm:pb-20 md:pb-24">
        <div className="container text-center max-w-3xl px-4 sm:px-6">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-secondary text-balance">
            Your new <span className="italic text-primary">favorite place</span> on the internet.
          </h2>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground">
            Secure, private, and beautifully organized. Start saving today.
          </p>
          <Button asChild size="lg" className="mt-8 sm:mt-10 rounded-full gradient-primary text-primary-foreground shadow-pink hover:opacity-95 px-8 sm:px-10 h-12 sm:h-14 text-base w-full sm:w-auto">
            <Link to={user ? "/app" : "/auth"}>
              {user ? "Open App" : "Get Started Free"} <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 sm:py-12">
        <div className="container px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
              <Logo />
              <span className="text-xs sm:text-sm text-muted-foreground italic">— your personal corner of the internet</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Built with ♥ for curious minds</p>
            <nav className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground flex-wrap justify-center">
              <Link to="mailto:astralquarks@proton.me" className="hover:text-secondary transition-colors">Mail</Link>
              <a href="https://github.com/editinghero" className="hover:text-secondary transition-colors">About</a>
              <a href="https://github.com/editinghero/astralstash" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors flex items-center gap-1.5">
                <Github className="w-4 h-4" /> GitHub
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
};

const PreviewLink = ({
  color, title, domain, tags = [],
}: { color: string; title: string; domain: string; tags?: string[] }) => (
  <div className="bg-card rounded-2xl overflow-hidden shadow-soft mb-4 break-inside-avoid">
    <div className="h-32" style={{ background: `#${color}` }} />
    <div className="p-4">
      <div className="text-[11px] text-muted-foreground mb-1">{domain}</div>
      <div className="font-display text-secondary leading-snug text-base">{title}</div>
      {tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {tags.map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">#{t}</span>
          ))}
        </div>
      )}
    </div>
  </div>
);

const PreviewNote = ({ bg, title, body }: { bg: string; title: string; body: string }) => (
  <div className="rounded-2xl p-5 shadow-soft mb-4 break-inside-avoid" style={{ background: bg, color: "#1A2B3C" }}>
    <div className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/60 mb-2" style={{ color: "#1A2B3C" }}>
      <FileText className="w-3 h-3" /> Note
    </div>
    <div className="font-display text-lg leading-snug">{title}</div>
    <p className="text-sm mt-2 opacity-75">{body}</p>
  </div>
);

const PreviewIdea = ({ bg, body }: { bg: string; body: string }) => (
  <div className="rounded-2xl p-5 shadow-soft mb-4 break-inside-avoid" style={{ background: bg, color: "#1A2B3C" }}>
    <div className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/60 mb-2" style={{ color: "#1A2B3C" }}>
      <Lightbulb className="w-3 h-3" /> Idea
    </div>
    <div className="font-display text-xl leading-snug">{body}</div>
  </div>
);

export default Index;
