import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { triggerHaptic } from "@/lib/haptics";
import {
  Command,
  Download,
  Globe,
  ImageIcon,
  Loader2,
  Lock,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  X,
} from "lucide-react";

function ModeButton({ active, children, icon, onClick, title }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
        active
          ? "border-[#7fc7ba] bg-[#16363d] text-[#f5fbfa] shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
          : "border-white/8 bg-white/[0.03] text-[#dcebe8] hover:border-[#7fc7ba]/50 hover:bg-white/[0.05]"
      }`}
    >
      {icon}
      {children}
    </motion.button>
  );
}

export function Composer({
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
    textarea.style.height = "56px";
    textarea.style.height = `${Math.min(220, Math.max(56, textarea.scrollHeight))}px`;
  }, [value]);

  return (
    <div
      className={`rounded-[34px] border bg-[linear-gradient(180deg,rgba(9,18,21,0.98),rgba(7,13,16,1))] p-3 shadow-[0_18px_44px_rgba(0,0,0,0.22)] backdrop-blur-xl ${
        focused ? "border-[#7fc7ba]/55" : "border-white/6"
      } ${compact ? "mx-auto w-full max-w-5xl" : "w-full"}`}
    >
      {attachments.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={`${file}-${index}`}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs text-[#e0efec]"
            >
              <span className="max-w-[180px] truncate sm:max-w-[240px]">{file}</span>
              <button type="button" onClick={() => onRemoveAttachment(index)} className="text-[#abc3be] hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-[28px] border border-white/6 bg-[#0a1518]/90 p-3">
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
          placeholder="Ask Luna for strategy, research, writing, image prompts, debugging, or execution support..."
          disabled={disabled}
          className="luna-scrollbar min-h-[56px] w-full resize-none overflow-y-auto bg-transparent px-1 py-2 text-[15px] leading-7 text-[#eef7f4] outline-none placeholder:text-[#6e8781]"
        />

        <div className="mt-3 flex flex-col gap-3">
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
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => {
                triggerHaptic();
                fileInputRef.current?.click();
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-[#edf6f3] transition hover:border-[#7fc7ba]/50 hover:bg-white/[0.05]"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </motion.button>

            <ModeButton active={webSearch} onClick={onToggleWebSearch} title="Use live web results" icon={<Globe className="h-3.5 w-3.5" />}>
              Live web
            </ModeButton>
            <ModeButton
              active={researchMode}
              onClick={onToggleResearchMode}
              title={isPro ? "Research mode" : "Luna Pro feature"}
              icon={isPro ? <Sparkles className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            >
              Research
            </ModeButton>
            <ModeButton active={imageMode} onClick={() => { triggerHaptic(); onToggleImageMode(); }} title="Create image" icon={<ImageIcon className="h-3.5 w-3.5" />}>
              Image
            </ModeButton>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] text-[#86a09a]">
              <Command className="h-3.5 w-3.5" />
              Enter to send, Shift+Enter for a new line
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onExport}
                disabled={!isPro}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-2xl border px-3 transition ${
                  isPro
                    ? "border-white/8 bg-white/[0.03] text-[#edf6f3] hover:border-[#7fc7ba]/50 hover:bg-white/[0.05]"
                    : "border-white/6 bg-white/[0.02] text-[#6c837e]"
                }`}
                title={isPro ? "Export this chat" : "Luna Pro feature"}
              >
                {isPro ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onToggleVoice}
                disabled={transcribing}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-2xl border px-3 transition ${
                  voiceActive
                    ? "border-emerald-400/65 bg-emerald-500/15 text-emerald-100"
                    : "border-white/8 bg-white/[0.03] text-[#edf6f3] hover:border-[#7fc7ba]/50 hover:bg-white/[0.05]"
                } ${transcribing ? "opacity-75" : ""}`}
                title={voiceActive ? "Stop recording" : "Voice input"}
              >
                {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: value.trim() && !sendDisabled ? 1.03 : 1 }}
                type="button"
                onClick={onSend}
                disabled={sendDisabled || !value.trim()}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
                  value.trim() && !sendDisabled
                    ? "bg-[linear-gradient(135deg,#f1ca78,#b88d3a)] text-[#102126] shadow-[0_14px_28px_rgba(184,141,58,0.26)]"
                    : "bg-[#22373d] text-[#8ba39e]"
                }`}
                title="Send"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
