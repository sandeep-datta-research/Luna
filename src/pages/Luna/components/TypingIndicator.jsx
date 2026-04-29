import { motion } from "framer-motion";
import lunaLogo from "@/assets/luna-logo.svg";
import { CHARACTER_OPTIONS } from "../constants";

export function TypingIndicator({ character }) {
  const assistantCharacter = character || CHARACTER_OPTIONS[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="rounded-[18px] rounded-bl-[4px] border border-[#21353a] bg-[linear-gradient(180deg,rgba(14,22,25,0.96),rgba(8,14,17,0.98))] px-4 py-3 text-[#d7e9e5]">
        <div className="mb-2 flex items-center gap-2 text-xs text-[#86a49d]">
          <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5">
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
