
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Clock3,
  Command,
  Copy,
  Download,
  Folder,
  FolderPlus,
  Globe,
  Home,
  ImageIcon,
  Layers3,
  Loader2,
  Menu,
  Mic,
  Paperclip,
  PenSquare,
  Plus,
  ShieldCheck,
  RotateCcw,
  Search,
  Send,
  Settings,
  Sparkles,
  Star,
  Trash2,
  UserCircle2,
  X,
  Zap,
  Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchApi, streamApi, getStoredUser, hydrateUser } from "@/lib/api-client";
import { useBrandingLogo } from "@/lib/branding";
import lunaLogo from "@/assets/luna-logo.svg";
import lunaClassicPortrait from "@/assets/characters/luna-classic.svg";
import electroEmpressPortrait from "@/assets/characters/electro-empress.svg";
import tricksterDirectorPortrait from "@/assets/characters/trickster-director.svg";
import verdantSagePortrait from "@/assets/characters/verdant-sage.svg";
import MarkdownMessage from "@/components/ui/chat/MarkdownMessage";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import AnnouncementBanner from "@/components/AnnouncementBanner";

const MAX_HISTORY_ITEMS = 6;
const VOICE_SILENCE_THRESHOLD = 0.015;
const VOICE_SILENCE_MS = 1800;
const VOICE_MONITOR_INTERVAL_MS = 120;

const MODEL_OPTIONS = [
  { id: "luna-2.5", label: "Luna 2.5", available: true },
  { id: "luna-2.1", label: "Luna 2.1", available: true },
  { id: "luna-reasoning", label: "Luna Reasoning", available: false },
];

const QUICK_CHIPS = [
  { icon: "Ops", label: "Strategy Memo", prompt: "Write a concise strategy memo with priorities, tradeoffs, risks, and next actions for this situation:" },
  { icon: "Code", label: "Technical Debug", prompt: "Help me debug this issue step-by-step, explain the root cause, and propose the cleanest fix." },
  { icon: "Doc", label: "Client Proposal", prompt: "Draft a polished client proposal with scope, timeline, deliverables, pricing logic, and assumptions." },
  { icon: "Res", label: "Research Brief", prompt: "Create an executive research brief with a short summary, key findings, open questions, and recommendations." },
  { icon: "Mail", label: "Executive Email", prompt: "Draft a professional email with a clear ask, concise context, and a confident tone for this scenario:" },
  { icon: "Plan", label: "90-Day Plan", prompt: "Build a practical 90-day execution plan with milestones, owners, and measurable outcomes for this goal:" },
  { icon: "UX", label: "Product Critique", prompt: "Review this product experience and give a candid UX critique with prioritized fixes and rationale." },
  { icon: "Sum", label: "Meeting Summary", prompt: "Turn these meeting notes into decisions, action items, owners, deadlines, and unresolved questions." },
];

