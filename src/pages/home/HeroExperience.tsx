import React from "react";
import { motion, useTransform, MotionValue } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Download, Sparkles, Zap } from "lucide-react";
import Orb from "@/components/ui/orb";
import Earth from "@/components/ui/globe";
import Ribbons from "@/components/ui/ribbons";
import { SignalStat } from "./SignalStat";
import { MotionPanel } from "./MotionPanel";
import { HERO_SIGNAL_ITEMS, MOTION_STACK } from "./constants";

interface HeroExperienceProps {
  ctaHref: string;
  isSignedIn: boolean;
  scrollYProgress: MotionValue<number>;
  logoSrc: string;
  canInstallApp: boolean;
  showIosInstallHint: boolean;
  installingApp: boolean;
  onInstall: () => void;
}

export function HeroExperience({
  ctaHref,
  isSignedIn,
  scrollYProgress,
  logoSrc,
  canInstallApp,
  showIosInstallHint,
  installingApp,
  onInstall,
}: HeroExperienceProps) {
  const textY = useTransform(scrollYProgress, [0, 0.22], [0, -42]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0.82]);
  const visualY = useTransform(scrollYProgress, [0, 0.22], [0, 58]);
  const visualRotate = useTransform(scrollYProgress, [0, 0.22], [0, -5]);
  const ribbonsOpacity = useTransform(scrollYProgress, [0, 0.18], [0.75, 0.18]);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(88,165,255,0.18),transparent_25%),radial-gradient(circle_at_78%_18%,rgba(168,85,247,0.18),transparent_28%),radial-gradient(circle_at_50%_85%,rgba(16,185,129,0.12),transparent_34%)]" />
      <motion.div className="absolute inset-x-0 top-0 h-[520px] overflow-hidden" style={{ opacity: ribbonsOpacity }}>
        <Ribbons
          className="absolute inset-0 opacity-70"
          colors={["#59d3ff", "#8b5cf6", "#22c55e"]}
          baseThickness={36}
          speedMultiplier={0.45}
          maxAge={420}
          enableFade
          enableShaderEffect
        />
      </motion.div>

      <div className="relative mx-auto grid min-h-[calc(100vh-84px)] w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-20 lg:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10"
          style={{ y: textY, opacity: textOpacity }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-cyan-100">
            <Zap className="h-3.5 w-3.5" />
            Professional AI Workspace
          </div>

          <h1 className="mt-6 max-w-[12ch] text-5xl font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
            Built to feel fast, spatial, and serious.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
            Luna now leads with a smoother 3D presence, clearer information hierarchy, and a more
            polished command surface for research, writing, and daily execution.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to={ctaHref}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-gradient-to-r from-cyan-400/80 to-sky-500/70 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(56,189,248,0.3)]"
            >
              {isSignedIn ? "Open Workspace" : "Enter Luna"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/features"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl"
            >
              Explore Features
            </Link>
            {(canInstallApp || showIosInstallHint) ? (
              <button
                type="button"
                onClick={onInstall}
                disabled={installingApp}
                className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-[#20190f] px-6 py-3 text-sm font-semibold text-amber-100 backdrop-blur-xl disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                Install Luna
              </button>
            ) : null}
          </div>

          {(canInstallApp || showIosInstallHint) ? (
            <p className="mt-4 text-sm text-zinc-400">
              Install Luna directly from the web. Supported browsers will show an install prompt, and iPhone/iPad can use Add to Home Screen.
            </p>
          ) : null}

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {HERO_SIGNAL_ITEMS.map((item) => (
              <SignalStat key={item.label} item={item} />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.08 }}
          className="relative flex min-h-[540px] items-center justify-center"
          style={{ y: visualY, rotateZ: visualRotate }}
        >
          {MOTION_STACK.map((item, index) => (
            <MotionPanel key={item.title} item={item} index={index} />
          ))}

          <div className="absolute inset-0 rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,24,0.86),rgba(7,9,13,0.56))] shadow-[0_40px_140px_rgba(0,0,0,0.38)] backdrop-blur-2xl" />
          <div className="absolute inset-[1px] rounded-[38px] border border-white/8" />

          <motion.div
            animate={{ y: [0, -14, 0], rotate: [0, 4, 0] }}
            transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="absolute left-6 top-8 h-24 w-24 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.34),transparent_65%)] blur-2xl"
          />
          <motion.div
            animate={{ y: [0, 12, 0], x: [0, -10, 0] }}
            transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="absolute bottom-10 right-10 h-28 w-28 rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.32),transparent_65%)] blur-2xl"
          />

          <div className="relative z-10 flex w-full max-w-[460px] flex-col items-center px-6 py-8">
            <div className="relative flex h-[220px] w-[220px] items-center justify-center sm:h-[250px] sm:w-[250px]">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <Orb
                  hue={194}
                  hoverIntensity={0.6}
                  rotateOnHover={false}
                  backgroundColor="#071018"
                  logoSrc={logoSrc}
                  logoClassName="scale-[1.08]"
                />
              </motion.div>
            </div>

            <div className="mt-8 grid w-full gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <motion.div
                whileHover={{ y: -6, rotateX: 2, rotateY: -2 }}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Response Layer</p>
                    <p className="mt-2 text-lg font-semibold text-white">Smooth, guided, executive-grade</p>
                  </div>
                  <Sparkles className="h-5 w-5 text-cyan-200" />
                </div>
                <p className="mt-4 text-sm leading-7 text-zinc-300">
                  Cleaner motion, calmer gradients, and better spatial cues make the homepage feel
                  like a product surface rather than a collection of sections.
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -6, rotateX: 2, rotateY: 2 }}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,28,0.95),rgba(10,12,18,0.8))] p-4"
                style={{ transformStyle: "preserve-3d" }}
              >
                <p className="px-1 text-xs uppercase tracking-[0.24em] text-zinc-400">Global Context</p>
                <div className="mt-3 h-[180px] rounded-[22px] border border-white/8 bg-black/30">
                  <Earth
                    className="max-w-none scale-[1.08]"
                    baseColor={[0.17, 0.67, 0.92]}
                    glowColor={[0.39, 0.33, 0.97]}
                    markerColor={[0.45, 0.96, 0.82]}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
