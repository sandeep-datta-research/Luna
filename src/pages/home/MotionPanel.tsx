import React from "react";
import { motion } from "framer-motion";
import { MotionStackItem } from "./types";

interface MotionPanelProps {
  item: MotionStackItem;
  index: number;
}

export function MotionPanel({ item, index }: MotionPanelProps) {
  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, delay: 0.1 + index * 0.08, ease: "easeOut" }}
      whileHover={{ y: -6, rotateX: 2, rotateY: -2 }}
      className={`absolute hidden w-[200px] rounded-[28px] border border-white/10 bg-[#0c1320]/82 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:block ${item.className}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className={`pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br ${item.accent}`} />
      <div className="relative">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">Luna Stack</p>
          </div>
        </div>
        <p className="text-sm leading-6 text-zinc-300">{item.detail}</p>
      </div>
    </motion.div>
  );
}
