import { useCallback, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Download, Smartphone, Sparkles } from "lucide-react";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { NativeAppDownloads } from "@/components/NativeAppDownloads";
import { useBrandingLogo } from "@/lib/branding";
import { getPrimaryNativeDownload } from "@/lib/native-app-links";
import logo from "@/assets/luna-logo.svg";

export default function LunaApp() {
  const logoSrc = useBrandingLogo(logo);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [installSupported, setInstallSupported] = useState(false);
  const [installingApp, setInstallingApp] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);
  const isNativeShell = Capacitor.isNativePlatform();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
    const updateStandalone = () => {
      const standalone = Boolean(mediaQuery?.matches || window.navigator?.standalone || isNativeShell);
      setIsStandaloneApp(standalone);
    };

    updateStandalone();
    mediaQuery?.addEventListener?.("change", updateStandalone);
    return () => mediaQuery?.removeEventListener?.("change", updateStandalone);
  }, [isNativeShell]);

  useEffect(() => {
    if (typeof window === "undefined" || isNativeShell) return undefined;

    const ua = window.navigator?.userAgent || "";
    const isIos = /iPad|iPhone|iPod/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    setShowIosInstallHint(isIos && isSafari && !window.navigator?.standalone);

    const handleBeforeInstallPrompt = (event) => {
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
  }, [isNativeShell]);

  const canInstallWebApp = useMemo(
    () => !isNativeShell && installSupported && !isStandaloneApp && !installingApp,
    [installSupported, installingApp, isNativeShell, isStandaloneApp],
  );

  const handleInstall = useCallback(async () => {
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
      window.alert("Safari on iPhone or iPad: tap Share, then Add to Home Screen.");
      return;
    }

    const nativeDownload = getPrimaryNativeDownload();
    if (nativeDownload?.href) {
      window.location.assign(nativeDownload.href);
    }
  }, [installPromptEvent, showIosInstallHint]);

  return (
    <div className="min-h-screen bg-[#06070c] text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <AnnouncementBanner className="mb-6" />
        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,16,23,0.96),rgba(7,9,13,0.92))] p-6 shadow-[0_32px_100px_rgba(0,0,0,0.42)] sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/15 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-cyan-100/80">
                <Smartphone className="h-4 w-4" />
                Luna App
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                Luna is a real installable app, not only a browser tab.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
                The current Luna app ships as a Capacitor-based mobile app: the same product experience runs inside real Android and iOS app shells with native install, app icons, splash screens, permissions, and store distribution paths.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
                Today, Android is the most complete path. The web build can also install as a PWA where supported, but that is separate from the packaged mobile app.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/chat"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0b1220]"
                >
                  Open Luna Chat
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/features"
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white"
                >
                  Explore Features
                </Link>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                  <img src={logoSrc} alt="Luna" className="h-full w-full object-cover" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Install Luna</p>
                  <p className="text-xs text-zinc-400">Android APK, iOS link, or web app install</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <NativeAppDownloads />
                {canInstallWebApp || showIosInstallHint ? (
                  <div className="rounded-2xl border border-amber-300/15 bg-amber-300/10 p-4">
                    <div className="flex items-start gap-3">
                      <Download className="mt-0.5 h-4 w-4 text-amber-100" />
                      <div>
                        <p className="text-sm font-semibold text-amber-50">Install the web app</p>
                        <p className="mt-1 text-xs leading-6 text-amber-100/80">
                          Useful if you want a lightweight install before using the packaged Android or iOS app.
                        </p>
                        <button
                          type="button"
                          onClick={handleInstall}
                          disabled={!canInstallWebApp && !showIosInstallHint}
                          className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-[#20190f] px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-60"
                        >
                          {installingApp ? "Preparing web app..." : "Install Web App"}
                        </button>
                        {showIosInstallHint ? (
                          <p className="mt-2 text-xs text-amber-100/75">
                            Safari on iPhone/iPad: use Share, then Add to Home Screen.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {isStandaloneApp || isNativeShell ? (
                  <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/10 p-4 text-sm text-emerald-100">
                    Luna is already running as an installed app on this device.
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {[
            {
              title: "Android",
              body: "Packaged as a native Android app shell and distributed as an APK now, with AAB output prepared for Play Store upload.",
            },
            {
              title: "iOS",
              body: "Prepared as a native iOS shell. Distribution should go through TestFlight or the App Store once signing and App Store Connect setup are complete.",
            },
            {
              title: "Web App",
              body: "The browser version remains installable as a PWA where supported, but it is not the same thing as the packaged mobile app.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                <h2 className="text-lg font-semibold">{item.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-zinc-300">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,22,33,0.92),rgba(8,12,18,0.9))] p-6">
          <div className="flex items-center gap-2 text-cyan-100">
            <Sparkles className="h-4 w-4" />
            <p className="text-sm font-semibold">Current status</p>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
            Android is the most complete app path right now. Luna should be described as a real installable app built with web technology plus native shells, rather than as a fully bespoke native codebase.
          </p>
        </div>
      </div>
    </div>
  );
}
