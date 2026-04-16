import { useEffect, useRef, useState } from "react";
import {
  fetchApi,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
} from "@/lib/api-client";

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

let googleSdkPromise = null;

function notifyAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("luna-auth-changed"));
}

function setStoredAuth({ user }) {
  if (user) setStoredUser(user);
  notifyAuthChange();
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;
  clearStoredUser();
  notifyAuthChange();
}

function waitForGoogleReady(resolve, reject, attempt = 0) {
  if (typeof window !== "undefined" && window.google?.accounts?.id) {
    resolve(window.google.accounts.id);
    return;
  }

  if (attempt >= 40) {
    reject(new Error("Google SDK failed to initialize."));
    return;
  }

  setTimeout(() => waitForGoogleReady(resolve, reject, attempt + 1), 100);
}

function loadGoogleSdk() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is unavailable."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id);
  }

  if (googleSdkPromise) {
    return googleSdkPromise;
  }

  googleSdkPromise = new Promise((resolve, reject) => {
    const onReady = () => waitForGoogleReady(resolve, reject, 0);
    const onError = () => reject(new Error("Unable to load Google OAuth script."));

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener("error", onError, { once: true });
      onReady();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", onReady, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    googleSdkPromise = null;
    throw error;
  });

  return googleSdkPromise;
}

async function fetchAuthApi(path, options = {}) {
  const result = await fetchApi(path, options, { includeAuth: true, includeGuest: false });

  if (!result.ok && result.status === 0) {
    return {
      ...result,
      message: "Cannot reach backend API. Start backend with: cd server && npm start",
    };
  }

  return result;
}

export default function GoogleOAuthCard({ onSignedIn } = {}) {
  const buttonRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [runtimeError, setRuntimeError] = useState("");
  const [user, setUser] = useState(getStoredUser);

  const error = !GOOGLE_CLIENT_ID
    ? "Google OAuth not configured. Add VITE_GOOGLE_CLIENT_ID in .env.local"
    : runtimeError;

  useEffect(() => {
    const verifySession = async () => {
      const result = await fetchAuthApi("/api/auth/me");

      if (!result.ok || !result.data?.user) {
        clearStoredAuth();
        setUser(null);
        return;
      }

      setUser(result.data.user);
      setStoredAuth({ user: result.data.user });
    };

    verifySession();
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    const initializeGoogleButton = async () => {
      try {
        setRuntimeError("");
        await loadGoogleSdk();

        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;

        buttonRef.current.innerHTML = "";

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            const credential = typeof response?.credential === "string" ? response.credential : "";
            if (!credential) {
              setRuntimeError("Missing Google credential.");
              return;
            }

            const result = await fetchAuthApi("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential }),
            });

            if (!result.ok || !result.data?.token || !result.data?.user) {
              setRuntimeError(result.message || "Google login failed.");
              return;
            }

            setRuntimeError("");
            setUser(result.data.user);
            setStoredAuth({ user: result.data.user });
            if (typeof onSignedIn === "function") {
              onSignedIn(result.data.user);
            }
          },
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "signin_with",
          width: 300,
        });

        setIsReady(true);
      } catch (errorValue) {
        if (!cancelled) {
          setRuntimeError(errorValue?.message || "Google SDK failed to load.");
          setIsReady(false);
        }
      }
    };

    initializeGoogleButton();

    return () => {
      cancelled = true;
    };
  }, [onSignedIn]);

  const handleSignOut = async () => {
    await fetchAuthApi("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    setUser(null);
    clearStoredAuth();
  };

  return (
    <div className="rounded-2xl border border-zinc-700/60 bg-zinc-950/70 p-5">
      <h3 className="text-base font-semibold text-white">Google OAuth</h3>
      <p className="mt-1 text-xs text-zinc-400">Use Google sign-in for your Luna web app.</p>

      {user ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-emerald-200">{user.name}</p>
            <p className="truncate text-xs text-emerald-100/80">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-emerald-300/50 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-400/10"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <div ref={buttonRef} className="min-h-[42px]" />
          {!isReady && !error ? <p className="mt-2 text-xs text-zinc-500">Loading Google sign-in...</p> : null}
        </div>
      )}

      {error ? <p className="mt-3 text-xs text-amber-300">{error}</p> : null}
    </div>
  );
}
