import React from "react";
import { motion, useTransform, MotionValue } from "framer-motion";
import { FEATURE_PILLARS, fadeInUp } from "./constants";

interface FeaturePillarSectionProps {
  scrollYProgress: MotionValue<number>;
}

export function FeaturePillarSection({ scrollYProgress }: FeaturePillarSectionProps) {
  const sectionY = useTransform(scrollYProgress, [0.1, 0.4], [100, 0]);
  const sectionOpacity = useTransform(scrollYProgress, [0.05, 0.25], [0, 1]);

  return (
    <motion.section
      className="mx-auto mt-24 w-full max-w-7xl px-6 lg:px-12"
      style={{ y: sectionY, opacity: sectionOpacity }}
    >
      <div className="grid gap-8 lg:grid-cols-3">
        {FEATURE_PILLARS.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ 
                duration: 0.8, 
                delay: index * 0.15,
                ease: [0.16, 1, 0.3, 1]
              }}
              whileHover={{ y: -12, scale: 1.02 }}
              className="group relative rounded-[40px] border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-8 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] backdrop-blur-3xl transition-all hover:border-white/20"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition-transform group-hover:scale-110 group-hover:rotate-3">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-8 text-3xl font-bold text-white tracking-tight">{item.title}</h2>
              <p className="mt-5 text-[15px] leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors">{item.body}</p>
              
              <div className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="h-1 w-12 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" />
              </div>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}
