import type { ReactNode } from "react";
import { Apple, ArrowUpRight, Download, Smartphone } from "lucide-react";
import { getNativeDownloadOptions } from "@/lib/native-app-links";

interface NativeAppDownloadsProps {
  compact?: boolean;
  className?: string;
}

function DownloadLink({
  item,
  icon,
  compact = false,
}: {
  item: {
    href: string;
    label: string;
    platform: "android" | "ios";
    preferred: boolean;
    directDownload: boolean;
  };
  icon: ReactNode;
  compact?: boolean;
}) {
  const deviceHint = item.preferred ? "Recommended for this device" : "";

  return (
    <a
      href={item.href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${item.label}${deviceHint ? ` - ${deviceHint}` : ""}`}
      title={deviceHint || item.label}
      download={item.directDownload ? "" : undefined}
      className={`inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/10 hover:border-white/20 ${
        compact ? "px-3 py-2 text-xs font-medium" : "px-4 py-2.5 text-sm font-semibold"
      }`}
    >
      {icon}
      <span>{item.label}</span>
      {item.preferred ? (
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-emerald-100">
          This device
        </span>
      ) : null}
      <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
    </a>
  );
}

export function NativeAppDownloads({ compact = false, className = "" }: NativeAppDownloadsProps) {
  const downloadOptions = getNativeDownloadOptions();

  if (!downloadOptions.length) return null;

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2.5">
        {downloadOptions.map((item) => (
          <DownloadLink
            key={item.platform}
            item={item}
            compact={compact}
            icon={
              item.platform === "ios" ? (
                <Apple className="h-4 w-4" />
              ) : (
                <>
                  <Smartphone className="h-4 w-4" />
                  <Download className="h-3.5 w-3.5 opacity-80" />
                </>
              )
            }
          />
        ))}
      </div>
      {downloadOptions.some((item) => item.platform === "ios") ? (
        <p className="mt-2 text-xs leading-5 text-white/55">
          iPhone and iPad installs run through TestFlight or the App Store link you configure.
        </p>
      ) : null}
    </div>
  );
}
