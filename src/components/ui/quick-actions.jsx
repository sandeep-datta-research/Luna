"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Users, BarChart3, Download, Settings } from "lucide-react";

const actions = [
  {
    icon: Users,
    label: "Add New User",
    style:
      "border-blue-500/35 text-zinc-100 hover:border-blue-400/70 hover:bg-blue-500/10 [&>svg]:text-blue-300",
    shortcut: "Ctrl+N",
    action: "addUser",
  },
  {
    icon: BarChart3,
    label: "View Analytics",
    style:
      "border-emerald-500/35 text-zinc-100 hover:border-emerald-400/70 hover:bg-emerald-500/10 [&>svg]:text-emerald-300",
    shortcut: "Ctrl+A",
    action: "analytics",
  },
  {
    icon: Download,
    label: "Export Data",
    style:
      "border-violet-500/35 text-zinc-100 hover:border-violet-400/70 hover:bg-violet-500/10 [&>svg]:text-violet-300",
    shortcut: "Ctrl+E",
    action: "export",
  },
  {
    icon: Settings,
    label: "System Settings",
    style:
      "border-amber-500/35 text-zinc-100 hover:border-amber-400/70 hover:bg-amber-500/10 [&>svg]:text-amber-300",
    shortcut: "Ctrl+S",
    action: "settings",
  },
];

export const QuickActions = memo(({ onAddUser, onExport }) => {
  const handleAction = (action) => {
    switch (action) {
      case "addUser":
        onAddUser();
        break;
      case "analytics":
        console.log("Viewing analytics...");
        break;
      case "export":
        onExport();
        break;
      case "settings":
        console.log("Opening settings...");
        break;
      default:
        break;
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-[#14141d]/80 p-6">
      <h3 className="mb-4 text-xl font-semibold text-zinc-100">Quick Actions</h3>
      <div className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.div key={action.label} whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
              <Button
                variant="outline"
                className={`h-12 w-full justify-start border bg-zinc-900/45 transition-all duration-200 ${action.style}`}
                onClick={() => handleAction(action.action)}
              >
                <Icon className="mr-3 h-5 w-5" />
                <span className="font-medium">{action.label}</span>
                <div className="ml-auto text-xs text-zinc-500">{action.shortcut}</div>
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

QuickActions.displayName = "QuickActions";
