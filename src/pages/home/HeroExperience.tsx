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
  const textY = useTransform(scrollYProgress, [0, 0.22], [0, -60]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const visualY = useTransform(scrollYProgress, [0, 0.3], [0, 100]);
  const visualScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.9]);
  const visualRotate = useTransform(scrollYProgress, [0, 0.22], [0, -8]);
  const ribbonsOpacity = useTransform(scrollYProgress, [0, 0.15], [0.8, 0]);
  const bgScale = useTransform(scrollYProgress, [0, 0.4], [1, 1.1]);

  return (
    <section className="relative min-h-[110vh] overflow-hidden">
      <motion.div 
        style={{ scale: bgScale }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(88,165,255,0.15),transparent_35%),radial-gradient(circle_at_78%_18%,rgba(168,85,247,0.15),transparent_40%),radial-gradient(circle_at_50%_85%,rgba(16,185,129,0.08),transparent_45%)]" 
      />
      <motion.div className="absolute inset-x-0 top-0 h-[640px] overflow-hidden" style={{ opacity: ribbonsOpacity }}>
        <Ribbons
          className="absolute inset-0 opacity-60"
          colors={["#59d3ff", "#8b5cf6", "#22c55e"]}
          baseThickness={42}
          speedMultiplier={0.35}
          maxAge={500}
          enableFade
          enableShaderEffect
        />
      </motion.div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-16 px-6 pb-24 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:pb-32 lg:pt-20">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10"
          style={{ y: textY, opacity: textOpacity }}
        >
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2.5 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.32em] text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.1)] backdrop-blur-md"
          >
            <Zap className="h-4 w-4 text-cyan-400" />
            The Intelligence Layer
          </motion.div>

          <h1 className="mt-8 max-w-[14ch] text-6xl font-bold leading-[0.92] tracking-[-0.06em] text-white sm:text-7xl lg:text-8xl">
            Smarter. <br />
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Spatial.</span> <br />
            Serious.
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
            Luna is a high-performance workspace designed for research, technical execution, and strategic writing. Guided by spatial cues and a cinematic command surface.
          </p>

          <div className="mt-10 flex flex-wrap gap-5">
            <Link
              to={ctaHref}
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-white px-8 py-4 text-base font-bold text-black transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.15)]"
            >
              <span className="relative z-10">{isSignedIn ? "Open Workspace" : "Get Started"}</span>
              <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-cyan-200 to-white transition-transform group-hover:translate-x-0" />
            </Link>
            
            <Link
              to="/features"
              className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-xl transition-all hover:bg-white/10 hover:border-white/20"
            >
              Tour Features
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-6 border-t border-white/5 pt-10">
            {HERO_SIGNAL_ITEMS.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <p className="text-2xl font-bold text-white tracking-tight">{item.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="relative flex min-h-[600px] items-center justify-center lg:min-h-[700px]"
          style={{ y: visualY, rotateZ: visualRotate, scale: visualScale }}
        >
          {MOTION_STACK.map((item, index) => (
            <MotionPanel key={item.title} item={item} index={index} />
          ))}

          <div className="absolute inset-0 rounded-[48px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,24,0.92),rgba(7,9,13,0.72))] shadow-[0_60px_160px_rgba(0,0,0,0.5)] backdrop-blur-3xl" />
          <div className="absolute inset-[1px] rounded-[48px] border border-white/5 bg-gradient-to-b from-white/5 to-transparent" />

          <motion.div
            animate={{ y: [0, -20, 0], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-10 top-12 h-40 w-40 rounded-full bg-cyan-500/20 blur-[80px]"
          />
          <motion.div
            animate={{ y: [0, 20, 0], opacity: [0.2, 0.3, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-16 right-16 h-48 w-48 rounded-full bg-violet-600/20 blur-[100px]"
          />

          <div className="relative z-10 flex w-full max-w-[500px] flex-col items-center px-8 py-12">
            <div className="relative flex h-[280px] w-[280px] items-center justify-center sm:h-[320px] sm:w-[320px]">
              <motion.div
                animate={{ y: [0, -15, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <Orb
                  hue={194}
                  hoverIntensity={0.8}
                  rotateOnHover={true}
                  backgroundColor="#071018"
                  logoSrc={logoSrc}
                  logoClassName="scale-[1.15] drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                />
              </motion.div>
            </div>

            <div className="mt-12 grid w-full gap-5 md:grid-cols-[1.1fr_0.9fr]">
              <motion.div
                whileHover={{ y: -8, rotateX: 3, rotateY: -3 }}
                className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-3xl"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-400 font-bold">Workspace</p>
                    <p className="mt-2 text-xl font-bold text-white tracking-tight">Executive Grade</p>
                  </div>
                  <Sparkles className="h-6 w-6 text-cyan-300" />
                </div>
                <p className="mt-5 text-[15px] leading-relaxed text-zinc-400">
                  Precision-tuned motion and spatial context organized into a clearer command surface.
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -8, rotateX: 3, rotateY: 3 }}
                className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,18,28,0.98),rgba(10,12,18,0.85))] p-5"
                style={{ transformStyle: "preserve-3d" }}
              >
                <p className="px-1 text-[10px] uppercase tracking-[0.24em] text-violet-400 font-bold">Analytics</p>
                <div className="mt-4 h-[190px] rounded-[24px] border border-white/5 bg-black/40 overflow-hidden">
                  <Earth
                    className="max-w-none scale-[1.15]"
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
