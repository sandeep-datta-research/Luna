
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Folder,
  FolderPlus,
  Globe,
  Home,
  ImageIcon,
  Loader2,
  Menu,
  Mic,
  Paperclip,
  PenSquare,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchApi, streamApi, getStoredUser, hydrateUser } from "@/lib/api-client";
import lunaLogo from "@/assets/luna.png";
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
  { icon: "AI", label: "AI Script Writer", prompt: "Write an engaging short script for a 60-second video about building better habits." },
  { icon: "Code", label: "Coding Assistant", prompt: "Help me debug this bug step-by-step and suggest a clean fix." },
  { icon: "Essay", label: "Essay Writer", prompt: "Create a structured essay outline with intro, arguments, and conclusion." },
  { icon: "Biz", label: "Business", prompt: "Give me a practical business growth plan for the next 90 days." },
  { icon: "Tr", label: "Translate", prompt: "Translate the following text with natural tone and context retention:" },
  { icon: "YT", label: "YouTube Summaries", prompt: "Summarize this YouTube video into key takeaways and action points:" },
  { icon: "Mail", label: "AI Email Writing", prompt: "Draft a professional email with a friendly tone for this scenario:" },
  { icon: "PDF", label: "AI PDF Chat", prompt: "Analyze this document and extract important points, decisions, and risks." },
  { icon: "R&D", label: "Research Assistant", prompt: "Research this topic and give a concise structured brief with sources-style sections." },
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

function sanitizeMessage(raw) {
  const role = raw?.role === "assistant" ? "assistant" : "user";
  const content = text(raw?.content || raw?.text);
  if (!content) return null;

  return {
    id: text(raw?.id) || createId(role),
    role,
    content,
    createdAt: text(raw?.createdAt) || nowIso(),
    llm: text(raw?.llm),
  };
}

