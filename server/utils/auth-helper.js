import { randomUUID } from "crypto";
import { COOKIE_AUTH_TOKEN } from "../config.js";
import { readCookie, setGuestCookie } from "./cookie-helper.js";
import { isAuthenticatedUserContext } from "./common.js";
import { validateSessionToken } from "../db-adapter.js";

export { readCookie };
export { isAuthenticatedUserContext };

export function readBearerToken(req) {
  const authHeader = req.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return "";
  return authHeader.slice(7).trim();
}

export function normalizeGuestId(rawValue) {
  const safe = typeof rawValue === "string" ? rawValue.trim().toLowerCase() : "";
  const compact = safe.replace(/[^a-z0-9_-]/g, "").slice(0, 48);
  return compact || "local";
}

export function readGuestId(req) {
  return normalizeGuestId(
    readCookie(req, COOKIE_AUTH_TOKEN === "luna_auth_token" ? "luna_guest_id" : "luna_guest_id") ||
    req.get("x-luna-guest-id") ||
    "",
  );
}

export function ensureGuestId(req, res) {
  const existing = readGuestId(req);
  if (existing && existing !== "local") {
    setGuestCookie(req, res, existing);
    return existing;
  }

  const nextGuestId = normalizeGuestId(`guest_${randomUUID().replace(/-/g, "")}`);
  setGuestCookie(req, res, nextGuestId);
  return nextGuestId;
}

export async function resolveRequestUser(req, res) {
  const token = readBearerToken(req) || readCookie(req, COOKIE_AUTH_TOKEN);
  if (token) {
    const auth = await validateSessionToken(token);
    if (auth?.user?.id) {
      return { userId: auth.user.id, user: auth.user, token };
    }
  }

  const guestId = ensureGuestId(req, res);
  return { userId: `guest:${guestId}`, user: null, token: "" };
}
