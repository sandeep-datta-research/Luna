"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { User, Download, Settings, Users } from "lucide-react";

const activities = [
  {
    action: "User login",
    user: "john@example.com",
    time: "2 min ago",
    icon: User,
    color: "text-blue-400",
  },
  {
    action: "Data export",
    user: "admin",
    time: "5 min ago",
    icon: Download,
    color: "text-emerald-400",
  },
  {
    action: "Settings updated",
    user: "admin",
    time: "10 min ago",
    icon: Settings,
    color: "text-amber-400",
  },
  {
    action: "New user registered",
    user: "sarah@example.com",
    time: "15 min ago",
    icon: Users,
    color: "text-violet-400",
  },
];

export const RecentActivity = memo(() => {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-[#14141d]/80 p-6">
      <h3 className="mb-4 text-xl font-semibold text-zinc-100">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="flex items-center gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-zinc-800 hover:bg-zinc-900/45"
            >
              <div className="rounded-lg bg-zinc-800/60 p-2">
                <Icon className={`h-4 w-4 ${activity.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-zinc-200">{activity.action}</div>
                <div className="truncate text-xs text-zinc-500">{activity.user}</div>
              </div>
              <div className="text-xs text-zinc-500">{activity.time}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

RecentActivity.displayName = "RecentActivity";
