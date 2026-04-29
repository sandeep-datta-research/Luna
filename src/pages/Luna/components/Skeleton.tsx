import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export function Skeleton({ className = "", width, height, circle }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-white/5 rounded-md ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? "1rem",
        borderRadius: circle ? "9999px" : undefined,
      }}
    />
  );
}
