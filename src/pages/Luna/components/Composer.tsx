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
        active ? "border-[#7fc7ba] bg-[#143038] text-white" : "border-[#294249] bg-[#102126] text-[#e4f0ed]"
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
    <div className={`rounded-2xl border bg-[#0c171a] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)] ${focused ? "border-[#7fc7ba]/60" : "border-[#1d3036]"} ${compact ? "mx-auto w-full max-w-[960px]" : "w-full"}`}>
      {attachments.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div key={`${file}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#294249] bg-[#102126] px-3 py-1.5 text-xs text-[#eef7f4]">
              <span className="max-w-[180px] truncate sm:max-w-[240px]">{file}</span>
              <button type="button" onClick={() => onRemoveAttachment(index)} className="text-[#b7cbc7] hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#294249] bg-[#0f1b1f] p-3">
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
          className="luna-scrollbar min-h-[56px] w-full resize-none overflow-y-auto bg-transparent px-1 py-2 text-[15px] leading-7 text-[#f5fbfa] outline-none placeholder:text-[#94aaa5]"
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
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#294249] bg-[#102126] text-[#eef7f4]"
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
            <p className="text-xs text-[#b8cbc7]">Press Enter to send. Use Shift+Enter for a new line.</p>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <button
                type="button"
                onClick={onExport}
                disabled={!isPro}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 ${isPro ? "border-[#294249] bg-[#102126] text-[#eef7f4]" : "border-[#1d3036] bg-[#0d181b] text-[#8da19d]"}`}
                title={isPro ? "Export this chat" : "Luna Pro feature"}
              >
                {isPro ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={onToggleVoice}
                disabled={transcribing}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 ${voiceActive ? "border-emerald-400/65 bg-emerald-500/15 text-emerald-100" : "border-[#294249] bg-[#102126] text-[#eef7f4]"}`}
                title={voiceActive ? "Stop recording" : "Voice input"}
              >
                {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={onSend}
                disabled={sendDisabled || !value.trim()}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-4 text-sm font-semibold ${value.trim() && !sendDisabled ? "bg-[linear-gradient(135deg,#f1ca78,#b88d3a)] text-[#102126]" : "bg-[#22373d] text-[#bfd0cc]"}`}
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
