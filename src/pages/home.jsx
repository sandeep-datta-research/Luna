import { Suspense, lazy, useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BrainCircuit,
  Globe2,
  Layers3,
  Menu,
  Mic,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { fetchApi, getStoredUser, hydrateUser } from "@/lib/api-client";
import CardNav from "@/component/CardNav";
import logo from "@/assets/luna-logo.svg";
import lunaLogo from "@/assets/luna-logo.svg";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import Orb from "@/components/ui/orb";
import Earth from "@/components/ui/globe";
import Ribbons from "@/components/ui/ribbons";

const TestimonialsCarousel = lazy(() => import("@/components/mvpblocks/testimonials-carousel"));
const Analytics = lazy(() => import("@vercel/analytics/react").then((mod) => ({ default: mod.Analytics })));
const SpeedInsights = lazy(() =>
  import("@vercel/speed-insights/react").then((mod) => ({ default: mod.SpeedInsights })),
);

const ALLOWED_ADMIN_EMAILS = new Set([
  "seiuasatou@gmail.com",
  "sandeepdatta866@gmail.com",
]);

const BASE_CARD_NAV_ITEMS = [
  {
    label: "Home",
    bgColor: "#0D0716",
    textColor: "#fff",
    links: [{ label: "Home", href: "/", ariaLabel: "Go to homepage" }],
  },
  {
    label: "Features",
    bgColor: "#170D27",
    textColor: "#fff",
    links: [{ label: "Features", href: "/features", ariaLabel: "View Luna features" }],
  },
  {
    label: "Pricing",
    bgColor: "#271E37",
    textColor: "#fff",
    links: [{ label: "Pricing", href: "/pricing", ariaLabel: "View pricing section" }],
  },
  {
    label: "Luna",
    bgColor: "#33224A",
    textColor: "#fff",
    links: [{ label: "Open Chat", href: "/chat", ariaLabel: "Open Luna chat" }],
  },
];

const PROFILE_NAV_ITEM = {
  label: "Profile",
  bgColor: "#2A203B",
  textColor: "#fff",
  links: [{ label: "My Profile", href: "/profile", ariaLabel: "Open user profile" }],
};

const FALLBACK_CAROUSEL_FEEDBACK = [
  {
    id: "local-fb-1",
    name: "Aarav",
    email: "aarav@example.com",
    message: "Luna feels clean and fast. The chat flow is smooth and really easy to use.",
    rating: 5,
  },
  {
    id: "local-fb-2",
    name: "Riya",
    email: "riya@example.com",
    message: "Model switching and history support make this feel like a production-ready assistant.",
    rating: 5,
  },
  {
    id: "local-fb-3",
    name: "Kabir",
    email: "kabir@example.com",
    message: "The dark theme and overall UI quality are excellent. Very polished experience.",
    rating: 4,
  },
];

const fadeInUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.55, ease: "easeOut" },
};

const hoverFloat = {
  whileHover: { y: -6, scale: 1.01 },
  transition: { type: "spring", stiffness: 240, damping: 22 },
};

const HERO_SIGNAL_ITEMS = [
  { label: "Live Provider Routing", value: "06", icon: Workflow },
  { label: "Professional Output Modes", value: "12", icon: Sparkles },
  { label: "Secure User Flows", value: "99.9%", icon: ShieldCheck },
];

const FEATURE_PILLARS = [
  {
    title: "3D Workspace Presence",
    body: "A cinematic landing surface with layered motion, spatial depth, and ambient systems that feel product-grade instead of template-grade.",
    icon: Layers3,
  },
  {
    title: "Research To Execution",
    body: "Move from ideas to strategy memos, product critique, technical debugging, and executive writing inside one interface.",
    icon: BrainCircuit,
  },
  {
    title: "Global System View",
    body: "Live account, provider, and workflow context organized into a clearer command surface for daily work.",
    icon: Globe2,
  },
];

const MOTION_STACK = [
  {
    title: "Reasoning Layer",
    detail: "Structured responses with smoother decision depth",
    icon: BrainCircuit,
    className: "left-0 top-10 md:left-6 md:top-10",
    accent: "from-cyan-400/30 via-sky-300/10 to-transparent",
  },
  {
    title: "Live Routing",
    detail: "Provider switching and resilient request flow",
    icon: Workflow,
    className: "right-0 top-24 md:right-6 md:top-16",
    accent: "from-violet-400/30 via-fuchsia-300/10 to-transparent",
  },
  {
    title: "Premium Output",
    detail: "Client-ready drafts and strategic synthesis",
    icon: Sparkles,
    className: "bottom-4 left-6 md:bottom-8 md:left-20",
    accent: "from-amber-300/30 via-orange-300/10 to-transparent",
  },
];

