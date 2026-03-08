const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const DEFAULT_BASES = [
  API_BASE_URL,
  "",
  "http://localhost:5112",
  "http://localhost:5108",
  "http://localhost:5000",
].map((base) => (typeof base === "string" ? base.replace(/\/$/, "") : ""));

export const API_BASE_URLS = [...new Set(DEFAULT_BASES.filter((value) => value !== null && value !== undefined))];

export const AUTH_TOKEN_STORAGE_KEY = "luna_auth_token";
export const AUTH_USER_STORAGE_KEY = "luna_google_user";
export const GUEST_ID_STORAGE_KEY = "luna_guest_id";

function isHtml(rawText) {
  const text = (rawText || "").trim();
  return text.startsWith("<!DOCTYPE") || text.startsWith("<html");
}

function createGuestId() {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

  return `guest_${random.slice(0, 18)}`;
}

export function getAuthToken() {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "").trim();
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getGuestId() {
  if (typeof window === "undefined") return "guest_local";

  const current = (localStorage.getItem(GUEST_ID_STORAGE_KEY) || "").trim();
  if (current) return current;

  const next = createGuestId();
  localStorage.setItem(GUEST_ID_STORAGE_KEY, next);
  return next;
}

export function buildRequestHeaders(headers = {}, { includeAuth = true, includeGuest = true } = {}) {
  const nextHeaders = new Headers(headers || {});

  if (includeAuth) {
    const token = getAuthToken();
    if (token && !nextHeaders.has("Authorization")) {
      nextHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  if (includeGuest) {
    const guestId = getGuestId();
    if (guestId && !nextHeaders.has("x-luna-guest-id")) {
      nextHeaders.set("x-luna-guest-id", guestId);
    }
  }

  return Object.fromEntries(nextHeaders.entries());
}

async function fetchJsonSafe(url, options = {}, headerMode = { includeAuth: true, includeGuest: true }) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: buildRequestHeaders(options.headers || {}, headerMode),
    });

    const rawText = await response.text();
    let data = null;

    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      const message =
        data?.error ||
        data?.message ||
        (isHtml(rawText)
          ? `API returned HTML instead of JSON for ${url}. Check backend and VITE_API_URL.`
          : `Request failed (${response.status})`);

      return { ok: false, status: response.status, data, message, url };
    }

    if (!data) {
      return { ok: false, status: response.status, data: null, message: "Invalid API response (expected JSON).", url };
    }

    return { ok: true, status: response.status, data, message: "", url };
  } catch (error) {
    return { ok: false, status: 0, data: null, message: error?.message || "Failed to fetch", url };
  }
}

export async function fetchApi(path, options = {}, headerMode = { includeAuth: true, includeGuest: true }) {
  let lastResult = { ok: false, status: 0, data: null, message: `Failed to fetch ${path}` };

  for (const base of API_BASE_URLS) {
    const url = base ? `${base}${path}` : path;
    const result = await fetchJsonSafe(url, options, headerMode);
    if (result.ok) return result;

    lastResult = result;

    const shouldTryNextBase =
      result.status === 404 ||
      result.message === "Invalid API response (expected JSON)." ||
      result.message?.includes("API returned HTML instead of JSON");

    if (result.status > 0 && !shouldTryNextBase) {
      return result;
    }
  }

  if (lastResult.status === 0) {
    return {
      ...lastResult,
      message: "Cannot reach backend API. Start backend with: cd server && npm start (default port 5112).",
    };
  }

  return lastResult;
}
