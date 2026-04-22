import { useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Menu, Mic, Send, Shield, X } from "lucide-react";
import HeroGeometric from "@/components/ui/hero-geometric";
import AboutUs1 from "@/components/mvpblocks/about-us-1";
import TestimonialsCarousel from "@/components/mvpblocks/testimonials-carousel";
import { fetchApi, getStoredUser, hydrateUser } from "@/lib/api-client";
import CardNav from "@/component/CardNav";
import logo from "@/assets/luna.png";
import lunaLogo from "@/assets/luna.png";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const ALLOWED_ADMIN_EMAILS = new Set([
  "seiuasatou@gmail.com",
  "sandeepdatta866@gmail.com",
]);

const BASE_CARD_NAV_ITEMS = [
  {
    label: "Home",
    bgColor: "#0D0716",
    textColor: "#fff",
    links: [{ label: "Home", href: "/", ariaLabel: "Go to homepage" }],
  },
  {
    label: "Features",
    bgColor: "#170D27",
    textColor: "#fff",
    links: [{ label: "Features", href: "/features", ariaLabel: "View Luna features" }],
  },
  {
    label: "Pricing",
    bgColor: "#271E37",
    textColor: "#fff",
    links: [{ label: "Pricing", href: "/pricing", ariaLabel: "View pricing section" }],
  },
  {
    label: "Luna",
    bgColor: "#33224A",
    textColor: "#fff",
    links: [{ label: "Open Chat", href: "/chat", ariaLabel: "Open Luna chat" }],
  },
];

const PROFILE_NAV_ITEM = {
  label: "Profile",
  bgColor: "#2A203B",
  textColor: "#fff",
  links: [{ label: "My Profile", href: "/profile", ariaLabel: "Open user profile" }],
};

const FALLBACK_CAROUSEL_FEEDBACK = [
  {
    id: "local-fb-1",
    name: "Aarav",
    email: "aarav@example.com",
    message: "Luna feels clean and fast. The chat flow is smooth and really easy to use.",
    rating: 5,
  },
  {
    id: "local-fb-2",
    name: "Riya",
    email: "riya@example.com",
    message: "Model switching and history support make this feel like a production-ready assistant.",
    rating: 5,
  },
  {
    id: "local-fb-3",
    name: "Kabir",
    email: "kabir@example.com",
    message: "The dark theme and overall UI quality are excellent. Very polished experience.",
    rating: 4,
  },
];

const fadeInUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.55, ease: "easeOut" },
};

const hoverFloat = {
  whileHover: { y: -6, scale: 1.01 },
  transition: { type: "spring", stiffness: 240, damping: 22 },
};

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getSignedInSnapshot() {
  if (typeof window === "undefined") {
    return { email: "", name: "", isSignedIn: false };
  }

  const user = getStoredUser();
  if (!user) {
    return { email: "", name: "", isSignedIn: false };
  }

  const email = normalizeEmail(user?.email);
  const name = typeof user?.name === "string" ? user.name.trim() : "";
  return { email, name, isSignedIn: Boolean(email) };
}

