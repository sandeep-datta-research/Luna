import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 200;
const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const RESET_TOKEN_TTL_MINUTES = 20;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validatePasswordStrength(password) {
  const value = typeof password === "string" ? password : "";
  if (value.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    throw new Error("Password is too long.");
  }
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
    throw new Error("Password must include uppercase, lowercase, and a number.");
  }
  return value;
}

export async function hashPassword(password) {
  const value = validatePasswordStrength(password);
  const salt = randomBytes(16);
  const derived = await scrypt(value, salt, SCRYPT_KEYLEN);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  const rawHash = normalizeText(storedHash);
  if (!rawHash) return false;

  const parts = rawHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nRaw, rRaw, pRaw, saltHex, hashHex] = parts;
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p) || !saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = await scrypt(password, salt, expected.length, { N: n, r, p });
  const actual = Buffer.from(derived);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function hashResetToken(token) {
  const value = normalizeText(token);
  if (!value) return "";
  return createHash("sha256").update(value).digest("hex");
}

export function createPasswordResetToken() {
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt,
  };
}

export function getPasswordResetPreviewAllowed() {
  return (process.env.NODE_ENV || "").toLowerCase() !== "production";
}
