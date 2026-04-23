import { AnimatePresence, motion } from "framer-motion";
import { Component, Suspense, lazy, useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Orb from "./components/ui/orb";
import { hydrateUser } from "./lib/api-client";

const Home = lazy(() => import("./pages/home"));
const Features = lazy(() => import("./pages/Features"));
const Luna = lazy(() => import("./pages/Luna"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminDashboard = lazy(() => import("./components/mvpblocks"));
const SignInPage = lazy(() => import("./components/mvpblocks/login-form-3"));

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Luna route render failed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#05060d] px-6 text-zinc-200">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_32px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Luna</p>
            <h1 className="mt-4 text-2xl font-semibold text-white">The page failed to load</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              A client-side error interrupted rendering. Refresh the page to retry.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full border border-white/12 bg-white/10 px-5 py-2 text-sm font-medium text-white"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05060d] px-6 text-zinc-200">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-20 w-20">
          <div className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.18),transparent_62%)] blur-lg" />
          <Orb hue={248} hoverIntensity={0.6} rotateOnHover={false} backgroundColor="#05060d" />
        </div>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">Loading Luna</p>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <RouteErrorBoundary>
      <AnimatePresence mode="wait" initial={false}>
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
      </AnimatePresence>
    </RouteErrorBoundary>
  );
}

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    const seen = window.sessionStorage.getItem("luna-tab-intro-seen");
    if (seen) return false;
    window.sessionStorage.setItem("luna-tab-intro-seen", "1");
    return true;
  });

  useEffect(() => {
    hydrateUser().catch(() => {});
  }, []);

  useEffect(() => {
    if (!showIntro) return undefined;
    const timeout = window.setTimeout(() => setShowIntro(false), 1450);
    return () => window.clearTimeout(timeout);
  }, [showIntro]);

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
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.16),transparent_30%),linear-gradient(180deg,#06070c,#04050a)]" />
            <motion.div
              initial={{ opacity: 0, scale: 0.38 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 2.15 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex min-h-screen items-center justify-center px-6"
            >
              <div className="relative flex flex-col items-center">
                <div className="relative mb-6 h-36 w-36">
                  <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.14),transparent_62%)] blur-xl" />
                  <Orb hue={248} hoverIntensity={0.9} rotateOnHover={false} backgroundColor="#05060d" />
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.45 }}
                  className="text-3xl font-semibold tracking-[0.18em] text-white"
                >
                  LUNA
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.78 }}
                  transition={{ delay: 0.28, duration: 0.45 }}
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
