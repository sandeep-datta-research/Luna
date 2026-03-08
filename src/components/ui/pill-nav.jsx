import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const Motion = motion;

export default function PillNav({
  logo,
  logoAlt = "Company Logo",
  items = [],
  activeHref = "/",
  className,
  ease = "power2.easeOut",
  baseColor = "#09090f",
  pillColor = "#ffffff",
  hoveredPillTextColor = "#0a0a0a",
  pillTextColor = "#0a0a0a",
  theme = "dark",
  initialLoadAnimation = false,
}) {
  const [active, setActive] = useState(() => activeHref || items[0]?.href || "");
  const [hovered, setHovered] = useState(null);

  const resolvedEase = useMemo(() => {
    if (ease === "power2.easeOut") return "easeOut";
    return ease || "easeOut";
  }, [ease]);

  const transition = useMemo(() => {
    if (initialLoadAnimation) {
      return { type: "spring", stiffness: 370, damping: 32 };
    }
    return { duration: 0.22, ease: resolvedEase };
  }, [initialLoadAnimation, resolvedEase]);

  const isDark = theme !== "light";

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-full border px-2 py-2 backdrop-blur-xl",
        isDark ? "border-zinc-700/70 shadow-[0_8px_30px_rgba(0,0,0,0.35)]" : "border-zinc-300/70",
        className,
      )}
      style={{ backgroundColor: baseColor }}
    >
      <Link
        to="/"
        className={cn(
          "flex shrink-0 items-center gap-3 rounded-full px-2 py-1",
          isDark ? "text-zinc-100" : "text-zinc-900",
        )}
      >
        {logo ? (
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl border",
              isDark
                ? "border-zinc-500/60 bg-zinc-900/85 shadow-[0_0_22px_rgba(255,255,255,0.12)]"
                : "border-zinc-300 bg-white",
            )}
          >
            <img
              src={logo}
              alt={logoAlt}
              className={cn(
                "h-7 w-7 object-contain",
                isDark && "brightness-125 contrast-125 drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]",
              )}
            />
          </span>
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/30 bg-violet-500/20 text-xs font-semibold text-violet-200">
            L
          </span>
        )}
        <span className="hidden text-sm font-semibold tracking-wide sm:block">Luna</span>
      </Link>

      <ul className="flex items-center gap-1 overflow-x-auto rounded-full p-1">
        {items.map((item) => {
          const showPill = hovered === item.href || active === item.href;
          const isHash = item.href.startsWith("#");
          const textColor = showPill ? (active === item.href ? pillTextColor : hoveredPillTextColor) : undefined;

          return (
            <li
              key={item.href}
              className="relative"
              onMouseEnter={() => setHovered(item.href)}
              onMouseLeave={() => setHovered(null)}
            >
              {showPill ? (
                <Motion.span
                  layoutId="pill-nav-highlight"
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: pillColor }}
                  transition={transition}
                />
              ) : null}

              {isHash ? (
                <a
                  href={item.href}
                  onClick={() => setActive(item.href)}
                  className={cn(
                    "relative z-10 block whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    showPill ? "" : isDark ? "text-zinc-300 hover:text-zinc-100" : "text-zinc-700 hover:text-zinc-950",
                  )}
                  style={{ color: textColor }}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  to={item.href}
                  onClick={() => setActive(item.href)}
                  className={cn(
                    "relative z-10 block whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    showPill ? "" : isDark ? "text-zinc-300 hover:text-zinc-100" : "text-zinc-700 hover:text-zinc-950",
                  )}
                  style={{ color: textColor }}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

