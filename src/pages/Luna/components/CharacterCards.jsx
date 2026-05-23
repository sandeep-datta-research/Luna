import { motion } from "framer-motion";
import { CHARACTER_OPTIONS } from "../constants";
import { normalizeCharacterId } from "../utils";

export function CharacterCards({ options = CHARACTER_OPTIONS, selectedCharacterId, onSelect, compact = false, isPro = false }) {
  return (
    <div className="luna-scrollbar flex gap-3 overflow-x-auto pb-1">
      {options.map((character) => {
        const active = character.id === normalizeCharacterId(selectedCharacterId, options);
        const locked = character.access === "pro" && !isPro;
        return (
          <motion.button
            key={character.id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            type="button"
            onClick={() => onSelect(character)}
            className={`group relative min-w-[240px] max-w-[240px] overflow-hidden rounded-[24px] border text-left transition md:min-w-[256px] md:max-w-[256px] ${
              active
                ? "border-[#7fc7ba]/80 bg-[#102126] shadow-[0_16px_40px_rgba(18,49,56,0.35)]"
                : "border-[#1f3135] bg-[#0b1518] hover:border-[#35545b] hover:bg-[#0e1b1f]"
            } ${locked ? "opacity-80" : ""}`}
          >
            <div
              className="absolute inset-x-0 top-0 h-20 opacity-90 md:h-24"
              style={{ backgroundImage: `linear-gradient(135deg, ${character.accentStart}, ${character.accentEnd})` }}
            />
            <div className="relative flex items-start gap-3 p-3">
              <span className="inline-flex h-20 w-16 shrink-0 overflow-hidden rounded-[16px] border border-white/10 shadow-[0_14px_24px_rgba(0,0,0,0.25)] md:h-24 md:w-20 md:rounded-[18px]">
                <img
                  src={character.portrait}
                  alt={character.name}
                  className="h-full w-full object-cover"
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#8badab]">Character</p>
                    <h3 className="mt-1 text-sm font-semibold text-[#edf5f2] md:text-base" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {character.name}
                    </h3>
                  </div>
                  <span className={`mt-0.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                    locked
                      ? "border-[#6f5624] bg-[#2d2413] text-[#f0d79b]"
                      : active
                        ? "border-[#4f7c75] bg-[#102126] text-[#dff7f1]"
                        : "border-[#294147] bg-[#102126] text-[#84a7a0]"
                  }`}>
                    {locked ? "Pro" : character.access === "pro" ? "Pro" : "Free"}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-[#d9ece7]">{character.tagline}</p>
                <p className="mt-1 line-clamp-4 text-xs leading-5 text-[#8ba39f]">{character.description}</p>
                {locked ? <p className="mt-2 text-[11px] text-[#f0d79b]">Upgrade to unlock this character.</p> : null}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
