import { motion, useTransform, type MotionValue } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Download, Globe2, Image, Mic, Sparkles, WandSparkles } from "lucide-react";
import Orb from "@/components/ui/orb";
import Ribbons from "@/components/ui/ribbons";
import { NativeAppDownloads } from "@/components/NativeAppDownloads";

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

const WORK_MODES = [
  { icon: Globe2, label: "Research" },
  { icon: Image, label: "Image creation" },
  { icon: Mic, label: "Voice" },
];

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
  const visualY = useTransform(scrollYProgress, [0, 0.32], [0, 54]);
  const visualScale = useTransform(scrollYProgress, [0, 0.32], [1, 0.94]);
  const ribbonsOpacity = useTransform(scrollYProgress, [0, 0.22], [0.62, 0]);

  return (
    <section className="luna-hero relative isolate min-h-[calc(100svh-4rem)] overflow-hidden">
      <div className="luna-hero-wash pointer-events-none absolute inset-0" />
      <motion.div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden" style={{ opacity: ribbonsOpacity }}>
        <Ribbons className="absolute inset-0 opacity-50" colors={["#67e8f9", "#818cf8", "#c4b5fd"]} baseThickness={34} speedMultiplier={0.28} maxAge={480} enableFade enableShaderEffect />
      </motion.div>

      <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-[1440px] items-center gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-14 lg:pb-24 lg:pt-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto w-full max-w-[680px] lg:mx-0"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-200/[0.06] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/85 backdrop-blur-xl sm:text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(103,232,249,.9)]" />
            A calmer kind of AI workspace
          </div>

          <h1 className="mt-7 max-w-[11ch] text-[3.6rem] font-semibold leading-[0.92] tracking-[-0.075em] text-white sm:text-7xl lg:text-[6.4rem]">
            Make room for <span className="luna-hero-title-glow">good thinking.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-7 text-zinc-300/80 sm:text-lg sm:leading-8">
            Luna brings AI chat, research, voice, and image creation into one focused space. Choose a character, shape your idea, and keep the whole thread close.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to={ctaHref} className="luna-hero-primary group inline-flex min-h-14 items-center justify-center gap-3 rounded-full px-6 text-sm font-semibold text-[#101318]">
              {isSignedIn ? "Open your workspace" : "Start with Luna"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/features" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-6 text-sm font-medium text-white/85 backdrop-blur-xl hover:border-white/20 hover:bg-white/[0.07]">
              Explore what Luna can do
            </Link>
          </div>

          <div className="mt-6 flex flex-col items-start gap-3">
            <NativeAppDownloads />
            {canInstallApp || showIosInstallHint ? (
              <div className="flex flex-col items-start gap-2">
                <button type="button" onClick={onInstall} disabled={installingApp} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-medium text-white/80 hover:bg-white/[0.08] disabled:opacity-60">
                  <Download className="h-3.5 w-3.5" />
                  {installingApp ? "Preparing app…" : "Install web app"}
                </button>
                {showIosInstallHint ? <p className="text-xs text-zinc-500">On iPhone or iPad: Share → Add to Home Screen.</p> : null}
              </div>
            ) : null}
          </div>

          <div className="mt-10 flex flex-wrap gap-2 border-t border-white/[0.08] pt-6">
            {WORK_MODES.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs text-zinc-300/75">
                <Icon className="h-3.5 w-3.5 text-cyan-100/75" /> {label}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          style={{ y: visualY, scale: visualScale }}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.95, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto flex min-h-[440px] w-full max-w-[720px] items-center justify-center sm:min-h-[560px] lg:min-h-[690px]"
        >
          <div className="luna-hero-frame absolute inset-0 rounded-[34px] sm:rounded-[42px]" />
          <div className="luna-hero-orbit luna-hero-orbit-a" />
          <div className="luna-hero-orbit luna-hero-orbit-b" />
          <div className="absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/[0.055] blur-[80px]" />

          <div className="relative z-10 flex w-full flex-col items-center px-4 py-8 sm:px-8 sm:py-10">
            <div className="relative h-[210px] w-[210px] sm:h-[270px] sm:w-[270px] lg:h-[310px] lg:w-[310px]">
              <motion.div animate={{ y: [0, -9, 0], rotate: [0, 1.5, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0">
                <Orb hue={194} hoverIntensity={0.5} rotateOnHover backgroundColor="#080b13" logoSrc={logoSrc} logoClassName="scale-[1.1] drop-shadow-[0_0_28px_rgba(103,232,249,.28)]" />
              </motion.div>
            </div>

            <div className="luna-preview-card mt-1 w-full max-w-[520px] rounded-[24px] border border-white/[0.11] p-4 shadow-[0_30px_100px_rgba(0,0,0,.42)] backdrop-blur-2xl sm:mt-4 sm:rounded-[28px] sm:p-5">
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-200/10 bg-cyan-100/[0.07] text-cyan-100"><WandSparkles className="h-4 w-4" /></span>
                  <div><p className="text-xs font-semibold text-white/90">A new thread</p><p className="mt-0.5 text-[10px] text-zinc-500">Luna workspace</p></div>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-200/75"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Ready when you are</span>
              </div>
              <div className="py-4 sm:py-5">
                <p className="max-w-[38ch] text-sm leading-6 text-zinc-300 sm:text-[15px] sm:leading-7">Bring a question, a draft, or a half-formed idea. Your chosen character and tools stay with the conversation.</p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-black/20 px-3 py-2.5 sm:px-4">
                <span className="truncate text-xs text-zinc-500">Ask Luna anything…</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-200 to-indigo-200 text-slate-950"><Sparkles className="h-4 w-4" /></span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
