import {
  BrainCircuit,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import lunaClassicPortrait from "@/assets/characters/luna-classic.svg";
import electroEmpressPortrait from "@/assets/characters/electro-empress.svg";
import tricksterDirectorPortrait from "@/assets/characters/trickster-director.svg";
import verdantSagePortrait from "@/assets/characters/verdant-sage.svg";

export const MAX_HISTORY_ITEMS = 6;
export const VOICE_SILENCE_THRESHOLD = 0.015;
export const VOICE_SILENCE_MS = 1800;
export const VOICE_MONITOR_INTERVAL_MS = 120;

export const MODEL_OPTIONS = [
  { id: "luna-2.5", label: "Luna 2.5", available: true },
  { id: "luna-2.1", label: "Luna 2.1", available: true },
  { id: "luna-reasoning", label: "Luna Reasoning", available: false },
];

export const QUICK_CHIPS = [
  { icon: "Ops", label: "Strategy Memo", prompt: "Write a concise strategy memo with priorities, tradeoffs, risks, and next actions for this situation:" },
  { icon: "Code", label: "Technical Debug", prompt: "Help me debug this issue step-by-step, explain the root cause, and propose the cleanest fix." },
  { icon: "Doc", label: "Client Proposal", prompt: "Draft a polished client proposal with scope, timeline, deliverables, pricing logic, and assumptions." },
  { icon: "Res", label: "Research Brief", prompt: "Create an executive research brief with a short summary, key findings, open questions, and recommendations." },
  { icon: "Mail", label: "Executive Email", prompt: "Draft a professional email with a clear ask, concise context, and a confident tone for this scenario:" },
  { icon: "Plan", label: "90-Day Plan", prompt: "Build a practical 90-day execution plan with milestones, owners, and measurable outcomes for this goal:" },
  { icon: "UX", label: "Product Critique", prompt: "Review this product experience and give a candid UX critique with prioritized fixes and rationale." },
  { icon: "Sum", label: "Meeting Summary", prompt: "Turn these meeting notes into decisions, action items, owners, deadlines, and unresolved questions." },
];

export const WORKSPACE_FEATURES = [
  {
    icon: BrainCircuit,
    title: "Reasoning Workspace",
    description: "Draft, analyze, and iterate in one thread with clearer context and cleaner message hierarchy.",
  },
  {
    icon: Layers3,
    title: "Project Context",
    description: "Group active conversations into projects so follow-up work stays organized instead of disappearing into history.",
  },
  {
    icon: ShieldCheck,
    title: "Professional Output",
    description: "Use quick modes for research, writing, and image generation without breaking the main flow.",
  },
];

export const CHARACTER_OPTIONS = [
  {
    id: "luna-classic",
    name: "Luna Classic",
    tagline: "Witty, sharp, balanced",
    description: "Default Luna voice with playful intelligence and practical help.",
    portrait: lunaClassicPortrait,
    accentStart: "#7fc7ba",
    accentEnd: "#0f1f24",
    starterPrompts: [
      "Help me plan my day in 5 practical steps.",
      "Rewrite this message so it sounds sharper and more confident.",
      "Break this problem down and tell me the best next move.",
    ],
  },
  {
    id: "electro-empress",
    name: "Electro Empress",
    tagline: "Cold strategy, high control",
    description: "Calm, commanding replies for planning, critique, and decisive guidance.",
    portrait: electroEmpressPortrait,
    accentStart: "#8e6cff",
    accentEnd: "#0f1f24",
    starterPrompts: [
      "Challenge this plan and tell me what is weak.",
      "Give me the strongest decision with risks and tradeoffs.",
      "Turn this messy idea into a clear strategy memo.",
    ],
  },
  {
    id: "trickster-director",
    name: "Trickster Director",
    tagline: "Chaotic charm, bold tone",
    description: "More theatrical, teasing, and energetic without losing competence.",
    portrait: tricksterDirectorPortrait,
    accentStart: "#ff7a4f",
    accentEnd: "#0f1f24",
    starterPrompts: [
      "Punch this copy up and make it impossible to ignore.",
      "Give me 5 bold creative directions for this concept.",
      "Turn this boring draft into something with attitude.",
    ],
  },
  {
    id: "verdant-sage",
    name: "Verdant Sage",
    tagline: "Gentle insight, deep calm",
    description: "Reflective, thoughtful replies with a softer mentoring style.",
    portrait: verdantSagePortrait,
    accentStart: "#78d89d",
    accentEnd: "#0f1f24",
    starterPrompts: [
      "Help me think through this calmly before I react.",
      "Explain this gently and simply, step by step.",
      "Give me a grounded reflection on what to do next.",
    ],
  },
];
