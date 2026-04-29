import { motion } from "framer-motion";
import { Copy, RotateCcw, Globe } from "lucide-react";
import MarkdownMessage from "@/components/ui/chat/MarkdownMessage";
import lunaLogo from "@/assets/luna-logo.svg";
import { CHARACTER_OPTIONS } from "../constants";
import { formatTime } from "../utils";

export function MessageBubble({
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
