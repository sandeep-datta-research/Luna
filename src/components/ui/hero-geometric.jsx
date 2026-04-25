import { useEffect, useMemo, useState } from "react";
import { easeInOut, motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Search, Sparkles, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Orb from "@/components/ui/orb";
import logo from "@/assets/luna-logo.svg";
import { useBrandingLogo } from "@/lib/branding";
import { cn } from "@/lib/utils";
import { getStoredUser, hydrateUser } from "@/lib/api-client";

const Motion = motion;

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-violet-300/35",
}) {
  return (
    <Motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate,
      }}
      transition={{
        duration: 2.2,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.15 },
      }}
      className={cn("absolute", className)}
    >
      <Motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{
          duration: 14,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "border border-white/18 bg-white/6 backdrop-blur-[8px]",
            "shadow-[0_10px_24px_0_rgba(8,10,22,0.22)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.16),transparent_72%)]",
          )}
        />
      </Motion.div>
    </Motion.div>
  );
}

const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.95,
      delay: 0.35 + index * 0.16,
      ease: easeInOut,
    },
  }),
};

const FLOATING_PANELS = [
  {
    title: "Reasoning",
    body: "Structured thinking with multi-step answers.",
    icon: BrainCircuit,
    accent: "from-cyan-300/40 via-sky-400/18 to-transparent",
    className: "left-[4%] top-[20%] sm:left-[10%] sm:top-[26%]",
    rotate: -10,
    delay: 0.15,
  },
  {
    title: "Live Search",
    body: "Current web context when precision matters.",
    icon: Search,
    accent: "from-violet-300/40 via-fuchsia-400/20 to-transparent",
    className: "right-[2%] top-[18%] sm:right-[8%] sm:top-[22%]",
    rotate: 12,
    delay: 0.25,
  },
  {
    title: "Creative Ops",
    body: "Content, ideas, and production-ready drafting.",
    icon: Wand2,
    accent: "from-amber-300/40 via-orange-300/18 to-transparent",
    className: "bottom-[16%] left-[10%] sm:bottom-[14%] sm:left-[18%]",
    rotate: -8,
    delay: 0.35,
  },
];

function FloatingPanel({ title, body, icon, className, rotate = 0, delay = 0, accent = "" }) {
  const Icon = icon;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96, rotateX: -8, rotateY: rotate * 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0, rotateY: rotate * 0.22 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("hero-3d-card absolute z-20 hidden w-[190px] lg:block", className)}
      style={{ rotate: `${rotate}deg` }}
    >
      <div className="relative overflow-hidden rounded-[26px] border border-white/14 bg-[linear-gradient(180deg,rgba(12,16,30,0.88),rgba(8,10,18,0.8))] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
        <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80", accent)} />
        <div className="pointer-events-none absolute inset-[1px] rounded-[24px] border border-white/8" />
        <div className="relative">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-white">
              {Icon ? <Icon className="h-4 w-4" /> : null}
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">Luna Hub</p>
            </div>
          </div>
          <p className="max-w-[20ch] text-sm leading-6 text-zinc-300">{body}</p>
        </div>
      </div>
    </Motion.div>
  );
}

