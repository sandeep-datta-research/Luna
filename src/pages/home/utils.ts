import { useEffect, useState } from "react";
import { getStoredUser } from "@/lib/api-client";

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 768px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener?.("change", update);
    return () => mediaQuery.removeEventListener?.("change", update);
  }, []);

  return isDesktop;
}

export function normalizeEmail(value: any) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function getSignedInSnapshot() {
  if (typeof window === "undefined") {
    return { email: "", name: "", isSignedIn: false };
  }

  const user = getStoredUser();
  if (!user) {
    return { email: "", name: "", isSignedIn: false };
  }

  const email = normalizeEmail(user?.email);
  const name = typeof user?.name === "string" ? user.name.trim() : "";
  return { email, name, isSignedIn: Boolean(email) };
}