function createSession(projectId = "") {
  return {
    id: createId("session"),
    title: "New chat",
    messages: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    projectId: text(projectId),
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
    backendConversationId: id,
  };
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
      whileTap={{ scale: 0.97 }}
      type="button"
      onClick={onClick}
      title={label}
      className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-all duration-150 ${
        danger
          ? "border-rose-500/25 bg-rose-500/10 text-rose-200 hover:border-rose-400/35 hover:bg-rose-500/15"
          : "border-[#2a2d45] bg-[#1a1d2e]/70 text-[#cfd4ff] hover:border-[#5b6af5]/55 hover:bg-[#20253b]"
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
        className="inline-flex items-center gap-2 rounded-full border border-[#2a2d45] bg-[#1a1d2e]/90 px-3 py-1.5 text-sm text-[#e5e8ff] transition-all duration-150 hover:border-[#5b6af5]/60"
      >
        <span>{selected.label}</span>
        <ChevronDown className="h-4 w-4 text-[#99a1cb]" />
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-[#2a2d45] bg-[#161a2a] p-1 shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
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
                    ? "text-[#dce2ff] hover:bg-[#202741]"
                    : "cursor-not-allowed text-[#7780a8]"
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

function MessageBubble({ message, showLunaHeader, isLatestAssistant, onCopy, onRegenerate }) {
  const isUser = message.role === "user";

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
              <img src={lunaLogo} alt="Luna" className="h-full w-full object-cover rounded-[inherit]" />
            </span>
            <span className="font-medium">Luna</span>
          </div>
        ) : null}

        <div
          className={`relative rounded-[18px] px-4 py-3 text-sm leading-6 ${
            isUser
              ? "rounded-br-[4px] bg-[#5b6af5] text-white"
              : "rounded-bl-[4px] border border-[#2a2d45] bg-[#1a1d2e]/95 text-[#f0f2ff]"
          }`}
        >
          {isUser ? message.content : <MarkdownMessage content={message.content} />}

          {!isUser ? (
            <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 transition-opacity duration-150 md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onCopy(message.content)}
                className="rounded-md border border-[#39406b] bg-[#202741]/90 p-1 text-[#c9d0ff] transition hover:border-[#5b6af5]"
                title="Copy"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>

              {isLatestAssistant ? (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="rounded-md border border-[#39406b] bg-[#202741]/90 p-1 text-[#c9d0ff] transition hover:border-[#5b6af5]"
                  title="Regenerate"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <span className="text-[11px] text-[#7981a7]">{formatTime(message.createdAt)}</span>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="rounded-[18px] rounded-bl-[4px] border border-[#2a2d45] bg-[#1a1d2e]/95 px-4 py-3 text-[#cfd5ff]">
        <div className="mb-2 flex items-center gap-2 text-xs text-[#9aa2c7]">
          <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5">
            <img src={lunaLogo} alt="Luna" className="h-full w-full object-cover rounded-[inherit]" />
          </span>
          <span>Luna</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#8f9af5] luna-dot" />
          <span className="h-2 w-2 rounded-full bg-[#8f9af5] luna-dot [animation-delay:0.15s]" />
          <span className="h-2 w-2 rounded-full bg-[#8f9af5] luna-dot [animation-delay:0.3s]" />
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
  imageMode,
  onToggleWebSearch,
  onToggleImageMode,
  onAttach,
  attachments,
  onRemoveAttachment,
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
      className={`rounded-2xl border bg-[#1a1d2e]/92 px-3 py-3 backdrop-blur ${
        focused ? "border-[#5b6af5]/80 shadow-[0_0_0_2px_rgba(91,106,245,0.16)]" : "border-[#2a2d45]"
      } ${compact ? "mx-auto w-full max-w-3xl" : "w-full"}`}
    >
      {attachments.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={`${file}-${index}`}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#38406a] bg-[#222846] px-3 py-1 text-xs text-[#d4dbff]"
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
        placeholder="Message Luna..."
        disabled={disabled}
        className="luna-scrollbar w-full resize-none overflow-y-auto bg-transparent px-2 py-1 text-[15px] text-[#eef1ff] outline-none placeholder:text-[#7a7f9a] sm:text-sm"
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
            className="rounded-lg border border-[#2f3558] bg-[#202642] p-2 text-[#cfd5ff] transition hover:border-[#5b6af5]"
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
                ? "border-[#5b6af5] bg-[#2a2f50] text-[#e2e7ff]"
                : "border-[#2f3558] bg-[#202642] text-[#cfd5ff] hover:border-[#5b6af5]/70"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            Search
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onToggleImageMode}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
              imageMode
                ? "border-[#5b6af5] bg-[#2a2f50] text-[#e2e7ff]"
                : "border-[#2f3558] bg-[#202642] text-[#cfd5ff] hover:border-[#5b6af5]/70"
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
            onClick={onToggleVoice}
            disabled={transcribing}
            className={`relative inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-2 transition ${
              voiceActive
                ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-200"
                : "border-[#2f3558] bg-[#202642] text-[#cfd5ff] hover:border-[#5b6af5]/70"
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
                ? "bg-[#5b6af5] text-white shadow-[0_0_0_8px_rgba(91,106,245,0.14)]"
                : "bg-[#343858] text-[#8b93bf]"
            }`}
            title="Send"
          >
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
export default function Luna() {
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
  const [webSearchMode, setWebSearchMode] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [attachments, setAttachments] = useState([]);
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

  const sessionsByProject = useMemo(() => {
    const map = new Map();
    for (const session of sortedSessions) {
      const key = text(session.projectId) || "unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(session);
    }
    return map;
  }, [sortedSessions]);

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

  const createFreshSession = useCallback(
    (projectId = "") => {
      const next = createSession(projectId || expandedProjectId || projects[0]?.id || "");
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
            body: JSON.stringify({ title: "New chat" }),
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
    [expandedProjectId, isSignedIn, projects],
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
          const next = createSession(projects[0]?.id || "");
          setSessions([next]);
          setActiveSessionId(next.id);
        }
      }
    },
    [activeSessionId, isSignedIn, projects, sessions],
  );

  const buildPromptPayload = useCallback(
    (prompt, options = { applyToggles: true }) => {
      const clean = text(prompt);
      if (!clean) return "";

      if (!options.applyToggles) return clean;

      const context = [];
      if (webSearchMode) context.push("Web search mode is ON. Prefer current, verifiable information.");
      if (imageMode) context.push("Image mode is ON. If relevant, provide image generation style prompt details.");
      if (attachments.length > 0) context.push(`Attached files: ${attachments.join(", ")}`);

      if (context.length === 0) return clean;

      return `${clean}\n\nContext:\n- ${context.join("\n- ")}`;
    },
    [attachments, imageMode, webSearchMode],
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
            body: JSON.stringify({ title: "New chat" }),
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
        }),
      });

      if (!result.ok) {
        throw new Error(result.message || result.data?.error || "Failed to fetch response.");
      }

      return {
        reply: text(result.data?.reply) || "I could not generate a reply. Please retry.",
        llm: text(result.data?.llm),
        conversationId: text(result.data?.conversationId),
      };
    },
    [buildPromptPayload, isSignedIn, selectedModel],
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
            body: JSON.stringify({ title: "New chat" }),
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
          }),
          signal: handlers.signal,
        },
        handlers,
      );
    },
    [buildPromptPayload, isSignedIn, selectedModel],
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

      const applyChunk = (chunk) => {
        if (!chunk) return;
        if (!assistantAdded) {
          ensureAssistant(chunk);
          setIsTyping(false);
          return;
        }

        updateSession(target.id, (session) => ({
          ...session,
          messages: session.messages.map((msg) =>
            msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg,
          ),
          updatedAt: nowIso(),
        }));
      };

      const appendChunk = (chunk) => {
        if (!chunk) return;
        streamedText += chunk;
        applyChunk(chunk);
      };

      let streamTimeout = null;

      try {
        if (!supportsStreaming) {
          const response = await requestLuna(target, basePrompt, { applyToggles: options.applyToggles });
          const assistantMessage = {
            id: createId("assistant"),
            role: "assistant",
            content: response.reply,
            createdAt: nowIso(),
            llm: response.llm,
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

      if (!assistantAdded) {
        ensureAssistant(finalReply);
      } else if (finalReply && finalReply !== streamedText) {
        updateSession(target.id, (session) => ({
          ...session,
          messages: session.messages.map((msg) =>
            msg.id === assistantId ? { ...msg, content: finalReply, llm } : msg,
          ),
          backendConversationId: payloadConversationId || session.backendConversationId,
          updatedAt: nowIso(),
        }));
      }

      updateSession(target.id, (session) => ({
        ...session,
        messages: session.messages.map((msg) => (msg.id === assistantId ? { ...msg, llm } : msg)),
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
            const assistantMessage = {
              id: createId("assistant"),
              role: "assistant",
              content: response.reply,
              createdAt: nowIso(),
              llm: response.llm,
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

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#07070d] text-zinc-100">
        <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-12">
          <div className="w-full rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-8 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-violet-300/30 bg-violet-500/15">
              <img src={lunaLogo} alt="Luna Logo" className="h-10 w-10 object-contain" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-white">Sign in to chat with Luna</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Luna chat is available for signed-in users so we can save your history and onboarding preferences.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => navigate("/signin")}
                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-2 text-sm font-semibold text-white hover:from-violet-400 hover:to-fuchsia-400"
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
      className="relative min-h-[100dvh] overflow-hidden bg-[#0d0f17] text-[#f0f0ff]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        .luna-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #2a2d45 transparent;
        }
        .luna-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .luna-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .luna-scrollbar::-webkit-scrollbar-thumb {
          background: #2a2d45;
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
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(91,106,245,0.18),transparent_52%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage: "radial-gradient(rgba(122,127,154,0.32) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 flex min-h-[100dvh]">
        <aside
          className={`hidden h-full flex-col overflow-hidden border-r border-[#1e2235] bg-[#13151f] shadow-[inset_-1px_0_0_rgba(30,34,53,0.8)] transition-[width] duration-300 md:flex ${
            isSidebarOpen ? "w-[260px]" : "w-[82px]"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-[#232841] p-3">
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
                    className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/5"
                  >
                    <img src={lunaLogo} alt="Luna logo" className="h-full w-full object-cover rounded-[inherit] drop-shadow-[0_0_8px_rgba(255,255,255,0.45)]" />
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
                    className="rounded-lg border border-[#30375d] bg-[#1d2238] p-1.5 text-[#c8ceff]"
                    title="Collapse"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(true)}
                    className="mx-auto rounded-lg border border-[#30375d] bg-[#1d2238] p-1.5 text-[#c8ceff]"
                    title="Expand"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                )}
              </div>

              {isSidebarOpen ? (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7f9a]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search chats..."
                    className="w-full rounded-xl border border-[#2a2d45] bg-[#1a1d2e] py-2 pl-9 pr-3 text-sm text-[#e7e9ff] outline-none transition focus:border-[#5b6af5] focus:shadow-[0_0_0_2px_rgba(91,106,245,0.2)]"
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
                  <SidebarButton icon={FolderPlus} label="New Project" collapsed={!isSidebarOpen} onClick={() => setNewProjectOpen(true)} />
                </motion.div>

                <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                  <SidebarButton icon={Settings} label="Settings" collapsed={!isSidebarOpen} onClick={() => navigate("/profile")} />
                </motion.div>
              </motion.div>

              {isSidebarOpen ? (
                <>
<div className="mt-5 mb-2 px-1 text-[11px] uppercase tracking-[0.14em] text-[#7a7f9a]">Chat History</div>
                  <div className="luna-scrollbar max-h-[220px] space-y-1 overflow-y-auto pr-1">
                    {historyList.length === 0 ? (
                      <p className="px-2 py-2 text-xs text-[#7f87b0]">No chats found.</p>
                    ) : null}

                    {historyList.map((session) => {
                      const active = session.id === activeSession?.id;

                      return (
                        <div
                          key={session.id}
                          className={`group relative rounded-xl border px-2.5 py-2 transition ${
                            active
                              ? "border-[#4250a8] bg-[#23294a]"
                              : "border-transparent bg-[#181c2e] hover:border-[#38406a]"
                          }`}
                        >
                          {active ? (
                            <motion.span
                              layoutId="luna-active-session"
                              className="absolute left-0 top-1/2 h-[70%] w-[3px] -translate-y-1/2 rounded-r-full bg-[#5b6af5]"
                            />
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleSelectSession(session.id)}
                            className="w-full text-left"
                          >
                            <p className="truncate pr-6 text-sm text-[#e5e9ff]">{session.title}</p>
                            <p className="text-[11px] text-[#8188b0]">{formatHistoryTime(session.updatedAt)}</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSession(session.id)}
                            className="absolute right-1.5 top-1.5 rounded-md p-1 text-[#96a0cf] opacity-0 transition group-hover:opacity-100 hover:bg-[#2a3050]"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 mb-2 px-1 text-[11px] uppercase tracking-[0.14em] text-[#7a7f9a]">Projects</div>
                  <div className="space-y-1">
                    {projects.map((project) => {
                      const open = expandedProjectId === project.id;
                      const projectSessions = sessionsByProject.get(project.id) || [];

                      return (
                        <div key={project.id} className="rounded-xl border border-[#2a2d45] bg-[#171b2d]">
                          <button
                            type="button"
                            onClick={() => setExpandedProjectId((prev) => (prev === project.id ? "" : project.id))}
                            className="flex w-full items-center justify-between px-2.5 py-2 text-left text-sm text-[#d5dbff]"
                          >
                            <span className="inline-flex items-center gap-2 truncate">
                              <Folder className="h-4 w-4 text-[#9fa8d7]" />
                              <span className="truncate">{project.name}</span>
                            </span>
                            {open ? <ChevronDown className="h-4 w-4 text-[#8f97bf]" /> : <ChevronRight className="h-4 w-4 text-[#8f97bf]" />}
                          </button>

                          <AnimatePresence>
                            {open ? (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="space-y-1 px-2 pb-2">
                                  {projectSessions.length === 0 ? (
                                    <p className="px-2 py-1 text-xs text-[#7f87b0]">No chats in this project.</p>
                                  ) : null}

                                  {projectSessions.slice(0, 6).map((session) => (
                                    <button
                                      key={session.id}
                                      type="button"
                                      onClick={() => handleSelectSession(session.id)}
                                      className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-xs transition ${
                                        session.id === activeSession?.id
                                          ? "bg-[#2a3153] text-[#e4e9ff]"
                                          : "text-[#a7b0da] hover:bg-[#222844]"
                                      }`}
                                    >
                                      {session.title}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>

            <div className="border-t border-[#232841] p-3">
              {isSidebarOpen ? (
                <>
                  <div className="mb-3 rounded-xl border border-amber-400/35 bg-amber-500/10 p-3">
                    <motion.span
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="inline-flex rounded-full border border-amber-300/60 bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200"
                    >
                      20 days left
                    </motion.span>
                    <p className="mt-2 text-xs text-[#bdc3e2]">Upgrade to Luna Pro to unlock faster response lanes.</p>
                    <button
                      type="button"
                      onClick={() => navigate("/pricing")}
                      className="mt-2 inline-flex rounded-lg border border-[#5b6af5]/65 bg-[#5b6af5]/20 px-3 py-1.5 text-xs font-medium text-[#e8ebff] transition hover:bg-[#5b6af5]/30"
                    >
                      View Plan
                    </button>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-[#2a2d45] bg-[#1a1d2e]/80 px-2 py-2">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#252c4b] text-[#d5dcff]">
                        <UserCircle2 className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[#f0f2ff]">{user.name}</p>
                      <p className="truncate text-xs text-[#8c95bd]">{user.email}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex justify-center">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#252c4b] text-[#d5dcff]">
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
              className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <motion.div
                initial={{ x: -22, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -22, opacity: 0 }}
                className="h-full w-[90vw] max-w-[340px] border-r border-[#1e2235] bg-[#13151f]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex h-14 items-center justify-between border-b border-[#232841] px-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-white/5">
                      <img src={lunaLogo} alt="Luna logo" className="h-full w-full object-cover rounded-[inherit]" />
                    </span>
                    <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="text-lg">Luna</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="rounded-lg border border-[#30375d] bg-[#1d2238] p-1.5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="luna-scrollbar h-[calc(100%-56px)] overflow-y-auto p-3">
                  <div className="relative mb-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7f9a]" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search chats..."
                      className="w-full rounded-xl border border-[#2a2d45] bg-[#1a1d2e] py-2 pl-9 pr-3 text-sm text-[#e7e9ff] outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <SidebarButton icon={Home} label="Home" onClick={() => { navigate("/"); setMobileSidebarOpen(false); }} />
                    <SidebarButton icon={PenSquare} label="New Chat" onClick={() => { createFreshSession(); setMobileSidebarOpen(false); }} />
                    <SidebarButton icon={FolderPlus} label="New Project" onClick={() => { setNewProjectOpen(true); setMobileSidebarOpen(false); }} />
                    <SidebarButton icon={Settings} label="Settings" onClick={() => { navigate("/profile"); setMobileSidebarOpen(false); }} />
                  </div>

                  <div className="mt-5 mb-2 text-[11px] uppercase tracking-[0.14em] text-[#7a7f9a]">Chat History</div>
                  <div className="space-y-1">
                    {historyList.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => handleSelectSession(session.id)}
                        className={`block w-full rounded-lg px-2 py-2 text-left text-sm ${
                          session.id === activeSession?.id
                            ? "bg-[#2a3153] text-[#e4e9ff]"
                            : "bg-[#181c2e] text-[#cfd4ff]"
                        }`}
                      >
                        <p className="truncate">{session.title}</p>
                        <p className="text-[11px] text-[#8188b0]">{formatHistoryTime(session.updatedAt)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <section className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-[#1d2233] px-3 py-3 md:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2f3558] bg-[#1d2238] text-[#d2d8ff]"
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#7f87b0]">Luna Chat</p>
                <h1 className="truncate text-base font-semibold text-[#f4f6ff]" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {activeSession?.title || "New chat"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => createFreshSession()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2f3558] bg-[#1d2238] text-[#d2d8ff]"
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
          <div className="hidden items-center justify-end px-3 md:flex md:px-6">
            <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} />
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
                  <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", duration: 0.7 }}
                    className="mb-4 max-w-[12ch] text-center text-[1.95rem] font-semibold leading-tight text-[#f5f7ff] sm:text-[2.2rem] md:mb-6 md:max-w-none md:text-[2.4rem]"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    What&apos;s on your mind today?
                  </motion.h2>

                  <p className="mb-6 max-w-xl text-center text-sm leading-6 text-[#9da6d4]">
                    Search the web, draft images, or continue your last thread with a layout tuned for phone and laptop.
                  </p>

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
                    imageMode={imageMode}
                    onToggleWebSearch={() => setWebSearchMode((prev) => !prev)}
                    onToggleImageMode={() => setImageMode((prev) => !prev)}
                    onAttach={(files) => setAttachments((prev) => [...prev, ...files])}
                    attachments={attachments}
                    onRemoveAttachment={(index) => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                  />

                  <motion.div
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: {},
                      show: { transition: { staggerChildren: 0.05 } },
                    }}
                    className="luna-scrollbar mt-5 flex w-full max-w-4xl flex-wrap justify-center gap-2 pb-1"
                  >
                    {QUICK_CHIPS.map((chip) => (
                      <motion.button
                        key={chip.label}
                        whileTap={{ scale: 0.97 }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                        onClick={() => setInputValue(chip.prompt)}
                        className="rounded-full border border-[#2d3353] bg-[#1a1f35] px-3 py-1.5 text-xs text-[#d7ddff] transition duration-150 hover:-translate-y-0.5 hover:border-[#5b6af5] hover:shadow-[0_8px_24px_rgba(91,106,245,0.2)]"
                      >
                        <span className="mr-1.5">{chip.icon}</span>
                        {chip.label}
                      </motion.button>
                    ))}
                  </motion.div>
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
                  <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-6 pt-3 md:pb-8">
                    {historyLoading ? (
                      <div className="flex items-center gap-3 rounded-2xl border border-[#2a2d45] bg-[#141a2d]/80 px-4 py-3 text-sm text-[#cfd4ff]">
                        <Loader2 className="h-4 w-4 animate-spin text-[#8f9af5]" />
                        Loading your chats...
                      </div>
                    ) : null}
                    {activeMessages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        showLunaHeader={message.role === "assistant"}
                        isLatestAssistant={message.id === latestAssistantId}
                        onCopy={copyMessage}
                        onRegenerate={regenerateLatest}
                      />
                    ))}

                    {showTyping ? <TypingIndicator /> : null}
                    <div ref={listEndRef} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {visibleMain ? (
            <div className="border-t border-[#232841] bg-[#0d0f17]/92 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-6">
              <div className="mx-auto max-w-4xl">
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
                  imageMode={imageMode}
                  onToggleWebSearch={() => setWebSearchMode((prev) => !prev)}
                  onToggleImageMode={() => setImageMode((prev) => !prev)}
                  onAttach={(files) => setAttachments((prev) => [...prev, ...files])}
                  attachments={attachments}
                  onRemoveAttachment={(index) => setAttachments((prev) => prev.filter((_, i) => i !== index))}
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
              className="w-full max-w-md rounded-2xl border border-[#2a2d45] bg-[#171b2d] p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold" style={{ fontFamily: "'Syne', sans-serif" }}>Create Project Folder</h3>
                <button
                  type="button"
                  onClick={() => setNewProjectOpen(false)}
                  className="rounded-md border border-[#2f3558] bg-[#202642] p-1.5 text-[#cfd5ff]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <input
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="Project name"
                className="w-full rounded-xl border border-[#2a2d45] bg-[#1d2238] px-3 py-2 text-sm outline-none focus:border-[#5b6af5]"
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewProjectOpen(false)}
                  className="rounded-lg border border-[#353d64] bg-[#1f2440] px-3 py-1.5 text-sm text-[#ced5ff]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleCreateProject}
                  className="rounded-lg border border-[#5b6af5]/70 bg-[#5b6af5]/25 px-3 py-1.5 text-sm text-[#e7eaff]"
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
            className="fixed bottom-5 right-5 z-[70] w-[min(92vw,360px)] rounded-xl border border-[#3a2a45] bg-[#23182c]/95 p-3 text-sm text-[#f6d9ff] shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          >
            <p>{toast.message}</p>
            <div className="mt-2 flex justify-end gap-2">
              {lastRetryPayload ? (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-md border border-[#5b6af5]/70 bg-[#5b6af5]/20 px-2.5 py-1 text-xs text-[#e8ecff]"
                >
                  Retry
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setToast(null)}
                className="rounded-md border border-[#4a3650] bg-[#2b2131] px-2.5 py-1 text-xs text-[#f2d3ff]"
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


















