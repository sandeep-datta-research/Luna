import { useCallback, useEffect, useMemo, useState } from "react";
import { Shield } from "lucide-react";
import { fetchApi, hydrateUser } from "@/lib/api-client";
import { useBrandingLogo } from "@/lib/branding";
import logo from "@/assets/luna-logo.svg";
import { useIsDesktop, getSignedInSnapshot } from "./utils";
import {
  ALLOWED_ADMIN_EMAILS,
  BASE_CARD_NAV_ITEMS,
  PROFILE_NAV_ITEM,
  FALLBACK_CAROUSEL_FEEDBACK,
} from "./constants";
import { MobileLanding } from "./MobileLanding";
import { DesktopHome } from "./DesktopHome";
import { FeedbackForm, UserMetrics } from "./types";

export default function Home() {
  const brandLogo = useBrandingLogo(logo);
  const isDesktop = useIsDesktop();
  const [showAdmin, setShowAdmin] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState<FeedbackForm>({
    name: "",
    email: "",
    message: "",
    rating: 5,
  });
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [featuredFeedback, setFeaturedFeedback] = useState<any[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetrics>({ total: 0, series: [], days: 14 });
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [installSupported, setInstallSupported] = useState(false);
  const [installingApp, setInstallingApp] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);
  const canInstallApp = installSupported && !isStandaloneApp && !installingApp;

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

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const loadAnalytics = () => setShowAnalytics(true);
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(loadAnalytics, { timeout: 2500 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(loadAnalytics, 1800);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
    const updateStandalone = () => {
      const standalone = Boolean(mediaQuery?.matches || (window.navigator as any)?.standalone);
      setIsStandaloneApp(standalone);
    };

    updateStandalone();
    mediaQuery?.addEventListener?.("change", updateStandalone);
    return () => mediaQuery?.removeEventListener?.("change", updateStandalone);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const ua = window.navigator?.userAgent || "";
    const isIos = /iPad|iPhone|iPod/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    setShowIosInstallHint(isIos && isSafari && !(window.navigator as any)?.standalone);

    const handleBeforeInstallPrompt = (event: any) => {
      event.preventDefault();
      setInstallPromptEvent(event);
      setInstallSupported(true);
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setInstallSupported(false);
      setInstallingApp(false);
      setIsStandaloneApp(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallLuna = useCallback(async () => {
    if (installPromptEvent) {
      setInstallingApp(true);
      try {
        await installPromptEvent.prompt();
        await installPromptEvent.userChoice;
      } finally {
        setInstallPromptEvent(null);
        setInstallSupported(false);
        setInstallingApp(false);
      }
      return;
    }

    if (showIosInstallHint) {
      window.alert("On iPhone or iPad, tap Share and choose Add to Home Screen.");
      return;
    }

    window.alert("Install is not available in this browser yet. Try Chrome or Safari on a supported device.");
  }, [installPromptEvent, showIosInstallHint]);

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
    const scheduleLoad = () => {
      void loadFeaturedFeedback();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(scheduleLoad, { timeout: 2500 });
      return () => {
        canceled = true;
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timer = typeof window !== "undefined" ? window.setTimeout(scheduleLoad, 1200) : null;
    return () => {
      canceled = true;
      if (timer) window.clearTimeout(timer);
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
    const scheduleLoad = () => {
      void loadUserMetrics();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(scheduleLoad, { timeout: 2500 });
      return () => {
        canceled = true;
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timer = typeof window !== "undefined" ? window.setTimeout(scheduleLoad, 1200) : null;
    return () => {
      canceled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const handleFeedbackSubmit = async (event: React.FormEvent) => {
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
      {isDesktop ? (
        <DesktopHome
          logoSrc={brandLogo}
          isSignedIn={isSignedIn}
          cardNavItems={cardNavItems}
          canInstallApp={canInstallApp}
          showIosInstallHint={showIosInstallHint}
          installingApp={installingApp}
          onInstall={handleInstallLuna}
          userMetrics={userMetrics}
          chartPoints={chartPoints}
          feedbackForm={feedbackForm}
          setFeedbackForm={setFeedbackForm}
          feedbackBusy={feedbackBusy}
          feedbackNote={feedbackNote}
          handleFeedbackSubmit={handleFeedbackSubmit}
          carouselTestimonials={carouselTestimonials}
          showAnalytics={showAnalytics}
        />
      ) : (
        <MobileLanding
          ctaHref={ctaHref}
          logoSrc={brandLogo}
          menuOpen={mobileMenuOpen}
          onOpenMenu={() => setMobileMenuOpen(true)}
          onCloseMenu={() => setMobileMenuOpen(false)}
          canInstallApp={canInstallApp}
          showIosInstallHint={showIosInstallHint}
          installingApp={installingApp}
          onInstall={handleInstallLuna}
          userMetrics={userMetrics}
          chartPoints={chartPoints}
          feedbackForm={feedbackForm}
          setFeedbackForm={setFeedbackForm}
          feedbackBusy={feedbackBusy}
          feedbackNote={feedbackNote}
          handleFeedbackSubmit={handleFeedbackSubmit}
          carouselTestimonials={carouselTestimonials}
        />
      )}
    </>
  );
}
