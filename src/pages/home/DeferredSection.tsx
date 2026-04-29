import React, { useEffect, useState } from "react";

interface DeferredSectionProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  className?: string;
  sectionId: string;
  rootMargin?: string;
}

export function DeferredSection({
  children,
  fallback,
  className = "",
  sectionId,
  rootMargin = "280px",
}: DeferredSectionProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const node = document.querySelector(`[data-deferred-section="${sectionId}"]`);
    if (!node || shouldRender) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, sectionId, shouldRender]);

  return (
    <div data-deferred-section={sectionId} className={className}>
      {shouldRender ? children : fallback}
    </div>
  );
}
