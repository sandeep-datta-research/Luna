import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import HeroGeometric from "@/components/ui/hero-geometric";
import Earth from "@/components/ui/globe";
import Feature1 from "@/components/mvpblocks/feature-1";
import AboutUs1 from "@/components/mvpblocks/about-us-1";
import SimplePricing from "@/components/mvpblocks/simple-pricing";
import TestimonialsCarousel from "@/components/mvpblocks/testimonials-carousel";
import { fetchApi } from "@/lib/api-client";
import CardNav from "@/component/CardNav";
import logo from "@/assets/luna-logo.svg";

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
    links: [{ label: "Features", href: "#features", ariaLabel: "View Luna features" }],
  },
  {
    label: "About",
    bgColor: "#1E1630",
    textColor: "#fff",
    links: [{ label: "About", href: "#about", ariaLabel: "View about section" }],
  },
  {
    label: "Pricing",
    bgColor: "#271E37",
    textColor: "#fff",
    links: [{ label: "Pricing", href: "#pricing", ariaLabel: "View pricing section" }],
  },
  {
    label: "Feedback",
    bgColor: "#2f1b3f",
    textColor: "#fff",
    links: [{ label: "Feedback", href: "#feedback", ariaLabel: "Leave feedback for Luna" }],
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

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getSignedInSnapshot() {
  if (typeof window === "undefined") {
    return { email: "", name: "", isSignedIn: false };
  }

  const token = (localStorage.getItem("luna_auth_token") || "").trim();
  const raw = localStorage.getItem("luna_google_user");
  if (!raw || !token) {
    return { email: "", name: "", isSignedIn: false };
  }

  try {
    const parsed = JSON.parse(raw);
    const email = normalizeEmail(parsed?.email);
    const name = typeof parsed?.name === "string" ? parsed.name.trim() : "";
    return { email, name, isSignedIn: Boolean(email && token) };
  } catch {
    return { email: "", name: "", isSignedIn: false };
  }
}

export default function Home() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ name: "", email: "", message: "", rating: 5 });
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [featuredFeedback, setFeaturedFeedback] = useState([]);

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

    if (isSignedIn) {
      items.push(PROFILE_NAV_ITEM);
    }

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

  return (    <div className="dark min-h-screen bg-[#07070d] text-zinc-100">
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
        <HeroGeometric />

        <motion.section id="features" {...fadeInUp} className="scroll-mt-28 mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.4)] sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(82,39,255,0.22),transparent_58%)]" />

            <div className="relative z-10 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Global Coverage</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-300 sm:text-base">
                Luna stays consistent across regions and providers with one polished experience.
              </p>
            </div>

            <div className="relative z-10 mt-4 flex justify-center sm:mt-6">
              <Earth
                className="max-w-[520px] sm:max-w-[620px]"
                theta={0.22}
                dark={1}
                scale={1.18}
                baseColor={[0.34, 0.15, 1]}
                glowColor={[0.27, 0.21, 0.82]}
                markerColor={[0.8, 0.9, 1]}
              />
            </div>
          </div>
        </motion.section>

        <motion.section {...fadeInUp} className="mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-violet-400/30 bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 shadow-[0_25px_80px_-45px_rgba(82,39,255,0.95)]">
            <Feature1 />
          </div>
        </motion.section>

        <motion.section id="about" {...fadeInUp} className="scroll-mt-28 mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="dark about-glow-shell relative overflow-hidden rounded-3xl border border-cyan-300/35 bg-gradient-to-b from-zinc-900/92 to-zinc-950/95 shadow-[0_30px_90px_-55px_rgba(34,211,238,0.95)]">
            <AboutUs1 />
          </div>
        </motion.section>

        <motion.section id="pricing" {...fadeInUp} className="scroll-mt-28 mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="dark rounded-3xl border border-emerald-300/30 bg-gradient-to-b from-zinc-900/96 to-zinc-950/98 shadow-[0_30px_90px_-55px_rgba(16,185,129,0.95)]">
            <SimplePricing />
          </div>
        </motion.section>

        <motion.section
          id="feedback"
          {...fadeInUp}
          className="scroll-mt-28 mx-auto mt-6 w-full max-w-6xl rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-6 text-zinc-300 sm:px-8"
        >
          <h2 className="text-lg font-semibold text-white">Feedback</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Share your experience. Admin can feature selected feedback in the carousel below.
          </p>

          <form onSubmit={handleFeedbackSubmit} className="mt-5 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:grid-cols-2">
            <label className="text-xs text-zinc-400">
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

            <label className="text-xs text-zinc-400 sm:col-span-2">
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

            <div className="flex items-end justify-end sm:col-span-1">
              <button
                type="submit"
                disabled={feedbackBusy}
                className="rounded-lg border border-violet-400/35 bg-violet-500/20 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-500/30 disabled:opacity-60"
              >
                {feedbackBusy ? "Submitting..." : "Submit Feedback"}
              </button>
            </div>

            {feedbackNote ? <p className="sm:col-span-2 text-xs text-cyan-200">{feedbackNote}</p> : null}
          </form>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40">
            <TestimonialsCarousel
              testimonials={carouselTestimonials}
              title="Luna Community"
              subtitle="Featured feedback selected by admin."
              autoplaySpeed={3600}
              className="py-10 md:py-14"
            />
          </div>
        </motion.section>
      </main>
    </div>
  );
}
