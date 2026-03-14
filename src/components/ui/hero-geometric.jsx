import { useEffect, useState } from "react";
import { easeInOut, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Orb from "@/components/ui/orb";
import { cn } from "@/lib/utils";

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
            "border border-white/25 bg-white/10 backdrop-blur-[10px]",
            "shadow-[0_12px_32px_0_rgba(15,17,35,0.35)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.32),transparent_70%)]",
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

export default function HeroGeometric() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem("luna_google_user");
      const token = (localStorage.getItem("luna_auth_token") || "").trim();
      let hasUser = false;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          hasUser = Boolean(parsed?.email || parsed?.name);
        } catch {
          hasUser = false;
        }
      }
      setIsSignedIn(Boolean(hasUser && token));
    };

    syncAuth();
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
    <section className="relative flex min-h-[calc(100vh-70px)] w-full items-center justify-center overflow-hidden bg-[#07070d]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(82,39,255,0.18),transparent_44%),radial-gradient(circle_at_84%_18%,rgba(177,158,239,0.13),transparent_38%),radial-gradient(circle_at_70%_82%,rgba(255,159,252,0.09),transparent_45%)]" />

      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.25}
          width={600}
          height={140}
          rotate={10}
          gradient="from-violet-400/40"
          className="top-[12%] left-[-12%] md:top-[18%] md:left-[-6%]"
        />

        <ElegantShape
          delay={0.42}
          width={500}
          height={120}
          rotate={-16}
          gradient="from-fuchsia-300/35"
          className="top-[68%] right-[-9%] md:top-[74%] md:right-[-2%]"
        />

        <ElegantShape
          delay={0.34}
          width={320}
          height={84}
          rotate={-7}
          gradient="from-indigo-300/30"
          className="bottom-[6%] left-[4%] md:bottom-[10%] md:left-[9%]"
        />

        <ElegantShape
          delay={0.55}
          width={210}
          height={62}
          rotate={21}
          gradient="from-violet-200/35"
          className="top-[9%] right-[13%] md:top-[14%] md:right-[18%]"
        />

        <ElegantShape
          delay={0.63}
          width={156}
          height={44}
          rotate={-23}
          gradient="from-purple-300/35"
          className="top-[4%] left-[20%] md:top-[9%] md:left-[24%]"
        />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[430px] w-[430px] -translate-x-1/2 -translate-y-1/2 sm:h-[540px] sm:w-[540px]">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.38] sm:scale-[0.52]"
          style={{ width: "1080px", height: "1080px", position: "relative" }}
        >
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.22),transparent_58%)] blur-2xl" />
          <div className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.22),transparent_65%)] opacity-80 blur-xl" />
          <div className="absolute inset-[14%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.18),transparent_62%)] opacity-70 blur-lg" />
          <div
            className="absolute inset-[2%] rounded-full bg-[conic-gradient(from_120deg,rgba(124,58,237,0.55),rgba(79,70,229,0.08),rgba(124,58,237,0.55))] opacity-70"
            style={{
              WebkitMaskImage: "radial-gradient(circle, transparent 62%, #000 63%)",
              maskImage: "radial-gradient(circle, transparent 62%, #000 63%)",
            }}
          />
          <Orb
            hue={262}
            hoverIntensity={2}
            rotateOnHover
            forceHoverState={false}
            backgroundColor="#07070d"
          />
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-[#0f1022]/62 px-4 py-1.5 shadow-sm backdrop-blur-sm md:mb-10"
          >
            <Sparkles className="h-4 w-4 text-violet-300" />
            <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-violet-300 bg-clip-text text-sm font-semibold tracking-wide text-transparent">
              Luna
            </span>
          </Motion.div>

          <Motion.div
            custom={1}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
          >
            <h1 className="mx-3 mb-6 text-white md:mb-8">
              <span className="block text-2xl font-semibold leading-tight tracking-[-0.02em] text-transparent bg-gradient-to-r from-white via-[#E9D5FF] to-[#C4B5FD] bg-clip-text sm:text-4xl md:text-5xl lg:text-6xl">
                GROW AND LEARN
              </span>
              <span className="block pt-2 text-base font-medium leading-relaxed tracking-[0.08em] text-zinc-300 sm:pt-3 sm:text-lg md:text-xl">
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
            <p className="mx-auto mb-10 max-w-2xl px-4 text-base leading-relaxed text-zinc-300 sm:text-lg md:text-xl">
              One interface. Multiple AI minds. Meet Luna.
            </p>
          </Motion.div>

          <Motion.div
            custom={3}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col justify-center gap-4 sm:flex-row"
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

