import { motion } from "framer-motion";

export function SidebarButton({ icon, label, onClick, collapsed = false, danger = false }) {
  const IconComponent = icon;
  return (
    <motion.button
      whileHover={{ y: -1, scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      type="button"
      onClick={onClick}
      title={label}
      className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition-all duration-150 ${
        danger
          ? "border-rose-500/25 bg-rose-500/10 text-rose-100 hover:border-rose-400/35 hover:bg-rose-500/15"
          : "border-white/8 bg-white/[0.03] text-[#d7e0eb] hover:border-[#4f7c75]/50 hover:bg-[#101f22]/70 hover:text-white"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <IconComponent className="h-4 w-4 shrink-0" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </motion.button>
  );
}
