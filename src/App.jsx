import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import AdminDashboard from "./components/mvpblocks";
import SignInPage from "./components/mvpblocks/login-form-3";
import Home from "./pages/home";
import Features from "./pages/Features";
import Luna from "./pages/Luna";
import Onboarding from "./pages/Onboarding";
import Pricing from "./pages/Pricing";
import Profile from "./pages/Profile";
import { hydrateUser } from "./lib/api-client";

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/features" element={<PageTransition><Features /></PageTransition>} />
        <Route path="/chat" element={<PageTransition><Luna /></PageTransition>} />
        <Route path="/onboarding" element={<PageTransition><Onboarding /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
        <Route path="/signin" element={<PageTransition><SignInPage /></PageTransition>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    hydrateUser().catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const seen = window.sessionStorage.getItem("luna-tab-intro-seen");
    if (seen) return undefined;

    window.sessionStorage.setItem("luna-tab-intro-seen", "1");
    setShowIntro(true);
    const timeout = window.setTimeout(() => setShowIntro(false), 1450);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <>
      <AnimatePresence>
        {showIntro ? (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.36, ease: "easeOut" }}
            className="pointer-events-none fixed inset-0 z-[120] overflow-hidden bg-[#05060d]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(91,61,245,0.32),transparent_42%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.18),transparent_35%),linear-gradient(180deg,#07070d,#04050a)]" />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.03 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="relative flex min-h-screen items-center justify-center px-6"
            >
              <div className="relative flex flex-col items-center">
                <motion.div
                  animate={{ boxShadow: ["0 0 0 rgba(91,61,245,0.15)", "0 0 60px rgba(91,61,245,0.35)", "0 0 0 rgba(91,61,245,0.15)"] }}
                  transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                  className="mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl"
                >
                  <div className="h-12 w-12 rounded-2xl bg-[linear-gradient(135deg,#7c5cff,#3dd9c9)]" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.45 }}
                  className="text-3xl font-semibold tracking-[0.18em] text-white"
                >
                  LUNA
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.78 }}
                  transition={{ delay: 0.25, duration: 0.45 }}
                  className="mt-3 text-sm uppercase tracking-[0.32em] text-zinc-400"
                >
                  Think. Chat. Build.
                </motion.p>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <HashRouter>
        <AnimatedRoutes />
      </HashRouter>
    </>
  );
}

export default App;