function MobileNavbar({ ctaHref, onOpenMenu }) {
  return (
    <header className="relative z-20 flex h-14 items-center justify-between px-4">
      <motion.button
        type="button"
        onClick={onOpenMenu}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white backdrop-blur-md"
        aria-label="Open menu"
        whileHover={{ y: -2, scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
      >
        <Menu className="h-5 w-5" />
      </motion.button>

      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur-md">
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
          <img src={lunaLogo} alt="Luna" className="h-full w-full object-cover" />
        </span>
        <span className="text-sm font-semibold tracking-[0.02em] text-white">Luna</span>
      </div>

      <motion.div whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
        <Link
          to={ctaHref}
          className="rounded-full border border-violet-300/25 bg-gradient-to-r from-violet-500/45 to-fuchsia-400/30 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_22px_rgba(124,92,255,0.28)] backdrop-blur-md"
        >
          Start Chat
        </Link>
      </motion.div>
    </header>
  );
}

function MobileInputPreview({ ctaHref }) {
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

function UserGrowthSection({ userMetrics, chartPoints, compact = false }) {
  const gradientId = useId().replace(/:/g, "");
  const areaId = `${gradientId}-area`;

  return (
    <motion.div
      {...(compact ? {} : hoverFloat)}
      className={`rounded-3xl border border-indigo-300/25 bg-gradient-to-b from-[#121225] to-[#0c0c16] shadow-[0_30px_90px_-55px_rgba(91,106,245,0.7)] ${compact ? "px-4 py-5" : "px-6 py-6 sm:px-8"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-200/70">User Growth</p>
          <h3 className={`mt-2 font-semibold text-white ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
            {userMetrics.total.toLocaleString()} total users
          </h3>
          <p className="mt-2 text-sm text-indigo-100/70">Last {userMetrics.days} days of signups</p>
        </div>
        <div className="rounded-2xl border border-indigo-300/20 bg-indigo-500/5 px-4 py-2 text-xs text-indigo-100/70">
          Updated automatically
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-300/20 bg-[#0b0b14]/70 p-4">
        <svg viewBox="0 0 560 140" className={`w-full ${compact ? "h-[120px]" : "h-[140px]"}`}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5B6AF5" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
            <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(91,106,245,0.35)" />
              <stop offset="100%" stopColor="rgba(91,106,245,0)" />
            </linearGradient>
          </defs>
          <polyline
            points={chartPoints || "8,120 552,120"}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={`${chartPoints || "8,120 552,120"} 552,136 8,136`}
            fill={`url(#${areaId})`}
            stroke="none"
          />
        </svg>
      </div>
    </motion.div>
  );
}

function FeedbackSection({
  feedbackForm,
  setFeedbackForm,
  feedbackBusy,
  feedbackNote,
  handleFeedbackSubmit,
  carouselTestimonials,
  compact = false,
}) {
  return (
    <motion.section
      {...(compact ? {} : hoverFloat)}
      className={`rounded-3xl border border-zinc-800 bg-zinc-900/60 text-zinc-300 ${compact ? "px-4 py-5" : "px-6 py-6 sm:px-8"}`}
    >
      <h2 className="text-lg font-semibold text-white">Feedback</h2>
      <p className="mt-2 text-sm leading-relaxed">
        Share your experience. Admin can feature selected feedback in the carousel below.
      </p>

      <form onSubmit={handleFeedbackSubmit} className={`mt-5 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 ${compact ? "" : "sm:grid-cols-2"}`}>
        <label className={`text-xs text-zinc-400 ${compact ? "" : ""}`}>
          Name
          <input
            value={feedbackForm.name}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Your name"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none"
          />
        </label>

        <label className="text-xs text-zinc-400">
          Email
          <input
            value={feedbackForm.email}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none"
          />
        </label>

        <label className={`text-xs text-zinc-400 ${compact ? "" : "sm:col-span-2"}`}>
          Feedback
          <textarea
            value={feedbackForm.message}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, message: e.target.value }))}
            placeholder="Tell us what to improve in Luna..."
            className="mt-1 min-h-[100px] w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none"
          />
        </label>

        <label className="text-xs text-zinc-400">
          Rating
          <select
            value={feedbackForm.rating}
            onChange={(e) => setFeedbackForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none"
          >
            <option value={5}>5 - Excellent</option>
            <option value={4}>4 - Good</option>
            <option value={3}>3 - Average</option>
            <option value={2}>2 - Needs work</option>
            <option value={1}>1 - Poor</option>
          </select>
        </label>

        <div className={`flex items-end ${compact ? "" : "justify-end sm:col-span-1"}`}>
          <button
            type="submit"
            disabled={feedbackBusy}
            className="rounded-lg border border-violet-400/35 bg-violet-500/20 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-500/30 disabled:opacity-60"
          >
            {feedbackBusy ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>

        {feedbackNote ? <p className={`${compact ? "" : "sm:col-span-2"} text-xs text-cyan-200`}>{feedbackNote}</p> : null}
      </form>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40">
        <TestimonialsCarousel
          testimonials={carouselTestimonials}
          title="Luna Community"
          subtitle="Featured feedback selected by admin."
          autoplaySpeed={3600}
          className={compact ? "py-8" : "py-10 md:py-14"}
        />
      </div>
    </motion.section>
  );
}

function MobileLanding({
  ctaHref,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  userMetrics,
  chartPoints,
  feedbackForm,
  setFeedbackForm,
  feedbackBusy,
  feedbackNote,
  handleFeedbackSubmit,
  carouselTestimonials,
}) {
  const menuLinks = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Open Chat", href: "/chat" },
    { label: "Profile", href: "/profile" },
  ];

  return (
    <div className="md:hidden min-h-screen overflow-hidden bg-[#07070d] text-white">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[420px] flex-col">
        <MobileNavbar ctaHref={ctaHref} onOpenMenu={onOpenMenu} />
        <div className="px-4 pt-2">
          <AnnouncementBanner />
        </div>
        <HeroGeometric mobileLanding />
        <MobileInputPreview ctaHref={ctaHref} />
        <div className="space-y-5 px-4 pb-10">
          <motion.div
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="dark about-glow-shell overflow-hidden rounded-[28px] border border-cyan-300/25 bg-gradient-to-b from-zinc-900/92 to-zinc-950/95 shadow-[0_30px_90px_-55px_rgba(34,211,238,0.95)]"
          >
            <AboutUs1 />
          </motion.div>
          <UserGrowthSection userMetrics={userMetrics} chartPoints={chartPoints} compact />
          <FeedbackSection
            feedbackForm={feedbackForm}
            setFeedbackForm={setFeedbackForm}
            feedbackBusy={feedbackBusy}
            feedbackNote={feedbackNote}
            handleFeedbackSubmit={handleFeedbackSubmit}
            carouselTestimonials={carouselTestimonials}
            compact
          />
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
                    <img src={lunaLogo} alt="Luna" className="h-full w-full object-cover" />
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
                    key={item.label}
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

function DesktopHome({
  cardNavItems,
  userMetrics,
  chartPoints,
  feedbackForm,
  setFeedbackForm,
  feedbackBusy,
  feedbackNote,
  handleFeedbackSubmit,
  carouselTestimonials,
}) {
  return (
    <div className="hidden md:block dark min-h-screen overflow-x-hidden bg-[#07070d] text-zinc-100">
      <nav className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#07070d]/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <CardNav
            logo={logo}
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
        <HeroGeometric />

        <motion.section id="features" {...fadeInUp} className="scroll-mt-28 mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            whileHover={{ y: -8, scale: 1.008 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="dark about-glow-shell relative overflow-hidden rounded-3xl border border-cyan-300/35 bg-gradient-to-b from-zinc-900/92 to-zinc-950/95 shadow-[0_30px_90px_-55px_rgba(34,211,238,0.95)]"
          >
            <AboutUs1 />
          </motion.div>
        </motion.section>

        <motion.section {...fadeInUp} className="mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <UserGrowthSection userMetrics={userMetrics} chartPoints={chartPoints} />
        </motion.section>

        <Analytics />
        <SpeedInsights />

        <motion.div id="feedback" {...fadeInUp} className="scroll-mt-28 mx-auto mt-6 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <FeedbackSection
            feedbackForm={feedbackForm}
            setFeedbackForm={setFeedbackForm}
            feedbackBusy={feedbackBusy}
            feedbackNote={feedbackNote}
            handleFeedbackSubmit={handleFeedbackSubmit}
            carouselTestimonials={carouselTestimonials}
          />
        </motion.div>
      </main>
    </div>
  );
}

export default function Home() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ name: "", email: "", message: "", rating: 5 });
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [featuredFeedback, setFeaturedFeedback] = useState([]);
  const [userMetrics, setUserMetrics] = useState({ total: 0, series: [], days: 14 });

  useEffect(() => {
    const syncAdminVisibility = () => {
      const snapshot = getSignedInSnapshot();
      setIsSignedIn(snapshot.isSignedIn);
      setShowAdmin(snapshot.isSignedIn && ALLOWED_ADMIN_EMAILS.has(snapshot.email));

      setFeedbackForm((prev) => ({
        ...prev,
        name: snapshot.name || prev.name,
        email: snapshot.email || prev.email,
      }));
    };

    syncAdminVisibility();
    hydrateUser().then(syncAdminVisibility).catch(syncAdminVisibility);

    window.addEventListener("storage", syncAdminVisibility);
    window.addEventListener("luna-auth-changed", syncAdminVisibility);
    window.addEventListener("focus", syncAdminVisibility);
    document.addEventListener("visibilitychange", syncAdminVisibility);

    return () => {
      window.removeEventListener("storage", syncAdminVisibility);
      window.removeEventListener("luna-auth-changed", syncAdminVisibility);
      window.removeEventListener("focus", syncAdminVisibility);
      document.removeEventListener("visibilitychange", syncAdminVisibility);
    };
  }, []);

  const cardNavItems = useMemo(() => {
    const items = [...BASE_CARD_NAV_ITEMS];

    if (isSignedIn) items.push(PROFILE_NAV_ITEM);
    if (showAdmin) {
      items.push({
        label: "Admin",
        icon: Shield,
        bgColor: "#3B2552",
        textColor: "#fff",
        links: [{ label: "Dashboard", href: "/admin", ariaLabel: "Open admin dashboard" }],
      });
    }

    return items;
  }, [isSignedIn, showAdmin]);

  useEffect(() => {
    let canceled = false;
    const loadFeaturedFeedback = async () => {
      const result = await fetchApi("/api/feedback?featured=1&limit=12");
      if (!canceled && result.ok) {
        setFeaturedFeedback(Array.isArray(result.data?.feedback) ? result.data.feedback : []);
      }
    };
    loadFeaturedFeedback();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    let canceled = false;
    const loadUserMetrics = async () => {
      const result = await fetchApi("/api/metrics/users?days=14");
      if (!canceled && result.ok) {
        const series = Array.isArray(result.data?.series) ? result.data.series : [];
        setUserMetrics({
          total: Number(result.data?.total || 0),
          series,
          days: Number(result.data?.days || 14),
        });
      }
    };
    loadUserMetrics();
    return () => {
      canceled = true;
    };
  }, []);

  const handleFeedbackSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      name: feedbackForm.name.trim(),
      email: feedbackForm.email.trim(),
      message: feedbackForm.message.trim(),
      rating: Number(feedbackForm.rating || 5),
    };

    if (payload.message.length < 8) {
      setFeedbackNote("Please enter at least 8 characters of feedback.");
      return;
    }

    setFeedbackBusy(true);
    setFeedbackNote("");

    const result = await fetchApi("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setFeedbackBusy(false);
    if (!result.ok) {
      setFeedbackNote(result.message || "Failed to submit feedback.");
      return;
    }

    setFeedbackNote("Thanks for your feedback. Admin will review it for carousel display.");
    setFeedbackForm((prev) => ({ ...prev, message: "", rating: 5 }));

    const featuredResult = await fetchApi("/api/feedback?featured=1&limit=12");
    if (featuredResult.ok) {
      setFeaturedFeedback(Array.isArray(featuredResult.data?.feedback) ? featuredResult.data.feedback : []);
    }
  };

  const carouselTestimonials = useMemo(() => {
    const source = featuredFeedback.length > 0 ? featuredFeedback : FALLBACK_CAROUSEL_FEEDBACK;
    return source.map((item, index) => {
      const name = (item?.name || `Luna User ${index + 1}`).trim();
      const email = `${item?.email || ""}`.trim().toLowerCase();
      const username = email ? `@${email.split("@")[0]}` : `@${name.toLowerCase().replace(/\s+/g, "")}`;
      const rating = Number(item?.rating || 5);
      return {
        text: item?.message || "Luna made AI chat simple and smooth.",
        imageSrc: `https://i.pravatar.cc/100?img=${(index % 40) + 1}`,
        name,
        username,
        role: `Rated ${Math.min(5, Math.max(1, Math.round(rating)))}/5`,
      };
    });
  }, [featuredFeedback]);

  const chartPoints = useMemo(() => {
    const series = userMetrics.series || [];
    if (series.length === 0) return "";
    const width = 560;
    const height = 140;
    const maxCount = Math.max(1, ...series.map((item) => Number(item.count || 0)));
    return series
      .map((item, index) => {
        const x = 8 + (index / Math.max(1, series.length - 1)) * (width - 16);
        const value = Number(item.count || 0);
        const y = height - 12 - (value / maxCount) * (height - 24);
        return `${x},${y}`;
      })
      .join(" ");
  }, [userMetrics.series]);

  const ctaHref = isSignedIn ? "/chat" : "/signin";

  return (
    <>
      <MobileLanding
        ctaHref={ctaHref}
        menuOpen={mobileMenuOpen}
        onOpenMenu={() => setMobileMenuOpen(true)}
        onCloseMenu={() => setMobileMenuOpen(false)}
        userMetrics={userMetrics}
        chartPoints={chartPoints}
        feedbackForm={feedbackForm}
        setFeedbackForm={setFeedbackForm}
        feedbackBusy={feedbackBusy}
        feedbackNote={feedbackNote}
        handleFeedbackSubmit={handleFeedbackSubmit}
        carouselTestimonials={carouselTestimonials}
      />
      <DesktopHome
        cardNavItems={cardNavItems}
        userMetrics={userMetrics}
        chartPoints={chartPoints}
        feedbackForm={feedbackForm}
        setFeedbackForm={setFeedbackForm}
        feedbackBusy={feedbackBusy}
        feedbackNote={feedbackNote}
        handleFeedbackSubmit={handleFeedbackSubmit}
        carouselTestimonials={carouselTestimonials}
      />
    </>
  );
}
