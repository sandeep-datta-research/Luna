import React from "react";
import { motion } from "framer-motion";
import { SignalItem } from "./types";

interface SignalStatProps {
  item: SignalItem;
}

export function SignalStat({ item }: SignalStatProps) {
  const Icon = item.icon;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-lg font-semibold text-white">{item.value}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{item.label}</p>
        </div>
      </div>
    </motion.div>
  );
}
