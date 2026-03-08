"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

export const DashboardCard = memo(({ stat, index }) => {
  const Icon = stat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative"
    >
      <div className="rounded-xl border border-zinc-800/80 bg-[#14141d]/80 p-5 transition-all duration-200 hover:border-zinc-700 hover:bg-[#171722]">
        <div className="mb-4 flex items-center justify-between">
          <div className={`rounded-lg p-3 ${stat.bgColor}`}>
            <Icon className={`h-5 w-5 ${stat.color}`} />
          </div>

          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              stat.changeType === "positive" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            <TrendingUp className={`h-4 w-4 ${stat.changeType === "negative" ? "rotate-180" : ""}`} />
            <span>{stat.change}</span>
          </div>
        </div>

        <div className="mb-3">
          <h3 className="mb-1 text-3xl font-bold text-zinc-100">{stat.value}</h3>
          <p className="text-sm font-medium text-zinc-400">{stat.title}</p>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${65 + index * 8}%` }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className={`h-full rounded-full ${stat.color.replace("text-", "bg-")}`}
          />
        </div>
      </div>
    </motion.div>
  );
});

DashboardCard.displayName = "DashboardCard";
