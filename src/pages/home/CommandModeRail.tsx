import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { COMMAND_MODES, fadeInUp } from "./constants";

interface CommandModeRailProps {
  compact?: boolean;
}

export function CommandModeRail({ compact = false }: CommandModeRailProps) {
  return (
    <section className={`${compact ? "" : "mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8"}`}>
      <motion.div
        {...fadeInUp}
        className={`grid gap-4 ${compact ? "" : "lg:grid-cols-[1.05fr_0.95fr]"}`}
      >
        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,24,0.92),rgba(8,10,16,0.88))] p-6 shadow-[0_26px_100px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Command Modes</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Pre-framed ways to start real work.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">
            Instead of an empty box, Luna can feel like a guided workspace. These modes turn the landing
            page into a stronger entry point for research, writing, debugging, and planning.
          </p>

          <div className="mt-6 grid gap-3">
            {COMMAND_MODES.map((mode) => (
              <motion.div
                key={mode.label}
                whileHover={{ y: -5, scale: 1.01 }}
                className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-4"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${mode.tone}`} />
                <div className="relative">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-white">{mode.label}</p>
                    <ArrowRight className="h-4 w-4 text-zinc-400" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{mode.prompt}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          whileHover={{ y: -8, rotateX: 2, rotateY: -2 }}
          className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,28,0.95),rgba(10,12,18,0.84))] p-5 shadow-[0_26px_100px_rgba(0,0,0,0.22)]"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Workspace Preview</p>
                <p className="mt-2 text-lg font-semibold text-white">Professional output, cleaner pacing</p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200">
                Live
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-cyan-300/18 bg-cyan-300/8 p-4 text-sm text-cyan-50">
                Build a strategy memo for the next 90 days with priorities, risk signals, and execution phases.
              </div>
              <div className="ml-auto max-w-[92%] rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-zinc-200">
                Working mode selected: <span className="font-semibold text-white">Strategy Memo</span>.
                Output will stay concise, executive, and decision-oriented with milestones and tradeoffs.
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-xs uppercase tracking-[0.2em] text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                context mapped
                <span className="h-2 w-2 rounded-full bg-violet-300" />
                reasoning staged
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                response prepared
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
