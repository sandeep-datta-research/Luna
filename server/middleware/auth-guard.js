import { 
  ADMIN_EMAIL_ALLOWLIST,
  COOKIE_AUTH_TOKEN
} from "../config.js";
import { readCookie } from "../utils/cookie-helper.js";
import { readBearerToken as readToken } from "../utils/auth-helper.js";
import { validateSessionToken } from "../db-adapter.js";
import { recordAuthFailure } from "../observability.js";
import { normalizeEmail } from "../utils/common.js";

export async function requireAuthenticatedUser(req, res) {
  const token = readToken(req) || readCookie(req, COOKIE_AUTH_TOKEN);
  if (!token) {
    recordAuthFailure("missing_token", req);
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const auth = await validateSessionToken(token);
  if (!auth?.user?.id) {
    recordAuthFailure("invalid_session", req);
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  return { token, user: auth.user, session: auth.session, userId: auth.user.id };
}

export async function requireAdmin(req, res) {
  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return null;

  if (ADMIN_EMAIL_ALLOWLIST.size === 0) {
    recordAuthFailure("admin_not_configured", req);
    res.status(503).json({ error: "Admin access is not configured" });
    return null;
  }

  const email = normalizeEmail(auth.user.email);
  if (!ADMIN_EMAIL_ALLOWLIST.has(email)) {
    recordAuthFailure("admin_denied", req, email);
    res.status(403).json({ error: "Admin access required" });
    return null;
  }

  return auth;
}
