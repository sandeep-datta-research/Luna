import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  X, 
  Paperclip, 
  Globe, 
  Sparkles, 
  Lock, 
  ImageIcon, 
  Download, 
  Mic, 
  Loader2, 
  Send, 
  Command 
} from "lucide-react";

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
