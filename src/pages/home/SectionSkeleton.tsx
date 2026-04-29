import React from "react";

interface SectionSkeletonProps {
  className?: string;
  compact?: boolean;
}

export function SectionSkeleton({ className = "", compact = false }: SectionSkeletonProps) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-white/8 bg-white/[0.04] ${compact ? "min-h-[220px]" : "min-h-[320px]"} ${className}`}
      aria-hidden="true"
    >
      <div className="h-full w-full animate-pulse bg-[linear-gradient(110deg,rgba(255,255,255,0.03),rgba(255,255,255,0.08),rgba(255,255,255,0.03))]" />
    </div>
  );
}
