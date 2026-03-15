import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import CardNav from "@/component/CardNav";
import HeroGeometric from "@/components/ui/hero-geometric";
import Earth from "@/components/ui/globe";
import Feature1 from "@/components/mvpblocks/feature-1";
import logo from "@/assets/luna.png";

const ALLOWED_ADMIN_EMAILS = new Set(["seiuasatou@gmail.com", "sandeepdatta866@gmail.com"]);

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
    label: "About",
    bgColor: "#1E1630",
    textColor: "#fff",
    links: [{ label: "About", href: "#about", ariaLabel: "View about section" }],
  },
  {
    label: "Pricing",
    bgColor: "#271E37",
    textColor: "#fff",
    links: [{ label: "Pricing", href: "/pricing", ariaLabel: "View pricing section" }],
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

export default function Features() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const syncAdminVisibility = () => {
      const snapshot = getSignedInSnapshot();
      setIsSignedIn(snapshot.isSignedIn);
      setShowAdmin(snapshot.isSignedIn && ALLOWED_ADMIN_EMAILS.has(snapshot.email));
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

  return (
    <div className="dark min-h-screen overflow-x-hidden bg-[#07070d] text-zinc-100">
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

      <main className="relative pb-12 pt-14 md:pt-16">
        <HeroGeometric />

        <motion.section {...fadeInUp} className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
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
      </main>
    </div>
  );
}
