import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import lunaLogo from "@/assets/luna-logo.svg";

interface MobileNavbarProps {
  ctaHref: string;
  onOpenMenu: () => void;
  logoSrc?: string;
}

export function MobileNavbar({ ctaHref, onOpenMenu, logoSrc = lunaLogo }: MobileNavbarProps) {
  return (
    <header className="relative z-20 flex h-14 items-center justify-between px-4">
      <motion.button
        type="button"
        onClick={onOpenMenu}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white backdrop-blur-md"
        aria-label="Open menu"
        whileHover={{ y: -2, scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
      >
        <Menu className="h-5 w-5" />
      </motion.button>

      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur-md">
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
          <img src={logoSrc} alt="Luna" className="h-full w-full object-cover" />
        </span>
        <span className="text-sm font-semibold tracking-[0.02em] text-white">Luna</span>
      </div>

      <motion.div whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
        <Link
          to={ctaHref}
          className="rounded-full border border-violet-300/25 bg-gradient-to-r from-violet-500/45 to-fuchsia-400/30 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_22px_rgba(124,92,255,0.28)] backdrop-blur-md"
        >
          Start Chat
        </Link>
      </motion.div>
    </header>
  );
}
