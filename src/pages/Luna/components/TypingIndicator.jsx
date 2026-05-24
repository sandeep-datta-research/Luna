import { motion } from "framer-motion";
import lunaLogo from "@/assets/luna-logo.svg";
import { CHARACTER_OPTIONS } from "../constants";

export function TypingIndicator({ character }) {
  const assistantCharacter = character || CHARACTER_OPTIONS[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 flex justify-start"
    >
      <div className="rounded-2xl border border-[#294249] bg-[#102126] px-4 py-3 text-[#d7e9e5]">
        <div className="mb-2 flex items-center gap-2 text-xs text-[#adc1bc]">
          <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-[#36545a] bg-[#0f1b1f]">
            <img src={assistantCharacter.portrait || lunaLogo} alt={assistantCharacter.name} className="h-full w-full rounded-[inherit] object-cover" />
          </span>
          <span>{assistantCharacter.name}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#7fc7ba] luna-dot" />
          <span className="h-2 w-2 rounded-full bg-[#7fc7ba] luna-dot [animation-delay:0.15s]" />
          <span className="h-2 w-2 rounded-full bg-[#7fc7ba] luna-dot [animation-delay:0.3s]" />
        </div>
      </div>
    </motion.div>
  );
}