const COMMAND_MODES = [
  {
    label: "Strategy Memo",
    prompt: "Priorities, tradeoffs, risks, and next actions.",
    tone: "from-cyan-400/25 via-sky-400/10 to-transparent",
  },
  {
    label: "Technical Debug",
    prompt: "Root cause analysis with the cleanest fix path.",
    tone: "from-violet-400/25 via-fuchsia-400/10 to-transparent",
  },
  {
    label: "Research Brief",
    prompt: "Executive summary, findings, open questions, recommendations.",
    tone: "from-emerald-400/25 via-teal-400/10 to-transparent",
  },
  {
    label: "Client Proposal",
    prompt: "Scope, timeline, pricing logic, and assumptions.",
    tone: "from-amber-300/25 via-orange-300/10 to-transparent",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Frame the ask",
    body: "Move from rough intent into a clearer work mode with better structure up front.",
  },
  {
    step: "02",
    title: "Route the context",
    body: "Model and provider routing stay behind the surface while the interface stays calm.",
  },
  {
    step: "03",
    title: "Ship the output",
    body: "Land on cleaner summaries, memos, critiques, and action-ready responses faster.",
  },
];

function SectionSkeleton({ className = "", compact = false }) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-white/8 bg-white/[0.04] ${compact ? "min-h-[220px]" : "min-h-[320px]"} ${className}`}
      aria-hidden="true"
    >
      <div className="h-full w-full animate-pulse bg-[linear-gradient(110deg,rgba(255,255,255,0.03),rgba(255,255,255,0.08),rgba(255,255,255,0.03))]" />
    </div>
  );
}

function DeferredSection({ children, fallback, className = "", sectionId, rootMargin = "280px" }) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const node = document.querySelector(`[data-deferred-section="${sectionId}"]`);
    if (!node || shouldRender) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, sectionId, shouldRender]);

  return (
    <div data-deferred-section={sectionId} className={className}>
      {shouldRender ? children : fallback}
    </div>
  );
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 768px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener?.("change", update);
    return () => mediaQuery.removeEventListener?.("change", update);
  }, []);

  return isDesktop;
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getSignedInSnapshot() {
  if (typeof window === "undefined") {
    return { email: "", name: "", isSignedIn: false };
  }

  const user = getStoredUser();
  if (!user) {
    return { email: "", name: "", isSignedIn: false };
  }

  const email = normalizeEmail(user?.email);
  const name = typeof user?.name === "string" ? user.name.trim() : "";
  return { email, name, isSignedIn: Boolean(email) };
}

function MobileNavbar({ ctaHref, onOpenMenu }) {
  return (
    <header className="relative z-20 flex h-14 items-center justify-between px-4">
      <motion.button
        type="button"
        onClick={onOpenMenu}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white backdrop-blur-md"
        aria-label="Open menu"
        whileHover={{ y: -2, scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
      >
        <Menu className="h-5 w-5" />
      </motion.button>

      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur-md">
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
          <img src={lunaLogo} alt="Luna" className="h-full w-full object-cover" />
        </span>
        <span className="text-sm font-semibold tracking-[0.02em] text-white">Luna</span>
      </div>

      <motion.div whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
        <Link
          to={ctaHref}
          className="rounded-full border border-violet-300/25 bg-gradient-to-r from-violet-500/45 to-fuchsia-400/30 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_22px_rgba(124,92,255,0.28)] backdrop-blur-md"
        >
          Start Chat
        </Link>
      </motion.div>
    </header>
  );
}

function SignalStat({ item }) {
  const Icon = item.icon;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-lg font-semibold text-white">{item.value}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{item.label}</p>
        </div>
      </div>
    </motion.div>
  );
}

function MotionPanel({ item, index }) {
  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, delay: 0.1 + index * 0.08, ease: "easeOut" }}
      whileHover={{ y: -6, rotateX: 2, rotateY: -2 }}
      className={`absolute hidden w-[200px] rounded-[28px] border border-white/10 bg-[#0c1320]/82 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:block ${item.className}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className={`pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br ${item.accent}`} />
      <div className="relative">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">Luna Stack</p>
          </div>
        </div>
        <p className="text-sm leading-6 text-zinc-300">{item.detail}</p>
      </div>
    </motion.div>
  );
}

function ScrollProgressBar({ progress }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-1 bg-white/[0.03]">
      <motion.div
        className="h-full origin-left bg-[linear-gradient(90deg,#67e8f9,#60a5fa,#8b5cf6)] shadow-[0_0_28px_rgba(96,165,250,0.55)]"
        style={{ scaleX: progress }}
      />
    </div>
  );
}

