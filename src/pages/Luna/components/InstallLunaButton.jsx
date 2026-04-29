import { Download } from "lucide-react";

export function InstallLunaButton({ onInstall, disabled = false, compact = false }) {
  return (
    <button
      type="button"
      onClick={onInstall}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-2xl border border-[#6f5624] bg-[#2d2413] text-[#f0d79b] transition hover:-translate-y-0.5 hover:bg-[#362b16] disabled:cursor-not-allowed disabled:opacity-60 ${
        compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"
      }`}
    >
      <Download className="h-4 w-4" />
      Install Luna
    </button>
  );
}
