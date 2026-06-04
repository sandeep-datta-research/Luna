import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { triggerHaptic } from "@/lib/haptics";
import { Download, Globe, ImageIcon, Loader2, Lock, Mic, Paperclip, Send, Sparkles, X } from "lucide-react";

function ToggleChip({ active, label, icon, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm ${
        active
          ? "border-[var(--luna-accent)] bg-[var(--luna-panel-raised)] text-[var(--luna-text)]"
          : "border-[var(--luna-border)] bg-[var(--luna-panel)] text-[var(--luna-text)]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
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
    <div className={`rounded-2xl border bg-[var(--luna-surface)] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)] ${focused ? "border-[var(--luna-accent)]" : "border-[var(--luna-border)]"} ${compact ? "mx-auto w-full max-w-[960px]" : "w-full"}`}>
      {attachments.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div key={`${file}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--luna-border)] bg-[var(--luna-panel)] px-3 py-1.5 text-xs text-[var(--luna-text)]">
              <span className="max-w-[180px] truncate sm:max-w-[240px]">{file}</span>
              <button type="button" onClick={() => onRemoveAttachment(index)} className="text-[var(--luna-muted)] hover:text-[var(--luna-text)]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--luna-border)] bg-[var(--luna-surface-2)] p-3">
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
          placeholder="Ask Luna anything..."
          disabled={disabled}
          className="luna-scrollbar min-h-[56px] w-full resize-none overflow-y-auto bg-transparent px-1 py-2 text-[15px] leading-7 text-[var(--luna-text)] outline-none placeholder:text-[var(--luna-subtle)]"
        />

        <div className="mt-3 flex flex-col gap-3">
          <div className="luna-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
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
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--luna-border)] bg-[var(--luna-panel)] text-[var(--luna-text)]"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </motion.button>

            <ToggleChip active={webSearch} onClick={onToggleWebSearch} title="Use live web results" icon={<Globe className="h-4 w-4" />} label="Web" />
            <ToggleChip
              active={researchMode}
              onClick={onToggleResearchMode}
              title={isPro ? "Research mode" : "Luna Pro feature"}
              icon={isPro ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              label="Research"
            />
            <ToggleChip active={imageMode} onClick={() => { triggerHaptic(); onToggleImageMode(); }} title="Create image" icon={<ImageIcon className="h-4 w-4" />} label="Image" />
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-[var(--luna-muted)]">Press Enter to send. Use Shift+Enter for a new line.</p>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <button
                type="button"
                onClick={onExport}
                disabled={!isPro}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 ${isPro ? "border-[var(--luna-border)] bg-[var(--luna-panel)] text-[var(--luna-text)]" : "border-[var(--luna-border)] bg-[var(--luna-surface)] text-[var(--luna-subtle)]"}`}
                title={isPro ? "Export this chat" : "Luna Pro feature"}
              >
                {isPro ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={onToggleVoice}
                disabled={transcribing}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 ${voiceActive ? "border-[var(--luna-accent)] bg-[var(--luna-panel-raised)] text-[var(--luna-text)]" : "border-[var(--luna-border)] bg-[var(--luna-panel)] text-[var(--luna-text)]"}`}
                title={voiceActive ? "Stop recording" : "Voice input"}
              >
                {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={onSend}
                disabled={sendDisabled || !value.trim()}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-4 text-sm font-semibold ${value.trim() && !sendDisabled ? "text-[var(--luna-send-text)]" : "bg-[var(--luna-panel-raised)] text-[var(--luna-muted)]"}`}
                style={value.trim() && !sendDisabled ? { background: "var(--luna-send)" } : undefined}
                title="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