function HeroExperience({ ctaHref, isSignedIn, scrollYProgress }) {
  const textY = useTransform(scrollYProgress, [0, 0.22], [0, -42]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0.82]);
  const visualY = useTransform(scrollYProgress, [0, 0.22], [0, 58]);
  const visualRotate = useTransform(scrollYProgress, [0, 0.22], [0, -5]);
  const ribbonsOpacity = useTransform(scrollYProgress, [0, 0.18], [0.75, 0.18]);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(88,165,255,0.18),transparent_25%),radial-gradient(circle_at_78%_18%,rgba(168,85,247,0.18),transparent_28%),radial-gradient(circle_at_50%_85%,rgba(16,185,129,0.12),transparent_34%)]" />
      <motion.div className="absolute inset-x-0 top-0 h-[520px] overflow-hidden" style={{ opacity: ribbonsOpacity }}>
        <Ribbons
          className="absolute inset-0 opacity-70"
          colors={["#59d3ff", "#8b5cf6", "#22c55e"]}
          baseThickness={36}
          speedMultiplier={0.45}
          maxAge={420}
          enableFade
          enableShaderEffect
        />
      </motion.div>

      <div className="relative mx-auto grid min-h-[calc(100vh-84px)] w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-20 lg:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10"
          style={{ y: textY, opacity: textOpacity }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-cyan-100">
            <Zap className="h-3.5 w-3.5" />
            Professional AI Workspace
          </div>

          <h1 className="mt-6 max-w-[12ch] text-5xl font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
            Built to feel fast, spatial, and serious.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
            Luna now leads with a smoother 3D presence, clearer information hierarchy, and a more
            polished command surface for research, writing, and daily execution.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to={ctaHref}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-gradient-to-r from-cyan-400/80 to-sky-500/70 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(56,189,248,0.3)]"
            >
              {isSignedIn ? "Open Workspace" : "Enter Luna"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/features"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl"
            >
              Explore Features
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {HERO_SIGNAL_ITEMS.map((item) => (
              <SignalStat key={item.label} item={item} />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.08 }}
          className="relative flex min-h-[540px] items-center justify-center"
          style={{ y: visualY, rotateZ: visualRotate }}
        >
          {MOTION_STACK.map((item, index) => (
            <MotionPanel key={item.title} item={item} index={index} />
          ))}

          <div className="absolute inset-0 rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,24,0.86),rgba(7,9,13,0.56))] shadow-[0_40px_140px_rgba(0,0,0,0.38)] backdrop-blur-2xl" />
          <div className="absolute inset-[1px] rounded-[38px] border border-white/8" />

          <motion.div
            animate={{ y: [0, -14, 0], rotate: [0, 4, 0] }}
            transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="absolute left-6 top-8 h-24 w-24 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.34),transparent_65%)] blur-2xl"
          />
          <motion.div
            animate={{ y: [0, 12, 0], x: [0, -10, 0] }}
            transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="absolute bottom-10 right-10 h-28 w-28 rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.32),transparent_65%)] blur-2xl"
          />

          <div className="relative z-10 flex w-full max-w-[460px] flex-col items-center px-6 py-8">
            <div className="relative flex h-[220px] w-[220px] items-center justify-center sm:h-[250px] sm:w-[250px]">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <Orb hue={194} hoverIntensity={0.6} rotateOnHover={false} backgroundColor="#071018" />
              </motion.div>
            </div>

            <div className="mt-8 grid w-full gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <motion.div
                whileHover={{ y: -6, rotateX: 2, rotateY: -2 }}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Response Layer</p>
                    <p className="mt-2 text-lg font-semibold text-white">Smooth, guided, executive-grade</p>
                  </div>
                  <Sparkles className="h-5 w-5 text-cyan-200" />
                </div>
                <p className="mt-4 text-sm leading-7 text-zinc-300">
                  Cleaner motion, calmer gradients, and better spatial cues make the homepage feel
                  like a product surface rather than a collection of sections.
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -6, rotateX: 2, rotateY: 2 }}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,28,0.95),rgba(10,12,18,0.8))] p-4"
                style={{ transformStyle: "preserve-3d" }}
              >
                <p className="px-1 text-xs uppercase tracking-[0.24em] text-zinc-400">Global Context</p>
                <div className="mt-3 h-[180px] rounded-[22px] border border-white/8 bg-black/30">
                  <Earth
                    className="max-w-none scale-[1.08]"
                    baseColor={[0.17, 0.67, 0.92]}
                    glowColor={[0.39, 0.33, 0.97]}
                    markerColor={[0.45, 0.96, 0.82]}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FeaturePillarSection({ scrollYProgress }) {
  const sectionY = useTransform(scrollYProgress, [0.12, 0.45], [48, -18]);
  const sectionOpacity = useTransform(scrollYProgress, [0.04, 0.18], [0.55, 1]);

  return (
    <motion.section
      className="mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8"
      style={{ y: sectionY, opacity: sectionOpacity }}
    >
      <motion.div
        {...fadeInUp}
        className="grid gap-5 lg:grid-cols-3"
      >
        {FEATURE_PILLARS.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.article
              key={item.title}
              whileHover={{ y: -8, rotateX: 2, rotateY: index === 1 ? 0 : index === 0 ? 2 : -2 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,26,0.88),rgba(9,11,16,0.86))] p-6 shadow-[0_26px_100px_rgba(0,0,0,0.25)] backdrop-blur-2xl"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-white">{item.title}</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-300">{item.body}</p>
            </motion.article>
          );
        })}
      </motion.div>
    </motion.section>
  );
}

