import { motion } from "framer-motion";
import { Copy, RotateCcw, Globe } from "lucide-react";
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
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className={`group flex mb-4 ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`flex max-w-full flex-col gap-1.5 ${isUser ? "items-end md:max-w-[75%]" : "items-start md:max-w-[85%]"}`}>
        {!isUser && showLunaHeader ? (
          <div className="mb-0.5 ml-1 flex items-center gap-2 text-[13px] text-[#a4b5b2]">
            <span className="inline-flex h-[26px] w-[26px] items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#122125] shadow-sm">
              <img src={assistantCharacter.portrait || lunaLogo} alt={assistantCharacter.name} className="h-full w-full rounded-[inherit] object-cover" />
            </span>
            <span className="font-semibold tracking-wide" style={{ fontFamily: "'Syne', sans-serif" }}>{assistantCharacter.name}</span>
          </div>
        ) : null}

        <div
          className={`relative max-w-full rounded-3xl px-5 py-3.5 text-[15px] leading-relaxed transition-colors ${
            isUser
              ? "rounded-br-sm bg-[linear-gradient(145deg,#327d74,#184f49)] text-[#f4f9f8] shadow-[0_12px_32px_rgba(24,79,73,0.3)] ring-1 ring-inset ring-white/10"
              : "rounded-bl-sm border border-[#21353a] bg-[linear-gradient(180deg,rgba(18,27,31,0.96),rgba(12,20,23,0.98))] text-[#e4f0ed] shadow-[0_14px_36px_rgba(0,0,0,0.22)] hover:border-[#2f4950]"
          }`}
        >
          {isUser ? message.content : <MarkdownMessage content={message.content} />}
        </div>

        {!isUser ? (
          <div className="flex w-full items-center gap-2 pl-1 md:w-auto md:pl-0">
            <div className="flex items-center gap-2 md:pointer-events-none md:-translate-y-1 md:opacity-0 md:transition-all md:duration-200 md:group-hover:pointer-events-auto md:group-hover:translate-y-0 md:group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onCopy(message.content)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2d474e] bg-[#112024] text-[#a4b5b2] shadow-sm transition hover:scale-105 hover:border-[#4f7c75] hover:text-[#e4f0ed]"
                title="Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
              {isLatestAssistant && onRegenerate ? (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2d474e] bg-[#112024] text-[#a4b5b2] shadow-sm transition hover:scale-105 hover:border-[#4f7c75] hover:text-[#e4f0ed]"
                  title="Regenerate"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {!isUser && sources.length > 0 ? (
          <div className="mt-1 grid w-full gap-2">
            {sources.map((source, index) => (
              <a
                key={source.id || source.link || index}
                href={source.link || source.url}
                target="_blank"
                rel="noreferrer"
                className="group/source block rounded-[20px] border border-[#21353a] bg-[#0d171a]/90 px-4 py-3 text-left transition hover:border-[#4f7c75] hover:bg-[#122126]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b8b85] transition-colors group-hover/source:text-[#8fc4ba]">
                    [{index + 1}] {source.source || "Source"}
                  </span>
                  <Globe className="h-3.5 w-3.5 text-[#5e7874] transition-colors group-hover/source:text-[#8fc4ba]" />
                </div>
                <p className="mt-1.5 text-[13px] font-medium text-[#d4e4e0] group-hover/source:text-[#f4f9f8]">{source.title}</p>
                {source.snippet || source.summary ? (
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#869f9a] group-hover/source:text-[#a0bfba]">{source.snippet || source.summary}</p>
                ) : null}
              </a>
            ))}
          </div>
        ) : null}

        {!isUser && totalTokens > 0 ? (
          <div className="pl-1 text-[10px] text-[#6f8682]">
            {completionTokens > 0 ? `${completionTokens} output tokens` : `${totalTokens} total tokens`}
            {usage?.provider ? ` via ${usage.provider}` : ""}
          </div>
        ) : null}

        <span className={`text-[10px] font-medium text-[#647c78] ${isUser ? "pr-1" : "pl-1"}`}>
          {formatTime(message.createdAt)}
        </span>
      </div>
    </motion.div>
  );
}
