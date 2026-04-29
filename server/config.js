import "./load-env.js";

function parseDelimitedEnv(value) {
  return `${value || ""}`
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";

  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

function parseAllowedOrigins() {
  return [
    process.env.CORS_ALLOWED_ORIGINS,
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    process.env.SITE_URL,
  ]
    .flatMap((value) => parseDelimitedEnv(value))
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);
}

function readProviderSecret(name) {
  const raw = typeof process.env[name] === "string" ? process.env[name] : "";
  return raw.replace(/\s+/g, "");
}

export const PORT = Number(process.env.PORT) || 5108;
export const LUNA_MAX_RESPONSE_MS = Number(process.env.LUNA_MAX_RESPONSE_MS || 8000);
export const LUNA_PROVIDER_TIMEOUT_MS = Number(process.env.LUNA_PROVIDER_TIMEOUT_MS || 7000);
export const LUNA_STREAM_TIMEOUT_MS = Number(process.env.LUNA_STREAM_TIMEOUT_MS || 7000);
export const LUNA_MAX_PROVIDER_ATTEMPTS = Number(process.env.LUNA_MAX_PROVIDER_ATTEMPTS || 1);
export const LUNA_FAST_MESSAGE_WORDS = Number(process.env.LUNA_FAST_MESSAGE_WORDS || 6);

export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-nano-30b-a3b:free";
export const OPENROUTER_GLM45_AIR_MODEL = process.env.OPENROUTER_GLM45_AIR_MODEL || "z-ai/glm-4.5-air:free";
export const NVIDIA_GLM_MODEL = process.env.NVIDIA_GLM_MODEL || "z-ai/glm4.7";
export const NVIDIA_QWEN_MODEL = process.env.NVIDIA_QWEN_MODEL || "qwen/qwen3-235b-a22b";
export const ZAI_GLM_MODEL = process.env.ZAI_GLM_MODEL || "z-ai/glm-4.5";
export const ZAI_API_URL = process.env.ZAI_API_URL || "https://api.z.ai/api/paas/v4/chat/completions";
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
export const HUGGINGFACE_MODEL = process.env.HUGGINGFACE_MODEL || "HuggingFaceH4/zephyr-7b-beta";
export const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || "").trim();

export const COOKIE_AUTH_TOKEN = "luna_auth_token";
export const COOKIE_GUEST_ID = "luna_guest_id";
export const IS_PRODUCTION = (process.env.NODE_ENV || "").trim().toLowerCase() === "production";

export const EXPLICIT_ALLOWED_ORIGINS = new Set(parseAllowedOrigins());

export const GEMINI_API_KEY = readProviderSecret("GEMINI_API_KEY");
export const GROQ_API_KEY = readProviderSecret("GROQ_API_KEY");
export const NVIDIA_API_KEY = readProviderSecret("NVIDIA_API_KEY");
export const OPENROUTER_API_KEY = readProviderSecret("OPENROUTER_API_KEY");
export const ZAI_API_KEY = readProviderSecret("ZAI_API_KEY");
export const HUGGINGFACE_API_KEY = readProviderSecret("HUGGINGFACE_API_KEY");

export const MAX_HISTORY_MESSAGES = 20;
export const FREE_DAILY_LIMIT = Number(process.env.LUNA_FREE_DAILY_LIMIT || 100);
export const DEFAULT_PRO_MONTHLY_PRICE_INR = Number(process.env.LUNA_PRO_PRICE_INR || 90);
export const DEFAULT_UPI_ID = (process.env.LUNA_PRO_UPI_ID || "9366183700@fam").trim();
export const ADMIN_EMAIL_ALLOWLIST = new Set(
  parseDelimitedEnv(process.env.LUNA_ADMIN_EMAILS)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
);

export const MANUALLY_DISABLED_PROVIDERS = new Set(
  (process.env.LUNA_DISABLED_PROVIDERS || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean),
);

export const DEFAULT_CHARACTER_PROFILE = {
  id: "luna-classic",
  name: "Luna Classic",
  tagline: "Witty, sharp, balanced",
  description: "Default Luna voice with playful intelligence and practical help.",
  imageUrl: "",
  accentStart: "#7fc7ba",
  accentEnd: "#0f1f24",
  prompt: "Primary persona: Luna Classic. Keep Luna's established identity, witty warmth, and anime-inspired confidence.",
  starterPrompts: [
    "Help me plan my day in 5 practical steps.",
    "Rewrite this message so it sounds sharper and more confident.",
    "Break this problem down and tell me the best next move.",
  ],
  promptVersions: [],
  access: "free",
  active: true,
  sortOrder: 0,
  usageCount: 0,
  usageCountFree: 0,
  usageCountPro: 0,
  lastUsedAt: "",
};

export const CONCISE_STYLE_PROMPT = `Response style:
- Keep answers concise and structured.
- Use short paragraphs or bullets.
- Answer as much as the user required and    stay clear and understandable of user's emotion.`;

export const DETAILED_STYLE_PROMPT = `Response style (detailed):
- Be structured.
- Use clear steps.
- Keep it useful and non-repetitive.`;

export const DEFAULT_MEMORY = {
  goals: [],
  subjects: [],
  response_style: "Detailed",
  favorite_topics: [],
  learning_level: "Beginner",
};

export const RESPONSE_STYLE_OPTIONS = new Set(["short", "detailed", "step by step", "step-by-step"]);
export const LEARNING_LEVEL_OPTIONS = new Set(["beginner", "intermediate", "advanced"]);
