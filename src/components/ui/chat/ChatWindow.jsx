import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const MotionDiv = motion.div;

function formatTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getModelLabel(llm) {
  if (llm === "gpt") {
    return "GPT";
  }

  if (llm === "nvidia") {
    return "NVIDIA";
  }

  if (llm === "glm43") {
    return "GLM 4.3";
  }

  if (llm === "glm45air") {
    return "GLM 4.5 Air";
  }

  return null;
}

function AssistantMessage({ message }) {
  const modelLabel = getModelLabel(message.llm);
  const timestamp = formatTime(message.createdAt);

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-start gap-3"
    >
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-200">
        L
      </div>

      <div className="min-w-0 max-w-[92%] space-y-1 sm:max-w-[84%]">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/80 px-4 py-3 text-sm leading-6 text-zinc-100 whitespace-pre-wrap">
          {message.text}
        </div>

        <div className="flex items-center gap-2 px-1 text-[11px] text-zinc-500">
          {modelLabel ? (
            <span className="rounded-full border border-zinc-700 px-2 py-0.5 font-medium text-zinc-400">
              {modelLabel}
            </span>
          ) : null}
          {timestamp ? <span>{timestamp}</span> : null}
        </div>
      </div>
    </MotionDiv>
  );
}

function UserMessage({ message }) {
  const timestamp = formatTime(message.createdAt);

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex justify-end"
    >
      <div className="max-w-[90%] space-y-1 sm:max-w-[76%]">
        <div className="rounded-2xl bg-zinc-700 px-4 py-3 text-sm leading-6 text-zinc-100 whitespace-pre-wrap">
          {message.text}
        </div>
        <div className="flex justify-end px-1 text-[11px] text-zinc-500">
          {timestamp ? <span>{timestamp}</span> : null}
        </div>
      </div>
    </MotionDiv>
  );
}

export default function ChatWindow({ messages, isLoading, error }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading, error]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#121314] px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {messages.map((msg) =>
          msg.role === "user" ? (
            <UserMessage key={msg.id} message={msg} />
          ) : (
            <AssistantMessage key={msg.id} message={msg} />
          ),
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-500" />
            Luna is thinking...
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div ref={endRef} />
      </div>
    </div>
  );
}
