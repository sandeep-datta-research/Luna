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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`w-full min-w-0 ${isUser ? "max-w-[92%] md:max-w-[44rem]" : "max-w-full md:max-w-[48rem]"}`}>
        {!isUser && showLunaHeader ? (
          <div className="mb-3 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#36545a] bg-[#102126]">
              <img src={assistantCharacter.portrait || lunaLogo} alt={assistantCharacter.name} className="h-full w-full object-cover" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#f4faf8]">{assistantCharacter.name}</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#9eb7b2]">Assistant</p>
            </div>
          </div>
        ) : null}

        <div className={`rounded-2xl border px-4 py-3 text-[15px] leading-7 shadow-[0_8px_20px_rgba(0,0,0,0.12)] md:px-5 ${isUser ? "border-[#27645d] bg-[#1d675f] text-white" : "border-[#294249] bg-[#102126] text-[#edf7f4]"}`}>
          {isUser ? <p className="whitespace-pre-wrap break-words">{message.content}</p> : <MarkdownMessage content={message.content} />}
        </div>

        {!isUser ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onCopy(message.content)}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#294249] bg-[#0f1b1f] px-3 text-xs text-[#eef7f4]"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            {isLatestAssistant && onRegenerate ? (
              <button
                type="button"
                onClick={onRegenerate}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#294249] bg-[#0f1b1f] px-3 text-xs text-[#eef7f4]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </button>
            ) : null}
            <span className="text-[11px] text-[#adc1bc]">{formatTime(message.createdAt)}</span>
            {totalTokens > 0 ? (
              <span className="text-[11px] text-[#adc1bc]">
                {completionTokens > 0 ? `${completionTokens} output tokens` : `${totalTokens} total tokens`}
                {usage?.provider ? ` via ${usage.provider}` : ""}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="mt-2 text-right text-[11px] text-[#adc1bc]">{formatTime(message.createdAt)}</div>
        )}

        {!isUser && sources.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {sources.map((source, index) => (
              <a
                key={source.id || source.link || index}
                href={source.link || source.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-[#294249] bg-[#0f1b1f] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9eb7b2]">
                    [{index + 1}] {source.source || "Source"}
                  </span>
                  <Globe className="h-3.5 w-3.5 text-[#9eb7b2]" />
                </div>
                <p className="mt-2 break-words text-sm font-medium text-[#eef7f4]">{source.title}</p>
                {source.snippet || source.summary ? (
                  <p className="mt-1 break-words text-xs leading-6 text-[#c4d7d2]">{source.snippet || source.summary}</p>
                ) : null}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