function CommandModeRail({ compact = false }) {
  return (
    <section className={`${compact ? "" : "mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8"}`}>
      <motion.div
        {...fadeInUp}
        className={`grid gap-4 ${compact ? "" : "lg:grid-cols-[1.05fr_0.95fr]"}`}
      >
        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,24,0.92),rgba(8,10,16,0.88))] p-6 shadow-[0_26px_100px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Command Modes</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Pre-framed ways to start real work.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">
            Instead of an empty box, Luna can feel like a guided workspace. These modes turn the landing
            page into a stronger entry point for research, writing, debugging, and planning.
          </p>

          <div className="mt-6 grid gap-3">
            {COMMAND_MODES.map((mode) => (
              <motion.div
                key={mode.label}
                whileHover={{ y: -5, scale: 1.01 }}
                className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-4"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${mode.tone}`} />
                <div className="relative">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-white">{mode.label}</p>
                    <ArrowRight className="h-4 w-4 text-zinc-400" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{mode.prompt}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          whileHover={{ y: -8, rotateX: 2, rotateY: -2 }}
          className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,28,0.95),rgba(10,12,18,0.84))] p-5 shadow-[0_26px_100px_rgba(0,0,0,0.22)]"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Workspace Preview</p>
                <p className="mt-2 text-lg font-semibold text-white">Professional output, cleaner pacing</p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200">
                Live
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-cyan-300/18 bg-cyan-300/8 p-4 text-sm text-cyan-50">
                Build a strategy memo for the next 90 days with priorities, risk signals, and execution phases.
              </div>
              <div className="ml-auto max-w-[92%] rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-zinc-200">
                Working mode selected: <span className="font-semibold text-white">Strategy Memo</span>.
                Output will stay concise, executive, and decision-oriented with milestones and tradeoffs.
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-xs uppercase tracking-[0.2em] text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                context mapped
                <span className="h-2 w-2 rounded-full bg-violet-300" />
                reasoning staged
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                response prepared
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function WorkflowTimeline({ compact = false }) {
  return (
    <section className={`${compact ? "" : "mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8"}`}>
      <motion.div
        {...fadeInUp}
        className={`rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,13,19,0.95),rgba(7,9,14,0.86))] p-6 shadow-[0_30px_110px_rgba(0,0,0,0.2)] ${compact ? "" : "sm:p-8"}`}
      >
        <div className={`${compact ? "" : "flex items-end justify-between gap-6"}`}>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Workflow Arc</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">A smoother path from prompt to polished output.</h2>
          </div>
          {!compact ? (
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-300">
              The homepage should signal how the product works. This timeline makes Luna feel more like a
              professional system with stages, not a generic chat box.
            </p>
          ) : null}
        </div>

        <div className={`mt-8 grid gap-4 ${compact ? "" : "md:grid-cols-3"}`}>
          {WORKFLOW_STEPS.map((item) => (
            <motion.div
              key={item.step}
              whileHover={{ y: -6, scale: 1.01 }}
              className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">{item.step}</p>
              <h3 className="mt-3 text-xl font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-300">{item.body}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function MobileInputPreview({ ctaHref }) {
  return (
    <div className="relative z-20 px-4 pb-5">
      <motion.div whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.985 }}>
        <Link
          to={ctaHref}
          className="flex h-16 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 backdrop-blur-md shadow-[0_0_32px_rgba(124,92,255,0.14)]"
        >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80">
          <Mic className="h-4 w-4" />
        </div>
        <span className="flex-1 text-sm text-gray-400">Start Chat...</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 text-white shadow-[0_0_18px_rgba(124,92,255,0.38)]">
          <Send className="h-4 w-4" />
        </div>
        </Link>
      </motion.div>
    </div>
  );
}

function UserGrowthSection({ userMetrics, chartPoints, compact = false }) {
  const gradientId = useId().replace(/:/g, "");
  const areaId = `${gradientId}-area`;

  return (
    <motion.div
      {...(compact ? {} : hoverFloat)}
      className={`rounded-3xl border border-indigo-300/25 bg-gradient-to-b from-[#121225] to-[#0c0c16] shadow-[0_30px_90px_-55px_rgba(91,106,245,0.7)] ${compact ? "px-4 py-5" : "px-6 py-6 sm:px-8"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-200/70">User Growth</p>
          <h3 className={`mt-2 font-semibold text-white ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
            {userMetrics.total.toLocaleString()} total users
          </h3>
          <p className="mt-2 text-sm text-indigo-100/70">Last {userMetrics.days} days of signups</p>
        </div>
        <div className="rounded-2xl border border-indigo-300/20 bg-indigo-500/5 px-4 py-2 text-xs text-indigo-100/70">
          Updated automatically
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-300/20 bg-[#0b0b14]/70 p-4">
        <svg viewBox="0 0 560 140" className={`w-full ${compact ? "h-[120px]" : "h-[140px]"}`}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5B6AF5" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
            <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(91,106,245,0.35)" />
              <stop offset="100%" stopColor="rgba(91,106,245,0)" />
            </linearGradient>
          </defs>
          <polyline
            points={chartPoints || "8,120 552,120"}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={`${chartPoints || "8,120 552,120"} 552,136 8,136`}
            fill={`url(#${areaId})`}
            stroke="none"
          />
        </svg>
      </div>
    </motion.div>
  );
}

function FeedbackSection({
  feedbackForm,
  setFeedbackForm,
  feedbackBusy,
  feedbackNote,
  handleFeedbackSubmit,
  carouselTestimonials,
  compact = false,
}) {
  return (
    <motion.section
      {...(compact ? {} : hoverFloat)}
      className={`rounded-3xl border border-zinc-800 bg-zinc-900/60 text-zinc-300 ${compact ? "px-4 py-5" : "px-6 py-6 sm:px-8"}`}
    >
      <h2 className="text-lg font-semibold text-white">Feedback</h2>
      <p className="mt-2 text-sm leading-relaxed">
        Share your experience. Admin can feature selected feedback in the carousel below.
      </p>

      <form onSubmit={handleFeedbackSubmit} className={`mt-5 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 ${compact ? "" : "sm:grid-cols-2"}`}>
        <label className={`text-xs text-zinc-400 ${compact ? "" : ""}`}>
          Name
          <input
            value={feedbackForm.name}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Your name"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none"
          />
        </label>

        <label className="text-xs text-zinc-400">
          Email
          <input
            value={feedbackForm.email}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none"
          />
        </label>

        <label className={`text-xs text-zinc-400 ${compact ? "" : "sm:col-span-2"}`}>
          Feedback
          <textarea
            value={feedbackForm.message}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, message: e.target.value }))}
            placeholder="Tell us what to improve in Luna..."
            className="mt-1 min-h-[100px] w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none"
          />
        </label>

        <label className="text-xs text-zinc-400">
          Rating
          <select
            value={feedbackForm.rating}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none"
          >
            <option value={5}>5 - Excellent</option>
            <option value={4}>4 - Good</option>
            <option value={3}>3 - Average</option>
            <option value={2}>2 - Needs work</option>
            <option value={1}>1 - Poor</option>
          </select>
        </label>

        <div className={`flex items-end ${compact ? "" : "justify-end sm:col-span-1"}`}>
          <button
            type="submit"
            disabled={feedbackBusy}
            className="rounded-lg border border-violet-400/35 bg-violet-500/20 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-500/30 disabled:opacity-60"
          >
            {feedbackBusy ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>

        {feedbackNote ? <p className={`${compact ? "" : "sm:col-span-2"} text-xs text-cyan-200`}>{feedbackNote}</p> : null}
      </form>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40">
        <Suspense fallback={<SectionSkeleton compact={compact} className="rounded-2xl border-0 bg-transparent" />}>
          <TestimonialsCarousel
            testimonials={carouselTestimonials}
            title="Luna Community"
            subtitle="Featured feedback selected by admin."
            autoplaySpeed={3600}
            className={compact ? "py-8" : "py-10 md:py-14"}
          />
        </Suspense>
      </div>
    </motion.section>
  );
}

function MobileLanding({
  ctaHref,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  userMetrics,
  chartPoints,
  feedbackForm,
  setFeedbackForm,
  feedbackBusy,
  feedbackNote,
  handleFeedbackSubmit,
  carouselTestimonials,
}) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.24 });
  const mobileHeroY = useTransform(progress, [0, 0.3], [0, -28]);

  const menuLinks = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Open Chat", href: "/chat" },
    { label: "Profile", href: "/profile" },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#07070d] text-white">
      <ScrollProgressBar progress={progress} />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[420px] flex-col">
        <MobileNavbar ctaHref={ctaHref} onOpenMenu={onOpenMenu} />
        <div className="px-4 pt-2">
          <AnnouncementBanner />
        </div>
        <motion.div className="px-4 pb-2 pt-6" style={{ y: mobileHeroY }}>
          <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,24,0.94),rgba(7,9,13,0.82))]">
            <div className="relative px-5 pb-7 pt-6">
              <div className="pointer-events-none absolute inset-0 opacity-70">
                <Ribbons
                  className="absolute inset-0"
                  colors={["#59d3ff", "#8b5cf6"]}
                  baseThickness={22}
                  speedMultiplier={0.45}
                  maxAge={320}
                  enableFade
                  enableShaderEffect
                />
              </div>
              <p className="relative text-[11px] uppercase tracking-[0.28em] text-cyan-100/80">Luna AI Hub</p>
              <h1 className="relative mt-4 text-4xl font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                Smooth 3D motion, sharper product presence.
              </h1>
              <p className="relative mt-4 text-sm leading-7 text-zinc-300">
                A cleaner command surface for chat, research, and premium output.
              </p>
              <div className="relative mt-6 flex h-[220px] items-center justify-center">
                <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.16),transparent_40%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.14),transparent_34%)]" />
                <div className="relative h-[170px] w-[170px]">
                  <Orb hue={194} hoverIntensity={0.45} rotateOnHover={false} backgroundColor="#071018" />
                </div>
              </div>
              <div className="relative mt-2 grid gap-3">
                {HERO_SIGNAL_ITEMS.map((item) => (
                  <SignalStat key={item.label} item={item} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
        <MobileInputPreview ctaHref={ctaHref} />
        <div className="space-y-5 px-4 pb-10">
          <DeferredSection sectionId="mobile-pillars" className="mobile-pillars" fallback={<SectionSkeleton compact />}>
            <div className="space-y-4">
              {FEATURE_PILLARS.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    whileHover={{ y: -5, scale: 1.01 }}
                    className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,26,0.88),rgba(9,11,16,0.86))] p-5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-white">{item.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-zinc-300">{item.body}</p>
                  </motion.div>
                );
              })}
            </div>
          </DeferredSection>
          <DeferredSection sectionId="mobile-modes" className="mobile-modes" fallback={<SectionSkeleton compact />}>
            <CommandModeRail compact />
          </DeferredSection>
          <DeferredSection sectionId="mobile-growth" className="mobile-growth" fallback={<SectionSkeleton compact />}>
            <UserGrowthSection userMetrics={userMetrics} chartPoints={chartPoints} compact />
          </DeferredSection>
          <DeferredSection sectionId="mobile-workflow" className="mobile-workflow" fallback={<SectionSkeleton compact />}>
            <WorkflowTimeline compact />
          </DeferredSection>
          <DeferredSection sectionId="mobile-feedback" className="mobile-feedback" fallback={<SectionSkeleton compact />}>
            <FeedbackSection
              feedbackForm={feedbackForm}
              setFeedbackForm={setFeedbackForm}
              feedbackBusy={feedbackBusy}
              feedbackNote={feedbackNote}
              handleFeedbackSubmit={handleFeedbackSubmit}
              carouselTestimonials={carouselTestimonials}
              compact
            />
          </DeferredSection>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMenu}
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
              aria-label="Close menu overlay"
            />
            <motion.div
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="fixed inset-x-4 top-4 z-40 rounded-[28px] border border-white/10 bg-[#0b1020]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
                    <img src={lunaLogo} alt="Luna" className="h-full w-full object-cover" />
                  </span>
                  <span className="text-sm font-semibold text-white">Luna</span>
                </div>
                <motion.button
                  type="button"
                  onClick={onCloseMenu}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
                  aria-label="Close menu"
                  whileHover={{ y: -2, scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              <nav className="space-y-2">
                {menuLinks.map((item) => (
                  <motion.div key={item.label} whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
                    <Link
                    key={item.label}
                    to={item.href}
                    onClick={onCloseMenu}
                    className="flex h-12 items-center rounded-2xl border border-white/8 bg-white/[0.04] px-4 text-sm font-medium text-zinc-100"
                  >
                    {item.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DesktopHome({
  isSignedIn,
  cardNavItems,
  userMetrics,
  chartPoints,
  feedbackForm,
  setFeedbackForm,
  feedbackBusy,
  feedbackNote,
  handleFeedbackSubmit,
  carouselTestimonials,
  showAnalytics,
}) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.26 });
  const growthY = useTransform(progress, [0.22, 0.62], [60, -24]);
  const feedbackY = useTransform(progress, [0.36, 0.85], [72, -20]);
  const ambientYLeft = useTransform(progress, [0, 1], [0, -160]);
  const ambientYRight = useTransform(progress, [0, 1], [0, -100]);

  return (
    <div className="dark min-h-screen overflow-x-hidden bg-[#07070d] text-zinc-100">
      <ScrollProgressBar progress={progress} />
      <motion.div
        className="pointer-events-none fixed left-[-8rem] top-24 z-0 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.14),transparent_66%)] blur-3xl"
        style={{ y: ambientYLeft }}
      />
      <motion.div
        className="pointer-events-none fixed right-[-8rem] top-[38vh] z-0 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.14),transparent_66%)] blur-3xl"
        style={{ y: ambientYRight }}
      />
      <nav className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#07070d]/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <CardNav
            logo={logo}
            logoAlt="Luna Logo"
            items={cardNavItems}
            className="w-full"
            ease="power3.out"
            baseColor="#09090f"
            menuColor="#f4f4f5"
            buttonBgColor="#5B3DF5"
            buttonTextColor="#ffffff"
          />
        </div>
      </nav>

      <main className="relative pb-10 pt-14 md:pt-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <AnnouncementBanner className="mb-6" />
        </div>
        <HeroExperience ctaHref={isSignedIn ? "/chat" : "/signin"} isSignedIn={isSignedIn} scrollYProgress={progress} />

        <DeferredSection
          sectionId="desktop-pillars"
          className="desktop-pillars scroll-mt-28"
          fallback={<SectionSkeleton className="mx-auto mt-8 min-h-[320px] w-full max-w-6xl" />}
        >
          <FeaturePillarSection scrollYProgress={progress} />
        </DeferredSection>

        <DeferredSection
          sectionId="desktop-modes"
          className="desktop-modes"
          fallback={<SectionSkeleton className="mx-auto mt-8 min-h-[380px] w-full max-w-6xl" />}
        >
          <CommandModeRail />
        </DeferredSection>

        <DeferredSection
          sectionId="desktop-growth"
          className="desktop-growth mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8"
          fallback={<SectionSkeleton />}
        >
          <motion.section {...fadeInUp} style={{ y: growthY }}>
            <UserGrowthSection userMetrics={userMetrics} chartPoints={chartPoints} />
          </motion.section>
        </DeferredSection>

        <DeferredSection
          sectionId="desktop-workflow"
          className="desktop-workflow"
          fallback={<SectionSkeleton className="mx-auto mt-8 min-h-[300px] w-full max-w-6xl" />}
        >
          <WorkflowTimeline />
        </DeferredSection>

        {showAnalytics ? (
          <Suspense fallback={null}>
            <Analytics />
            <SpeedInsights />
          </Suspense>
        ) : null}

        <DeferredSection
          sectionId="desktop-feedback"
          className="desktop-feedback scroll-mt-28 mx-auto mt-6 w-full max-w-6xl px-4 sm:px-6 lg:px-8"
          fallback={<SectionSkeleton />}
        >
          <motion.div id="feedback" {...fadeInUp} style={{ y: feedbackY }}>
            <FeedbackSection
              feedbackForm={feedbackForm}
              setFeedbackForm={setFeedbackForm}
              feedbackBusy={feedbackBusy}
              feedbackNote={feedbackNote}
              handleFeedbackSubmit={handleFeedbackSubmit}
              carouselTestimonials={carouselTestimonials}
            />
          </motion.div>
        </DeferredSection>
      </main>
    </div>
  );
}

export default function Home() {
  const isDesktop = useIsDesktop();
  const [showAdmin, setShowAdmin] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ name: "", email: "", message: "", rating: 5 });
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [featuredFeedback, setFeaturedFeedback] = useState([]);
  const [userMetrics, setUserMetrics] = useState({ total: 0, series: [], days: 14 });
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    const syncAdminVisibility = () => {
      const snapshot = getSignedInSnapshot();
      setIsSignedIn(snapshot.isSignedIn);
      setShowAdmin(snapshot.isSignedIn && ALLOWED_ADMIN_EMAILS.has(snapshot.email));

      setFeedbackForm((prev) => ({
        ...prev,
        name: snapshot.name || prev.name,
        email: snapshot.email || prev.email,
      }));
    };

    syncAdminVisibility();
    hydrateUser().then(syncAdminVisibility).catch(syncAdminVisibility);

    window.addEventListener("storage", syncAdminVisibility);
    window.addEventListener("luna-auth-changed", syncAdminVisibility);
    window.addEventListener("focus", syncAdminVisibility);
    document.addEventListener("visibilitychange", syncAdminVisibility);

    return () => {
      window.removeEventListener("storage", syncAdminVisibility);
      window.removeEventListener("luna-auth-changed", syncAdminVisibility);
      window.removeEventListener("focus", syncAdminVisibility);
      document.removeEventListener("visibilitychange", syncAdminVisibility);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const loadAnalytics = () => setShowAnalytics(true);
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(loadAnalytics, { timeout: 2500 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(loadAnalytics, 1800);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const cardNavItems = useMemo(() => {
    const items = [...BASE_CARD_NAV_ITEMS];

    if (isSignedIn) items.push(PROFILE_NAV_ITEM);
    if (showAdmin) {
      items.push({
        label: "Admin",
        icon: Shield,
        bgColor: "#3B2552",
        textColor: "#fff",
        links: [{ label: "Dashboard", href: "/admin", ariaLabel: "Open admin dashboard" }],
      });
    }

    return items;
  }, [isSignedIn, showAdmin]);

  useEffect(() => {
    let canceled = false;
    const loadFeaturedFeedback = async () => {
      const result = await fetchApi("/api/feedback?featured=1&limit=12");
      if (!canceled && result.ok) {
        setFeaturedFeedback(Array.isArray(result.data?.feedback) ? result.data.feedback : []);
      }
    };
    const scheduleLoad = () => {
      void loadFeaturedFeedback();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(scheduleLoad, { timeout: 2500 });
      return () => {
        canceled = true;
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timer = typeof window !== "undefined" ? window.setTimeout(scheduleLoad, 1200) : null;
    return () => {
      canceled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let canceled = false;
    const loadUserMetrics = async () => {
      const result = await fetchApi("/api/metrics/users?days=14");
      if (!canceled && result.ok) {
        const series = Array.isArray(result.data?.series) ? result.data.series : [];
        setUserMetrics({
          total: Number(result.data?.total || 0),
          series,
          days: Number(result.data?.days || 14),
        });
      }
    };
    const scheduleLoad = () => {
      void loadUserMetrics();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(scheduleLoad, { timeout: 2500 });
      return () => {
        canceled = true;
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timer = typeof window !== "undefined" ? window.setTimeout(scheduleLoad, 1200) : null;
    return () => {
      canceled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const handleFeedbackSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      name: feedbackForm.name.trim(),
      email: feedbackForm.email.trim(),
      message: feedbackForm.message.trim(),
      rating: Number(feedbackForm.rating || 5),
    };

    if (payload.message.length < 8) {
      setFeedbackNote("Please enter at least 8 characters of feedback.");
      return;
    }

    setFeedbackBusy(true);
    setFeedbackNote("");

    const result = await fetchApi("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setFeedbackBusy(false);
    if (!result.ok) {
      setFeedbackNote(result.message || "Failed to submit feedback.");
      return;
    }

    setFeedbackNote("Thanks for your feedback. Admin will review it for carousel display.");
    setFeedbackForm((prev) => ({ ...prev, message: "", rating: 5 }));

    const featuredResult = await fetchApi("/api/feedback?featured=1&limit=12");
    if (featuredResult.ok) {
      setFeaturedFeedback(Array.isArray(featuredResult.data?.feedback) ? featuredResult.data.feedback : []);
    }
  };

  const carouselTestimonials = useMemo(() => {
    const source = featuredFeedback.length > 0 ? featuredFeedback : FALLBACK_CAROUSEL_FEEDBACK;
    return source.map((item, index) => {
      const name = (item?.name || `Luna User ${index + 1}`).trim();
      const email = `${item?.email || ""}`.trim().toLowerCase();
      const username = email ? `@${email.split("@")[0]}` : `@${name.toLowerCase().replace(/\s+/g, "")}`;
      const rating = Number(item?.rating || 5);
      return {
        text: item?.message || "Luna made AI chat simple and smooth.",
        imageSrc: `https://i.pravatar.cc/100?img=${(index % 40) + 1}`,
        name,
        username,
        role: `Rated ${Math.min(5, Math.max(1, Math.round(rating)))}/5`,
      };
    });
  }, [featuredFeedback]);

  const chartPoints = useMemo(() => {
    const series = userMetrics.series || [];
    if (series.length === 0) return "";
    const width = 560;
    const height = 140;
    const maxCount = Math.max(1, ...series.map((item) => Number(item.count || 0)));
    return series
      .map((item, index) => {
        const x = 8 + (index / Math.max(1, series.length - 1)) * (width - 16);
        const value = Number(item.count || 0);
        const y = height - 12 - (value / maxCount) * (height - 24);
        return `${x},${y}`;
      })
      .join(" ");
  }, [userMetrics.series]);

  const ctaHref = isSignedIn ? "/chat" : "/signin";

  return (
    <>
      {isDesktop ? (
        <DesktopHome
          isSignedIn={isSignedIn}
          cardNavItems={cardNavItems}
          userMetrics={userMetrics}
          chartPoints={chartPoints}
          feedbackForm={feedbackForm}
          setFeedbackForm={setFeedbackForm}
          feedbackBusy={feedbackBusy}
          feedbackNote={feedbackNote}
          handleFeedbackSubmit={handleFeedbackSubmit}
          carouselTestimonials={carouselTestimonials}
          showAnalytics={showAnalytics}
        />
      ) : (
        <MobileLanding
          ctaHref={ctaHref}
          menuOpen={mobileMenuOpen}
          onOpenMenu={() => setMobileMenuOpen(true)}
          onCloseMenu={() => setMobileMenuOpen(false)}
          userMetrics={userMetrics}
          chartPoints={chartPoints}
          feedbackForm={feedbackForm}
          setFeedbackForm={setFeedbackForm}
          feedbackBusy={feedbackBusy}
          feedbackNote={feedbackNote}
          handleFeedbackSubmit={handleFeedbackSubmit}
          carouselTestimonials={carouselTestimonials}
        />
      )}
    </>
  );
}
