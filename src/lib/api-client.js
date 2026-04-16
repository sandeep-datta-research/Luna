const GITHUB_PAGES_API_FALLBACK = "https://luna-backend-yc4e.onrender.com";

const IS_GITHUB_PAGES =
  typeof window !== "undefined" && window.location.hostname.endsWith("github.io");
const IS_IOS =
  typeof window !== "undefined" && /iPad|iPhone|iPod/i.test(window.navigator?.userAgent || "");

function normalizeApiBase(input) {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/$/, "");
  }

  if (value.startsWith("//")) {
    return `https:${value}`.replace(/\/$/, "");
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(value)) {
    return `https://${value}`.replace(/\/$/, "");
  }

  return value.replace(/\/$/, "");
}

const API_BASE_URL = normalizeApiBase(
  import.meta.env.VITE_API_URL || (IS_GITHUB_PAGES ? GITHUB_PAGES_API_FALLBACK : ""),
);

const DEFAULT_BASES = [
  API_BASE_URL,
  GITHUB_PAGES_API_FALLBACK,
  ...(IS_GITHUB_PAGES ? [] : [""]),
  "http://localhost:5112",
  "http://localhost:5108",
  "http://localhost:5000",
].map((base) => (typeof base === "string" ? base.replace(/\/$/, "") : ""));

export const API_BASE_URLS = [...new Set(DEFAULT_BASES.filter((value) => value !== null && value !== undefined))];

export const AUTH_TOKEN_STORAGE_KEY = "luna_auth_token";
export const AUTH_USER_STORAGE_KEY = "luna_google_user";
export const GUEST_ID_STORAGE_KEY = "luna_guest_id";

let cachedUser = null;

function isHtml(rawText) {
  const text = (rawText || "").trim();
  return text.startsWith("<!DOCTYPE") || text.startsWith("<html");
}

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const source = `; ${document.cookie || ""}`;
  const parts = source.split(`; ${name}=`);
  if (parts.length < 2) return "";
  return decodeURIComponent(parts.pop()?.split(";").shift() || "");
}

export function getAuthToken() {
  return readCookie(AUTH_TOKEN_STORAGE_KEY).trim();
}

export function getStoredUser() {
  return cachedUser;
}

export function setStoredUser(user) {
  cachedUser = user ? { ...user } : null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("luna-auth-changed"));
  }
}

export function clearStoredUser() {
  cachedUser = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("luna-auth-changed"));
  }
}

export function buildRequestHeaders(headers = {}, { includeAuth = true, includeGuest = true } = {}) {
  const nextHeaders = new Headers(headers || {});

  if (includeAuth) {
    const token = getAuthToken();
    if (token && !nextHeaders.has("Authorization")) {
      nextHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  void includeGuest;
  void IS_IOS;

  return Object.fromEntries(nextHeaders.entries());
}

async function fetchJsonSafe(url, options = {}, headerMode = { includeAuth: true, includeGuest: true }) {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: options.credentials || "include",
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

export async function hydrateUser() {
  const token = getAuthToken();
  if (cachedUser?.id) {
    return cachedUser;
  }

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const result = await fetchApi("/api/auth/me", { headers }, { includeAuth: false, includeGuest: false });
  if (result.ok && result.data?.user) {
    setStoredUser(result.data.user);
    return result.data.user;
  }

  clearStoredUser();
  return null;
}
function parseSseEvent(rawEvent) {
  if (!rawEvent) return null;
  const lines = rawEvent.replace(/\r/g, "").split("\n");
  let event = "message";
  const dataLines = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  const payload = dataLines.join("\n");
  if (!payload) return { event, data: null };

  try {
    return { event, data: JSON.parse(payload) };
  } catch {
    return { event, data: payload };
  }
}

async function streamSse(url, options = {}, handlers = {}, headerMode = { includeAuth: true, includeGuest: true }) {
  const response = await fetch(url, {
    ...options,
    credentials: options.credentials || "include",
    headers: buildRequestHeaders(options.headers || {}, headerMode),
  });

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!response.ok) {
    const rawText = await response.text();
    let data = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    const message =
      data?.error ||
      data?.message ||
      (isHtml(rawText)
        ? `API returned HTML instead of JSON for ${url}. Check backend and VITE_API_URL.`
        : `Request failed (${response.status})`);

    return { ok: false, status: response.status, data, message, url };
  }

  if (!contentType.includes("text/event-stream")) {
    const rawText = await response.text();
    let data = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    return {
      ok: false,
      status: response.status,
      data,
      message: "Invalid streaming response (expected event-stream).",
      url,
    };
  }

  if (!response.body) {
    return {
      ok: false,
      status: response.status,
      data: null,
      message: "Streaming response body is empty.",
      url,
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let donePayload = null;
  let errorPayload = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let match;
    while ((match = buffer.match(/\r?\n\r?\n/))) {
      const idx = match.index ?? -1;
      if (idx < 0) break;
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + match[0].length);

      const parsed = parseSseEvent(rawEvent);
      if (!parsed) continue;

      if (parsed.event === "start") {
        handlers.onStart?.(parsed.data);
      } else if (parsed.event === "token") {
        const token = typeof parsed.data === "string" ? parsed.data : parsed.data?.token;
        if (token) handlers.onToken?.(token);
      } else if (parsed.event === "done") {
        donePayload = parsed.data;
        handlers.onDone?.(parsed.data);
      } else if (parsed.event === "error") {
        errorPayload = parsed.data || { error: "Stream error" };
        handlers.onError?.(errorPayload);
      } else if (parsed.event === "message") {
        handlers.onMessage?.(parsed.data);
      }
    }
  }

  if (errorPayload) {
    return {
      ok: false,
      status: 500,
      data: errorPayload,
      message: errorPayload?.error || "Stream error",
      url,
    };
  }

  return { ok: true, status: response.status, data: donePayload, message: "", url };
}

export async function streamApi(path, options = {}, handlers = {}, headerMode = { includeAuth: true, includeGuest: true }) {
  let lastResult = { ok: false, status: 0, data: null, message: `Failed to stream ${path}` };

  for (const base of API_BASE_URLS) {
    const url = base ? `${base}${path}` : path;

    try {
      const result = await streamSse(url, options, handlers, headerMode);
      if (result.ok) return result;

      lastResult = result;

      const shouldTryNextBase =
        result.status === 404 ||
        result.message === "Invalid streaming response (expected event-stream)." ||
        result.message?.includes("API returned HTML instead of JSON");

      if (result.status > 0 && !shouldTryNextBase) {
        return result;
      }
    } catch (error) {
      lastResult = {
        ok: false,
        status: 0,
        data: null,
        message: error?.message || "Failed to stream",
        url,
      };
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
