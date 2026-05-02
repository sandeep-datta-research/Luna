import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { COMMAND_MODES, revealItem, staggerContainer } from "./constants";

interface CommandModeRailProps {
  compact?: boolean;
}

export function CommandModeRail({ compact = false }: CommandModeRailProps) {
  return (
    <section className={`${compact ? "" : "mx-auto mt-32 w-full max-w-7xl px-6 lg:px-12"}`}>
      <motion.div
        {...staggerContainer}
        className={`grid gap-12 ${compact ? "" : "lg:grid-cols-[1.1fr_0.9fr] lg:items-center"}`}
      >
        <motion.div
          variants={revealItem}
          className="rounded-[48px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-10 shadow-[0_40px_100px_rgba(0,0,0,0.3)] backdrop-blur-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-violet-300">
            Workflows
          </div>
          <h2 className="mt-6 text-4xl font-bold text-white tracking-tight sm:text-5xl">Pre-framed entry points.</h2>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Luna eliminates the "empty box" problem with guided workspace modes. Turn raw intent into actionable 
            research, technical fix paths, and executive-ready memos instantly.
          </p>

          <div className="mt-10 grid gap-4">
            {COMMAND_MODES.map((mode, i) => (
              <motion.div
                key={mode.label}
                initial={{ opacity: 0, x: -22 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: i * 0.09, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ x: 8, y: -2 }}
                className="group relative cursor-pointer overflow-hidden rounded-[28px] border border-white/5 bg-white/[0.02] p-5 transition-all hover:bg-white/[0.05] hover:border-white/10"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${mode.tone}`} />
                <div className="relative flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white group-hover:bg-white/10 transition-colors">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white tracking-tight">{mode.label}</p>
                      <p className="mt-1 text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">{mode.prompt}</p>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-all">
                    <ArrowRight className="h-4 w-4 text-white" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={revealItem}
          whileHover={{ y: -10, rotateZ: 1 }}
          className="relative rounded-[48px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,28,0.95),rgba(10,12,18,0.88))] p-8 shadow-[0_60px_140px_rgba(0,0,0,0.4)]"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="absolute -inset-2 bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-500/10 blur-2xl rounded-[50px] pointer-events-none" />
          
          <div className="relative rounded-[32px] border border-white/5 bg-black/40 p-6 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-bold">System Preview</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                <div className="h-1 w-1 rounded-full bg-current animate-pulse" />
                Live
              </span>
            </div>

            <div className="mt-8 space-y-5">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-sm font-medium text-cyan-50 shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
              >
                Draft a technical architecture review for the new spatial module. Identify performance bottlenecks and thread-safety risks.
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="ml-auto max-w-[90%] rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-relaxed text-zinc-300 shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
              >
                Analyzing context... Mode matched: <span className="font-bold text-white">Technical Review</span>. <br />
                <span className="mt-2 block text-zinc-500">Scanning spatial-module/core.ts for race conditions and memory leaks...</span>
              </motion.div>
              
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-[9px] uppercase tracking-[0.24em] text-zinc-500 font-bold">
                <div className="flex items-center gap-2 text-cyan-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                  Context active
                </div>
                <div className="flex items-center gap-2 text-violet-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                  Routing fixed
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                  Ready
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
