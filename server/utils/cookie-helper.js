import { COOKIE_AUTH_TOKEN, COOKIE_GUEST_ID } from "../config.js";

export function buildCookieOptions(req, overrides = {}) {
  const requestOrigin = `${req.get("origin") || ""}`.trim();
  const forwardedProto = `${req.get("x-forwarded-proto") || ""}`.trim().toLowerCase();
  const inferredSecure =
    forwardedProto === "https" ||
    requestOrigin.startsWith("https://") ||
    (process.env.NODE_ENV || "").toLowerCase() === "production";
  const secure =
    overrides.secure ?? inferredSecure;
  const sameSite = secure ? "None" : "Lax";
  const parts = [
    `Path=${overrides.path || "/"}`,
    `SameSite=${overrides.sameSite || sameSite}`,
  ];

  if (secure) parts.push("Secure");
  if (overrides.httpOnly !== false) parts.push("HttpOnly");
  if (overrides.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(overrides.maxAge))}`);
  return parts.join("; ");
}

export function appendCookie(res, name, value, options) {
  const nextValue = `${name}=${encodeURIComponent(value)}; ${options}`;
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", nextValue);
    return;
  }

  if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, nextValue]);
    return;
  }

  res.setHeader("Set-Cookie", [existing, nextValue]);
}

export function readCookie(req, name) {
  const raw = `${req.get("cookie") || ""}`;
  if (!raw) return "";

  const parts = raw.split(";");
  for (const item of parts) {
    const [key, ...rest] = item.split("=");
    if ((key || "").trim() !== name) continue;
    return decodeURIComponent(rest.join("=").trim());
  }
  return "";
}

export function setAuthCookie(req, res, token = "", expiresAt = "") {
  if (!token) return;
  const expiresMs = new Date(expiresAt).getTime();
  const maxAge = Number.isFinite(expiresMs) ? Math.max(0, Math.floor((expiresMs - Date.now()) / 1000)) : 30 * 24 * 60 * 60;
  appendCookie(
    res,
    COOKIE_AUTH_TOKEN,
    token,
    buildCookieOptions(req, { maxAge }),
  );
}

export function clearAuthCookie(req, res) {
  appendCookie(
    res,
    COOKIE_AUTH_TOKEN,
    "",
    buildCookieOptions(req, { maxAge: 0 }),
  );
}

export function setGuestCookie(req, res, guestId = "") {
  if (!guestId) return;
  appendCookie(
    res,
    COOKIE_GUEST_ID,
    guestId,
    buildCookieOptions(req, { maxAge: 365 * 24 * 60 * 60, httpOnly: false }),
  );
}