export default function HeroGeometric({ mobileLanding = false, isSignedIn: controlledIsSignedIn }) {
  const brandLogo = useBrandingLogo(logo);
  const [storedIsSignedIn, setStoredIsSignedIn] = useState(() => {
    if (typeof controlledIsSignedIn === "boolean") return controlledIsSignedIn;
    if (typeof window === "undefined") return false;
    const user = getStoredUser();
    return Boolean(user?.email || user?.name);
  });
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const isSignedIn =
    typeof controlledIsSignedIn === "boolean" ? controlledIsSignedIn : storedIsSignedIn;

  useEffect(() => {
    if (typeof controlledIsSignedIn === "boolean") return undefined;

    const syncAuth = () => {
      if (typeof window === "undefined") return;
      const user = getStoredUser();
      setStoredIsSignedIn(Boolean(user?.email || user?.name));
    };

    hydrateUser().then(syncAuth).catch(syncAuth);
    window.addEventListener("storage", syncAuth);
    window.addEventListener("luna-auth-changed", syncAuth);
    window.addEventListener("focus", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("luna-auth-changed", syncAuth);
      window.removeEventListener("focus", syncAuth);
    };
  }, [controlledIsSignedIn]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setReduceMotion(mediaQuery.matches);
    syncMotionPreference();
    mediaQuery.addEventListener?.("change", syncMotionPreference);
    return () => mediaQuery.removeEventListener?.("change", syncMotionPreference);
  }, []);

  const primaryHref = isSignedIn ? "/chat" : "/signin";
  const primaryLabel = isSignedIn ? "Start Chat" : "Get Started";
  const panelConfigs = useMemo(
    () =>
      FLOATING_PANELS.map((panel) => ({
        ...panel,
        className: mobileLanding
          ? `${panel.className} hidden`
          : panel.className,
      })),
    [mobileLanding],
  );
  const stageTilt = reduceMotion
    ? {}
    : {
        rotateX: pointer.y * -4.5,
        rotateY: pointer.x * 5.5,
        x: pointer.x * 8,
        y: pointer.y * 6,
      };
  const orbDrift = reduceMotion
    ? {}
    : {
        x: pointer.x * -18,
        y: pointer.y * -12,
        rotateZ: pointer.x * 4,
      };

  return (
    <section
      className={`relative flex w-full items-center justify-center overflow-hidden bg-[#07070d] ${mobileLanding ? "min-h-[calc(100vh-132px)]" : "min-h-[calc(100vh-70px)]"}`}
      onMouseMove={(event) => {
        if (reduceMotion) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const nextX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        const nextY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
        setPointer({ x: nextX, y: nextY });
      }}
      onMouseLeave={() => setPointer({ x: 0, y: 0 })}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(82,39,255,0.1),transparent_40%),radial-gradient(circle_at_84%_18%,rgba(177,158,239,0.08),transparent_34%),linear-gradient(180deg,#06070c,#080910)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_15%,rgba(125,211,252,0.05)_35%,transparent_52%,rgba(196,181,253,0.05)_74%,transparent_86%)] opacity-80" />

      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.25}
          width={mobileLanding ? 340 : 600}
          height={mobileLanding ? 92 : 140}
          rotate={10}
          gradient="from-violet-400/40"
          className={mobileLanding ? "top-[10%] left-[-22%]" : "top-[12%] left-[-12%] md:top-[18%] md:left-[-6%]"}
        />

        <ElegantShape
          delay={0.42}
          width={mobileLanding ? 280 : 500}
          height={mobileLanding ? 76 : 120}
          rotate={-16}
          gradient="from-fuchsia-300/35"
          className={mobileLanding ? "top-[64%] right-[-20%]" : "top-[68%] right-[-9%] md:top-[74%] md:right-[-2%]"}
        />

        <ElegantShape
          delay={0.34}
          width={mobileLanding ? 190 : 320}
          height={mobileLanding ? 54 : 84}
          rotate={-7}
          gradient="from-indigo-300/30"
          className={mobileLanding ? "bottom-[10%] left-[-2%]" : "bottom-[6%] left-[4%] md:bottom-[10%] md:left-[9%]"}
        />

        <ElegantShape
          delay={0.55}
          width={mobileLanding ? 130 : 210}
          height={mobileLanding ? 40 : 62}
          rotate={21}
          gradient="from-violet-200/35"
          className={mobileLanding ? "top-[12%] right-[2%]" : "top-[9%] right-[13%] md:top-[14%] md:right-[18%]"}
        />

        <ElegantShape
          delay={0.63}
          width={mobileLanding ? 92 : 156}
          height={mobileLanding ? 28 : 44}
          rotate={-23}
          gradient="from-purple-300/35"
          className={mobileLanding ? "top-[6%] left-[18%]" : "top-[4%] left-[20%] md:top-[9%] md:left-[24%]"}
        />
      </div>

      <Motion.div
        className={`pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 ${mobileLanding ? "h-[308px] w-[308px]" : "h-[430px] w-[430px] sm:h-[540px] sm:w-[540px]"}`}
        animate={stageTilt}
        transition={{ type: "spring", stiffness: 80, damping: 20, mass: 0.7 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {panelConfigs.map((panel) => (
          <FloatingPanel key={panel.title} {...panel} />
        ))}

        <Motion.div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${mobileLanding ? "scale-[0.285]" : "scale-[0.38] sm:scale-[0.52]"}`}
          animate={orbDrift}
          transition={{ type: "spring", stiffness: 65, damping: 18, mass: 0.9 }}
          style={{ width: "1080px", height: "1080px", position: "relative", transformStyle: "preserve-3d" }}
        >
          <Motion.div
            animate={reduceMotion ? {} : { rotate: 360 }}
            transition={{ duration: 26, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
            className="absolute inset-[6%] rounded-full border border-white/8 opacity-60"
            style={{
              WebkitMaskImage: "radial-gradient(circle, transparent 63%, #000 64%)",
              maskImage: "radial-gradient(circle, transparent 63%, #000 64%)",
            }}
          />
          <Motion.div
            animate={reduceMotion ? {} : { rotate: -360 }}
            transition={{ duration: 34, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
            className="absolute inset-[17%] rounded-full border border-cyan-200/10 opacity-70"
            style={{
              WebkitMaskImage: "radial-gradient(circle, transparent 69%, #000 70%)",
              maskImage: "radial-gradient(circle, transparent 69%, #000 70%)",
            }}
          />
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.12),transparent_56%)] blur-2xl" />
          <div className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.12),transparent_62%)] opacity-65 blur-lg" />
          <div
            className="absolute inset-[8%] rounded-full bg-[conic-gradient(from_120deg,rgba(124,58,237,0.28),rgba(79,70,229,0.02),rgba(124,58,237,0.24))] opacity-55"
            style={{
              WebkitMaskImage: "radial-gradient(circle, transparent 66%, #000 67%)",
              maskImage: "radial-gradient(circle, transparent 66%, #000 67%)",
            }}
          />
          <Motion.div
            animate={reduceMotion ? {} : { scale: [1, 1.05, 1], opacity: [0.45, 0.7, 0.45] }}
            transition={{ duration: 7.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="absolute inset-[24%] rounded-full border border-violet-300/15 blur-[1px]"
          />
          <Orb
            hue={248}
            hoverIntensity={1.1}
            rotateOnHover
            forceHoverState={false}
            backgroundColor="#07070d"
            logoSrc={brandLogo}
            logoClassName="scale-[1.08]"
          />
        </Motion.div>
      </Motion.div>

      <div className={`relative z-10 mx-auto w-full ${mobileLanding ? "max-w-[420px] px-4" : "max-w-6xl px-4 md:px-6"}`}>
        <div className={`mx-auto text-center ${mobileLanding ? "max-w-[340px] pt-8" : "max-w-3xl"}`}>
          <Motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className={`inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-[#0f1022]/62 px-4 py-1.5 shadow-sm backdrop-blur-sm ${mobileLanding ? "mb-5" : "mb-7 md:mb-10"}`}
          >
            <Sparkles className="h-4 w-4 text-violet-200" />
            <span className="bg-gradient-to-r from-zinc-100 via-violet-100 to-zinc-200 bg-clip-text text-sm font-semibold tracking-wide text-transparent">
              Luna
            </span>
          </Motion.div>

          <Motion.div
            custom={1}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
          >
            <h1 className={`text-white ${mobileLanding ? "mx-0 mb-4" : "mx-3 mb-6 md:mb-8"}`}>
              <span className={`block font-semibold leading-tight tracking-[-0.03em] text-transparent bg-gradient-to-r from-white via-[#f3f4f6] to-[#cbd5e1] bg-clip-text ${mobileLanding ? "text-[2rem]" : "text-2xl sm:text-4xl md:text-5xl lg:text-6xl"}`}>
                GROW AND LEARN
              </span>
              <span className={`block font-medium leading-relaxed tracking-[0.08em] text-zinc-400 ${mobileLanding ? "pt-2 text-[0.95rem]" : "pt-2 text-base sm:pt-3 sm:text-lg md:text-xl"}`}>
                Luna Your digital friend
              </span>
            </h1>
          </Motion.div>

          <Motion.div
            custom={2}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
          >
            <p className={`mx-auto leading-relaxed text-zinc-400 ${mobileLanding ? "mb-7 max-w-[260px] px-2 text-sm" : "mb-10 max-w-2xl px-4 text-base sm:text-lg md:text-xl"}`}>
              One interface. Multiple AI minds. A more refined AI hub for research, writing, and execution.
            </p>
          </Motion.div>

          <Motion.div
            custom={3}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className={`flex flex-col justify-center gap-4 ${mobileLanding ? "" : "sm:flex-row"}`}
          >
            <Motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.985 }}>
              <Button
                asChild
                size="lg"
                className="rounded-full border border-violet-300/25 bg-gradient-to-r from-violet-500 to-fuchsia-400 px-7 text-white shadow-md shadow-violet-900/30 hover:from-violet-400 hover:to-fuchsia-300"
              >
                <Link to={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Motion.div>

            <Motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.985 }}>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border border-white/10 bg-white/5 text-zinc-100 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10"
              >
                <a href="#features">View Features</a>
              </Button>
            </Motion.div>
          </Motion.div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07070d] via-transparent to-[#07070d]/35" />
    </section>
  );
}