const WORKSPACE_FEATURES = [
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

const CHARACTER_OPTIONS = [
  {
    id: "luna-classic",
    name: "Luna Classic",
    tagline: "Witty, sharp, balanced",
    description: "Default Luna voice with playful intelligence and practical help.",
    portrait: lunaClassicPortrait,
    accentStart: "#7fc7ba",
    accentEnd: "#0f1f24",
  },
  {
    id: "electro-empress",
    name: "Electro Empress",
    tagline: "Cold strategy, high control",
    description: "Calm, commanding replies for planning, critique, and decisive guidance.",
    portrait: electroEmpressPortrait,
    accentStart: "#8e6cff",
    accentEnd: "#0f1f24",
  },
  {
    id: "trickster-director",
    name: "Trickster Director",
    tagline: "Chaotic charm, bold tone",
    description: "More theatrical, teasing, and energetic without losing competence.",
    portrait: tricksterDirectorPortrait,
    accentStart: "#ff7a4f",
    accentEnd: "#0f1f24",
  },
  {
    id: "verdant-sage",
    name: "Verdant Sage",
    tagline: "Gentle insight, deep calm",
    description: "Reflective, thoughtful replies with a softer mentoring style.",
    portrait: verdantSagePortrait,
    accentStart: "#78d89d",
    accentEnd: "#0f1f24",
  },
];

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function shortTitle(input, fallback = "New chat") {
  const normalized = text(input).replace(/\s+/g, " ");
  if (!normalized) return fallback;
  return normalized.length <= 52 ? normalized : `${normalized.slice(0, 52)}...`;
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatHistoryTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function normalizeCharacterId(value, options = CHARACTER_OPTIONS) {
  const normalized = text(value).toLowerCase();
  if (!normalized) return options[0]?.id || CHARACTER_OPTIONS[0].id;
  return options.some((item) => item.id === normalized) ? normalized : normalized;
}

function getCharacterOption(value, options = CHARACTER_OPTIONS) {
  const id = normalizeCharacterId(value, options);
  return options.find((item) => item.id === id) || options[0] || CHARACTER_OPTIONS[0];
}

function hydrateCharacterOptions(rawList) {
  if (!Array.isArray(rawList) || rawList.length === 0) return CHARACTER_OPTIONS;

  return rawList
    .map((item, index) => {
      const fallback = CHARACTER_OPTIONS[index % CHARACTER_OPTIONS.length];
      const id = text(item?.id) || fallback.id;
      return {
        id,
        name: text(item?.name) || fallback.name,
        tagline: text(item?.tagline) || fallback.tagline,
        description: text(item?.description) || fallback.description,
        portrait: text(item?.imageUrl) || fallback.portrait,
        accentStart: text(item?.accentStart) || fallback.accentStart,
        accentEnd: text(item?.accentEnd) || fallback.accentEnd,
        access: text(item?.access) === "pro" ? "pro" : "free",
        active: item?.active !== false,
        locked: Boolean(item?.locked),
        usageCount: Number(item?.usageCount || 0),
        usageCountFree: Number(item?.usageCountFree || 0),
        usageCountPro: Number(item?.usageCountPro || 0),
        lastUsedAt: text(item?.lastUsedAt),
      };
    })
    .filter((item) => item.active !== false);
}

function sanitizeMessage(raw) {
  const role = raw?.role === "assistant" ? "assistant" : "user";
  const content = text(raw?.content || raw?.text);
  if (!content) return null;

  const sources = Array.isArray(raw?.sources)
    ? raw.sources
      .map((item, index) => {
        const link = text(item?.link || item?.url);
        if (!link) return null;
        return {
          id: text(item?.id) || `src-${index + 1}`,
          title: text(item?.title) || "Untitled source",
          link,
          source: text(item?.source),
          snippet: text(item?.snippet || item?.summary),
        };
      })
      .filter(Boolean)
    : [];

  return {
    id: text(raw?.id) || createId(role),
    role,
    content,
    createdAt: text(raw?.createdAt) || nowIso(),
    llm: text(raw?.llm),
    sources,
  };
}

function createSession(projectId = "", characterId = CHARACTER_OPTIONS[0].id) {
  return {
    id: createId("session"),
    title: "New chat",
    messages: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    projectId: text(projectId),
    characterId: normalizeCharacterId(characterId, CHARACTER_OPTIONS),
    backendConversationId: "",
  };
}

function getDefaultProjects() {
  return [
    { id: "project-general", name: "General", createdAt: nowIso() },
    { id: "project-notes", name: "Notes", createdAt: nowIso() },
  ];
}

  function loadUser() {
    if (typeof window === "undefined") {
      return { name: "Guest", email: "guest@luna.ai", picture: "" };
    }

    const user = getStoredUser();
    if (!user) return { name: "Guest", email: "guest@luna.ai", picture: "" };

    return {
      name: text(user?.name) || "Guest",
      email: text(user?.email) || "guest@luna.ai",
      picture: text(user?.picture),
    };
  }

function mapConversationSummaryToSession(summary, projectId = "") {
  const id = text(summary?.id) || createId("session");
  const createdAt = text(summary?.createdAt) || nowIso();
  const updatedAt = text(summary?.updatedAt) || createdAt;
  const title = text(summary?.title) || shortTitle(summary?.preview, "New chat");

  return {
    id,
    title,
    messages: [],
    createdAt,
    updatedAt,
    projectId: text(projectId),
    characterId: normalizeCharacterId(summary?.characterId, CHARACTER_OPTIONS),
    backendConversationId: id,
  };
}

function formatDateLabel(value = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(value);
}

function mapConversationMessages(conversation) {
  const rawMessages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  return rawMessages
    .map((message) =>
      sanitizeMessage({
        ...message,
        content: message?.content ?? message?.text,
      }),
    )
    .filter(Boolean);
}

function exportSessionToMarkdown(session) {
  const title = text(session?.title) || "Luna Chat";
  const character = getCharacterOption(session?.characterId);
  const messages = Array.isArray(session?.messages) ? session.messages : [];
  const lines = [`# ${title}`, "", `Character: ${character.name}`, `Exported: ${nowIso()}`, ""];

  for (const message of messages) {
    const label = message.role === "assistant" ? character.name : "You";
    lines.push(`## ${label}`);
    lines.push("");
    lines.push(text(message.content) || "");
    lines.push("");
  }

  return lines.join("\n");
}

function toBase64DataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read audio blob."));
    reader.readAsDataURL(blob);
  });
}
function SidebarButton({ icon, label, onClick, collapsed = false, danger = false }) {
  const IconComponent = icon;
  return (
    <motion.button
      whileHover={{ y: -1, scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      type="button"
      onClick={onClick}
      title={label}
      className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition-all duration-150 ${
        danger
          ? "border-rose-500/25 bg-rose-500/10 text-rose-100 hover:border-rose-400/35 hover:bg-rose-500/15"
          : "border-white/8 bg-white/[0.03] text-[#d7e0eb] hover:border-[#4f7c75]/50 hover:bg-[#101f22]/70 hover:text-white"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <IconComponent className="h-4 w-4 shrink-0" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </motion.button>
  );
}

function ModelSelector({ selectedModel, onSelect }) {
  const [open, setOpen] = useState(false);
  const selected = MODEL_OPTIONS.find((item) => item.id === selectedModel) || MODEL_OPTIONS[0];

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.97 }}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0f1b1d]/90 px-3 py-1.5 text-sm text-[#f2f6f7] transition-all duration-150 hover:border-[#4f7c75]/70"
      >
        <span>{selected.label}</span>
        <ChevronDown className="h-4 w-4 text-[#8fa6a2]" />
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#091316] p-1 shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
          >
            {MODEL_OPTIONS.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  if (model.available) {
                    onSelect(model.id);
                    setOpen(false);
                  }
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  model.available
                    ? "text-[#e6eff0] hover:bg-[#102126]"
                    : "cursor-not-allowed text-[#6f8380]"
                }`}
              >
                <span>{model.label}</span>
                <span className="flex items-center gap-2 text-xs">
                  <span className={`h-2.5 w-2.5 rounded-full ${model.available ? "bg-emerald-400" : "bg-zinc-600"}`} />
                  {model.available ? "Available" : "Soon"}
                </span>
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({
  message,
  showLunaHeader,
  isLatestAssistant,
  onCopy,
  onRegenerate,
  character,
}) {
  const isUser = message.role === "user";
  const sources = Array.isArray(message.sources) ? message.sources : [];
  const assistantCharacter = character || CHARACTER_OPTIONS[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`group flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`flex max-w-full flex-col gap-1 ${isUser ? "items-end md:max-w-[78%]" : "items-start md:max-w-[82%]"}`}>
        {!isUser && showLunaHeader ? (
          <div className="mb-1 flex items-center gap-2 text-xs text-[#9aa2c7]">
            <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5">
              <img src={assistantCharacter.portrait || lunaLogo} alt={assistantCharacter.name} className="h-full w-full rounded-[inherit] object-cover" />
            </span>
            <span className="font-medium">{assistantCharacter.name}</span>
          </div>
        ) : null}

        <div
          className={`relative rounded-[18px] px-4 py-3 text-sm leading-6 ${
            isUser
              ? "rounded-br-[4px] bg-[linear-gradient(135deg,#205c57,#0f3f3f)] text-white shadow-[0_16px_40px_rgba(15,63,63,0.28)]"
              : "rounded-bl-[4px] border border-[#21353a] bg-[linear-gradient(180deg,rgba(14,22,25,0.96),rgba(8,14,17,0.98))] text-[#eef6f3] shadow-[0_18px_44px_rgba(0,0,0,0.18)]"
          }`}
        >
          {isUser ? message.content : <MarkdownMessage content={message.content} />}

          {!isUser ? (
            <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 transition-opacity duration-150 md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onCopy(message.content)}
                className="rounded-md border border-[#274149] bg-[#0f1f24]/95 p-1 text-[#cfe4e0] transition hover:border-[#4f7c75]"
                title="Copy"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {isLatestAssistant ? (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="rounded-md border border-[#274149] bg-[#0f1f24]/95 p-1 text-[#cfe4e0] transition hover:border-[#4f7c75]"
                  title="Regenerate"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {!isUser && sources.length > 0 ? (
          <div className="mt-2 grid w-full gap-2">
            {sources.map((source, index) => (
              <a
                key={source.id || source.link || index}
                href={source.link}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-[#21353a] bg-[#0d171a]/90 px-3 py-2 text-left transition hover:border-[#4f7c75] hover:bg-[#102126]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#7fa69f]">
                    [{index + 1}] {source.source || "Source"}
                  </span>
                  <Globe className="h-3.5 w-3.5 text-[#7fa69f]" />
                </div>
                <p className="mt-1 text-sm font-medium text-[#eef6f3]">{source.title}</p>
                {source.snippet ? (
                  <p className="mt-1 text-xs leading-5 text-[#98b0ab]">{source.snippet}</p>
                ) : null}
              </a>
            ))}
          </div>
        ) : null}

        <span className="text-[11px] text-[#7f9893]">{formatTime(message.createdAt)}</span>
      </div>
    </motion.div>
  );
}

function CharacterCards({ options = CHARACTER_OPTIONS, selectedCharacterId, onSelect, compact = false, isPro = false }) {
  return (
    <div className={`luna-scrollbar flex gap-3 overflow-x-auto pb-1 ${compact ? "" : ""}`}>
      {options.map((character) => {
        const active = character.id === normalizeCharacterId(selectedCharacterId, options);
        const locked = character.access === "pro" && !isPro;
        return (
          <motion.button
            key={character.id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            type="button"
            onClick={() => onSelect(character)}
            className={`group relative min-w-[272px] overflow-hidden rounded-[26px] border text-left transition ${
              active
                ? "border-[#7fc7ba]/80 bg-[#102126] shadow-[0_16px_40px_rgba(18,49,56,0.35)]"
                : "border-[#1f3135] bg-[#0b1518] hover:border-[#35545b] hover:bg-[#0e1b1f]"
            } ${locked ? "opacity-80" : ""}`}
          >
            <div
              className="absolute inset-x-0 top-0 h-24 opacity-90"
              style={{ backgroundImage: `linear-gradient(135deg, ${character.accentStart}, ${character.accentEnd})` }}
            />
            <div className="relative flex items-start gap-3 p-3">
              <img
                src={character.portrait}
                alt={character.name}
                className="h-24 w-20 rounded-[18px] border border-white/10 object-cover shadow-[0_14px_24px_rgba(0,0,0,0.25)]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#8badab]">Character</p>
                    <h3 className="mt-1 text-base font-semibold text-[#edf5f2]" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {character.name}
                    </h3>
                  </div>
                  <span className={`mt-0.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                    locked
                      ? "border-[#6f5624] bg-[#2d2413] text-[#f0d79b]"
                      : active
                        ? "border-[#4f7c75] bg-[#102126] text-[#dff7f1]"
                        : "border-[#294147] bg-[#102126] text-[#84a7a0]"
                  }`}>
                    {locked ? "Pro" : character.access === "pro" ? "Pro" : "Free"}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-[#d9ece7]">{character.tagline}</p>
                <p className="mt-1 text-xs leading-5 text-[#8ba39f]">{character.description}</p>
                {locked ? <p className="mt-2 text-[11px] text-[#f0d79b]">Upgrade to unlock this character.</p> : null}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

function TypingIndicator({ character }) {
  const assistantCharacter = character || CHARACTER_OPTIONS[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="rounded-[18px] rounded-bl-[4px] border border-[#21353a] bg-[linear-gradient(180deg,rgba(14,22,25,0.96),rgba(8,14,17,0.98))] px-4 py-3 text-[#d7e9e5]">
        <div className="mb-2 flex items-center gap-2 text-xs text-[#86a49d]">
          <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5">
            <img src={assistantCharacter.portrait || lunaLogo} alt={assistantCharacter.name} className="h-full w-full rounded-[inherit] object-cover" />
          </span>
          <span>{assistantCharacter.name}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#7fc7ba] luna-dot" />
          <span className="h-2 w-2 rounded-full bg-[#7fc7ba] luna-dot [animation-delay:0.15s]" />
          <span className="h-2 w-2 rounded-full bg-[#7fc7ba] luna-dot [animation-delay:0.3s]" />
        </div>
      </div>
    </motion.div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  disabled,
  sendDisabled = false,
  voiceActive,
  transcribing,
  onToggleVoice,
  webSearch,
  researchMode,
  imageMode,
  onToggleWebSearch,
  onToggleResearchMode,
  onToggleImageMode,
  onExport,
  onAttach,
  attachments,
  onRemoveAttachment,
  isPro = false,
  compact = false,
}) {
  const [focused, setFocused] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "48px";
    textarea.style.height = `${Math.min(180, Math.max(48, textarea.scrollHeight))}px`;
  }, [value]);

  return (
    <div
      className={`rounded-[28px] border bg-[linear-gradient(180deg,rgba(10,16,18,0.96),rgba(7,12,14,0.98))] px-3 py-3 backdrop-blur ${
        focused ? "border-[#4f7c75]/80 shadow-[0_0_0_2px_rgba(79,124,117,0.16)]" : "border-[#1f3135]"
      } ${compact ? "mx-auto w-full max-w-3xl" : "w-full"}`}
    >
      {attachments.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={`${file}-${index}`}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#274149] bg-[#102126] px-3 py-1 text-xs text-[#dceae7]"
            >
              <span className="max-w-[160px] truncate sm:max-w-[220px]">{file}</span>
              <button type="button" onClick={() => onRemoveAttachment(index)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        placeholder="Ask Luna for strategy, research, writing, or execution support..."
        disabled={disabled}
        className="luna-scrollbar w-full resize-none overflow-y-auto bg-transparent px-2 py-1 text-[15px] text-[#eef6f3] outline-none placeholder:text-[#6b817d] sm:text-sm"
      />
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files || []).map((item) => item.name);
              if (files.length) onAttach(files);
              event.target.value = "";
            }}
          />

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-[#274149] bg-[#0f1f24] p-2 text-[#cde3df] transition hover:border-[#4f7c75]"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onToggleWebSearch}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
              webSearch
                ? "border-[#4f7c75] bg-[#102126] text-[#eef6f3]"
                : "border-[#274149] bg-[#0f1f24] text-[#cde3df] hover:border-[#4f7c75]/70"
            }`}
            title="Use live web results in this reply"
          >
            <Globe className="h-3.5 w-3.5" />
            Live web
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onToggleResearchMode}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
              researchMode
                ? "border-[#4f7c75] bg-[#102126] text-[#eef6f3]"
                : "border-[#274149] bg-[#0f1f24] text-[#cde3df] hover:border-[#4f7c75]/70"
            }`}
            title={isPro ? "Research mode" : "Luna Pro feature"}
          >
            {isPro ? <Sparkles className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            Research
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onToggleImageMode}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
              imageMode
                ? "border-[#4f7c75] bg-[#102126] text-[#eef6f3]"
                : "border-[#274149] bg-[#0f1f24] text-[#cde3df] hover:border-[#4f7c75]/70"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Create image
          </motion.button>
        </div>

        <div className="flex items-center justify-end gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onExport}
            disabled={!isPro}
            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-2 transition ${
              isPro
                ? "border-[#274149] bg-[#0f1f24] text-[#cde3df] hover:border-[#4f7c75]/70"
                : "border-[#24363a] bg-[#0f1f24]/70 text-[#68817b] opacity-80"
            }`}
            title={isPro ? "Export this chat" : "Luna Pro feature"}
          >
            {isPro ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onToggleVoice}
            disabled={transcribing}
            className={`relative inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-2 transition ${
              voiceActive
                ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-200"
                : "border-[#274149] bg-[#0f1f24] text-[#cde3df] hover:border-[#4f7c75]/70"
            } ${transcribing ? "opacity-70" : ""}`}
            title={voiceActive ? "Stop recording" : "Voice input"}
          >
            {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {!transcribing && voiceActive ? (
              <div className="flex h-4 items-end gap-[2px]">
                <span className="h-2 w-[3px] rounded bg-emerald-300 luna-wave" />
                <span className="h-3 w-[3px] rounded bg-emerald-300 luna-wave [animation-delay:0.1s]" />
                <span className="h-4 w-[3px] rounded bg-emerald-300 luna-wave [animation-delay:0.2s]" />
                <span className="h-3 w-[3px] rounded bg-emerald-300 luna-wave [animation-delay:0.3s]" />
              </div>
            ) : null}
            {!transcribing && !voiceActive ? <Mic className="h-4 w-4" /> : null}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: value.trim() ? 1.08 : 1 }}
            type="button"
            onClick={onSend}
            disabled={sendDisabled || !value.trim()}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
              value.trim() && !sendDisabled
                ? "bg-[linear-gradient(135deg,#e1ba6d,#9e7b33)] text-[#102126] shadow-[0_0_0_8px_rgba(225,186,109,0.14)]"
                : "bg-[#21353a] text-[#77928d]"
            }`}
            title="Send"
          >
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-2 text-[11px] text-[#6f8682]">
        <span className="inline-flex items-center gap-1">
          <Command className="h-3.5 w-3.5" />
          Enter to send, Shift+Enter for a new line
        </span>
        <span>{attachments.length ? `${attachments.length} attachment${attachments.length > 1 ? "s" : ""}` : "No attachments"}</span>
      </div>
    </div>
  );
}
export default function Luna() {
  const brandLogo = useBrandingLogo(lunaLogo);
  const navigate = useNavigate();

  const initialUser = useMemo(() => loadUser(), []);
  const [user, setUser] = useState(initialUser);
  const isSignedIn = useMemo(() => {
    return Boolean(user?.email && user.email !== "guest@luna.ai");
  }, [user?.email]);

  const defaultProjects = useMemo(() => getDefaultProjects(), []);
  const initialSession = useMemo(
    () => createSession(defaultProjects[0]?.id || ""),
    [defaultProjects],
  );

  const [sessions, setSessions] = useState([initialSession]);
  const [projects, setProjects] = useState(defaultProjects);
  const [activeSessionId, setActiveSessionId] = useState(initialSession.id);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState("luna-2.5");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [characterOptions, setCharacterOptions] = useState(CHARACTER_OPTIONS);
  const [characterSearchQuery, setCharacterSearchQuery] = useState("");
  const [webSearchMode, setWebSearchMode] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [membershipPlan, setMembershipPlan] = useState("free");
  const [expandedProjectId, setExpandedProjectId] = useState("");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [toast, setToast] = useState(null);
  const [onboardingState, setOnboardingState] = useState({ loading: true, answered: false });

  const supportsStreaming = useMemo(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator?.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/i.test(ua);
    return typeof ReadableStream !== "undefined" && !isIOS;
  }, []);
  const [lastRetryPayload, setLastRetryPayload] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const analyserRef = useRef(null);
  const analyserDataRef = useRef(null);
  const silenceStartedAtRef = useRef(null);
  const silenceIntervalRef = useRef(null);
  const autoStoppedBySilenceRef = useRef(false);
  const listEndRef = useRef(null);
  const streamAbortRef = useRef(null);
  const loadedConversationIdsRef = useRef(new Set());
  const historyLoadedRef = useRef(false);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    [sessions],
  );

  const activeSession = useMemo(() => {
    const direct = sessions.find((item) => item.id === activeSessionId);
    return direct || sortedSessions[0] || null;
  }, [activeSessionId, sessions, sortedSessions]);
  const activeCharacter = useMemo(
    () => getCharacterOption(activeSession?.characterId, characterOptions),
    [activeSession?.characterId, characterOptions],
  );
  const filteredCharacterOptions = useMemo(() => {
    const query = characterSearchQuery.trim().toLowerCase();
    if (!query) return characterOptions;
    return characterOptions.filter((item) =>
      [item.name, item.tagline, item.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [characterOptions, characterSearchQuery]);

  const activeMessages = useMemo(
    () => (Array.isArray(activeSession?.messages) ? activeSession.messages : []),
    [activeSession?.messages],
  );

  const latestAssistantId = useMemo(() => {
    for (let i = activeMessages.length - 1; i >= 0; i -= 1) {
      if (activeMessages[i].role === "assistant") return activeMessages[i].id;
    }
    return "";
  }, [activeMessages]);

  const historyList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = sortedSessions.filter((session) => {
      if (!query) return true;
      return session.title.toLowerCase().includes(query);
    });

    return filtered.slice(0, MAX_HISTORY_ITEMS);
  }, [searchQuery, sortedSessions]);

  const clearVoiceSilenceMonitor = useCallback(() => {
    if (silenceIntervalRef.current) {
      window.clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }

    silenceStartedAtRef.current = null;
    analyserDataRef.current = null;

    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.disconnect();
      } catch {
        // no-op
      }
      audioSourceRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        // no-op
      }
      analyserRef.current = null;
    }

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") {
      audioContext.close().catch(() => {});
    }
  }, []);

  const stopMediaStreamTracks = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      mediaStreamRef.current = null;
    }
  }, []);

  const beginVoiceSilenceMonitor = useCallback(
    (stream, recorder) => {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        const context = new AudioContextClass();
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.1;
        source.connect(analyser);

        audioContextRef.current = context;
        audioSourceRef.current = source;
        analyserRef.current = analyser;
        analyserDataRef.current = new Uint8Array(analyser.fftSize);
        silenceStartedAtRef.current = null;

        silenceIntervalRef.current = window.setInterval(() => {
          if (!analyserRef.current || !analyserDataRef.current || !recorder || recorder.state === "inactive") {
            return;
          }

          analyserRef.current.getByteTimeDomainData(analyserDataRef.current);
          let sumSquares = 0;

          for (let index = 0; index < analyserDataRef.current.length; index += 1) {
            const value = (analyserDataRef.current[index] - 128) / 128;
            sumSquares += value * value;
          }

          const rms = Math.sqrt(sumSquares / analyserDataRef.current.length);
          const now = Date.now();

          if (rms < VOICE_SILENCE_THRESHOLD) {
            if (!silenceStartedAtRef.current) {
              silenceStartedAtRef.current = now;
            }

            if (now - silenceStartedAtRef.current >= VOICE_SILENCE_MS) {
              autoStoppedBySilenceRef.current = true;
              if (recorder.state !== "inactive") {
                recorder.stop();
              }
              setVoiceActive(false);
            }
          } else {
            silenceStartedAtRef.current = null;
          }
        }, VOICE_MONITOR_INTERVAL_MS);
      } catch {
        // no-op: recording still works without silence auto-stop
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      stopMediaStreamTracks();
      clearVoiceSilenceMonitor();
    };
  }, [clearVoiceSilenceMonitor, stopMediaStreamTracks]);

  const updateSession = useCallback((sessionId, updater) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        return updater(session);
      }),
    );
  }, []);

  const showErrorToast = useCallback((message, retryPayload = null) => {
    setLastRetryPayload(retryPayload);
    setToast({ id: createId("toast"), message: text(message) || "Something went wrong." });
  }, []);

  const handleSelectCharacter = useCallback((character) => {
    const nextCharacterId = normalizeCharacterId(character?.id, characterOptions);
    const targetId = activeSession?.id;
    if (!targetId) return;
    const conversationId = text(activeSession?.backendConversationId || activeSession?.id);
    if (character?.access === "pro" && membershipPlan !== "pro") {
      showErrorToast(`${character.name} is available on Luna Pro only.`);
      return;
    }

    updateSession(targetId, (session) => ({
      ...session,
      characterId: nextCharacterId,
      updatedAt: nowIso(),
    }));

    if (isSignedIn && conversationId) {
      fetchApi(
        `/api/history/${conversationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ characterId: nextCharacterId }),
        },
        { includeAuth: true, includeGuest: false },
      ).catch(() => null);
    }
  }, [activeSession?.backendConversationId, activeSession?.id, characterOptions, isSignedIn, membershipPlan, showErrorToast, updateSession]);

  const loadConversationMessages = useCallback(
    async (sessionId, conversationId) => {
      const session = sessions.find((item) => item.id === sessionId);
      const targetId = text(conversationId || session?.backendConversationId || session?.id);
      if (!targetId) return;

      if (loadedConversationIdsRef.current.has(targetId) && session?.messages?.length) {
        return;
      }

      const result = await fetchApi(
        `/api/history/${targetId}`,
        {},
        { includeAuth: true, includeGuest: false },
      );

      if (!result.ok) {
        showErrorToast(result.message || "Unable to load this chat.");
        return;
      }

      const conversation = result.data?.conversation;
      if (!conversation) return;

      const messages = mapConversationMessages(conversation);
      loadedConversationIdsRef.current.add(targetId);

      updateSession(sessionId, (current) => ({
        ...current,
        title: text(conversation?.title) || current.title,
        messages,
        updatedAt: text(conversation?.updatedAt) || current.updatedAt,
        characterId: normalizeCharacterId(conversation?.characterId || current.characterId),
        backendConversationId: text(conversation?.id) || current.backendConversationId,
      }));
    },
    [sessions, showErrorToast, updateSession],
  );

  useEffect(() => {
    if (!activeSession && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSession, sessions]);

  useEffect(() => {
    if (!activeSession?.id) return;
    const conversationId = text(activeSession.backendConversationId || activeSession.id);
    if (conversationId) {
      loadConversationMessages(activeSession.id, conversationId);
    }
  }, [activeSession?.id, activeSession?.backendConversationId, loadConversationMessages]);

  useEffect(() => {
    const syncUser = () => {
      hydrateUser()
        .then(() => setUser(loadUser()))
        .catch(() => setUser(loadUser()));
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("luna-auth-changed", syncUser);
    window.addEventListener("focus", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("luna-auth-changed", syncUser);
      window.removeEventListener("focus", syncUser);
    };
  }, []);

  useEffect(() => {
    historyLoadedRef.current = false;
  }, [user?.email]);

  useEffect(() => {
    let canceled = false;

    const loadMembership = async () => {
      if (!isSignedIn) {
        if (!canceled) {
          setMembershipPlan("free");
          setResearchMode(false);
        }
        return;
      }

      const result = await fetchApi("/api/profile");
      if (canceled) return;
      const plan = result.ok && result.data?.membership?.plan === "pro" ? "pro" : "free";
      setMembershipPlan(plan);
      if (plan !== "pro") {
        setResearchMode(false);
      }
    };

    loadMembership();
    return () => {
      canceled = true;
    };
  }, [isSignedIn, user?.email]);

  useEffect(() => {
    let canceled = false;

    const loadOnboardingStatus = async () => {
      if (typeof window === "undefined") return;
      const isGuest = !user?.email || user.email === "guest@luna.ai";
      if (isGuest) {
        if (!canceled) setOnboardingState({ loading: false, answered: true });
        return;
      }

      setOnboardingState((prev) => ({ ...prev, loading: true }));
      const result = await fetchApi("/api/onboarding/status");
      if (canceled) return;
      if (result.ok) {
        setOnboardingState({ loading: false, answered: Boolean(result.data?.answered) });
      } else {
        setOnboardingState({ loading: false, answered: false });
      }
    };

    loadOnboardingStatus();
    return () => {
      canceled = true;
    };
  }, [user?.email]);

  useEffect(() => {
    if (listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [activeMessages, isTyping]);

  useEffect(() => {
    let timer;
    if (toast) {
      timer = setTimeout(() => setToast(null), 6000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    if (!isTyping) return undefined;
    const timer = window.setTimeout(() => setIsTyping(false), 20000);
    return () => clearTimeout(timer);
  }, [isTyping]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (!document.getElementById("luna-fonts-link")) {
      const link = document.createElement("link");
      link.id = "luna-fonts-link";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@500;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const shouldLock = mobileSidebarOpen || newProjectOpen;
    const previousOverflow = document.body.style.overflow;
    if (shouldLock) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSidebarOpen, newProjectOpen]);

  useEffect(() => {
    let canceled = false;

    const loadServerHistory = async () => {
      if (!isSignedIn) {
        historyLoadedRef.current = false;
        return;
      }
      if (historyLoadedRef.current) return;

      historyLoadedRef.current = true;
      setHistoryLoading(true);
      loadedConversationIdsRef.current = new Set();

      const result = await fetchApi(
        "/api/history",
        {},
        { includeAuth: true, includeGuest: false },
      );

      if (canceled) return;

      if (!result.ok) {
        setHistoryLoading(false);
        showErrorToast(result.message || "Unable to load chat history.");
        return;
      }

      const conversations = Array.isArray(result.data?.conversations)
        ? result.data.conversations
        : [];
      const baseProjectId = projects[0]?.id || defaultProjects[0]?.id || "";

      if (conversations.length === 0) {
        const next = createSession(baseProjectId);
        setSessions([next]);
        setActiveSessionId(next.id);
        setHistoryLoading(false);
        return;
      }

      const preferredId = conversations[0]?.id;

      let preferredConversation = null;
      if (preferredId) {
        const detail = await fetchApi(
          `/api/history/${preferredId}`,
          {},
          { includeAuth: true, includeGuest: false },
        );
        if (detail.ok) {
          preferredConversation = detail.data?.conversation || null;
          if (preferredConversation?.id) {
            loadedConversationIdsRef.current.add(preferredConversation.id);
          }
        }
      }

      const nextSessions = conversations.map((summary) => {
        const session = mapConversationSummaryToSession(summary, baseProjectId);
        if (summary.id === preferredConversation?.id) {
          return {
            ...session,
            messages: mapConversationMessages(preferredConversation),
          };
        }
        return session;
      });

      setSessions(nextSessions);
      setActiveSessionId(preferredId || nextSessions[0]?.id || "");
      setHistoryLoading(false);
    };

    loadServerHistory();
    return () => {
      canceled = true;
    };
  }, [defaultProjects, isSignedIn, projects, showErrorToast, user?.email]);

  useEffect(() => {
    let canceled = false;

    const loadCharacters = async () => {
      if (!isSignedIn) {
        setCharacterOptions(CHARACTER_OPTIONS);
        return;
      }

      const result = await fetchApi("/api/characters", {}, { includeAuth: true, includeGuest: false });
      if (canceled || !result.ok) return;

      setCharacterOptions(hydrateCharacterOptions(result.data?.characters));
      setMembershipPlan(result.data?.membership?.plan === "pro" ? "pro" : "free");
    };

    loadCharacters();
    return () => {
      canceled = true;
    };
  }, [isSignedIn]);

  const createFreshSession = useCallback(
    (projectId = "") => {
      const next = createSession(
        projectId || expandedProjectId || projects[0]?.id || "",
        activeSession?.characterId || CHARACTER_OPTIONS[0].id,
      );
      setSessions((prev) => [next, ...prev]);
      setActiveSessionId(next.id);
      setInputValue("");
      setAttachments([]);
      setIsTyping(false);
      if (isSignedIn) {
        fetchApi(
          "/api/history",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New chat", characterId: next.characterId }),
          },
          { includeAuth: true, includeGuest: false },
        ).then((result) => {
          if (result.ok && result.data?.conversation?.id) {
            const conversationId = text(result.data.conversation.id);
            loadedConversationIdsRef.current.add(conversationId);
            setSessions((prev) =>
              prev.map((session) =>
                session.id === next.id
                  ? {
                      ...session,
                      id: conversationId,
                      backendConversationId: conversationId,
                      title: text(result.data.conversation.title) || session.title,
                      createdAt: text(result.data.conversation.createdAt) || session.createdAt,
                      updatedAt: text(result.data.conversation.updatedAt) || session.updatedAt,
                      characterId: normalizeCharacterId(result.data.conversation.characterId || session.characterId),
                    }
                  : session,
              ),
            );
            setActiveSessionId(conversationId);
          }
        });
      }
      return next;
    },
    [activeSession?.characterId, expandedProjectId, isSignedIn, projects],
  );

  const handleDeleteSession = useCallback(
    (sessionId) => {
      const target = sessions.find((item) => item.id === sessionId);
      const conversationId = text(target?.backendConversationId || target?.id);
      if (conversationId && isSignedIn) {
        fetchApi(`/api/history/${conversationId}`, { method: "DELETE" }, { includeAuth: true, includeGuest: false }).catch(() => null);
      }
      if (conversationId) {
        loadedConversationIdsRef.current.delete(conversationId);
      }

      setSessions((prev) => prev.filter((item) => item.id !== sessionId));

      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((item) => item.id !== sessionId);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          const next = createSession(projects[0]?.id || "", activeSession?.characterId || CHARACTER_OPTIONS[0].id);
          setSessions([next]);
          setActiveSessionId(next.id);
        }
      }
    },
    [activeSession?.characterId, activeSessionId, isSignedIn, projects, sessions],
  );

  const buildPromptPayload = useCallback(
    (prompt, options = { applyToggles: true }) => {
      const clean = text(prompt);
      if (!clean) return "";

      if (!options.applyToggles) return clean;

      const context = [];
      if (webSearchMode) context.push("Web search mode is ON. Prefer current, verifiable information.");
      if (researchMode) context.push("Research mode is ON. Prioritize source-backed findings, recent context, and explicit evidence.");
      if (imageMode) context.push("Image mode is ON. If relevant, provide image generation style prompt details.");
      if (attachments.length > 0) context.push(`Attached files: ${attachments.join(", ")}`);

      if (context.length === 0) return clean;

      return `${clean}\n\nContext:\n- ${context.join("\n- ")}`;
    },
    [attachments, imageMode, researchMode, webSearchMode],
  );
  const requestLuna = useCallback(
    async (session, prompt, options = { applyToggles: true }) => {
      let conversationId = text(session?.backendConversationId || session?.id);
      if (!conversationId && isSignedIn) {
        const created = await fetchApi(
          "/api/history",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New chat", characterId: session?.characterId || CHARACTER_OPTIONS[0].id }),
          },
          { includeAuth: true, includeGuest: false },
        );
        if (created.ok && created.data?.conversation?.id) {
          conversationId = text(created.data.conversation.id);
          setSessions((prev) =>
            prev.map((item) =>
              item.id === session.id
                ? {
                    ...item,
                    id: conversationId,
                    backendConversationId: conversationId,
                    title: text(created.data.conversation.title) || item.title,
                    createdAt: text(created.data.conversation.createdAt) || item.createdAt,
                    updatedAt: text(created.data.conversation.updatedAt) || item.updatedAt,
                    characterId: normalizeCharacterId(created.data.conversation.characterId || item.characterId),
                  }
                : item,
            ),
          );
          setActiveSessionId(conversationId);
        }
      }

      const payloadPrompt = buildPromptPayload(prompt, options);
      const result = await fetchApi("/api/luna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: payloadPrompt,
          conversationId,
          llm: selectedModel,
          characterId: session?.characterId || CHARACTER_OPTIONS[0].id,
          webSearchMode,
          researchMode,
        }),
      });

      if (!result.ok) {
        throw new Error(result.message || result.data?.error || "Failed to fetch response.");
      }

      return {
        reply: text(result.data?.reply) || "I could not generate a reply. Please retry.",
        llm: text(result.data?.llm),
        conversationId: text(result.data?.conversationId),
        membershipPlan: result.data?.membership?.plan === "pro" ? "pro" : "free",
        warning: text(result.data?.warning),
        sources: Array.isArray(result.data?.sources) ? result.data.sources : [],
      };
    },
    [buildPromptPayload, isSignedIn, researchMode, selectedModel, webSearchMode],
  );

  const requestLunaStream = useCallback(
    async (session, prompt, handlers = {}, options = { applyToggles: true }) => {
      let conversationId = text(session?.backendConversationId || session?.id);
      if (!conversationId && isSignedIn) {
        const created = await fetchApi(
          "/api/history",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New chat", characterId: session?.characterId || CHARACTER_OPTIONS[0].id }),
          },
          { includeAuth: true, includeGuest: false },
        );
        if (created.ok && created.data?.conversation?.id) {
          conversationId = text(created.data.conversation.id);
          setSessions((prev) =>
            prev.map((item) =>
              item.id === session.id
                ? {
                    ...item,
                    id: conversationId,
                    backendConversationId: conversationId,
                    title: text(created.data.conversation.title) || item.title,
                    createdAt: text(created.data.conversation.createdAt) || item.createdAt,
                    updatedAt: text(created.data.conversation.updatedAt) || item.updatedAt,
                    characterId: normalizeCharacterId(created.data.conversation.characterId || item.characterId),
                  }
                : item,
            ),
          );
          setActiveSessionId(conversationId);
        }
      }

      const payloadPrompt = buildPromptPayload(prompt, options);
      return streamApi(
        "/api/luna/stream",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: payloadPrompt,
            conversationId,
            llm: selectedModel,
            characterId: session?.characterId || CHARACTER_OPTIONS[0].id,
            webSearchMode,
            researchMode,
          }),
          signal: handlers.signal,
        },
        handlers,
      );
    },
    [buildPromptPayload, isSignedIn, researchMode, selectedModel, webSearchMode],
  );
  const sendMessage = useCallback(
    async (manualPrompt, options = { regenerate: false, applyToggles: true, sessionId: "" }) => {
      const basePrompt = text(manualPrompt ?? inputValue);
      if (!basePrompt || isTyping || isTranscribing) return;

      const sessionId = options.sessionId || activeSession?.id;
      const target = sessions.find((item) => item.id === sessionId) || activeSession;
      if (!target) return;

      setToast(null);

      if (!options.regenerate) {
        const userMessage = {
          id: createId("user"),
          role: "user",
          content: basePrompt,
          createdAt: nowIso(),
          llm: "",
        };

        updateSession(target.id, (session) => {
          const nextMessages = [...session.messages, userMessage];
          const title = session.title === "New chat"
            ? shortTitle(basePrompt, "New chat")
            : session.title;

          return {
            ...session,
            title,
            messages: nextMessages,
            updatedAt: nowIso(),
          };
        });

        setInputValue("");
        setAttachments([]);
      }

      setIsTyping(true);

      let assistantId = "";
      let assistantAdded = false;
      let streamedText = "";
      let pendingChunkBuffer = "";
      let flushFrameId = 0;
      const ensureAssistant = (initialContent = "") => {
        if (assistantAdded) return;
        assistantId = createId("assistant");
        assistantAdded = true;
        updateSession(target.id, (session) => ({
          ...session,
          messages: [
            ...session.messages,
            {
              id: assistantId,
              role: "assistant",
              content: initialContent,
              createdAt: nowIso(),
              llm: "",
            },
          ],
          updatedAt: nowIso(),
        }));
      };

      const flushPendingChunks = () => {
        flushFrameId = 0;
        if (!pendingChunkBuffer || !assistantId) return;

        const chunk = pendingChunkBuffer;
        pendingChunkBuffer = "";
        updateSession(target.id, (session) => ({
          ...session,
          messages: session.messages.map((msg) =>
            msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg,
          ),
          updatedAt: nowIso(),
        }));
      };

      const scheduleChunkFlush = () => {
        if (flushFrameId || typeof window === "undefined") return;
        flushFrameId = window.requestAnimationFrame(flushPendingChunks);
      };

      const applyChunk = (chunk) => {
        if (!chunk || !assistantId) return;
        pendingChunkBuffer += chunk;
        scheduleChunkFlush();
      };

      const appendChunk = (chunk) => {
        if (!chunk) return;
        streamedText += chunk;
        if (!assistantAdded) {
          ensureAssistant("");
          setIsTyping(false);
        }
        applyChunk(chunk);
      };

      let streamTimeout = null;

      try {
        if (!supportsStreaming) {
          const response = await requestLuna(target, basePrompt, { applyToggles: options.applyToggles });
          setMembershipPlan(response.membershipPlan === "pro" ? "pro" : "free");
          if (response.warning) {
            setToast({ id: createId("toast"), message: response.warning });
          }
          const assistantMessage = {
            id: createId("assistant"),
            role: "assistant",
            content: response.reply,
            createdAt: nowIso(),
            llm: response.llm,
            sources: Array.isArray(response.sources) ? response.sources : [],
          };

          updateSession(target.id, (session) => ({
            ...session,
            messages: [...session.messages, assistantMessage],
            backendConversationId: response.conversationId || session.backendConversationId,
            updatedAt: nowIso(),
          }));
          if (response.conversationId && target.id !== response.conversationId) {
            setSessions((prev) =>
              prev.map((session) =>
                session.id === target.id
                  ? { ...session, id: response.conversationId, backendConversationId: response.conversationId }
                  : session,
              ),
            );
            setActiveSessionId(response.conversationId);
          }
          return;
        }

        const abortController = new AbortController();
        streamAbortRef.current = abortController;
        streamTimeout = window.setTimeout(() => {
          abortController.abort();
        }, 12000);

        const streamResult = await requestLunaStream(
          target,
          basePrompt,
          {
            signal: abortController.signal,
            onToken: appendChunk,
            onDone: () => setIsTyping(false),
          },
          { applyToggles: options.applyToggles },
        );

        if (!streamResult.ok) {
          throw new Error(streamResult.message || streamResult.data?.error || "Streaming failed.");
        }

      const payload = streamResult.data || {};
      const finalReply = text(payload.reply) || streamedText || "I could not generate a reply. Please retry.";
      const llm = text(payload.llm);
      const payloadConversationId = text(payload.conversationId);
      const payloadSources = Array.isArray(payload.sources) ? payload.sources : [];
      const payloadPlan = payload.membership?.plan === "pro" ? "pro" : "free";
      setMembershipPlan(payloadPlan);
      if (payload.warning) {
        setToast({ id: createId("toast"), message: text(payload.warning) });
      }

        if (flushFrameId && typeof window !== "undefined") {
          window.cancelAnimationFrame(flushFrameId);
          flushPendingChunks();
        } else {
          flushPendingChunks();
        }

      if (!assistantAdded) {
        ensureAssistant(finalReply);
        updateSession(target.id, (session) => ({
          ...session,
          messages: session.messages.map((msg) =>
            msg.id === assistantId ? { ...msg, sources: payloadSources } : msg,
          ),
          backendConversationId: payloadConversationId || session.backendConversationId,
          updatedAt: nowIso(),
        }));
      } else if (finalReply && finalReply !== streamedText) {
        updateSession(target.id, (session) => ({
          ...session,
          messages: session.messages.map((msg) =>
            msg.id === assistantId ? { ...msg, content: finalReply, llm, sources: payloadSources } : msg,
          ),
          backendConversationId: payloadConversationId || session.backendConversationId,
          updatedAt: nowIso(),
        }));
      }

      updateSession(target.id, (session) => ({
        ...session,
        messages: session.messages.map((msg) => (
          msg.id === assistantId ? { ...msg, llm, sources: payloadSources } : msg
        )),
        backendConversationId: payloadConversationId || session.backendConversationId,
        updatedAt: nowIso(),
      }));

      if (payloadConversationId && target.id !== payloadConversationId) {
        setSessions((prev) =>
          prev.map((session) =>
            session.id === target.id
              ? { ...session, id: payloadConversationId, backendConversationId: payloadConversationId }
              : session,
          ),
        );
        setActiveSessionId(payloadConversationId);
      }
      } catch (error) {
        if (!streamedText) {
          try {
            const response = await requestLuna(target, basePrompt, { applyToggles: options.applyToggles });
            setMembershipPlan(response.membershipPlan === "pro" ? "pro" : "free");
            if (response.warning) {
              setToast({ id: createId("toast"), message: response.warning });
            }
            const assistantMessage = {
              id: createId("assistant"),
              role: "assistant",
              content: response.reply,
              createdAt: nowIso(),
              llm: response.llm,
              sources: Array.isArray(response.sources) ? response.sources : [],
            };

          updateSession(target.id, (session) => ({
            ...session,
            messages: [...session.messages, assistantMessage],
            backendConversationId: response.conversationId || session.backendConversationId,
            updatedAt: nowIso(),
          }));
          if (response.conversationId && target.id !== response.conversationId) {
            setSessions((prev) =>
              prev.map((session) =>
                session.id === target.id
                  ? { ...session, id: response.conversationId, backendConversationId: response.conversationId }
                  : session,
              ),
            );
            setActiveSessionId(response.conversationId);
          }
          return;
        } catch (fallbackError) {
            showErrorToast(fallbackError.message || "Luna request failed.", {
              type: options.regenerate ? "regenerate" : "send",
              prompt: basePrompt,
              sessionId: target.id,
            });
          }
        } else {
          showErrorToast(error.message || "Stream failed.", {
            type: options.regenerate ? "regenerate" : "send",
            prompt: basePrompt,
            sessionId: target.id,
          });
        }
      } finally {
        if (flushFrameId && typeof window !== "undefined") {
          window.cancelAnimationFrame(flushFrameId);
        }
        flushPendingChunks();
        if (streamTimeout) {
          clearTimeout(streamTimeout);
        }
        streamAbortRef.current = null;
        setIsTyping(false);
      }
    },
    [
      activeSession,
      inputValue,
      isTranscribing,
      isTyping,
      requestLuna,
      requestLunaStream,
      sessions,
      showErrorToast,
      supportsStreaming,
      updateSession,
    ],
  );

  const showTyping = useMemo(() => {
    if (!isTyping) return false;
    const lastMessage = activeMessages[activeMessages.length - 1];
    if (!lastMessage) return true;
    if (lastMessage.role !== "assistant") return true;
    return !text(lastMessage.content);
  }, [activeMessages, isTyping]);

  const regenerateLatest = useCallback(async () => {
    const session = activeSession;
    if (!session || session.messages.length === 0 || isTyping) return;

    let assistantIndex = -1;
    for (let i = session.messages.length - 1; i >= 0; i -= 1) {
      if (session.messages[i].role === "assistant") {
        assistantIndex = i;
        break;
      }
    }

    if (assistantIndex < 0) return;

    let userPrompt = "";
    for (let i = assistantIndex - 1; i >= 0; i -= 1) {
      if (session.messages[i].role === "user") {
        userPrompt = session.messages[i].content;
        break;
      }
    }

    if (!userPrompt) return;

    updateSession(session.id, (draft) => ({
      ...draft,
      messages: draft.messages.filter((item) => item.id !== session.messages[assistantIndex].id),
      updatedAt: nowIso(),
    }));

    await sendMessage(userPrompt, {
      regenerate: true,
      applyToggles: false,
      sessionId: session.id,
    });
  }, [activeSession, isTyping, sendMessage, updateSession]);

  const copyMessage = useCallback(async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      setToast({ id: createId("toast"), message: "Copied to clipboard." });
    } catch {
      showErrorToast("Copy failed.");
    }
  }, [showErrorToast]);

  const handleRetry = useCallback(async () => {
    if (!lastRetryPayload) return;

    setToast(null);

    if (lastRetryPayload.type === "regenerate") {
      await sendMessage(lastRetryPayload.prompt, {
        regenerate: true,
        applyToggles: false,
        sessionId: lastRetryPayload.sessionId,
      });
      return;
    }

    await sendMessage(lastRetryPayload.prompt, {
      regenerate: false,
      applyToggles: true,
      sessionId: lastRetryPayload.sessionId,
    });
  }, [lastRetryPayload, sendMessage]);

  const handleToggleResearchMode = useCallback(() => {
    if (membershipPlan !== "pro") {
      showErrorToast("Research mode is available on Luna Pro only.");
      return;
    }
    setResearchMode((prev) => !prev);
  }, [membershipPlan, showErrorToast]);

  const handleExportSession = useCallback(() => {
    if (membershipPlan !== "pro") {
      showErrorToast("Chat export is available on Luna Pro only.");
      return;
    }
    if (!activeSession || activeMessages.length === 0 || typeof window === "undefined") {
      showErrorToast("There is no chat to export yet.");
      return;
    }

    const markdown = exportSessionToMarkdown(activeSession);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeTitle = (text(activeSession.title) || "luna-chat").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    anchor.href = url;
    anchor.download = `${safeTitle || "luna-chat"}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    setToast({ id: createId("toast"), message: "Chat exported to Markdown." });
  }, [activeMessages.length, activeSession, membershipPlan, showErrorToast]);

  const handleVoiceToggle = useCallback(async () => {
    if (isTranscribing || isTyping) return;

    if (voiceActive) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      autoStoppedBySilenceRef.current = false;
      clearVoiceSilenceMonitor();
      setVoiceActive(false);
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      showErrorToast("Microphone is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      autoStoppedBySilenceRef.current = false;

      const preferredType =
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported &&
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "";

      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setVoiceActive(false);
        clearVoiceSilenceMonitor();
        stopMediaStreamTracks();
        showErrorToast("Voice capture failed.");
      };

      recorder.onstop = async () => {
        setVoiceActive(false);
        clearVoiceSilenceMonitor();

        const blobType = preferredType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        audioChunksRef.current = [];
        stopMediaStreamTracks();

        if (!audioBlob || audioBlob.size < 128) {
          showErrorToast("Voice input was too short.");
          autoStoppedBySilenceRef.current = false;
          return;
        }

        setIsTranscribing(true);

        try {
          const audioBase64 = await toBase64DataUrl(audioBlob);
          const result = await fetchApi("/api/audio/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64,
              mimeType: blobType,
              fileName: `luna-audio-${Date.now()}.webm`
            }),
          });

          if (!result.ok) {
            throw new Error(result.message || "Transcription failed.");
          }

          const transcript = text(result.data?.text);
          if (!transcript) {
            throw new Error("No speech detected.");
          }

          setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
        } catch (error) {
          showErrorToast(error.message || "Could not transcribe audio.");
        } finally {
          setIsTranscribing(false);
          autoStoppedBySilenceRef.current = false;
        }
      };

      recorder.start();
      beginVoiceSilenceMonitor(stream, recorder);
      setVoiceActive(true);
    } catch (error) {
      showErrorToast(error.message || "Unable to access microphone.");
      clearVoiceSilenceMonitor();
      stopMediaStreamTracks();
      setVoiceActive(false);
    }
  }, [
    beginVoiceSilenceMonitor,
    clearVoiceSilenceMonitor,
    isTranscribing,
    isTyping,
    showErrorToast,
    stopMediaStreamTracks,
    voiceActive,
  ]);

  const handleCreateProject = useCallback(() => {
    const name = text(newProjectName);
    if (!name) return;

    const project = {
      id: createId("project"),
      name,
      createdAt: nowIso(),
    };

    setProjects((prev) => [project, ...prev]);
    setExpandedProjectId(project.id);
    setNewProjectName("");
    setNewProjectOpen(false);
  }, [newProjectName]);

  const handleSelectSession = useCallback(
    (sessionId) => {
      setActiveSessionId(sessionId);
      setMobileSidebarOpen(false);
      const target = sessions.find((item) => item.id === sessionId);
      const conversationId = text(target?.backendConversationId || target?.id);
      if (conversationId) {
        loadConversationMessages(sessionId, conversationId);
      }
    },
    [loadConversationMessages, sessions],
  );

  const visibleMain = activeMessages.length > 0 || historyLoading;
  const modePills = useMemo(() => {
    const pills = [];
    pills.push(activeCharacter.name);
    pills.push(webSearchMode ? "Live web on" : "Live web off");
    pills.push(researchMode ? "Pro research" : membershipPlan === "pro" ? "Pro ready" : "Free plan");
    pills.push(imageMode ? "Image drafting" : "Text drafting");
    if (attachments.length) pills.push(`${attachments.length} file${attachments.length > 1 ? "s" : ""} attached`);
    return pills;
  }, [activeCharacter.name, attachments.length, imageMode, membershipPlan, researchMode, webSearchMode]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#071013] text-zinc-100">
        <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-12">
          <div className="w-full rounded-[32px] border border-[#1f3135] bg-[linear-gradient(180deg,rgba(9,16,19,0.96),rgba(7,12,14,0.98))] p-8 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#5c857d]/30 bg-[#143038]">
              <img src={brandLogo} alt="Luna Logo" className="h-10 w-10 object-contain" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-white">Sign in to access the Luna workspace</h1>
            <p className="mt-2 text-sm text-[#8ca19d]">
              Luna now uses a persistent workspace layout with saved history, project grouping, and onboarding preferences.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => navigate("/signin")}
                className="rounded-full bg-[linear-gradient(135deg,#e1ba6d,#a77f36)] px-6 py-2 text-sm font-semibold text-[#102126] hover:brightness-105"
              >
                Go to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative min-h-[100dvh] overflow-hidden bg-[#071013] text-[#eef6f3]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        .luna-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #21353a transparent;
        }
        .luna-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .luna-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .luna-scrollbar::-webkit-scrollbar-thumb {
          background: #21353a;
          border-radius: 999px;
        }
        @keyframes lunaDot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        .luna-dot { animation: lunaDot 1s ease-in-out infinite; }
        @keyframes lunaWave {
          0%, 100% { transform: scaleY(0.65); opacity: 0.7; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        .luna-wave { animation: lunaWave 0.8s ease-in-out infinite; transform-origin: bottom; }
        @keyframes lunaFadeLift {
          0% { opacity: 0; transform: translateY(12px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lunaPanelFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .luna-fade-lift { animation: lunaFadeLift 0.42s cubic-bezier(0.22, 1, 0.36, 1); }
        .luna-panel-float { animation: lunaPanelFloat 5.6s ease-in-out infinite; }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(71,120,112,0.25),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(225,186,109,0.12),transparent_24%),radial-gradient(circle_at_50%_45%,rgba(18,47,51,0.65),transparent_58%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(rgba(135,160,155,0.24) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="relative z-10 flex min-h-[100dvh]">
        <aside
          className={`hidden h-full flex-col overflow-hidden border-r border-white/6 bg-[linear-gradient(180deg,rgba(7,14,16,0.98),rgba(10,20,23,0.96))] shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)] transition-[width] duration-300 md:flex ${
            isSidebarOpen ? "w-[260px]" : "w-[82px]"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-white/6 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className={`flex items-center gap-2 ${isSidebarOpen ? "" : "justify-center w-full"}`}>
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 0 rgba(255,255,255,0.08)",
                        "0 0 18px rgba(255,255,255,0.25)",
                        "0 0 0 rgba(255,255,255,0.08)",
                      ],
                    }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                    className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#0f2124]"
                  >
                    <img src={brandLogo} alt="Luna logo" className="h-full w-full object-cover rounded-[inherit] drop-shadow-[0_0_8px_rgba(255,255,255,0.45)]" />
                  </motion.div>
                  {isSidebarOpen ? (
                    <h1 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
                      Luna
                    </h1>
                  ) : null}
                </div>

                {isSidebarOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="rounded-xl border border-[#274149] bg-[#0f1f24] p-1.5 text-[#cbe0dc] transition duration-300 hover:-translate-y-0.5 hover:border-[#4f7c75]"
                    title="Collapse"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(true)}
                    className="mx-auto rounded-xl border border-[#274149] bg-[#0f1f24] p-1.5 text-[#cbe0dc] transition duration-300 hover:-translate-y-0.5 hover:border-[#4f7c75]"
                    title="Expand"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                )}
              </div>

              {isSidebarOpen ? (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8682]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search chats..."
                    className="w-full rounded-2xl border border-[#1f3135] bg-[#0c1719] py-2 pl-9 pr-3 text-sm text-[#e7f0ee] outline-none transition focus:border-[#4f7c75] focus:shadow-[0_0_0_2px_rgba(79,124,117,0.2)]"
                  />
                </div>
              ) : null}
            </div>

            <div className="luna-scrollbar flex-1 overflow-y-auto px-3 py-3">
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: {
                    transition: { staggerChildren: 0.04 },
                  },
                }}
                className="space-y-2"
              >
                <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                  <SidebarButton icon={Home} label="Home" collapsed={!isSidebarOpen} onClick={() => navigate("/")} />
                </motion.div>

                <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                  <SidebarButton icon={PenSquare} label="New Chat" collapsed={!isSidebarOpen} onClick={() => createFreshSession()} />
                </motion.div>

                <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                  <SidebarButton icon={Settings} label="Settings" collapsed={!isSidebarOpen} onClick={() => navigate("/profile")} />
                </motion.div>
              </motion.div>

              {isSidebarOpen ? (
                <>
<div className="mb-2 mt-5 px-1 text-[11px] uppercase tracking-[0.14em] text-[#6f8682]">Recent Chats</div>
                  <div className="luna-scrollbar max-h-[220px] space-y-1 overflow-y-auto pr-1">
                    {historyList.length === 0 ? (
                      <p className="px-2 py-2 text-xs text-[#7a938e]">No chats found.</p>
                    ) : null}

                    {historyList.map((session) => {
                      const active = session.id === activeSession?.id;

                      return (
                        <div
                          key={session.id}
                          className={`group relative rounded-xl border px-2.5 py-2 transition ${
                            active
                              ? "border-[#4f7c75] bg-[#102126]"
                              : "border-transparent bg-[#0c1719] hover:border-[#274149]"
                          }`}
                        >
                          {active ? (
                            <motion.span
                              layoutId="luna-active-session"
                              className="absolute left-0 top-1/2 h-[70%] w-[3px] -translate-y-1/2 rounded-r-full bg-[#e1ba6d]"
                            />
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleSelectSession(session.id)}
                            className="w-full text-left"
                          >
                            <p className="truncate pr-6 text-sm text-[#ecf5f3]">{session.title}</p>
                            <p className="text-[11px] text-[#7a938e]">{formatHistoryTime(session.updatedAt)}</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSession(session.id)}
                            className="absolute right-1.5 top-1.5 rounded-md p-1 text-[#9ab7b1] opacity-0 transition group-hover:opacity-100 hover:bg-[#102126]"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>

            <div className="border-t border-white/6 p-3">
              {isSidebarOpen ? (
                <>
                  <div className="flex items-center gap-2 rounded-2xl border border-[#1f3135] bg-[#0c1719]/95 px-2 py-2">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#102126] text-[#d5ebe6]">
                        <UserCircle2 className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[#f0f6f5]">{user.name}</p>
                      <p className="truncate text-xs text-[#7a938e]">{user.email}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex justify-center">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#102126] text-[#d5ebe6]">
                      <UserCircle2 className="h-5 w-5" />
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        <AnimatePresence>
          {mobileSidebarOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              >
              <motion.div
                initial={{ x: -22, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -22, opacity: 0 }}
                className="h-full w-[90vw] max-w-[340px] border-r border-white/6 bg-[linear-gradient(180deg,rgba(7,14,16,0.98),rgba(10,20,23,0.96))]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex h-14 items-center justify-between border-b border-white/6 px-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#0f2124]">
                      <img src={brandLogo} alt="Luna logo" className="h-full w-full object-cover rounded-[inherit]" />
                    </span>
                    <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="text-lg">Luna</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="rounded-xl border border-[#274149] bg-[#0f1f24] p-1.5 transition duration-300 hover:-translate-y-0.5 hover:border-[#4f7c75]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="luna-scrollbar h-[calc(100%-56px)] overflow-y-auto p-3">
                  <div className="relative mb-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8682]" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search chats..."
                      className="w-full rounded-2xl border border-[#1f3135] bg-[#0c1719] py-2 pl-9 pr-3 text-sm text-[#e7f0ee] outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <SidebarButton icon={Home} label="Home" onClick={() => { navigate("/"); setMobileSidebarOpen(false); }} />
                    <SidebarButton icon={PenSquare} label="New Chat" onClick={() => { createFreshSession(); setMobileSidebarOpen(false); }} />
                    <SidebarButton icon={Settings} label="Settings" onClick={() => { navigate("/profile"); setMobileSidebarOpen(false); }} />
                  </div>

                  <div className="mb-2 mt-5 text-[11px] uppercase tracking-[0.14em] text-[#6f8682]">Recent Chats</div>
                  <div className="space-y-1">
                    {historyList.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => handleSelectSession(session.id)}
                        className={`block w-full rounded-lg px-2 py-2 text-left text-sm ${
                          session.id === activeSession?.id
                            ? "bg-[#102126] text-[#ecf5f3]"
                            : "bg-[#0c1719] text-[#d5e6e3]"
                        }`}
                      >
                        <p className="truncate">{session.title}</p>
                        <p className="text-[11px] text-[#7a938e]">{formatHistoryTime(session.updatedAt)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <section className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-white/6 px-3 py-3 md:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#274149] bg-[#0f1f24] text-[#d2e7e2] transition duration-300 hover:-translate-y-0.5 hover:border-[#4f7c75] hover:bg-[#102126]"
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#7a938e]">Luna Workspace</p>
                <h1 className="truncate text-base font-semibold text-[#f4f8f7]" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {activeSession?.title || "New chat"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => createFreshSession()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#274149] bg-[#0f1f24] text-[#d2e7e2] transition duration-300 hover:-translate-y-0.5 hover:border-[#4f7c75] hover:bg-[#102126]"
                aria-label="Start a new chat"
              >
                <Plus className="h-4 w-4" />
              </button>
              <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} />
            </div>
          </div>

          <div className="px-3 pt-3 md:px-6 md:pt-4">
            <AnnouncementBanner className="mb-3" />
          </div>
          <div className="hidden items-center justify-between px-3 md:flex md:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#78938d]">Workspace briefing</p>
                <h1 className="truncate text-2xl font-semibold text-[#f5f8f7]" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {activeSession?.title || "New chat"}
                </h1>
              </div>
              <div className="hidden lg:flex items-center gap-2">
                {modePills.map((pill) => (
                  <span key={pill} className="rounded-full border border-[#274149] bg-[#0f1f24] px-3 py-1 text-xs text-[#d0e2de] transition duration-300 hover:-translate-y-0.5 hover:border-[#4f7c75] hover:bg-[#102126]">
                    {pill}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-[#274149] bg-[#0f1f24] px-3 py-1.5 text-xs text-[#8fb0aa]">
                {formatDateLabel()}
              </div>
              <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} />
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden px-3 pb-3 pt-2 md:px-6">
            {!onboardingState.loading && !onboardingState.answered ? (
              <div className="mb-6 flex justify-center">
                <OnboardingFlow onComplete={() => setOnboardingState({ loading: false, answered: true })} />
              </div>
            ) : null}
            <AnimatePresence mode="wait">
              {!visibleMain ? (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                  className="flex h-full flex-col items-center justify-center py-6 md:py-10"
                >
                  <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center xl:max-w-6xl">
                    <div className="luna-fade-lift w-full rounded-[36px] border border-[#1f3135] bg-[linear-gradient(180deg,rgba(9,16,19,0.92),rgba(7,12,14,0.98))] px-5 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.24)] md:px-10 md:py-12 xl:px-12">
                      <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="mb-3 text-center text-[11px] uppercase tracking-[0.26em] text-[#88a7a1]"
                      >
                        Luna Chat
                      </motion.p>
                      <motion.h2
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", duration: 0.7 }}
                        className="mx-auto mb-3 max-w-[18ch] text-center text-[2rem] font-semibold leading-tight text-[#f5f8f7] sm:text-[2.4rem] md:text-[3rem]"
                        style={{ fontFamily: "'Syne', sans-serif" }}
                      >
                        Hi {user?.name ? user.name.split(" ")[0] : "there"}, what should {activeCharacter.name} help you with?
                      </motion.h2>
                      <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-7 text-[#90a7a2] md:text-base">
                        Ask for research, writing, debugging, strategy, summaries, or image prompts. The composer stays centered so you can get straight to work.
                      </p>
                      <div className="mb-6">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.22em] text-[#88a7a1]">Character Mode</p>
                            <p className="mt-1 text-sm text-[#9ab3ae]">Pick who users talk to before the thread starts.</p>
                          </div>
                          <span className="rounded-full border border-[#274149] bg-[#102126] px-3 py-1 text-xs text-[#d7e8e5]">
                            Active: {activeCharacter.name}
                          </span>
                        </div>
                        <div className="mb-3">
                          <input
                            value={characterSearchQuery}
                            onChange={(event) => setCharacterSearchQuery(event.target.value)}
                            placeholder="Search character board..."
                            className="w-full rounded-2xl border border-[#274149] bg-[#0c1719] px-4 py-2.5 text-sm text-[#e7f0ee] outline-none placeholder:text-[#69807b]"
                          />
                        </div>
                        <CharacterCards
                          compact
                          options={filteredCharacterOptions}
                          selectedCharacterId={activeSession?.characterId}
                          onSelect={handleSelectCharacter}
                          isPro={membershipPlan === "pro"}
                        />
                      </div>
                      <Composer
                        compact
                        value={inputValue}
                        onChange={setInputValue}
                        onSend={() => sendMessage()}
                        disabled={isTranscribing}
                        sendDisabled={isTyping || isTranscribing}
                        voiceActive={voiceActive}
                        transcribing={isTranscribing}
                        onToggleVoice={handleVoiceToggle}
                        webSearch={webSearchMode}
                        researchMode={researchMode}
                        imageMode={imageMode}
                        onToggleWebSearch={() => setWebSearchMode((prev) => !prev)}
                        onToggleResearchMode={handleToggleResearchMode}
                        onToggleImageMode={() => setImageMode((prev) => !prev)}
                        onExport={handleExportSession}
                        onAttach={(files) => setAttachments((prev) => [...prev, ...files])}
                        attachments={attachments}
                        onRemoveAttachment={(index) => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                        isPro={membershipPlan === "pro"}
                      />

                      <motion.div
                        initial="hidden"
                        animate="show"
                        variants={{
                          hidden: {},
                          show: { transition: { staggerChildren: 0.05 } },
                        }}
                        className="luna-scrollbar mt-5 flex w-full flex-wrap justify-center gap-2 pb-1"
                      >
                        {QUICK_CHIPS.map((chip) => (
                          <motion.button
                            key={chip.label}
                            whileTap={{ scale: 0.97 }}
                            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                            onClick={() => setInputValue(chip.prompt)}
                            className="rounded-full border border-[#274149] bg-[#0f1f24] px-3 py-2 text-xs text-[#d7e8e5] transition duration-150 hover:-translate-y-0.5 hover:border-[#4f7c75] hover:bg-[#102126]"
                          >
                            <span className="mr-1.5 text-[#e1ba6d]">{chip.icon}</span>
                            {chip.label}
                          </motion.button>
                        ))}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={activeSession?.id || "messages"}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 14 }}
                  transition={{ duration: 0.25 }}
                  className="luna-scrollbar h-full overflow-y-auto pr-1"
                >
                  <div className="mx-auto grid w-full max-w-7xl gap-4 pb-6 pt-3 xl:grid-cols-[minmax(0,1.65fr)_360px] xl:items-start md:pb-8">
                    <div className="min-w-0">
                    <div className="luna-fade-lift sticky top-0 z-10 mb-2 rounded-[28px] border border-[#1f3135] bg-[linear-gradient(180deg,rgba(9,16,19,0.95),rgba(7,12,14,0.9))] px-4 py-4 backdrop-blur xl:px-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full border border-[#274149] bg-[#102126] px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-[#89aba4]">
                              <Zap className="h-3.5 w-3.5" />
                              Active workspace
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full border border-[#6f5624] bg-[#2d2413] px-3 py-1 text-[11px] text-[#f0d79b]">
                              <Clock3 className="h-3.5 w-3.5" />
                              Updated {formatHistoryTime(activeSession?.updatedAt)}
                            </span>
                          </div>
                          <h2 className="truncate text-2xl font-semibold text-[#f4f8f7]" style={{ fontFamily: "'Syne', sans-serif" }}>
                            {activeSession?.title || "New chat"}
                          </h2>
                          <p className="mt-1 text-sm text-[#89a49f]">
                            Use the controls below to shift between research, drafting, and media generation without leaving the thread.
                          </p>
                          <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-[#274149] bg-[#0f1f24] py-1 pl-1 pr-4">
                            <img
                              src={activeCharacter.portrait}
                              alt={activeCharacter.name}
                              className="h-10 w-10 rounded-full border border-white/10 object-cover"
                            />
                            <div className="min-w-0">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-[#84a7a0]">Character</p>
                              <p className="truncate text-sm font-medium text-[#edf5f2]">{activeCharacter.name}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {modePills.map((pill) => (
                            <span key={pill} className="rounded-full border border-[#274149] bg-[#0f1f24] px-3 py-1.5 text-xs text-[#d4e6e2] transition duration-300 hover:-translate-y-0.5 hover:border-[#4f7c75] hover:bg-[#102126]">
                              {pill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {historyLoading ? (
                      <div className="flex items-center gap-3 rounded-2xl border border-[#1f3135] bg-[#0b1518] px-4 py-3 text-sm text-[#d6e8e4]">
                        <Loader2 className="h-4 w-4 animate-spin text-[#7fc7ba]" />
                        Loading your chats...
                      </div>
                    ) : null}
                    <div className="mb-2 rounded-[28px] border border-[#1f3135] bg-[linear-gradient(180deg,rgba(9,16,19,0.92),rgba(7,12,14,0.98))] p-4 xl:hidden">
                      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[#84a7a0]">Character Switchboard</p>
                          <p className="mt-1 text-sm text-[#97b0ab]">
                            Each conversation keeps its own speaking style and portrait card.
                          </p>
                        </div>
                        <span className="text-xs text-[#d7e8e5]">Current: {activeCharacter.name}</span>
                      </div>
                      <div className="mb-3">
                        <input
                          value={characterSearchQuery}
                          onChange={(event) => setCharacterSearchQuery(event.target.value)}
                          placeholder="Search character board..."
                          className="w-full rounded-2xl border border-[#274149] bg-[#0c1719] px-4 py-2.5 text-sm text-[#e7f0ee] outline-none placeholder:text-[#69807b]"
                        />
                      </div>
                      <CharacterCards
                        options={filteredCharacterOptions}
                        selectedCharacterId={activeSession?.characterId}
                        onSelect={handleSelectCharacter}
                        isPro={membershipPlan === "pro"}
                      />
                    </div>
                    {activeMessages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        showLunaHeader={message.role === "assistant"}
                        isLatestAssistant={message.id === latestAssistantId}
                        onCopy={copyMessage}
                        onRegenerate={regenerateLatest}
                        character={activeCharacter}
                      />
                    ))}

                    {showTyping ? <TypingIndicator character={activeCharacter} /> : null}
                    <div ref={listEndRef} />
                    </div>
                    <aside className="hidden xl:block">
                      <div className="sticky top-3 space-y-4">
                        <div className="rounded-[28px] border border-[#1f3135] bg-[linear-gradient(180deg,rgba(9,16,19,0.95),rgba(7,12,14,0.98))] p-4">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[#84a7a0]">Character Switchboard</p>
                          <p className="mt-1 text-sm text-[#97b0ab]">
                            This thread speaks as {activeCharacter.name}. Switch styles without leaving desktop chat.
                          </p>
                          <div className="mt-3 rounded-[24px] border border-[#274149] bg-[#0f1f24] p-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={activeCharacter.portrait}
                                alt={activeCharacter.name}
                                className="h-16 w-14 rounded-[16px] border border-white/10 object-cover"
                              />
                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-[#84a7a0]">Active character</p>
                                <p className="truncate text-base font-semibold text-[#edf5f2]">{activeCharacter.name}</p>
                                <p className="mt-1 text-xs text-[#9ab3ae]">{activeCharacter.tagline}</p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <input
                              value={characterSearchQuery}
                              onChange={(event) => setCharacterSearchQuery(event.target.value)}
                              placeholder="Search character board..."
                              className="w-full rounded-2xl border border-[#274149] bg-[#0c1719] px-4 py-2.5 text-sm text-[#e7f0ee] outline-none placeholder:text-[#69807b]"
                            />
                          </div>
                          <div className="mt-3">
                            <CharacterCards
                              options={filteredCharacterOptions}
                              selectedCharacterId={activeSession?.characterId}
                              onSelect={handleSelectCharacter}
                              isPro={membershipPlan === "pro"}
                            />
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {visibleMain ? (
            <div className="border-t border-white/6 bg-[#071013]/92 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-6">
              <div className="mx-auto max-w-5xl xl:max-w-7xl">
                <div className="mb-3 hidden text-center md:block">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#6f8682]">{activeCharacter.name} chat</p>
                  <p className="mt-1 text-lg font-semibold text-[#edf5f2]" style={{ fontFamily: "'Syne', sans-serif" }}>
                    {activeMessages.length ? "Keep the thread moving." : "Start with one clear prompt."}
                  </p>
                </div>
                <Composer
                  value={inputValue}
                  onChange={setInputValue}
                  onSend={() => sendMessage()}
                  disabled={isTranscribing}
                  sendDisabled={isTyping || isTranscribing}
                  voiceActive={voiceActive}
                  transcribing={isTranscribing}
                  onToggleVoice={handleVoiceToggle}
                  webSearch={webSearchMode}
                  researchMode={researchMode}
                  imageMode={imageMode}
                  onToggleWebSearch={() => setWebSearchMode((prev) => !prev)}
                  onToggleResearchMode={handleToggleResearchMode}
                  onToggleImageMode={() => setImageMode((prev) => !prev)}
                  onExport={handleExportSession}
                  onAttach={(files) => setAttachments((prev) => [...prev, ...files])}
                  attachments={attachments}
                  onRemoveAttachment={(index) => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                  isPro={membershipPlan === "pro"}
                />
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <AnimatePresence>
        {newProjectOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="w-full max-w-md rounded-[28px] border border-[#1f3135] bg-[linear-gradient(180deg,rgba(10,18,20,0.96),rgba(7,12,14,0.98))] p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold" style={{ fontFamily: "'Syne', sans-serif" }}>Create Project Folder</h3>
                <button
                  type="button"
                  onClick={() => setNewProjectOpen(false)}
                  className="rounded-xl border border-[#274149] bg-[#0f1f24] p-1.5 text-[#cfe3df]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <input
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="Project name"
                className="w-full rounded-2xl border border-[#1f3135] bg-[#0c1719] px-3 py-2 text-sm outline-none focus:border-[#4f7c75]"
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewProjectOpen(false)}
                  className="rounded-xl border border-[#274149] bg-[#0f1f24] px-3 py-1.5 text-sm text-[#d4e6e2]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleCreateProject}
                  className="rounded-xl border border-[#e1ba6d]/40 bg-[#e1ba6d]/15 px-3 py-1.5 text-sm text-[#f3dfae]"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, x: 26, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 26, y: 10 }}
            className="fixed bottom-5 right-5 z-[70] w-[min(92vw,360px)] rounded-2xl border border-[#1f3135] bg-[linear-gradient(180deg,rgba(10,18,20,0.96),rgba(7,12,14,0.98))] p-3 text-sm text-[#e6f2ef] shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          >
            <p>{toast.message}</p>
            <div className="mt-2 flex justify-end gap-2">
              {lastRetryPayload ? (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-xl border border-[#e1ba6d]/35 bg-[#e1ba6d]/12 px-2.5 py-1 text-xs text-[#f5dfad]"
                >
                  Retry
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setToast(null)}
                className="rounded-xl border border-[#274149] bg-[#0f1f24] px-2.5 py-1 text-xs text-[#d4e6e2]"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.main>
  );
}


















