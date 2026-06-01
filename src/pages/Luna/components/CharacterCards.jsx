import { motion } from "framer-motion";
import { CHARACTER_OPTIONS } from "../constants";
import { normalizeCharacterId } from "../utils";

export function CharacterCards({ options = CHARACTER_OPTIONS, selectedCharacterId, onSelect, compact = false, isPro = false }) {
  const cardSizeClass = compact
    ? "min-w-[204px] max-w-[204px] md:min-w-[220px] md:max-w-[220px]"
    : "min-w-[228px] max-w-[228px] md:min-w-[244px] md:max-w-[244px]";
  const portraitSizeClass = compact
    ? "h-16 w-14 md:h-[4.5rem] md:w-16"
    : "h-[4.5rem] w-16 md:h-20 md:w-[4.5rem]";

  return (
    <div className="luna-scrollbar flex gap-3 overflow-x-auto pb-1">
      {options.map((character) => {
        const active = character.id === normalizeCharacterId(selectedCharacterId, options);
        const locked = character.access === "pro" && !isPro;
        return (
          <motion.button
            key={character.id}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.985 }}
            type="button"
            onClick={() => onSelect(character)}
            className={`group relative ${cardSizeClass} overflow-hidden rounded-2xl border text-left transition ${
              active
                ? "border-[#7fc7ba]/70 bg-[#102126] shadow-[0_10px_24px_rgba(18,49,56,0.2)]"
                : "border-[#294249] bg-[#0f1b1f] hover:border-[#36545a] hover:bg-[#13242a]"
            } ${locked ? "opacity-80" : ""}`}
          >
            <div
              className="absolute inset-x-0 top-0 h-16 opacity-90 md:h-20"
              style={{ backgroundImage: `linear-gradient(135deg, ${character.accentStart}, ${character.accentEnd})` }}
            />
            <div className="relative flex items-start gap-3 p-3">
              <span className={`inline-flex ${portraitSizeClass} shrink-0 overflow-hidden rounded-xl border border-[#36545a]`}>
                <img
                  src={character.portrait}
                  alt={character.name}
                  className="h-full w-full object-cover"
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#a6c0ba]">Character</p>
                    <h3 className="mt-1 text-sm font-semibold text-[#edf5f2] md:text-base" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {character.name}
                    </h3>
                  </div>
                  <span className={`mt-0.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                    locked
                      ? "border-[#6f5624] bg-[#2d2413] text-[#f0d79b]"
                      : active
                        ? "border-[#4f7c75] bg-[#143038] text-[#ecfaf7]"
                        : "border-[#36545a] bg-[#102126] text-[#a6c0ba]"
                  }`}>
                    {locked ? "Pro" : character.access === "pro" ? "Pro" : "Free"}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-[#e7f4f1]">{character.tagline}</p>
                <p className="mt-1 line-clamp-4 text-xs leading-5 text-[#bfd1cd]">{character.description}</p>
                {locked ? <p className="mt-2 text-[11px] text-[#f0d79b]">Upgrade to unlock this character.</p> : null}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
