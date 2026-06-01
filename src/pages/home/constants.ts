import {
  BrainCircuit,
  Globe2,
  Layers3,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import {
  CommandMode,
  FeaturePillar,
  MotionStackItem,
  NavItem,
  SignalItem,
  WorkflowStep,
} from "./types";

export const ALLOWED_ADMIN_EMAILS = new Set([
  "seiuasatou@gmail.com",
  "sandeepdatta866@gmail.com",
]);

export const BASE_CARD_NAV_ITEMS: NavItem[] = [
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
    label: "App",
    bgColor: "#2C2342",
    textColor: "#fff",
    links: [{ label: "Luna App", href: "/app", ariaLabel: "View Luna app details and downloads" }],
  },
  {
    label: "Luna",
    bgColor: "#33224A",
    textColor: "#fff",
    links: [{ label: "Open Chat", href: "/chat", ariaLabel: "Open Luna chat" }],
  },
];

export const PROFILE_NAV_ITEM: NavItem = {
  label: "Profile",
  bgColor: "#2A203B",
  textColor: "#fff",
  links: [{ label: "My Profile", href: "/profile", ariaLabel: "Open user profile" }],
};

export const FALLBACK_CAROUSEL_FEEDBACK = [
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

export const fadeInUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

export const staggerContainer = {
  initial: "hidden",
  whileInView: "show",
  viewport: { once: true, amount: 0.2 },
  variants: {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.12,
      },
    },
  },
};

export const revealItem = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export const hoverFloat = {
  whileHover: { y: -6, scale: 1.01 },
  transition: { type: "spring" as const, stiffness: 240, damping: 22 },
};

export const HERO_SIGNAL_ITEMS: SignalItem[] = [
  { label: "Live Provider Routing", value: "06", icon: Workflow },
  { label: "Professional Output Modes", value: "12", icon: Sparkles },
  { label: "Secure User Flows", value: "99.9%", icon: ShieldCheck },
];

export const FEATURE_PILLARS: FeaturePillar[] = [
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

export const MOTION_STACK: MotionStackItem[] = [
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

export const COMMAND_MODES: CommandMode[] = [
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

export const WORKFLOW_STEPS: WorkflowStep[] = [
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
