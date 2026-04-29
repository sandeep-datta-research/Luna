import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { MODEL_OPTIONS } from "../constants";

export function ModelSelector({ selectedModel, onSelect }) {
  const [open, setOpen] = useState(false);
  const selected = MODEL_OPTIONS.find((item) => item.id === selectedModel) || MODEL_OPTIONS[0];

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.97 }}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0f1b1d]/90 px-3 py-1.5 text-sm text-[#f2f6f7] transition-all duration-150 hover:border-[#4f7c75]/70"
      >
        <span>{selected.label}</span>
        <ChevronDown className="h-4 w-4 text-[#8fa6a2]" />
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#091316] p-1 shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
          >
            {MODEL_OPTIONS.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  if (model.available) {
                    onSelect(model.id);
                    setOpen(false);
                  }
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  model.available
                    ? "text-[#e6eff0] hover:bg-[#102126]"
                    : "cursor-not-allowed text-[#6f8380]"
                }`}
              >
                <span>{model.label}</span>
                <span className="flex items-center gap-2 text-xs">
                  <span className={`h-2.5 w-2.5 rounded-full ${model.available ? "bg-emerald-400" : "bg-zinc-600"}`} />
                  {model.available ? "Available" : "Soon"}
                </span>
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
