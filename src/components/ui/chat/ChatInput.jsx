import { useEffect, useRef, useCallback, useMemo, useState, useTransition } from "react";
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  MonitorIcon,
  Paperclip,
  SendIcon,
  XIcon,
  LoaderIcon,
  Sparkles,
  Command,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const _MOTION = motion;

const COMMAND_SUGGESTIONS = [
  {
    icon: <Sparkles className="h-4 w-4" />,
    label: "Use GPT",
    description: "Switch to GPT model",
    prefix: "/gpt",
  },
  {
    icon: <MonitorIcon className="h-4 w-4" />,
    label: "Use NVIDIA",
    description: "Switch to NVIDIA model",
    prefix: "/nvidia",
  },
  {
    icon: <ImageIcon className="h-4 w-4" />,
    label: "Use GLM 4.3",
    description: "Switch to GLM 4.3 model",
    prefix: "/glm43",
  },
  {
    icon: <Command className="h-4 w-4" />,
    label: "Use GLM 4.5 Air",
    description: "Switch to GLM 4.5 Air (free)",
    prefix: "/glm45",
  },
  {
    icon: <XIcon className="h-4 w-4" />,
    label: "Clear Draft",
    description: "Clear current input",
    prefix: "/clear",
  },
];

const MODEL_OPTIONS = [
  { value: "gpt", label: "GPT" },
  { value: "nvidia", label: "NVIDIA" },
  { value: "glm43", label: "GLM 4.3" },
  { value: "glm45air", label: "GLM 4.5 Air (Free)" },
];

function prefixToModel(prefix) {
  if (prefix === "/gpt") {
    return "gpt";
  }

  if (prefix === "/nvidia") {
    return "nvidia";
  }

  if (prefix === "/glm43") {
    return "glm43";
  }

  if (prefix === "/glm45") {
    return "glm45air";
  }

  return null;
}

function useAutoResizeTextarea({ minHeight, maxHeight }) {
  const textareaRef = useRef(null);

  const adjustHeight = useCallback(
    (reset = false) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY),
      );

      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight],
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

const Textarea = React.forwardRef(function Textarea(
  { className, containerClassName, showRing = true, ...props },
  ref,
) {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div className={cn("relative", containerClassName)}>
      <textarea
        className={cn(
          "flex w-full rounded-md border px-3 py-2 text-sm",
          "transition-all duration-200 ease-in-out",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500",
          showRing
            ? "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
            : "",
          className,
        )}
        ref={ref}
        onFocus={(event) => {
          setIsFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          props.onBlur?.(event);
        }}
        {...props}
      />

      {showRing && isFocused ? (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-sky-400/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      ) : null}

      {props.onChange ? (
        <div
          className="absolute right-2 bottom-2 h-2 w-2 rounded-full bg-sky-400 opacity-0"
          style={{ animation: "none" }}
          id="textarea-ripple"
        />
      ) : null}
    </div>
  );
});
Textarea.displayName = "Textarea";

function TypingDots() {
  return (
    <div className="ml-1 flex items-center">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="mx-0.5 h-1.5 w-1.5 rounded-full bg-sky-300"
          initial={{ opacity: 0.3 }}
          animate={{
            opacity: [0.3, 0.9, 0.3],
            scale: [0.85, 1.1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Number.POSITIVE_INFINITY,
            delay: dot * 0.15,
            ease: "easeInOut",
          }}
          style={{
            boxShadow: "0 0 4px rgba(125, 211, 252, 0.7)",
          }}
        />
      ))}
    </div>
  );
}

