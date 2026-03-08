"use client";

import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { Paperclip, SendHorizontal, X } from "lucide-react";

const MODEL_OPTIONS = [
  { value: "gpt", label: "GPT" },
  { value: "nvidia", label: "NVIDIA" },
  { value: "glm43", label: "GLM 4.3" },
  { value: "glm45air", label: "GLM 4.5 Air (Free)" },
];

export default function VercelV0Chat({
  onSend,
  disabled = false,
  defaultModel = "nvidia",
  embedded = false,
  showHeading = false,
  className,
}) {
  const [value, setValue] = useState("");
  const [llm, setLlm] = useState(defaultModel);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 54,
    maxHeight: 200,
  });

  const handleSend = () => {
    const text = value.trim();
    if (!text || disabled) {
      return;
    }

    Promise.resolve(onSend?.(text, llm))
      .catch(() => {})
      .finally(() => {
        setValue("");
        setAttachments([]);
        adjustHeight(true);
      });
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesPicked = (event) => {
    const next = Array.from(event.target.files || []).map((file) => file.name);
    if (next.length > 0) {
      setAttachments((prev) => [...prev, ...next]);
    }
    event.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className={cn(
        embedded
          ? "w-full border-t border-zinc-800 bg-[#111214]/95 px-4 py-4 backdrop-blur-xl"
          : "mx-auto flex w-full max-w-4xl flex-col items-center space-y-6 p-4 py-16",
        className,
      )}
    >
      {showHeading ? (
        <h1 className="text-center text-2xl font-semibold text-zinc-100 sm:text-4xl">
          What can I help you with?
        </h1>
      ) : null}

      <div className={cn("w-full", embedded ? "mx-auto max-w-3xl" : "")}
      >
        <div className="overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900/90 shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between border-b border-zinc-800/90 px-4 py-2">
            <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Luna Composer</p>

            <select
              value={llm}
              onChange={(event) => setLlm(event.target.value)}
              disabled={disabled}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 outline-none transition focus:border-zinc-500 disabled:opacity-60"
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? "Luna is replying..." : "Message Luna"}
              className={cn(
                "w-full min-h-[54px] resize-none border-none bg-transparent px-2 py-2 text-sm text-zinc-100",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder:text-zinc-500",
              )}
              style={{ overflow: "hidden" }}
              disabled={disabled}
            />
          </div>

          {attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2 px-3 pb-2">
              {attachments.map((file, index) => (
                <span
                  key={`${file}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {file}
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="rounded text-zinc-400 transition hover:text-zinc-100"
                    aria-label="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-zinc-800/90 p-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFilesPicked}
            />

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAttachClick}
              className="rounded-lg border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Paperclip className="mr-1 h-4 w-4" />
              Attach
            </Button>

            <button
              type="button"
              onClick={handleSend}
              disabled={disabled || !value.trim()}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                disabled || !value.trim()
                  ? "bg-zinc-800 text-zinc-500"
                  : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
              )}
            >
              Send
              <SendHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
