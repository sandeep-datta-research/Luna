import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Menu, Mic, Send, Sparkles } from "lucide-react";
import { getStoredUser, hydrateUser } from "@/lib/api-client";
import lunaLogo from "@/assets/luna.png";

function BackgroundDecor() {
  const starDots = [
    "left-[12%] top-[14%]",
    "left-[22%] top-[28%]",
    "left-[80%] top-[18%]",
    "left-[72%] top-[34%]",
    "left-[16%] top-[68%]",
    "left-[84%] top-[74%]",
    "left-[36%] top-[82%]",
    "left-[64%] top-[88%]",
    "left-[52%] top-[12%]",
    "left-[90%] top-[52%]",
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#11182B] via-[#0B0F1A] to-[#090D16]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,92,255,0.14),transparent_34%),radial-gradient(circle_at_80%_24%,rgba(77,163,255,0.12),transparent_24%),radial-gradient(circle_at_50%_84%,rgba(210,91,255,0.08),transparent_28%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_0.8px,transparent_0.8px)] [background-size:18px_18px] opacity-[0.14]" />

      <div className="absolute -left-12 top-24 h-32 w-24 rotate-[-24deg] rounded-full bg-[#7C5CFF]/18 blur-3xl" />
      <div className="absolute right-[-18px] top-20 h-24 w-32 rotate-[28deg] rounded-full bg-[#4DA3FF]/16 blur-3xl" />
      <div className="absolute left-10 top-[58%] h-20 w-36 rotate-[18deg] rounded-full bg-fuchsia-400/12 blur-3xl" />
      <div className="absolute right-8 top-[70%] h-24 w-20 rotate-[-18deg] rounded-full bg-[#7C5CFF]/14 blur-3xl" />
      <div className="absolute left-[34%] top-[10%] h-14 w-14 rounded-full bg-white/6 blur-2xl" />

      {starDots.map((position) => (
        <span
          key={position}
          className={`absolute h-1 w-1 rounded-full bg-white/50 shadow-[0_0_10px_rgba(124,92,255,0.55)] ${position}`}
        />
      ))}
    </div>
  );
}

function Navbar({ ctaHref }) {
  return (
    <header className="relative z-20 flex h-14 items-center justify-between px-4">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white backdrop-blur-md"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur-md">
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
          <img src={lunaLogo} alt="Luna" className="h-full w-full object-cover" />
        </span>
        <span className="text-sm font-semibold tracking-[0.02em] text-white">Luna</span>
      </div>

      <Link
        to={ctaHref}
        className="rounded-full border border-[#9D88FF]/40 bg-gradient-to-r from-[#7C5CFF]/30 to-[#D65BFF]/20 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_24px_rgba(124,92,255,0.28)] backdrop-blur-md"
      >
        Start Chat
      </Link>
    </header>
  );
}

function CTAButtons({ primaryHref }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6">
      <motion.div whileTap={{ scale: 0.97 }} className="w-full">
        <Link
          to={primaryHref}
          className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#7C5CFF] via-[#9A5CFF] to-[#E25BFF] text-sm font-semibold text-white shadow-[0_0_26px_rgba(160,92,255,0.42)]"
        >
          Start Chat
        </Link>
      </motion.div>

      <motion.div whileTap={{ scale: 0.985 }} className="w-full">
        <Link
          to="/features"
          className="flex h-12 w-full items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-medium text-white/90 backdrop-blur-md shadow-[0_0_22px_rgba(124,92,255,0.12)]"
        >
          View Features
        </Link>
      </motion.div>
    </div>
  );
}

function HeroCircle({ primaryHref }) {
  return (
    <section className="relative z-10 flex flex-1 items-center justify-center px-4 pb-6 pt-4">
      <div className="relative flex h-[min(78vw,300px)] w-[min(78vw,300px)] min-h-[264px] min-w-[264px] max-h-[300px] max-w-[300px] items-center justify-center">
        <div className="absolute inset-[-12%] rounded-full bg-[radial-gradient(circle,rgba(124,92,255,0.38)_0%,rgba(124,92,255,0.16)_34%,rgba(77,163,255,0.12)_52%,transparent_72%)] blur-2xl" />
        <div className="absolute inset-[-5%] rounded-full bg-[conic-gradient(from_180deg,#f05cff_0deg,#7C5CFF_130deg,#4DA3FF_260deg,#f05cff_360deg)] opacity-70 blur-lg" />
        <div className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-[1.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_48px_rgba(124,92,255,0.24)]">
          <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_30%,rgba(124,92,255,0.18),rgba(11,15,26,0.96)_58%,rgba(8,11,20,1)_100%)] px-7 text-center backdrop-blur-xl">
            <div className="absolute inset-[7%] rounded-full border border-white/10 opacity-55" />
            <div className="absolute inset-[15%] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_62%)]" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-4 inline-flex items-center gap-1 rounded-full border border-[#A897FF]/30 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[#E8DDFF] shadow-[0_0_18px_rgba(124,92,255,0.22)]">
                <Sparkles className="h-3 w-3" />
                Luna
              </div>

              <h1 className="max-w-[180px] text-[30px] font-extrabold uppercase leading-[1.02] tracking-[0.22em] text-white">
                Grow and Learn
              </h1>

              <p className="mt-4 text-[15px] font-medium text-white/90">
                Luna Your digital friend
              </p>

              <p className="mt-3 max-w-[198px] text-[13px] leading-5 text-gray-400">
                One interface. Multiple AI minds. Meet Luna.
              </p>

              <div className="mt-6 w-full">
                <CTAButtons primaryHref={primaryHref} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InputPreview({ ctaHref }) {
  return (
    <div className="relative z-20 px-4 pb-5">
      <Link
        to={ctaHref}
        className="flex h-16 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 backdrop-blur-md shadow-[0_0_32px_rgba(124,92,255,0.14)]"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80">
          <Mic className="h-4 w-4" />
        </div>
        <span className="flex-1 text-sm text-gray-400">Start Chat...</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#7C5CFF] to-[#D65BFF] text-white shadow-[0_0_18px_rgba(124,92,255,0.38)]">
          <Send className="h-4 w-4" />
        </div>
      </Link>
    </div>
  );
}

function MobileLayout({ ctaHref }) {
  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[420px] flex-col overflow-hidden">
      <BackgroundDecor />
      <div className="relative flex min-h-screen flex-col">
        <Navbar ctaHref={ctaHref} />
        <HeroCircle primaryHref={ctaHref} />
        <InputPreview ctaHref={ctaHref} />
      </div>
    </div>
  );
}

export default function Home() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      if (typeof window === "undefined") return;
      const user = getStoredUser();
      setIsSignedIn(Boolean(user?.email || user?.name));
    };

    syncAuth();
    hydrateUser().then(syncAuth).catch(syncAuth);
    window.addEventListener("storage", syncAuth);
    window.addEventListener("luna-auth-changed", syncAuth);
    window.addEventListener("focus", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("luna-auth-changed", syncAuth);
      window.removeEventListener("focus", syncAuth);
    };
  }, []);

  const ctaHref = useMemo(() => (isSignedIn ? "/chat" : "/signin"), [isSignedIn]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#0B0F1A] text-white">
      <MobileLayout ctaHref={ctaHref} />
    </div>
  );
}