export default function ChatInput({ onSend, disabled = false, defaultModel = "nvidia", showModelSelector = true }) {
  const [value, setValue] = useState("");
  const [llm, setLlm] = useState(defaultModel);
  const [attachments, setAttachments] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [recentCommand, setRecentCommand] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [inputFocused, setInputFocused] = useState(false);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });

  const commandPaletteRef = useRef(null);
  const commandButtonRef = useRef(null);
  const fileInputRef = useRef(null);
  const recentCommandTimeoutRef = useRef(null);

  const normalizedValue = value.trim().toLowerCase();
  const isSlashMode = normalizedValue.startsWith("/") && !normalizedValue.includes(" ");
  const busy = disabled || isTyping || isPending;

  const commandSuggestions = useMemo(() => {
    if (showModelSelector) {
      return COMMAND_SUGGESTIONS;
    }

    return COMMAND_SUGGESTIONS.filter((cmd) => cmd.prefix === "/clear");
  }, [showModelSelector]);

  const filteredSuggestions = useMemo(() => {
    if (!isSlashMode) {
      return commandSuggestions;
    }

    const next = commandSuggestions.filter((cmd) => cmd.prefix.startsWith(normalizedValue));
    return next.length > 0 ? next : commandSuggestions;
  }, [commandSuggestions, isSlashMode, normalizedValue]);

  const paletteOpen = showCommandPalette || isSlashMode;
  const safeActiveIndex =
    filteredSuggestions.length === 0
      ? -1
      : Math.max(0, Math.min(activeSuggestion, filteredSuggestions.length - 1));

  useEffect(() => {
    const handleMouseMove = (event) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;

      const clickedInPalette = commandPaletteRef.current?.contains(target);
      const clickedButton = commandButtonRef.current?.contains(target);

      if (!clickedInPalette && !clickedButton) {
        setShowCommandPalette(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (recentCommandTimeoutRef.current) {
        clearTimeout(recentCommandTimeoutRef.current);
      }
    };
  }, []);

  const showRecentCommand = (label, durationMs = 2200) => {
    setRecentCommand(label);

    if (recentCommandTimeoutRef.current) {
      clearTimeout(recentCommandTimeoutRef.current);
    }

    recentCommandTimeoutRef.current = setTimeout(() => {
      setRecentCommand(null);
      recentCommandTimeoutRef.current = null;
    }, durationMs);
  };

  const applySuggestion = (suggestion, timeoutMs = 2200) => {
    if (!suggestion) {
      return;
    }

    const model = prefixToModel(suggestion.prefix);

    if (suggestion.prefix === "/clear") {
      setValue("");
      setAttachments([]);
      adjustHeight(true);
    } else {
      setValue(`${suggestion.prefix} `);
      adjustHeight();
    }

    if (model && showModelSelector) {
      setLlm(model);
    }

    setShowCommandPalette(false);
    setActiveSuggestion(-1);
    showRecentCommand(suggestion.label, timeoutMs);
  };

  const handleValueChange = (event) => {
    const nextValue = event.target.value;
    setValue(nextValue);
    adjustHeight();

    const normalized = nextValue.trim().toLowerCase();
    if (normalized.startsWith("/") && !normalized.includes(" ")) {
      setActiveSuggestion(0);
      return;
    }

    setActiveSuggestion(-1);
  };

  const handleSendMessage = () => {
    const trimmed = value.trim();

    if (!trimmed || busy) {
      return;
    }

    startTransition(() => {
      setIsTyping(true);
    });

    Promise.resolve(onSend(trimmed, llm))
      .catch(() => {})
      .finally(() => {
        setIsTyping(false);
        setValue("");
        setAttachments([]);
        adjustHeight(true);
      });
  };

  const handleKeyDown = (event) => {
    if (paletteOpen && filteredSuggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveSuggestion((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveSuggestion((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
        );
        return;
      }

      if (event.key === "Tab" || (event.key === "Enter" && isSlashMode)) {
        event.preventDefault();
        if (safeActiveIndex >= 0) {
          applySuggestion(filteredSuggestions[safeActiveIndex], 3200);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setShowCommandPalette(false);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const handleFilesPicked = (event) => {
    const fileNames = Array.from(event.target.files || []).map((file) => file.name);

    if (fileNames.length > 0) {
      setAttachments((prev) => [...prev, ...fileNames]);
    }

    event.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="relative border-t border-zinc-800/90 bg-zinc-950/90 p-4 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
        <div className="absolute top-0 left-1/4 h-80 w-80 animate-pulse rounded-full bg-sky-500/10 blur-[120px]" />
        <div className="absolute right-1/4 bottom-0 h-80 w-80 animate-pulse rounded-full bg-cyan-400/10 blur-[120px] delay-700" />
      </div>

      <div className="relative mx-auto w-full max-w-3xl">
        <motion.div
          className="relative z-10 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <motion.div
            className="relative rounded-2xl border border-zinc-700/80 bg-zinc-900/85 shadow-2xl backdrop-blur-2xl"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.08 }}
          >
            <AnimatePresence>
              {paletteOpen ? (
                <motion.div
                  ref={commandPaletteRef}
                  className="absolute right-4 bottom-full left-4 z-50 mb-2 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900/95 shadow-lg backdrop-blur-xl"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="py-1">
                    {filteredSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.prefix}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 px-3 py-2 text-xs transition-colors",
                          safeActiveIndex === index
                            ? "bg-sky-500/20 text-zinc-100"
                            : "text-zinc-400 hover:bg-zinc-800/80",
                        )}
                        onClick={() => applySuggestion(suggestion)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <div className="flex h-5 w-5 items-center justify-center text-sky-300">
                          {suggestion.icon}
                        </div>
                        <div className="font-medium">{suggestion.label}</div>
                        <div className="ml-1 text-xs text-zinc-500">{suggestion.prefix}</div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="flex items-center justify-between border-b border-zinc-800/90 px-4 pt-3 pb-2">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                Type a command or ask a question
              </p>

              {showModelSelector ? (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="llm-model"
                    className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
                  >
                    Model
                  </label>
                  <select
                    id="llm-model"
                    value={llm}
                    onChange={(event) => setLlm(event.target.value)}
                    disabled={busy}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 outline-none transition focus:border-zinc-500 disabled:opacity-60"
                  >
                    {MODEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                  Best response mode
                </span>
              )}
            </div>

            <div className="p-4">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={handleValueChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={busy ? "Luna is replying..." : showModelSelector ? "Message Luna (try /gpt, /nvidia, /glm43, /glm45)" : "Message Luna..."}
                containerClassName="w-full"
                className={cn(
                  "w-full px-4 py-3",
                  "resize-none",
                  "bg-transparent",
                  "border-none",
                  "text-sm text-zinc-100",
                  "focus:outline-none",
                  "placeholder:text-zinc-500",
                  "min-h-[60px]",
                )}
                style={{ overflow: "hidden" }}
                showRing={false}
                disabled={busy}
              />
            </div>

            <AnimatePresence>
              {attachments.length > 0 ? (
                <motion.div
                  className="flex flex-wrap gap-2 px-4 pb-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {attachments.map((file, index) => (
                    <motion.div
                      key={`${file}-${index}`}
                      className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <span>{file}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-zinc-400 transition-colors hover:text-zinc-100"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="flex items-center justify-between gap-4 border-t border-zinc-800/90 p-4">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFilesPicked}
                />

                <motion.button
                  type="button"
                  onClick={handleAttachFile}
                  whileTap={{ scale: 0.94 }}
                  className="group relative rounded-lg p-2 text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  <Paperclip className="h-4 w-4" />
                  <motion.span
                    className="absolute inset-0 rounded-lg bg-zinc-700/50 opacity-0 transition-opacity group-hover:opacity-100"
                    layoutId="button-highlight"
                  />
                </motion.button>

                <motion.button
                  ref={commandButtonRef}
                  type="button"
                  data-command-button
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowCommandPalette((prev) => !prev);
                    setActiveSuggestion(0);
                  }}
                  whileTap={{ scale: 0.94 }}
                  className={cn(
                    "group relative rounded-lg p-2 text-zinc-400 transition-colors hover:text-zinc-100",
                    paletteOpen ? "bg-zinc-700/60 text-zinc-100" : "",
                  )}
                >
                  <Command className="h-4 w-4" />
                  <motion.span
                    className="absolute inset-0 rounded-lg bg-zinc-700/50 opacity-0 transition-opacity group-hover:opacity-100"
                    layoutId="button-highlight"
                  />
                </motion.button>
              </div>

              <motion.button
                type="button"
                onClick={handleSendMessage}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={busy || !value.trim()}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  value.trim() && !busy
                    ? "bg-sky-500 text-zinc-950 shadow-lg shadow-sky-500/20"
                    : "bg-zinc-800 text-zinc-500",
                )}
              >
                {busy ? (
                  <LoaderIcon className="h-4 w-4 animate-[spin_2s_linear_infinite]" />
                ) : (
                  <SendIcon className="h-4 w-4" />
                )}
                <span>Send</span>
              </motion.button>
            </div>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {commandSuggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion.prefix}
                onClick={() => applySuggestion(suggestion)}
                className="group relative flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-2 text-sm text-zinc-300 transition-all hover:bg-zinc-800 hover:text-zinc-100"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                {suggestion.icon}
                <span>{suggestion.label}</span>
                <motion.div
                  className="absolute inset-0 rounded-lg border border-zinc-600/40"
                  initial={false}
                  animate={{
                    opacity: [0, 1],
                    scale: [0.98, 1],
                  }}
                  transition={{
                    duration: 0.25,
                    ease: "easeOut",
                  }}
                />
              </motion.button>
            ))}
          </div>

          <AnimatePresence>
            {recentCommand ? (
              <motion.div
                className="mx-auto w-fit rounded-full border border-zinc-700 bg-zinc-900/90 px-3 py-1 text-xs text-zinc-300"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                {recentCommand} ready
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {busy ? (
          <motion.div
            className="fixed bottom-8 left-1/2 z-40 mx-auto -translate-x-1/2 rounded-full border border-zinc-700 bg-zinc-900/90 px-4 py-2 shadow-lg backdrop-blur-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-8 items-center justify-center rounded-full bg-sky-500/20 text-center">
                <Sparkles className="h-4 w-4 text-sky-300" />
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <span>Thinking</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {inputFocused ? (
        <motion.div
          className="pointer-events-none fixed z-0 h-[44rem] w-[44rem] rounded-full bg-gradient-to-r from-sky-500/30 via-cyan-400/25 to-blue-500/25 opacity-[0.07] blur-[96px]"
          animate={{
            x: mousePosition.x - 360,
            y: mousePosition.y - 360,
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 150,
            mass: 0.5,
          }}
        />
      ) : null}
    </div>
  );
}

const rippleKeyframes = `
@keyframes ripple {
  0% { transform: scale(0.5); opacity: 0.6; }
  100% { transform: scale(2); opacity: 0; }
}
`;

if (typeof document !== "undefined" && !document.getElementById("luna-ripple-style")) {
  const style = document.createElement("style");
  style.id = "luna-ripple-style";
  style.innerHTML = rippleKeyframes;
  document.head.appendChild(style);
}








