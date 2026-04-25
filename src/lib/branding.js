import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";

let brandingCache = {
  logoUrl: "",
};

let brandingPromise = null;

export function setBrandingLogoCache(logoUrl = "") {
  brandingCache = {
    ...brandingCache,
    logoUrl: typeof logoUrl === "string" ? logoUrl.trim() : "",
  };
}

async function loadBranding() {
  if (brandingPromise) return brandingPromise;

  brandingPromise = fetchApi("/api/branding", {}, { includeAuth: false, includeGuest: false })
    .then((result) => {
      if (result.ok && result.data?.branding) {
        setBrandingLogoCache(result.data.branding.logoUrl);
      }
      return brandingCache;
    })
    .finally(() => {
      brandingPromise = null;
    });

  return brandingPromise;
}

export function useBrandingLogo(fallbackLogo = "") {
  const [logoUrl, setLogoUrl] = useState(brandingCache.logoUrl || fallbackLogo);

  useEffect(() => {
    let cancelled = false;

    setLogoUrl(brandingCache.logoUrl || fallbackLogo);

    loadBranding()
      .then((branding) => {
        if (cancelled) return;
        setLogoUrl(branding.logoUrl || fallbackLogo);
      })
      .catch(() => {
        if (cancelled) return;
        setLogoUrl((current) => current || fallbackLogo);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackLogo]);

  return logoUrl || fallbackLogo;
}
