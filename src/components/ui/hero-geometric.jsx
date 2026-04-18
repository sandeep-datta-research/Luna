import { useEffect, useState } from "react";
import { easeInOut, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Orb from "@/components/ui/orb";
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

export default function HeroGeometric({ mobileLanding = false }) {
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

  const primaryHref = isSignedIn ? "/chat" : "/signin";
  const primaryLabel = isSignedIn ? "Start Chat" : "Get Started";

  return (
    <section className={`relative flex w-full items-center justify-center overflow-hidden bg-[#07070d] ${mobileLanding ? "min-h-[calc(100vh-132px)]" : "min-h-[calc(100vh-70px)]"}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(82,39,255,0.1),transparent_40%),radial-gradient(circle_at_84%_18%,rgba(177,158,239,0.08),transparent_34%),linear-gradient(180deg,#06070c,#080910)]" />

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

      <div className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${mobileLanding ? "h-[308px] w-[308px]" : "h-[430px] w-[430px] sm:h-[540px] sm:w-[540px]"}`}>
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${mobileLanding ? "scale-[0.285]" : "scale-[0.38] sm:scale-[0.52]"}`}
          style={{ width: "1080px", height: "1080px", position: "relative" }}
        >
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.12),transparent_56%)] blur-2xl" />
          <div className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.12),transparent_62%)] opacity-65 blur-lg" />
          <div
            className="absolute inset-[8%] rounded-full bg-[conic-gradient(from_120deg,rgba(124,58,237,0.28),rgba(79,70,229,0.02),rgba(124,58,237,0.24))] opacity-55"
            style={{
              WebkitMaskImage: "radial-gradient(circle, transparent 66%, #000 67%)",
              maskImage: "radial-gradient(circle, transparent 66%, #000 67%)",
            }}
          />
          <Orb
            hue={248}
            hoverIntensity={1.1}
            rotateOnHover
            forceHoverState={false}
            backgroundColor="#07070d"
          />
        </div>
      </div>

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
              One interface. Multiple AI minds. Meet Luna.
            </p>
          </Motion.div>

          <Motion.div
            custom={3}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className={`flex flex-col justify-center gap-4 ${mobileLanding ? "" : "sm:flex-row"}`}
          >
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

            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border border-white/10 bg-white/5 text-zinc-100 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10"
            >
              <a href="#features">View Features</a>
            </Button>
          </Motion.div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07070d] via-transparent to-[#07070d]/35" />
    </section>
  );
}
