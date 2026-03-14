import { AnimatePresence, motion } from "framer-motion";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import AdminDashboard from "./components/mvpblocks";
import SignInPage from "./components/mvpblocks/login-form-3";
import Home from "./pages/home";
import Luna from "./pages/Luna";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";

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
        <Route path="/chat" element={<PageTransition><Luna /></PageTransition>} />
        <Route path="/onboarding" element={<PageTransition><Onboarding /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
        <Route path="/signin" element={<PageTransition><SignInPage /></PageTransition>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <HashRouter>
      <AnimatedRoutes />
    </HashRouter>
  );
}

export default App;

