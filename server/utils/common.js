import { 
  IS_PRODUCTION, 
  EXPLICIT_ALLOWED_ORIGINS, 
  DEFAULT_MEMORY, 
  RESPONSE_STYLE_OPTIONS, 
  LEARNING_LEVEL_OPTIONS,
  LUNA_FAST_MESSAGE_WORDS
} from "../config.js";
import { CATEGORY_LABELS } from "../luna-classifier.js";

export function normalizeOrigin(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";

  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

export function isLocalDevOrigin(origin) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  try {
    const { hostname } = new URL(normalized);
    const lowered = hostname.toLowerCase();
    return lowered === "localhost" || lowered === "127.0.0.1" || lowered === "[::1]";
  } catch {
    return false;
  }
}

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  if (EXPLICIT_ALLOWED_ORIGINS.has(normalized)) return true;
  if (!IS_PRODUCTION && isLocalDevOrigin(normalized)) return true;

  return false;
}

export function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function buildAccountSecurity(user) {
  const hasPassword = Boolean(user?.hasPassword);
  const hasGoogle = Boolean(`${user?.googleSub || ""}`.trim());
  const providers = [];
  if (hasGoogle) providers.push("google");
  if (hasPassword) providers.push("password");
  return {
    hasPassword,
    hasGoogle,
    authProviders: providers,
    passwordUpdatedAt: typeof user?.passwordUpdatedAt === "string" ? user.passwordUpdatedAt : "",
  };
}

export function isoDateKey(dateValue = new Date()) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

export function isAuthenticatedUserContext(ctx) {
  return Boolean(ctx?.user && !String(ctx.userId || "").startsWith("guest:"));
}

export function sanitizePromptText(value) {
  return typeof value === "string" ? value.trim().slice(0, 5000) : "";
}

export function sanitizeLogoUrl(value) {
  return typeof value === "string" ? value.trim().slice(0, 2_000_000) : "";
}

export function extractProviderError(error) {
  const status = error.response?.status || error.status || 500;
  const responseData = error.response?.data || error.responseData;
  const providerMessage =
    responseData?.error?.message ||
    responseData?.error_description ||
    (typeof responseData?.error === "string" ? responseData.error : "") ||
    responseData?.message ||
    (typeof responseData === "string" ? responseData : "") ||
    error.message ||
    "AI API request failed";

  return { status, providerMessage, responseData };
}

export function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export function normalizeResponseStyle(value) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!RESPONSE_STYLE_OPTIONS.has(raw)) return DEFAULT_MEMORY.response_style;
  if (raw === "step-by-step") return "Step by step";
  return raw === "short" ? "Short" : raw === "detailed" ? "Detailed" : "Step by step";
}

export function normalizeLearningLevel(value) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!LEARNING_LEVEL_OPTIONS.has(raw)) return DEFAULT_MEMORY.learning_level;
  return raw[0].toUpperCase() + raw.slice(1);
}

export function splitTextForStream(text, maxChunk = 18) {
  const normalized = typeof text === "string" ? text : "";
  if (!normalized) return [];

  const parts = normalized.match(/\s+|[^\s]+/g) || [];
  const chunks = [];
  let current = "";

  for (const part of parts) {
    if (current && current.length + part.length > maxChunk) {
      chunks.push(current);
      current = part;
    } else {
      current += part;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function splitForUiTokens(text) {
  const normalized = typeof text === "string" ? text : "";
  if (!normalized) return [];

  const rawParts = normalized.match(/\s+|[^\s]+/g) || [];
  const tokens = [];

  for (const part of rawParts) {
    if (/^\s+$/.test(part)) {
      tokens.push(part);
      continue;
    }

    if (part.length <= 12) {
      tokens.push(part);
      continue;
    }

    for (let index = 0; index < part.length; index += 8) {
      tokens.push(part.slice(index, index + 8));
    }
  }

  return tokens;
}

export function streamTextChunks(text, onToken) {
  const chunks = splitTextForStream(text);
  for (const chunk of chunks) {
    if (typeof onToken === "function") {
      onToken(chunk);
    }
  }
}

export function toPlainPrompt(messages) {
  return (messages || [])
    .map((item) => {
      const role = item?.role === "assistant" ? "Assistant" : item?.role === "user" ? "User" : "System";
      return `${role}: ${item?.content || ""}`.trim();
    })
    .join("\n")
    .trim();
}

export function isShortCasualMessage(message, label) {
  if (!message || label !== CATEGORY_LABELS.CASUAL) return false;
  const words = String(message).trim().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= LUNA_FAST_MESSAGE_WORDS;
}

export function clampReplyLength(reply) {
  if (!reply) return "";
  let normalized = reply.replace(/\n{3,}/g, "\n\n").trim();

  if (!/[.!?]$/.test(normalized)) {
    return normalized + ".";
  }

  return normalized;
}
