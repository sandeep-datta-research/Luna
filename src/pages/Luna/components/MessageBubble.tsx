import { motion } from "framer-motion";
import { Copy, Globe, RotateCcw } from "lucide-react";
import MarkdownMessage from "@/components/ui/chat/MarkdownMessage";
import lunaLogo from "@/assets/luna-logo.svg";
import { CHARACTER_OPTIONS } from "../constants";
import { formatTime } from "../utils";

interface Source {
  id?: string;
  link?: string;
  url?: string;
  source?: string;
  title?: string;
  snippet?: string;
  summary?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  sources?: Source[];
  usage?: {
    provider?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;
    cachedPromptTokens?: number;
  } | null;
}

interface Character {
  id: string;
  name: string;
  portrait?: string;
}

interface MessageBubbleProps {
  message: Message;
  showLunaHeader?: boolean;
  isLatestAssistant?: boolean;
  onCopy: (content: string) => void;
  onRegenerate?: () => void;
  character?: Character;
}

export function MessageBubble({
  message,
  showLunaHeader,
  isLatestAssistant,
  onCopy,
  onRegenerate,
  character,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const sources = Array.isArray(message.sources) ? message.sources : [];
  const assistantCharacter = character || CHARACTER_OPTIONS[0];
  const usage = message?.usage && typeof message.usage === "object" ? message.usage : null;
  const totalTokens = Number(usage?.totalTokens || 0);
  const completionTokens = Number(usage?.completionTokens || 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className={`group flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`w-full min-w-0 ${isUser ? "max-w-[92%] md:max-w-[46rem]" : "max-w-full md:max-w-[46rem]"}`}>
        {!isUser && showLunaHeader ? (
          <div className="mb-3 flex items-center gap-3 pl-1">
            <span className="inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#122125] shadow-[0_12px_26px_rgba(0,0,0,0.18)]">
              <img src={assistantCharacter.portrait || lunaLogo} alt={assistantCharacter.name} className="h-full w-full object-cover" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#eef7f4]" style={{ fontFamily: "'Syne', sans-serif" }}>
                {assistantCharacter.name}
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#6d8882]">Assistant</p>
            </div>
          </div>
        ) : null}

        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
          <div
            className={`relative min-w-0 max-w-full overflow-hidden rounded-[28px] px-4 py-4 text-[15px] leading-7 break-words shadow-[0_16px_40px_rgba(0,0,0,0.16)] md:px-5 ${
              isUser
                ? "rounded-br-lg bg-[linear-gradient(135deg,#1d675f,#143d3a)] text-[#f4fbf8] ring-1 ring-inset ring-white/10"
                : "rounded-bl-lg border border-white/6 bg-[linear-gradient(180deg,rgba(16,27,31,0.98),rgba(10,18,21,1))] text-[#e5f0ed]"
            }`}
          >
            {isUser ? <p className="whitespace-pre-wrap">{message.content}</p> : <MarkdownMessage content={message.content} />}
          </div>
        </div>

        {!isUser ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 pl-1">
            <button
              type="button"
              onClick={() => onCopy(message.content)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 text-[#dcece8] transition hover:border-[#7fc7ba]/50 hover:bg-white/[0.05] hover:text-white"
              title="Copy response"
            >
              <Copy className="h-4 w-4" />
              <span className="text-xs">Copy</span>
            </button>
            {isLatestAssistant && onRegenerate ? (
              <button
                type="button"
                onClick={onRegenerate}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 text-[#dcece8] transition hover:border-[#7fc7ba]/50 hover:bg-white/[0.05] hover:text-white"
                title="Regenerate response"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="text-xs">Retry</span>
              </button>
            ) : null}

            <span className="text-[11px] text-[#6e8781]">{formatTime(message.createdAt)}</span>
            {!isUser && totalTokens > 0 ? (
              <span className="text-[11px] text-[#6e8781]">
                {completionTokens > 0 ? `${completionTokens} output tokens` : `${totalTokens} total tokens`}
                {usage?.provider ? ` via ${usage.provider}` : ""}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="mt-2 pr-1 text-right text-[11px] text-[#6e8781]">{formatTime(message.createdAt)}</div>
        )}

        {!isUser && sources.length > 0 ? (
          <div className="mt-4 grid gap-2 pl-1">
            {sources.map((source, index) => (
              <a
                key={source.id || source.link || index}
                href={source.link || source.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 transition hover:border-[#7fc7ba]/45 hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7f9c96]">
                    [{index + 1}] {source.source || "Source"}
                  </span>
                  <Globe className="h-3.5 w-3.5 text-[#8eaaa4]" />
                </div>
                <p className="mt-2 break-words text-sm font-medium text-[#eef7f4]">{source.title}</p>
                {source.snippet || source.summary ? (
                  <p className="mt-1 break-words text-xs leading-6 text-[#8ca6a0]">{source.snippet || source.summary}</p>
                ) : null}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
