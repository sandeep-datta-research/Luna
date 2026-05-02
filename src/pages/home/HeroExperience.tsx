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
  const textY = useTransform(scrollYProgress, [0, 0.22], [0, -40]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0]);
  const visualY = useTransform(scrollYProgress, [0, 0.3], [0, 80]);
  const visualScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.94]);
  const visualRotate = useTransform(scrollYProgress, [0, 0.22], [0, -4]);
  const ribbonsOpacity = useTransform(scrollYProgress, [0, 0.15], [0.8, 0]);
  const bgScale = useTransform(scrollYProgress, [0, 0.4], [1, 1.05]);

  return (
    <section className="relative min-h-screen overflow-hidden">
      <motion.div 
        style={{ scale: bgScale }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(88,165,255,0.12),transparent_35%),radial-gradient(circle_at_78%_18%,rgba(168,85,247,0.12),transparent_40%),radial-gradient(circle_at_50%_85%,rgba(16,185,129,0.06),transparent_45%)]" 
      />
      <motion.div className="absolute inset-x-0 top-0 h-[640px] overflow-hidden" style={{ opacity: ribbonsOpacity }}>
        <Ribbons
          className="absolute inset-0 opacity-50"
          colors={["#59d3ff", "#8b5cf6", "#22c55e"]}
          baseThickness={40}
          speedMultiplier={0.3}
          maxAge={500}
          enableFade
          enableShaderEffect
        />
      </motion.div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-12 px-6 pb-20 pt-28 lg:grid-cols-2 lg:px-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10"
          style={{ y: textY, opacity: textOpacity }}
        >
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.3em] text-cyan-200 backdrop-blur-md"
          >
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            The Intelligence Layer
          </motion.div>

          <h1 className="mt-6 max-w-[14ch] text-5xl font-bold leading-[0.94] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
            Smarter. <br />
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Spatial.</span> <br />
            Serious.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Luna is a high-performance workspace designed for research, technical execution, and strategic writing. Guided by spatial cues and a cinematic command surface.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to={ctaHref}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-7 py-3.5 text-sm font-bold text-black transition-all hover:scale-105 active:scale-95 shadow-[0_15px_35px_rgba(255,255,255,0.1)]"
            >
              <span className="relative z-10">{isSignedIn ? "Open Workspace" : "Get Started"}</span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-cyan-100 to-white transition-transform group-hover:translate-x-0" />
            </Link>
            
            <Link
              to="/features"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-xl transition-all hover:bg-white/10 hover:border-white/20"
            >
              Tour Features
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4 border-t border-white/5 pt-8">
            {HERO_SIGNAL_ITEMS.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <p className="text-xl font-bold text-white tracking-tight">{item.value}</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-medium">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
          className="relative flex min-h-[500px] items-center justify-center lg:min-h-[600px]"
          style={{ y: visualY, rotateZ: visualRotate, scale: visualScale }}
        >
          {MOTION_STACK.map((item, index) => (
            <MotionPanel key={item.title} item={item} index={index} />
          ))}

          <div className="absolute inset-0 rounded-[40px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,24,0.9),rgba(7,9,13,0.7))] shadow-[0_50px_140px_rgba(0,0,0,0.4)] backdrop-blur-3xl" />
          <div className="absolute inset-[1px] rounded-[40px] border border-white/5" />

          <motion.div
            animate={{ y: [0, -15, 0], opacity: [0.2, 0.3, 0.2] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-8 top-10 h-32 w-32 rounded-full bg-cyan-500/15 blur-[60px]"
          />
          <motion.div
            animate={{ y: [0, 15, 0], opacity: [0.2, 0.25, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-12 right-12 h-40 w-40 rounded-full bg-violet-600/15 blur-[80px]"
          />

          <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center px-6 py-10">
            <div className="relative flex h-[240px] w-[240px] items-center justify-center sm:h-[280px] sm:w-[280px]">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <Orb
                  hue={194}
                  hoverIntensity={0.6}
                  rotateOnHover={true}
                  backgroundColor="#071018"
                  logoSrc={logoSrc}
                  logoClassName="scale-[1.1] drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                />
              </motion.div>
            </div>

            <div className="mt-10 grid w-full gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <motion.div
                whileHover={{ y: -6, rotateX: 2, rotateY: -2 }}
                className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-3xl"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-400 font-bold">Workspace</p>
                    <p className="mt-1.5 text-lg font-bold text-white tracking-tight">Executive Grade</p>
                  </div>
                  <Sparkles className="h-5 w-5 text-cyan-300" />
                </div>
                <p className="mt-4 text-[14px] leading-relaxed text-zinc-400">
                  Precision-tuned motion and spatial context.
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -6, rotateX: 2, rotateY: 2 }}
                className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,28,0.95),rgba(10,12,18,0.8))] p-4"
                style={{ transformStyle: "preserve-3d" }}
              >
                <p className="px-1 text-[9px] uppercase tracking-[0.2em] text-violet-400 font-bold">Analytics</p>
                <div className="mt-3 h-[160px] rounded-[20px] border border-white/5 bg-black/40 overflow-hidden">
                  <Earth
                    className="max-w-none scale-[1.1]"
                    baseColor={[0.2, 0.7, 1.0]}
                    glowColor={[0.4, 0.4, 1.0]}
                    markerColor={[0.5, 1.0, 0.8]}
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
