import React from "react";
import { motion, useTransform, MotionValue } from "framer-motion";
import { FEATURE_PILLARS, fadeInUp } from "./constants";

interface FeaturePillarSectionProps {
  scrollYProgress: MotionValue<number>;
}

export function FeaturePillarSection({ scrollYProgress }: FeaturePillarSectionProps) {
  const sectionY = useTransform(scrollYProgress, [0.12, 0.45], [48, -18]);
  const sectionOpacity = useTransform(scrollYProgress, [0.04, 0.18], [0.55, 1]);

  return (
    <motion.section
      className="mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8"
      style={{ y: sectionY, opacity: sectionOpacity }}
    >
      <motion.div
        {...fadeInUp}
        className="grid gap-5 lg:grid-cols-3"
      >
        {FEATURE_PILLARS.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.article
              key={item.title}
              whileHover={{ y: -8, rotateX: 2, rotateY: index === 1 ? 0 : index === 0 ? 2 : -2 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,26,0.88),rgba(9,11,16,0.86))] p-6 shadow-[0_26px_100px_rgba(0,0,0,0.25)] backdrop-blur-2xl"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-white">{item.title}</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-300">{item.body}</p>
            </motion.article>
          );
        })}
      </motion.div>
    </motion.section>
  );
}
