"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Shield, Database, Zap, Activity } from "lucide-react";

const statusItems = [
  {
    label: "Server Status",
    status: "Online",
    color: "text-emerald-400",
    icon: Shield,
    percentage: 100,
  },
  {
    label: "Database",
    status: "Healthy",
    color: "text-emerald-400",
    icon: Database,
    percentage: 95,
  },
  {
    label: "API Response",
    status: "Fast",
    color: "text-blue-400",
    icon: Zap,
    percentage: 98,
  },
  {
    label: "Storage",
    status: "85% Used",
    color: "text-amber-400",
    icon: Activity,
    percentage: 85,
  },
];

export const SystemStatus = memo(() => {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-[#14141d]/80 p-6">
      <h3 className="mb-4 text-xl font-semibold text-zinc-100">System Status</h3>
      <div className="space-y-4">
        {statusItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-transparent p-3 transition-colors hover:border-zinc-800 hover:bg-zinc-900/45"
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-sm font-medium text-zinc-200">{item.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.08 }}
                    className={`h-full rounded-full ${item.color.replace("text-", "bg-")}`}
                  />
                </div>
                <span className={`min-w-[60px] text-right text-sm font-medium ${item.color}`}>{item.status}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

SystemStatus.displayName = "SystemStatus";
