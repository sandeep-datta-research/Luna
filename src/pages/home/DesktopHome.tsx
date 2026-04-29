import { Suspense, lazy } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ScrollProgressBar } from "./ScrollProgressBar";
import CardNav from "@/components/CardNav";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { HeroExperience } from "./HeroExperience";
import { DeferredSection } from "./DeferredSection";
import { SectionSkeleton } from "./SectionSkeleton";
import { FeaturePillarSection } from "./FeaturePillarSection";
import { CommandModeRail } from "./CommandModeRail";
import { UserGrowthSection } from "./UserGrowthSection";
import { WorkflowTimeline } from "./WorkflowTimeline";
import { FeedbackSection } from "./FeedbackSection";
import { fadeInUp } from "./constants";
import { NavItem, UserMetrics, FeedbackForm, Testimonial } from "./types";

const Analytics = lazy(() => import("@vercel/analytics/react").then((mod) => ({ default: mod.Analytics })));
const SpeedInsights = lazy(() =>
  import("@vercel/speed-insights/react").then((mod) => ({ default: mod.SpeedInsights })),
);

interface DesktopHomeProps {
  logoSrc: string;
  isSignedIn: boolean;
  cardNavItems: NavItem[];
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
  showAnalytics: boolean;
}

export function DesktopHome({
  logoSrc,
  isSignedIn,
  cardNavItems,
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
  showAnalytics,
}: DesktopHomeProps) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.26 });
  const growthY = useTransform(progress, [0.22, 0.62], [60, -24]);
  const feedbackY = useTransform(progress, [0.36, 0.85], [72, -20]);
  const ambientYLeft = useTransform(progress, [0, 1], [0, -160]);
  const ambientYRight = useTransform(progress, [0, 1], [0, -100]);

  return (
    <div className="dark min-h-screen overflow-x-hidden bg-[#07070d] text-zinc-100">
      <ScrollProgressBar progress={progress} />
      <motion.div
        className="pointer-events-none fixed left-[-8rem] top-24 z-0 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.14),transparent_66%)] blur-3xl"
        style={{ y: ambientYLeft }}
      />
      <motion.div
        className="pointer-events-none fixed right-[-8rem] top-[38vh] z-0 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.14),transparent_66%)] blur-3xl"
        style={{ y: ambientYRight }}
      />
      <nav className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#07070d]/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <CardNav
            logo={logoSrc}
            logoAlt="Luna Logo"
            items={cardNavItems}
            className="w-full"
            ease="power3.out"
            baseColor="#09090f"
            menuColor="#f4f4f5"
            buttonBgColor="#5B3DF5"
            buttonTextColor="#ffffff"
          />
        </div>
      </nav>

      <main className="relative pb-10 pt-14 md:pt-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <AnnouncementBanner className="mb-6" />
        </div>
        <HeroExperience
          ctaHref={isSignedIn ? "/chat" : "/signin"}
          isSignedIn={isSignedIn}
          scrollYProgress={progress}
          logoSrc={logoSrc}
          canInstallApp={canInstallApp}
          showIosInstallHint={showIosInstallHint}
          installingApp={installingApp}
          onInstall={onInstall}
        />

        <DeferredSection
          sectionId="desktop-pillars"
          className="desktop-pillars scroll-mt-28"
          fallback={<SectionSkeleton className="mx-auto mt-8 min-h-[320px] w-full max-w-6xl" />}
        >
          <FeaturePillarSection scrollYProgress={progress} />
        </DeferredSection>

        <DeferredSection
          sectionId="desktop-modes"
          className="desktop-modes"
          fallback={<SectionSkeleton className="mx-auto mt-8 min-h-[380px] w-full max-w-6xl" />}
        >
          <CommandModeRail />
        </DeferredSection>

        <DeferredSection
          sectionId="desktop-growth"
          className="desktop-growth mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8"
          fallback={<SectionSkeleton />}
        >
          <motion.section {...fadeInUp} style={{ y: growthY }}>
            <UserGrowthSection userMetrics={userMetrics} chartPoints={chartPoints} />
          </motion.section>
        </DeferredSection>

        <DeferredSection
          sectionId="desktop-workflow"
          className="desktop-workflow"
          fallback={<SectionSkeleton className="mx-auto mt-8 min-h-[300px] w-full max-w-6xl" />}
        >
          <WorkflowTimeline />
        </DeferredSection>

        {showAnalytics ? (
          <Suspense fallback={null}>
            <Analytics />
            <SpeedInsights />
          </Suspense>
        ) : null}

        <DeferredSection
          sectionId="desktop-feedback"
          className="desktop-feedback scroll-mt-28 mx-auto mt-6 w-full max-w-6xl px-4 sm:px-6 lg:px-8"
          fallback={<SectionSkeleton />}
        >
          <motion.div id="feedback" {...fadeInUp} style={{ y: feedbackY }}>
            <FeedbackSection
              feedbackForm={feedbackForm}
              setFeedbackForm={setFeedbackForm}
              feedbackBusy={feedbackBusy}
              feedbackNote={feedbackNote}
              handleFeedbackSubmit={handleFeedbackSubmit}
              carouselTestimonials={carouselTestimonials}
            />
          </motion.div>
        </DeferredSection>
      </main>
    </div>
  );
}
