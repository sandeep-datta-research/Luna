import { motion } from "framer-motion";
import { fadeInUp, revealItem, staggerContainer, WORKFLOW_STEPS } from "./constants";

interface WorkflowTimelineProps {
  compact?: boolean;
}

export function WorkflowTimeline({ compact = false }: WorkflowTimelineProps) {
  return (
    <section className={`${compact ? "" : "mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8"}`}>
      <motion.div
        {...fadeInUp}
        className={`rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,13,19,0.95),rgba(7,9,14,0.86))] p-6 shadow-[0_30px_110px_rgba(0,0,0,0.2)] ${compact ? "" : "sm:p-8"}`}
      >
        <div className={`${compact ? "" : "flex items-end justify-between gap-6"}`}>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Workflow Arc</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">A smoother path from prompt to polished output.</h2>
          </div>
          {!compact ? (
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-300">
              The homepage should signal how the product works. This timeline makes Luna feel more like a
              professional system with stages, not a generic chat box.
            </p>
          ) : null}
        </div>

        <motion.div className={`mt-8 grid gap-4 ${compact ? "" : "md:grid-cols-3"}`} {...staggerContainer}>
          {WORKFLOW_STEPS.map((item) => (
            <motion.div
              key={item.step}
              variants={revealItem}
              whileHover={{ y: -8, scale: 1.01 }}
              className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_36%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <p className="relative text-xs uppercase tracking-[0.24em] text-cyan-200/80">{item.step}</p>
              <h3 className="relative mt-3 text-xl font-semibold text-white">{item.title}</h3>
              <p className="relative mt-3 text-sm leading-7 text-zinc-300">{item.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
