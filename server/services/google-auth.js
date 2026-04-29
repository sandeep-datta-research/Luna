import axios from "axios";
import { GOOGLE_CLIENT_ID } from "../config.js";
import { extractProviderError } from "../utils/common.js";

function decodeJwtPayload(idToken) {
  try {
    const parts = `${idToken || ""}`.split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isDevEnvironment() {
  return `${process.env.NODE_ENV || ""}`.toLowerCase() !== "production";
}

function normalizeGoogleProfilePayload(data) {
  return {
    sub: `${data.sub || ""}`,
    email: `${data.email || ""}`,
    name: `${data.name || "Google User"}`,
    picture: `${data.picture || ""}`,
  };
}

export async function verifyGoogleCredential(credential) {
  const idToken = typeof credential === "string" ? credential.trim() : "";
  if (!idToken) {
    throw Object.assign(new Error("Google credential is required"), { status: 400 });
  }

  let data = null;
  try {
    const response = await axios.get("https://oauth2.googleapis.com/tokeninfo", {
      params: { id_token: idToken },
      timeout: 15000,
    });
    data = response.data;
  } catch (error) {
    const fallbackPayload = decodeJwtPayload(idToken);

    if (isDevEnvironment() && fallbackPayload?.sub) {
      data = fallbackPayload;
    } else {
      const normalized = extractProviderError(error);
      throw Object.assign(new Error(normalized.providerMessage || "Invalid Google credential"), { status: 401 });
    }
  }

  if (!data?.sub) {
    throw Object.assign(new Error("Invalid Google token payload"), { status: 401 });
  }

  if (GOOGLE_CLIENT_ID) {
    const aud = `${data.aud || ""}`.trim();
    const azp = `${data.azp || ""}`.trim();
    if (aud && aud !== GOOGLE_CLIENT_ID && azp && azp !== GOOGLE_CLIENT_ID) {
      throw Object.assign(new Error("Google token audience mismatch"), { status: 401 });
    }
  }

  const exp = Number(data.exp || 0);
  if (Number.isFinite(exp) && exp > 0 && exp * 1000 < Date.now() - 30_000) {
    throw Object.assign(new Error("Google token expired"), { status: 401 });
  }

  return normalizeGoogleProfilePayload(data);
}
