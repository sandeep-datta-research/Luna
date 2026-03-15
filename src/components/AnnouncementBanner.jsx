import { useEffect, useMemo, useState } from "react";
import { Megaphone, Tag, X } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

const DISMISS_KEY = "luna_announcements_dismissed";

function readDismissed() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(nextSet) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(nextSet)));
}

function variantStyles(variant) {
  if (variant === "discount") {
    return {
      badge: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
      ring: "ring-emerald-400/40",
      icon: Tag,
    };
  }
  if (variant === "event") {
    return {
      badge: "border-amber-400/40 bg-amber-500/15 text-amber-200",
      ring: "ring-amber-400/40",
      icon: Megaphone,
    };
  }
  return {
    badge: "border-violet-400/40 bg-violet-500/15 text-violet-200",
    ring: "ring-violet-400/40",
    icon: Megaphone,
  };
}

export default function AnnouncementBanner({ className = "" }) {
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useState(() => readDismissed());
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      const res = await fetchApi("/api/announcements", {}, { includeAuth: false, includeGuest: false });
      if (!active) return;
      if (!res.ok) {
        setError(res.message || "Failed to load announcements");
        return;
      }
      setItems(Array.isArray(res.data?.announcements) ? res.data.announcements : []);
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(
    () => items.filter((item) => item?.id && !dismissed.has(item.id)),
    [items, dismissed],
  );

  if (!visibleItems.length || error) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {visibleItems.slice(0, 3).map((item) => {
        const style = variantStyles(item.variant);
        const Icon = style.icon;

        return (
          <div
            key={item.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#101322]/80 px-4 py-3 text-sm text-zinc-200 shadow-[0_0_0_1px_rgba(124,58,237,0.08)] ring-1 ${style.ring}`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${style.badge}`}>
                <Icon className="h-3 w-3" />
                {item.variant || "info"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-400">{item.message}</p>
                {item.ctaLabel && item.ctaHref ? (
                  <a href={item.ctaHref} className="mt-2 inline-flex text-xs font-medium text-violet-200 hover:text-violet-100">
                    {item.ctaLabel}
                  </a>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = new Set(dismissed);
                next.add(item.id);
                setDismissed(next);
                writeDismissed(next);
              }}
              className="rounded-full border border-white/10 bg-white/5 p-1 text-zinc-300 hover:bg-white/10"
              aria-label="Dismiss announcement"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
