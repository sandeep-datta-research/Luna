import { Link } from "react-router-dom";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Download, Mic, Send, X } from "lucide-react";
import { ScrollProgressBar } from "./ScrollProgressBar";
import { MobileNavbar } from "./MobileNavbar";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import Ribbons from "@/components/ui/orb"; // Wait, Ribbons is from @/components/ui/ribbons in the original file
import Orb from "@/components/ui/orb";
import { HERO_SIGNAL_ITEMS, FEATURE_PILLARS } from "./constants";
import { SignalStat } from "./SignalStat";
import { DeferredSection } from "./DeferredSection";
import { SectionSkeleton } from "./SectionSkeleton";
import { CommandModeRail } from "./CommandModeRail";
import { UserGrowthSection } from "./UserGrowthSection";
import { WorkflowTimeline } from "./WorkflowTimeline";
import { FeedbackSection } from "./FeedbackSection";
import { UserMetrics, FeedbackForm, Testimonial } from "./types";

// Fixing import for Ribbons which was mixed up in my thought
import RibbonsActual from "@/components/ui/ribbons";

interface MobileLandingProps {
  ctaHref: string;
  logoSrc: string;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  canInstallApp: boolean;
  showIosInstallHint: boolean;
  installingApp: boolean;
  onInstall: () => Promise<void>;
  userMetrics: UserMetrics;
  chartPoints: string;
  feedbackForm: FeedbackForm;
  setFeedbackForm: React.Dispatch<React.SetStateAction<FeedbackForm>>;
  feedbackBusy: boolean;
  feedbackNote: string;
  handleFeedbackSubmit: (event: React.FormEvent) => Promise<void>;
  carouselTestimonials: Testimonial[];
}

function MobileInputPreview({ ctaHref }: { ctaHref: string }) {
  return (
    <div className="relative z-20 px-4 pb-5">
      <motion.div whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.985 }}>
        <Link
          to={ctaHref}
          className="flex h-16 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 backdrop-blur-md shadow-[0_0_32px_rgba(124,92,255,0.14)]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80">
            <Mic className="h-4 w-4" />
          </div>
          <span className="flex-1 text-sm text-gray-400">Start Chat...</span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 text-white shadow-[0_0_18px_rgba(124,92,255,0.38)]">
            <Send className="h-4 w-4" />
          </div>
        </Link>
      </motion.div>
    </div>
  );
}

export function MobileLanding({
  ctaHref,
  logoSrc,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  canInstallApp,
  showIosInstallHint,
  installingApp,
  onInstall,
  userMetrics,
  chartPoints,
  feedbackForm,
  setFeedbackForm,
  feedbackBusy,
  feedbackNote,
  handleFeedbackSubmit,
  carouselTestimonials,
}: MobileLandingProps) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.24 });
  const mobileHeroY = useTransform(progress, [0, 0.3], [0, -28]);

  const menuLinks = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Open Chat", href: "/chat" },
    { label: "Profile", href: "/profile" },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#07070d] text-white">
      <ScrollProgressBar progress={progress} />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[420px] flex-col">
        <MobileNavbar ctaHref={ctaHref} onOpenMenu={onOpenMenu} logoSrc={logoSrc} />
        <div className="px-4 pt-2">
          <AnnouncementBanner />
        </div>
        <motion.div className="px-4 pb-2 pt-6" style={{ y: mobileHeroY }}>
          <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,24,0.94),rgba(7,9,13,0.82))]">
            <div className="relative px-5 pb-7 pt-6">
              <div className="pointer-events-none absolute inset-0 opacity-70">
                <RibbonsActual
                  className="absolute inset-0"
                  colors={["#59d3ff", "#8b5cf6"]}
                  baseThickness={22}
                  speedMultiplier={0.45}
                  maxAge={320}
                  enableFade
                  enableShaderEffect
                />
              </div>
              <p className="relative text-[11px] uppercase tracking-[0.28em] text-cyan-100/80">Luna AI Hub</p>
              <h1 className="relative mt-4 text-4xl font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                Smooth 3D motion, sharper product presence.
              </h1>
              <p className="relative mt-4 text-sm leading-7 text-zinc-300">
                A cleaner command surface for chat, research, and premium output.
              </p>
              {(canInstallApp || showIosInstallHint) ? (
                <button
                  type="button"
                  onClick={onInstall}
                  disabled={installingApp}
                  className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-[#20190f] px-5 py-2.5 text-sm font-semibold text-amber-100 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Install Luna
                </button>
              ) : null}
              <div className="relative mt-6 flex h-[220px] items-center justify-center">
                <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.16),transparent_40%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.14),transparent_34%)]" />
                <div className="relative h-[170px] w-[170px]">
                  <Orb
                    hue={194}
                    hoverIntensity={0.45}
                    rotateOnHover={false}
                    backgroundColor="#071018"
                    logoSrc={logoSrc}
                    logoClassName="scale-[1.02]"
                  />
                </div>
              </div>
              <div className="relative mt-2 grid gap-3">
                {HERO_SIGNAL_ITEMS.map((item) => (
                  <SignalStat key={item.label} item={item} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
        <MobileInputPreview ctaHref={ctaHref} />
        <div className="space-y-5 px-4 pb-10">
          <DeferredSection sectionId="mobile-pillars" className="mobile-pillars" fallback={<SectionSkeleton compact />}>
            <div className="space-y-4">
              {FEATURE_PILLARS.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    whileHover={{ y: -5, scale: 1.01 }}
                    className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,26,0.88),rgba(9,11,16,0.86))] p-5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-white">{item.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-zinc-300">{item.body}</p>
                  </motion.div>
                );
              })}
            </div>
          </DeferredSection>
          <DeferredSection sectionId="mobile-modes" className="mobile-modes" fallback={<SectionSkeleton compact />}>
            <CommandModeRail compact />
          </DeferredSection>
          <DeferredSection sectionId="mobile-growth" className="mobile-growth" fallback={<SectionSkeleton compact />}>
            <UserGrowthSection userMetrics={userMetrics} chartPoints={chartPoints} compact />
          </DeferredSection>
          <DeferredSection sectionId="mobile-workflow" className="mobile-workflow" fallback={<SectionSkeleton compact />}>
            <WorkflowTimeline compact />
          </DeferredSection>
          <DeferredSection sectionId="mobile-feedback" className="mobile-feedback" fallback={<SectionSkeleton compact />}>
            <FeedbackSection
              feedbackForm={feedbackForm}
              setFeedbackForm={setFeedbackForm}
              feedbackBusy={feedbackBusy}
              feedbackNote={feedbackNote}
              handleFeedbackSubmit={handleFeedbackSubmit}
              carouselTestimonials={carouselTestimonials}
              compact
            />
          </DeferredSection>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMenu}
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
              aria-label="Close menu overlay"
            />
            <motion.div
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="fixed inset-x-4 top-4 z-40 rounded-[28px] border border-white/10 bg-[#0b1020]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
                    <img src={logoSrc} alt="Luna" className="h-full w-full object-cover" />
                  </span>
                  <span className="text-sm font-semibold text-white">Luna</span>
                </div>
                <motion.button
                  type="button"
                  onClick={onCloseMenu}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
                  aria-label="Close menu"
                  whileHover={{ y: -2, scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              <nav className="space-y-2">
                {menuLinks.map((item) => (
                  <motion.div key={item.label} whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
                    <Link
                      to={item.href}
                      onClick={onCloseMenu}
                      className="flex h-12 items-center rounded-2xl border border-white/8 bg-white/[0.04] px-4 text-sm font-medium text-zinc-100"
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
