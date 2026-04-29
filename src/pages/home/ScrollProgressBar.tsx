import React from "react";
import { motion, MotionValue } from "framer-motion";

interface ScrollProgressBarProps {
  progress: MotionValue<number>;
}

export function ScrollProgressBar({ progress }: ScrollProgressBarProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-1 bg-white/[0.03]">
      <motion.div
        className="h-full origin-left bg-[linear-gradient(90deg,#67e8f9,#60a5fa,#8b5cf6)] shadow-[0_0_28px_rgba(96,165,250,0.55)]"
        style={{ scaleX: progress }}
      />
    </div>
  );
}
