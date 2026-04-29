import { useId } from "react";
import { motion } from "framer-motion";
import { hoverFloat } from "./constants";
import { UserMetrics } from "./types";

interface UserGrowthSectionProps {
  userMetrics: UserMetrics;
  chartPoints: string;
  compact?: boolean;
}

export function UserGrowthSection({ userMetrics, chartPoints, compact = false }: UserGrowthSectionProps) {
  const gradientId = useId().replace(/:/g, "");
  const areaId = `${gradientId}-area`;

  return (
    <motion.div
      {...(compact ? {} : hoverFloat)}
      className={`rounded-3xl border border-indigo-300/25 bg-gradient-to-b from-[#121225] to-[#0c0c16] shadow-[0_30px_90px_-55px_rgba(91,106,245,0.7)] ${compact ? "px-4 py-5" : "px-6 py-6 sm:px-8"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-200/70">User Growth</p>
          <h3 className={`mt-2 font-semibold text-white ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
            {userMetrics.total.toLocaleString()} total users
          </h3>
          <p className="mt-2 text-sm text-indigo-100/70">Last {userMetrics.days} days of signups</p>
        </div>
        <div className="rounded-2xl border border-indigo-300/20 bg-indigo-500/5 px-4 py-2 text-xs text-indigo-100/70">
          Updated automatically
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-300/20 bg-[#0b0b14]/70 p-4">
        <svg viewBox="0 0 560 140" className={`w-full ${compact ? "h-[120px]" : "h-[140px]"}`}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5B6AF5" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
            <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(91,106,245,0.35)" />
              <stop offset="100%" stopColor="rgba(91,106,245,0)" />
            </linearGradient>
          </defs>
          <polyline
            points={chartPoints || "8,120 552,120"}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={`${chartPoints || "8,120 552,120"} 552,136 8,136`}
            fill={`url(#${areaId})`}
            stroke="none"
          />
        </svg>
      </div>
    </motion.div>
  );
}
