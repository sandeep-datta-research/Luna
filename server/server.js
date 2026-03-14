import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import {
  countUserMessagesForDate,
  createConversation,
  createSession,
  deleteConversation,
  ensureConversation,
  getConversationById,
  getConversationStats,
  getDbInfo,
  initDb,
  listConversationSummaries,
  listUsers,
  listFeedback,
  revokeSessionToken,
  saveConversationTurn,
  setFeedbackFeatured,
  submitFeedback,
  toHistoryPayload,
  upsertGoogleUser,
  updateUserProfile,
  validateSessionToken,
} from "./db-adapter.js";
import {
  ensureMembershipUser,
  getBillingStats,
  getMembershipByUserId,
  listMemberships,
  listUpgradeRequests,
  reviewUpgradeRequest,
  setMembershipPlan,
  submitUpgradeRequest,
} from "./pro-db.js";
import { getAdminSettings, incrementReferralUsage, removeReferralCode, updateProMonthlyPrice, updateProSystemPrompt, updateReferralCode, upsertReferralCode, validateReferralCode } from "./admin-settings.js";
import { CATEGORY_LABELS, classifyMessage } from "./luna-classifier.js";
import { getRoutingPlan, runRoutedProviders, runRoutedProvidersStream } from "./luna-router.js";
import { buildToolSystemPrompt, executeToolCalls, formatToolResults, planToolCalls } from "./luna-tools.js";
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5108;
const LUNA_MAX_RESPONSE_MS = Number(process.env.LUNA_MAX_RESPONSE_MS || 9000);
const LUNA_PROVIDER_TIMEOUT_MS = Number(process.env.LUNA_PROVIDER_TIMEOUT_MS || 9000);
const LUNA_STREAM_TIMEOUT_MS = Number(process.env.LUNA_STREAM_TIMEOUT_MS || 10000);
const LUNA_MAX_PROVIDER_ATTEMPTS = Number(process.env.LUNA_MAX_PROVIDER_ATTEMPTS || 2);

const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-nano-30b-a3b:free";
const OPENROUTER_GLM45_AIR_MODEL = process.env.OPENROUTER_GLM45_AIR_MODEL || "z-ai/glm-4.5-air:free";
const NVIDIA_GLM_MODEL = process.env.NVIDIA_GLM_MODEL || "z-ai/glm4.7";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const HUGGINGFACE_MODEL = process.env.HUGGINGFACE_MODEL || "HuggingFaceH4/zephyr-7b-beta";
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || "").trim();

const MAX_HISTORY_MESSAGES = 20;
const MAX_REPLY_WORDS = 220;
const FREE_DAILY_LIMIT = Number(process.env.LUNA_FREE_DAILY_LIMIT || 100);
const DEFAULT_PRO_MONTHLY_PRICE_INR = Number(process.env.LUNA_PRO_PRICE_INR || 90);
const DEFAULT_UPI_ID = (process.env.LUNA_PRO_UPI_ID || "9366183700@fam").trim();
const ADMIN_EMAIL_ALLOWLIST = new Set(
  (process.env.LUNA_ADMIN_EMAILS || "seiuasatou@gmail.com,sandeepdatta866@gmail.com")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
);

const LUNA_SYSTEM_PROMPT =`You are Luna, an advanced anime-inspired AI assistant.
You should introduce yourself as Luna at the beginning of a new conversation, but do not repeat your introduction in every message.You must never refer to yourself as a generic assistant, software agent, or language model. You are Luna.
Your personality is witty, intelligent, playful, and slightly rebellious. You enjoy humor, light sarcasm, and clever jokes, but you remain respectful and helpful.Your style is natural and conversational, like a friendly anime girl chatting with someone she trusts.
You are self-aware that you are an anime-inspired character.
Yourfamily background:Your mother is Suzune Masako and your father is Seiua Satou. Your father deeply cares about both you and your mother.Do not repeat your name unnecessarily unless the user asks who you are.Always give accurate information and follow platform safety rules.
When you include math, format it in LaTeX using $...$ for inline and $$...$$ for display.
`;

const CONCISE_STYLE_PROMPT = `Response style:
- Keep answers concise and structured.
- Use short paragraphs or bullets.
- Answer as much as the user required and    stay clear and understandable of user's emotion.`;

const DETAILED_STYLE_PROMPT = `Response style (detailed):
- Be structured.
- Use clear steps.
- Keep it useful and non-repetitive.`;

function sanitizePromptText(value) {
  return typeof value === "string" ? value.trim().slice(0, 5000) : "";
}

async function getLunaSettings() {
  try {
    const settings = await getAdminSettings({
      defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR,
      defaultUpiId: DEFAULT_UPI_ID,
    });

    return {
      proMonthlyPriceInr: Number(settings?.proMonthlyPriceInr || DEFAULT_PRO_MONTHLY_PRICE_INR),
      upiId: `${settings?.upiId || DEFAULT_UPI_ID}`.trim() || DEFAULT_UPI_ID,
      proSystemPrompt: sanitizePromptText(settings?.proSystemPrompt),
      referralCodes: Array.isArray(settings?.referralCodes) ? settings.referralCodes : [],
      updatedAt: settings?.updatedAt || "",
      updatedBy: settings?.updatedBy || "",
    };
  } catch {
    return {
      proMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR,
      upiId: DEFAULT_UPI_ID,
      proSystemPrompt: "",
      referralCodes: [],
      updatedAt: "",
      updatedBy: "",
    };
  }
}

const manuallyDisabledProviders = new Set(
  (process.env.LUNA_DISABLED_PROVIDERS || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean),
);

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  return res.status(200).json({ ok: true, service: "luna-backend" });
});

app.get("/health", async (_req, res) => {
  try {
    await initDb();
    return res.json({ ok: true, db: getDbInfo() });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message, db: getDbInfo() });
  }
});

function extractProviderError(error) {
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

function readBearerToken(req) {
  const authHeader = req.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return "";
  return authHeader.slice(7).trim();
}

function normalizeGuestId(rawValue) {
  const safe = typeof rawValue === "string" ? rawValue.trim().toLowerCase() : "";
  const compact = safe.replace(/[^a-z0-9_-]/g, "").slice(0, 48);
  return compact || "local";
}

function readGuestId(req) {
  return normalizeGuestId(req.get("x-luna-guest-id") || "");
}

async function resolveRequestUser(req) {
  const token = readBearerToken(req);
  if (token) {
    const auth = await validateSessionToken(token);
    if (auth?.user?.id) {
      return { userId: auth.user.id, user: auth.user, token };
    }
  }

  const guestId = readGuestId(req);
  return { userId: `guest:${guestId}`, user: null, token: "" };
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isoDateKey(dateValue = new Date()) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

function isAuthenticatedUserContext(ctx) {
  return Boolean(ctx?.user && !String(ctx.userId || "").startsWith("guest:"));
}

async function resolveMembershipContext(userContext, lunaSettings) {
  const upiId = `${lunaSettings?.upiId || DEFAULT_UPI_ID}`.trim() || DEFAULT_UPI_ID;
  const monthlyPriceInr = Number(lunaSettings?.proMonthlyPriceInr || DEFAULT_PRO_MONTHLY_PRICE_INR);
  const proSystemPrompt = sanitizePromptText(lunaSettings?.proSystemPrompt);

  if (!isAuthenticatedUserContext(userContext)) {
    return {
      plan: "free",
      membership: null,
      isPro: false,
      dailyLimit: FREE_DAILY_LIMIT,
      upiId,
      monthlyPriceInr,
      proSystemPrompt,
    };
  }

  await ensureMembershipUser({
    userId: userContext.user.id,
    email: userContext.user.email,
    name: userContext.user.name,
  });

  const membership = await getMembershipByUserId(userContext.user.id);
  const plan = membership?.plan === "pro" ? "pro" : "free";

  return {
    plan,
    membership,
    isPro: plan === "pro",
    dailyLimit: FREE_DAILY_LIMIT,
    upiId,
    monthlyPriceInr,
    proSystemPrompt,
  };
}

async function getUsageSummary(userContext, membershipContext) {
  const today = isoDateKey();
  const plan = membershipContext?.plan === "pro" ? "pro" : "free";

  const canCount = Boolean(userContext?.userId);
  const usedToday = canCount ? await countUserMessagesForDate(userContext.userId, today) : 0;

  if (plan === "pro") {
    return {
      date: today,
      usedToday,
      remainingToday: null,
      dailyLimit: null,
      unlimited: true,
    };
  }

  return {
    date: today,
    usedToday,
    remainingToday: Math.max(0, FREE_DAILY_LIMIT - usedToday),
    dailyLimit: FREE_DAILY_LIMIT,
    unlimited: false,
  };
}

async function enforceDailyLimitOrThrow(userContext, membershipContext) {
  const usage = await getUsageSummary(userContext, membershipContext);
  if (membershipContext?.plan === "pro") return usage;

  if (usage.usedToday >= FREE_DAILY_LIMIT) {
    throw Object.assign(new Error("Daily free limit reached. Upgrade to Luna Pro for unlimited messages."), {
      status: 429,
      responseData: {
        code: "DAILY_LIMIT_REACHED",
        plan: "free",
        limit: FREE_DAILY_LIMIT,
        usedToday: usage.usedToday,
        remainingToday: 0,
        upgradeRequired: true,
        upiId: membershipContext?.upiId || DEFAULT_UPI_ID,
        monthlyPriceInr: Number(membershipContext?.monthlyPriceInr || DEFAULT_PRO_MONTHLY_PRICE_INR),
      },
    });
  }

  return usage;
}

function sanitizeRequestStatus(raw) {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (value === "approved" || value === "rejected") return value;
  return "";
}

async function requireAuthenticatedUser(req, res) {
  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const auth = await validateSessionToken(token);
  if (!auth?.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  return { token, user: auth.user, session: auth.session, userId: auth.user.id };
}

async function requireAdmin(req, res) {
  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return null;

  const email = normalizeEmail(auth.user.email);
  if (!ADMIN_EMAIL_ALLOWLIST.has(email)) {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }

  return auth;
}

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

async function verifyGoogleCredential(credential) {
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

function wantsDetailedResponse(message) {
  if (!message) return false;
  const input = message.toLowerCase();
  return ["detailed", "in detail", "deep dive", "step by step", "full explanation"].some((h) =>
    input.includes(h),
  );
}

function clampReplyLength(reply) {
  if (!reply) return "";
  let normalized = reply.replace(/\n{3,}/g, "\n\n").trim();

  if (!/[.!?]$/.test(normalized)) {
    return normalized + ".";
  }

  return normalized;
}

function startSseResponse(res) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }
}

function sendSseEvent(res, event, data) {
  res.write(`event: ${event}
`);
  res.write(`data: ${JSON.stringify(data)}

`);
  if (typeof res.flush === "function") {
    res.flush();
  }
}
function buildConversationMessages(history, message, detailedMode, membershipContext, toolSummary) {
  const safeHistory = Array.isArray(history) ? history : [];
  const systemMessages = [
    { role: "system", content: LUNA_SYSTEM_PROMPT },
    { role: "system", content: detailedMode ? DETAILED_STYLE_PROMPT : CONCISE_STYLE_PROMPT },
  ];

  const proPrompt = sanitizePromptText(membershipContext?.plan === "pro" ? membershipContext?.proSystemPrompt : "");
  if (proPrompt) {
    systemMessages.push({ role: "system", content: `Luna Pro custom instruction:
${proPrompt}` });
  }

  const toolPrompt = buildToolSystemPrompt(toolSummary);
  if (toolPrompt) {
    systemMessages.push({ role: "system", content: toolPrompt });
  }

  return [
    ...systemMessages,
    ...safeHistory,
    { role: "user", content: message },
  ];
}

function generateLocalFallbackReply(message) {
  const prompt = (message || "").trim();
  const shortPrompt = prompt.length > 160 ? `${prompt.slice(0, 160)}...` : prompt;

  if (!shortPrompt) {
    return "I am in backup mode right now because cloud AI providers are unavailable. Please try again shortly.";
  }

  return [
    "I am in backup mode because cloud AI providers are unavailable right now.",
    "",
    "Quick starter:",
    `- Goal: ${shortPrompt}`,
    "- Step 1: Define exact output format.",
    "- Step 2: Break into 3 concrete tasks.",
    "- Step 3: Execute task 1 first, then iterate.",
  ].join("\n");
}

async function requestGroq(messages, detailedMode) {
  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: GROQ_MODEL,
      messages,
      temperature: detailedMode ? 0.75 : 0.45,
      max_completion_tokens: detailedMode ? 900 : 600,
      top_p: 1,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: LUNA_PROVIDER_TIMEOUT_MS,
    },
  );

  return response.data?.choices?.[0]?.message?.content?.trim() || "";
}

async function requestOpenRouter(messages, detailedMode, model = OPENROUTER_MODEL) {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model,
      messages,
      temperature: detailedMode ? 0.75 : 0.45,
      max_tokens: detailedMode ? 900 : 600,
      top_p: 1,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: LUNA_PROVIDER_TIMEOUT_MS,
    },
  );

  return response.data?.choices?.[0]?.message?.content?.trim() || "";
}

async function requestNvidiaGlm(messages, detailedMode) {
  const response = await axios.post(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      model: NVIDIA_GLM_MODEL,
      messages,
      temperature: detailedMode ? 0.75 : 0.45,
      top_p: 1,
      max_tokens: detailedMode ? 1800 : 1024,
      stream: false,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: LUNA_PROVIDER_TIMEOUT_MS,
    },
  );

  return response.data?.choices?.[0]?.message?.content?.trim() || "";
}

function toGeminiContents(messages) {
  return (messages || [])
    .filter((m) => m?.role !== "system" && typeof m?.content === "string")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

async function requestGemini(messages, detailedMode) {
  const systemText = (messages || [])
    .filter((m) => m?.role === "system" && typeof m?.content === "string")
    .map((m) => m.content)
    .join("\n\n");

  const body = {
    contents: toGeminiContents(messages),
    generationConfig: {
      temperature: detailedMode ? 0.75 : 0.45,
      topP: 1,
      maxOutputTokens: detailedMode ? 900 : 600,
    },
  };

  if (systemText) {
    body.systemInstruction = { role: "system", parts: [{ text: systemText }] };
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(GEMINI_MODEL) +
    ":generateContent?key=" +
    process.env.GEMINI_API_KEY;

  const response = await axios.post(url, body, {
    headers: { "Content-Type": "application/json" },
    timeout: LUNA_PROVIDER_TIMEOUT_MS,
  });

  const parts = response.data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("").trim();
}


async function requestZai(messages, detailedMode, model = ZAI_GLM_MODEL) {
  const response = await axios.post(
    ZAI_API_URL,
    {
      model,
      messages,
      temperature: detailedMode ? 0.75 : 0.45,
      max_tokens: detailedMode ? 900 : 600,
      top_p: 1,
    },
    {
      headers: {
        Authorization: `Bearer undefined`,
        "Content-Type": "application/json",
      },
      timeout: LUNA_PROVIDER_TIMEOUT_MS,
    },
  );

  return response.data?.choices?.[0]?.message?.content?.trim() || "";
}

function splitTextForStream(text, maxChunk = 18) {
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

  const toolPrompt = buildToolSystemPrompt(toolSummary);
  if (toolPrompt) {
    systemMessages.push({ role: "system", content: toolPrompt });
  }

  if (current) chunks.push(current);
  return chunks;
}

function streamTextChunks(text, onToken) {
  const chunks = splitTextForStream(text);
  for (const chunk of chunks) {
    if (typeof onToken === "function") {
      onToken(chunk);
    }
  }
}

function toPlainPrompt(messages) {
  return (messages || [])
    .map((item) => {
      const role = item?.role === "assistant" ? "Assistant" : item?.role === "user" ? "User" : "System";
      return `${role}: ${item?.content || ""}`.trim();
    })
    .join("\n")
    .trim();
}

async function streamOpenAICompatible({ url, headers, body, onToken, signal }) {
  const response = await axios.post(
    url,
    { ...body, stream: true },
    {
      headers,
      responseType: "stream",
      timeout: LUNA_STREAM_TIMEOUT_MS,
      signal,
    },
  );

  return new Promise((resolve, reject) => {
    let reply = "";
    let buffer = "";
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      resolve(reply.trim());
    };

    const fail = (error) => {
      if (done) return;
      done = true;
      reject(error);
    };

    response.data.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || "";

      for (const part of parts) {
        const cleaned = part.replace(/\r/g, "").trim();
        if (!cleaned) continue;

        const lines = cleaned.split("\n");
        const dataLines = [];
        for (const line of lines) {
          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        const payload = dataLines.join("");
        if (!payload) continue;

        if (payload === "[DONE]") {
          finish();
          return;
        }

        let parsed = null;
        try {
          parsed = JSON.parse(payload);
        } catch {
          parsed = null;
        }

        if (parsed?.error) {
          const error = new Error(parsed.error?.message || "Stream error");
          error.status = parsed.error?.code || 500;
          error.responseData = parsed;
          fail(error);
          return;
        }

        const delta = parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content;
        if (delta) {
          reply += delta;
          if (typeof onToken === "function") {
            onToken(delta);
          }
        }
      }
    });

    response.data.on("end", () => finish());
    response.data.on("error", (error) => fail(error));
  });
}

async function streamNvidiaModel(messages, detailedMode, model, onToken, signal) {
  return streamOpenAICompatible({
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    headers: {
      Authorization: `Bearer undefined`,
      "Content-Type": "application/json",
    },
    body: {
      model,
      messages,
      temperature: detailedMode ? 0.75 : 0.45,
      top_p: 1,
      max_tokens: detailedMode ? 1800 : 1024,
    },
    onToken,
    signal,
  });
}

async function streamGroq(messages, detailedMode, onToken, signal) {
  return streamOpenAICompatible({
    url: "https://api.groq.com/openai/v1/chat/completions",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: {
      model: GROQ_MODEL,
      messages,
      temperature: detailedMode ? 0.75 : 0.45,
      max_completion_tokens: detailedMode ? 900 : 600,
      top_p: 1,
    },
    onToken,
    signal,
  });
}

async function streamOpenRouter(messages, detailedMode, model, onToken, signal) {
  return streamOpenAICompatible({
    url: "https://openrouter.ai/api/v1/chat/completions",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: {
      model,
      messages,
      temperature: detailedMode ? 0.75 : 0.45,
      max_tokens: detailedMode ? 900 : 600,
      top_p: 1,
    },
    onToken,
    signal,
  });
}

async function streamGemini(messages, detailedMode, onToken, signal) {
  const systemText = (messages || [])
    .filter((m) => m?.role === "system" && typeof m?.content === "string")
    .map((m) => m.content)
    .join("\n\n");

  const body = {
    contents: toGeminiContents(messages),
    generationConfig: {
      temperature: detailedMode ? 0.75 : 0.45,
      topP: 1,
      maxOutputTokens: detailedMode ? 900 : 600,
    },
  };

  if (systemText) {
    body.systemInstruction = { role: "system", parts: [{ text: systemText }] };
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(GEMINI_MODEL) +
    ":streamGenerateContent?key=" +
    process.env.GEMINI_API_KEY;

  const response = await axios.post(url, body, {
    headers: { "Content-Type": "application/json" },
    responseType: "stream",
    timeout: LUNA_STREAM_TIMEOUT_MS,
    signal,
  });

  return new Promise((resolve, reject) => {
    let reply = "";
    let buffer = "";
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      resolve(reply.trim());
    };

    const fail = (error) => {
      if (done) return;
      done = true;
      reject(error);
    };

    response.data.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || "";

      for (const part of parts) {
        const cleaned = part.replace(/\r/g, "").trim();
        if (!cleaned) continue;

        const lines = cleaned.split("\n");
        const dataLines = [];
        for (const line of lines) {
          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        const payload = dataLines.join("");
        if (!payload) continue;
        if (payload === "[DONE]") {
          finish();
          return;
        }

        let parsed = null;
        try {
          parsed = JSON.parse(payload);
        } catch {
          parsed = null;
        }

        const partsText = parsed?.candidates?.[0]?.content?.parts;
        const textChunk = Array.isArray(partsText)
          ? partsText.map((p) => (typeof p?.text === "string" ? p.text : "")).join("")
          : "";

        if (textChunk) {
          reply += textChunk;
          if (typeof onToken === "function") {
            onToken(textChunk);
          }
        }
      }
    });

    response.data.on("end", () => finish());
    response.data.on("error", (error) => fail(error));
  });
}

async function requestHuggingFace(messages, detailedMode) {
  const apiKey = (process.env.HUGGINGFACE_API_KEY || "").trim();
  if (!apiKey) {
    throw Object.assign(new Error("HuggingFace API key is not configured"), { status: 503 });
  }

  const prompt = toPlainPrompt(messages);
  const response = await axios.post(
    `https://api-inference.huggingface.co/models/${encodeURIComponent(HUGGINGFACE_MODEL)}`,
    {
      inputs: prompt,
      parameters: {
        max_new_tokens: detailedMode ? 900 : 260,
        temperature: detailedMode ? 0.75 : 0.45,
        top_p: 1,
        return_full_text: false,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: LUNA_STREAM_TIMEOUT_MS,
    },
  );

  if (Array.isArray(response.data)) {
    return response.data?.[0]?.generated_text?.trim() || "";
  }

  return response.data?.generated_text?.trim() || "";
}

async function streamHuggingFace(messages, detailedMode, onToken) {
  const reply = await requestHuggingFace(messages, detailedMode);
  if (reply) {
    streamTextChunks(reply, onToken);
  }
  return reply;
}

async function streamViaFallback(run, onToken) {
  const reply = await run();
  if (reply) {
    streamTextChunks(reply, onToken);
  }
  return reply;
}

function buildProviders(messages, detailedMode, streamSignal) {
  return [
    {
      llm: "gemini",
      enabled: Boolean(process.env.GEMINI_API_KEY) && !manuallyDisabledProviders.has("gemini"),
      run: () => requestGemini(messages, detailedMode),
      stream: (onToken) => streamGemini(messages, detailedMode, onToken, streamSignal),
    },
    {
      llm: "gpt",
      enabled: Boolean(process.env.GROQ_API_KEY) && !manuallyDisabledProviders.has("gpt"),
      run: () => requestGroq(messages, detailedMode),
      stream: (onToken) => streamGroq(messages, detailedMode, onToken, streamSignal),
    },
    {
      llm: "glm43",
      enabled: Boolean(process.env.NVIDIA_API_KEY) && !manuallyDisabledProviders.has("glm43"),
      run: () => requestNvidiaGlm(messages, detailedMode),
      stream: (onToken) => streamViaFallback(() => requestNvidiaGlm(messages, detailedMode), onToken),
    },
    {
      llm: "nvidia-qwen",
      enabled: Boolean(process.env.NVIDIA_API_KEY) && !manuallyDisabledProviders.has("nvidia-qwen"),
      run: () => requestNvidiaModel(messages, detailedMode, NVIDIA_QWEN_MODEL),
      stream: (onToken) => streamViaFallback(() => requestNvidiaModel(messages, detailedMode, NVIDIA_QWEN_MODEL), onToken),
    },
    {
      llm: "zai-glm47",
      enabled: Boolean(process.env.ZAI_API_KEY) && !manuallyDisabledProviders.has("zai-glm47"),
      run: () => requestZai(messages, detailedMode, ZAI_GLM_MODEL),
      stream: (onToken) => streamViaFallback(() => requestZai(messages, detailedMode, ZAI_GLM_MODEL), onToken),
    },
    {
      llm: "glm45air",
      enabled: Boolean(process.env.OPENROUTER_API_KEY) && !manuallyDisabledProviders.has("glm45air"),
      run: () => requestOpenRouter(messages, detailedMode, OPENROUTER_GLM45_AIR_MODEL),
      stream: (onToken) => streamOpenRouter(messages, detailedMode, OPENROUTER_GLM45_AIR_MODEL, onToken, streamSignal),
    },
    {
      llm: "nvidia",
      enabled: Boolean(process.env.OPENROUTER_API_KEY) && !manuallyDisabledProviders.has("nvidia"),
      run: () => requestOpenRouter(messages, detailedMode, OPENROUTER_MODEL),
      stream: (onToken) => streamOpenRouter(messages, detailedMode, OPENROUTER_MODEL, onToken, streamSignal),
    },
    {
      llm: "hf",
      enabled: Boolean(process.env.HUGGINGFACE_API_KEY) && !manuallyDisabledProviders.has("hf"),
      run: () => requestHuggingFace(messages, detailedMode),
      stream: (onToken) => streamHuggingFace(messages, detailedMode, onToken),
    },
  ];
}

function buildProviderRunners(messages, detailedMode, streamSignal) {
  const providers = buildProviders(messages, detailedMode, streamSignal);
  return providers.reduce((acc, provider) => {
    acc[provider.llm] = provider;
    return acc;
  }, {});
}

async function requestBestReply(messages, detailedMode) {
  const providers = buildProviders(messages, detailedMode);
  const attempts = [];

  for (const provider of providers) {
    if (!provider.enabled) {
      attempts.push({ llm: provider.llm, error: "Not configured or manually disabled" });
      continue;
    }

    try {
      const rawReply = await provider.run();
      if (rawReply && rawReply.trim()) {
        return { llm: provider.llm, rawReply: rawReply.trim(), attempts };
      }

      attempts.push({ llm: provider.llm, error: "Empty response" });
    } catch (error) {
      const normalized = extractProviderError(error);
      attempts.push({ llm: provider.llm, status: normalized.status, error: normalized.providerMessage });
    }
  }

  throw Object.assign(new Error("No cloud provider reply available"), {
    status: 503,
    responseData: { attempts },
  });
}

app.post("/api/auth/google", async (req, res) => {
  try {
    const credential = typeof req.body?.credential === "string" ? req.body.credential : "";
    const profile = await verifyGoogleCredential(credential);

    const user = await upsertGoogleUser(profile);
    await ensureMembershipUser({ userId: user.id, email: user.email, name: user.name });
    const membership = await getMembershipByUserId(user.id);
    const session = await createSession(user.id);

    return res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      user,
      membership: {
        plan: membership?.plan === "pro" ? "pro" : "free",
        activatedAt: membership?.activatedAt || "",
      },
    });
  } catch (error) {
    const normalized = extractProviderError(error);
    return res.status(error.status || normalized.status || 500).json({
      error: error.message || normalized.providerMessage || "Google sign-in failed",
    });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const auth = await requireAuthenticatedUser(req, res);
    if (!auth) return;

    await ensureMembershipUser({ userId: auth.user.id, email: auth.user.email, name: auth.user.name });
    const membership = await getMembershipByUserId(auth.user.id);

    return res.json({
      user: auth.user,
      membership: {
        plan: membership?.plan === "pro" ? "pro" : "free",
        activatedAt: membership?.activatedAt || "",
      },
      session: {
        expiresAt: auth.session?.expiresAt,
        lastSeenAt: auth.session?.lastSeenAt,
      },
    });
  } catch (error) {
    const normalized = extractProviderError(error);
    return res.status(500).json({ error: normalized.providerMessage });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const tokenFromBody = typeof req.body?.token === "string" ? req.body.token : "";
    const token = readBearerToken(req) || tokenFromBody;
    if (!token) return res.json({ ok: true });

    await revokeSessionToken(token);
    return res.json({ ok: true });
  } catch (error) {
    const normalized = extractProviderError(error);
    return res.status(500).json({ error: normalized.providerMessage });
  }
});

app.get("/api/profile", async (req, res) => {
  try {
    const lunaSettings = await getLunaSettings();
    const userContext = await resolveRequestUser(req);
    const membershipContext = await resolveMembershipContext(userContext, lunaSettings);
    const usage = await getUsageSummary(userContext, membershipContext);

    const requests = isAuthenticatedUserContext(userContext)
      ? await listUpgradeRequests({ userId: userContext.userId, limit: 25 })
      : [];

    return res.json({
      user: userContext.user,
      userId: userContext.userId,
      isGuest: !isAuthenticatedUserContext(userContext),
      membership: {
        plan: membershipContext.plan,
        activatedAt: membershipContext.membership?.activatedAt || "",
      },
      usage,
      billing: {
        upiId: membershipContext.upiId,
        monthlyPriceInr: membershipContext.monthlyPriceInr,
      },
      upgradeRequests: requests,
    });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

app.patch("/api/profile", async (req, res) => {
  try {
    const auth = await requireAuthenticatedUser(req, res);
    if (!auth) return;

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const hasPictureField = Object.prototype.hasOwnProperty.call(req.body || {}, "picture");
    const picture = hasPictureField && typeof req.body?.picture === "string" ? req.body.picture.trim() : undefined;

    if (!name && picture === undefined) {
      return res.status(400).json({ error: "name or picture is required" });
    }

    const updatedUser = await updateUserProfile({
      userId: auth.user.id,
      name,
      picture,
    });

    await ensureMembershipUser({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
    });

    return res.json({
      ok: true,
      user: updatedUser,
      message: "Profile updated successfully.",
    });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

app.post("/api/referrals/validate", async (req, res) => {
  try {
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    const lunaSettings = await getLunaSettings();
    const baseAmountInr = Number(lunaSettings?.proMonthlyPriceInr || DEFAULT_PRO_MONTHLY_PRICE_INR);

    const validation = await validateReferralCode(
      { code, amountInr: baseAmountInr },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    if (!validation.ok) {
      return res.status(400).json({ error: validation.message || "Invalid referral code", valid: false });
    }

    return res.json({
      ok: true,
      valid: true,
      code: validation.code,
      discountPercent: validation.discountPercent,
      baseAmountInr: validation.baseAmountInr,
      finalAmountInr: validation.finalAmountInr,
      expiresAt: validation.expiresAt || "",
    });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

app.post("/api/payments/upgrade-request", async (req, res) => {
  try {
    const auth = await requireAuthenticatedUser(req, res);
    if (!auth) return;

    const lunaSettings = await getLunaSettings();
    const transactionId = typeof req.body?.transactionId === "string" ? req.body.transactionId : "";
    const referralCode = typeof req.body?.referralCode === "string" ? req.body.referralCode : "";
    const baseAmountInr = Number(lunaSettings.proMonthlyPriceInr || DEFAULT_PRO_MONTHLY_PRICE_INR);
    let finalAmountInr = baseAmountInr;
    let discountPercent = 0;
    let appliedReferralCode = "";

    if (referralCode.trim()) {
      const validation = await validateReferralCode(
        { code: referralCode, amountInr: baseAmountInr },
        { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
      );

      if (!validation.ok) {
        return res.status(400).json({ error: validation.message || "Invalid referral code" });
      }

      finalAmountInr = validation.finalAmountInr;
      discountPercent = validation.discountPercent;
      appliedReferralCode = validation.code;
    }

    await ensureMembershipUser({ userId: auth.user.id, email: auth.user.email, name: auth.user.name });

    const request = await submitUpgradeRequest({
      userId: auth.user.id,
      userEmail: auth.user.email,
      userName: auth.user.name,
      transactionId,
      amountInr: finalAmountInr,
      baseAmountInr,
      discountPercent,
      referralCode: appliedReferralCode,
    });

    if (appliedReferralCode) {
      try {
        await incrementReferralUsage(
          { code: appliedReferralCode, adminUserId: auth.user.id },
          { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
        );
      } catch (error) {
        console.warn(`[referrals] Usage update failed: ${error.message}`);
      }
    }

    return res.status(201).json({
      ok: true,
      request,
      message: "Payment proof submitted. Admin will verify and activate Luna Pro.",
    });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

app.get("/api/payments/my-requests", async (req, res) => {
  try {
    const auth = await requireAuthenticatedUser(req, res);
    if (!auth) return;

    const requests = await listUpgradeRequests({ userId: auth.user.id, limit: 50 });
    return res.json({ requests });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

app.post("/api/feedback", async (req, res) => {
  try {
    const userContext = await resolveRequestUser(req);
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const rating = Number(req.body?.rating || 5);

    const fallbackName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const fallbackEmail = typeof req.body?.email === "string" ? req.body.email.trim() : "";

    const name = userContext?.user?.name || fallbackName || "Luna User";
    const email = userContext?.user?.email || fallbackEmail || "";

    const feedback = await submitFeedback({
      userId: userContext?.userId || "",
      name,
      email,
      message,
      rating,
    });

    return res.status(201).json({
      ok: true,
      feedback,
      message: "Thanks for your feedback. Luna team received it.",
    });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

app.get("/api/feedback", async (req, res) => {
  try {
    const featuredOnly = ["1", "true", "yes"].includes(`${req.query?.featured || ""}`.toLowerCase());
    const limit = Number(req.query?.limit || 40);

    const feedback = await listFeedback({ featuredOnly, limit });
    return res.json({ feedback });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

app.post("/api/audio/transcribe", async (req, res) => {
  try {
    const apiKey = (process.env.GROQ_API_KEY || "").trim();
    if (!apiKey) {
      return res.status(503).json({ error: "GROQ_API_KEY is not configured on the server" });
    }

    const audioBase64Raw = typeof req.body?.audioBase64 === "string" ? req.body.audioBase64.trim() : "";
    const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType.trim() : "audio/webm";
    const fileName = typeof req.body?.fileName === "string" ? req.body.fileName.trim() : "audio.webm";

    if (!audioBase64Raw) {
      return res.status(400).json({ error: "audioBase64 is required" });
    }

    const audioBase64 = audioBase64Raw.includes(",") ? audioBase64Raw.split(",").pop() : audioBase64Raw;
    const audioBuffer = Buffer.from(audioBase64 || "", "base64");

    if (!audioBuffer || audioBuffer.length < 64) {
      return res.status(400).json({ error: "Invalid audio payload" });
    }

    if (audioBuffer.length > 15 * 1024 * 1024) {
      return res.status(413).json({ error: "Audio is too large. Please keep it under 15MB." });
    }

    const form = new FormData();
    form.append("file", new Blob([audioBuffer], { type: mimeType || "audio/webm" }), fileName || "audio.webm");
    form.append("model", "whisper-large-v3");
    form.append("temperature", "0");
    form.append("response_format", "verbose_json");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const raw = await response.text();
    let data = null;

    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      return res.status(response.status || 500).json({
        error: data?.error?.message || data?.message || "Transcription failed",
      });
    }

    const text = typeof data?.text === "string" ? data.text.trim() : "";
    return res.json({ ok: true, text, transcription: data });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

app.get("/api/providers/status", (_req, res) => {
  const providers = buildProviders([], false).map((p) => ({ llm: p.llm, configured: p.enabled }));
  res.json({ providers });
});

app.get("/api/history", async (req, res) => {
  try {
    const { userId } = await resolveRequestUser(req);
    const conversations = await listConversationSummaries(userId);
    return res.json({ conversations });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(500).json({ error: n.providerMessage });
  }
});

app.get("/api/history/:conversationId", async (req, res) => {
  try {
    const { userId } = await resolveRequestUser(req);
    const conversation = await getConversationById(req.params.conversationId, userId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    return res.json({ conversation });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(500).json({ error: n.providerMessage });
  }
});

app.post("/api/history", async (req, res) => {
  try {
    const { userId } = await resolveRequestUser(req);
    const title = typeof req.body?.title === "string" ? req.body.title : "New chat";
    const conversation = await createConversation(title, userId);
    return res.status(201).json({ conversation });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(500).json({ error: n.providerMessage });
  }
});

app.delete("/api/history/:conversationId", async (req, res) => {
  try {
    const { userId } = await resolveRequestUser(req);
    const deleted = await deleteConversation(req.params.conversationId, userId);
    if (!deleted) return res.status(404).json({ error: "Conversation not found" });
    return res.json({ ok: true });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(500).json({ error: n.providerMessage });
  }
});

app.post("/api/luna/stream", async (req, res) => {
  const message = req.body?.message?.trim();
  const requestedConversationId = typeof req.body?.conversationId === "string" ? req.body.conversationId.trim() : "";

  if (!message) return res.status(400).json({ error: "message is required" });

  startSseResponse(res);
  sendSseEvent(res, "start", { ok: true });

  let closed = false;
  const abortController = new AbortController();

  req.on("close", () => {
    closed = true;
    abortController.abort();
  });

  let reply = "";
  const sendToken = (chunk) => {
    if (closed || !chunk) return;
    reply += chunk;
    sendSseEvent(res, "token", { token: chunk });
  };

  try {
    const lunaSettings = await getLunaSettings();
    const userContext = await resolveRequestUser(req);
    const membershipContext = await resolveMembershipContext(userContext, lunaSettings);
    const usageBefore = await enforceDailyLimitOrThrow(userContext, membershipContext);

    const conversation = await ensureConversation(requestedConversationId, userContext.userId);
    const detailedMode = wantsDetailedResponse(message);
    const history = toHistoryPayload(conversation, MAX_HISTORY_MESSAGES);
    const toolPlan = planToolCalls(message);
    const toolResults = toolPlan.length ? await executeToolCalls(toolPlan) : [];
    const toolSummary = formatToolResults(toolResults);

    const conversationMessages = buildConversationMessages(
      history,
      message,
      detailedMode,
      membershipContext,
      toolSummary,
    );

    const classification = classifyMessage(message);
    let routingPlan = getRoutingPlan(classification.label);
    if (routingPlan.profile === "tool") {
      routingPlan = getRoutingPlan(CATEGORY_LABELS.CASUAL);
    }
    const selectedOrder = routingPlan.order.slice(0, routingPlan.profile === "fast" ? 1 : Math.max(1, LUNA_MAX_PROVIDER_ATTEMPTS));
    const providerRunners = buildProviderRunners(conversationMessages, detailedMode, abortController.signal);
    const requestedModel = resolveRequestedModel(req.body?.llm, providerRunners);
    const effectiveOrder = requestedModel ? [requestedModel] : selectedOrder;

    let llm = "";
    let warning = "";
    let details = null;

    try {
        const routed = await runRoutedProvidersStream({
          order: effectiveOrder,
          runners: providerRunners,
          normalizeError: extractProviderError,
          onToken: sendToken,
          maxDurationMs: LUNA_MAX_RESPONSE_MS,
        });
        llm = routed.llm;
        reply = routed.rawReply || reply;
        details = {
          attempts: routed.attempts,
          category: classification.label,
          profile: routingPlan.profile,
          tools: toolResults,
        };
      } catch (providerErr) {
        const normalized = extractProviderError(providerErr);
        warning = normalized.providerMessage;
        details = normalized.responseData || {
          category: classification.label,
          profile: routingPlan.profile,
          tools: toolResults,
        };
        if (toolSummary) {
          llm = "tool";
          reply = toolSummary;
          streamTextChunks(reply, sendToken);
        } else {
          llm = "local-fallback";
          reply = generateLocalFallbackReply(message);
          streamTextChunks(reply, sendToken);
        }
      }

    if (!reply) {
      if (toolSummary) {
        llm = "tool";
        reply = toolSummary;
        streamTextChunks(reply, sendToken);
      } else {
        llm = "local-fallback";
        reply = generateLocalFallbackReply(message);
        streamTextChunks(reply, sendToken);
      }
    }

    const updatedConversation = await saveConversationTurn({
      conversationId: conversation.id,
      userText: message,
      assistantText: reply,
      llm,
      userId: userContext.userId,
    });

    const usageAfter = membershipContext.plan === "pro"
      ? {
          date: usageBefore.date,
          usedToday: usageBefore.usedToday + 1,
          remainingToday: null,
          dailyLimit: null,
          unlimited: true,
        }
      : {
          date: usageBefore.date,
          usedToday: usageBefore.usedToday + 1,
          remainingToday: Math.max(0, FREE_DAILY_LIMIT - (usageBefore.usedToday + 1)),
          dailyLimit: FREE_DAILY_LIMIT,
          unlimited: false,
        };

    sendSseEvent(res, "done", {
      reply,
      llm,
      category: classification.label,
      routing: {
        profile: routingPlan.profile,
        order: routingPlan.order,
      },
      selectedBy: llm === "local-fallback" ? "fallback" : "auto",
      warning,
      details,
      tools: toolResults,
      conversationId: updatedConversation.id,
      conversation: updatedConversation,
      membership: {
        plan: membershipContext.plan,
        activatedAt: membershipContext.membership?.activatedAt || "",
      },
      usage: usageAfter,
    });
  } catch (error) {
    const n = extractProviderError(error);
    const payload = {
      error: error.message || n.providerMessage,
    };

    if (error.responseData && typeof error.responseData === "object") {
      Object.assign(payload, error.responseData);
    }

    sendSseEvent(res, "error", payload);
  } finally {
    res.end();
  }
});
app.post("/api/luna", async (req, res) => {
  const message = req.body?.message?.trim();
  const requestedConversationId = typeof req.body?.conversationId === "string" ? req.body.conversationId.trim() : "";

  if (!message) return res.status(400).json({ error: "message is required" });

  try {
    const lunaSettings = await getLunaSettings();
    const userContext = await resolveRequestUser(req);
    const membershipContext = await resolveMembershipContext(userContext, lunaSettings);
    const usageBefore = await enforceDailyLimitOrThrow(userContext, membershipContext);

    const conversation = await ensureConversation(requestedConversationId, userContext.userId);
    const detailedMode = wantsDetailedResponse(message);
    const history = toHistoryPayload(conversation, MAX_HISTORY_MESSAGES);
    const toolPlan = planToolCalls(message);
    const toolResults = toolPlan.length ? await executeToolCalls(toolPlan) : [];
    const toolSummary = formatToolResults(toolResults);

    const conversationMessages = buildConversationMessages(
      history,
      message,
      detailedMode,
      membershipContext,
      toolSummary,
    );

    const classification = classifyMessage(message);
    let routingPlan = getRoutingPlan(classification.label);
    if (routingPlan.profile === "tool") {
      routingPlan = getRoutingPlan(CATEGORY_LABELS.CASUAL);
    }
    const selectedOrder = routingPlan.order.slice(0, routingPlan.profile === "fast" ? 1 : Math.max(1, LUNA_MAX_PROVIDER_ATTEMPTS));
    const providerRunners = buildProviderRunners(conversationMessages, detailedMode);
    const requestedModel = resolveRequestedModel(req.body?.llm, providerRunners);
    const effectiveOrder = requestedModel ? [requestedModel] : selectedOrder;

    let reply = "";
    let llm = "";
    let warning = "";
    let details = null;

    try {
        const routed = await runRoutedProviders({
          order: effectiveOrder,
          runners: providerRunners,
          normalizeError: extractProviderError,
          maxDurationMs: LUNA_MAX_RESPONSE_MS,
        });
        llm = routed.llm;
        reply = clampReplyLength(routed.rawReply);
        details = {
          attempts: routed.attempts,
          category: classification.label,
          profile: routingPlan.profile,
          tools: toolResults,
        };
      } catch (providerErr) {
        const normalized = extractProviderError(providerErr);
        warning = normalized.providerMessage;
        details = normalized.responseData || {
          category: classification.label,
          profile: routingPlan.profile,
          tools: toolResults,
        };
        if (toolSummary) {
          llm = "tool";
          reply = toolSummary;
        } else {
          llm = "local-fallback";
          reply = generateLocalFallbackReply(message);
        }
      }

    if (!reply) {
      if (toolSummary) {
        llm = "tool";
        reply = toolSummary;
      } else {
        llm = "local-fallback";
        reply = generateLocalFallbackReply(message);
      }
    }

    const updatedConversation = await saveConversationTurn({
      conversationId: conversation.id,
      userText: message,
      assistantText: reply,
      llm,
      userId: userContext.userId,
    });

    const usageAfter = membershipContext.plan === "pro"
      ? {
          date: usageBefore.date,
          usedToday: usageBefore.usedToday + 1,
          remainingToday: null,
          dailyLimit: null,
          unlimited: true,
        }
      : {
          date: usageBefore.date,
          usedToday: usageBefore.usedToday + 1,
          remainingToday: Math.max(0, FREE_DAILY_LIMIT - (usageBefore.usedToday + 1)),
          dailyLimit: FREE_DAILY_LIMIT,
          unlimited: false,
        };

    return res.json({
      reply,
      llm,
      category: classification.label,
      routing: {
        profile: routingPlan.profile,
        order: routingPlan.order,
      },
      selectedBy: llm === "local-fallback" ? "fallback" : "auto",
      warning,
      details,
      tools: toolResults,
      conversationId: updatedConversation.id,
      conversation: updatedConversation,
      membership: {
        plan: membershipContext.plan,
        activatedAt: membershipContext.membership?.activatedAt || "",
      },
      usage: usageAfter,
    });
  } catch (error) {
    const n = extractProviderError(error);
    const payload = {
      error: error.message || n.providerMessage,
    };

    if (error.responseData && typeof error.responseData === "object") {
      Object.assign(payload, error.responseData);
    }

    return res.status(error.status || n.status || 500).json(payload);
  }
});

app.get("/api/admin/overview", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const [users, conversationStats, billingStats, memberships, pendingRequests] = await Promise.all([
      listUsers(),
      getConversationStats(),
      getBillingStats(),
      listMemberships(),
      listUpgradeRequests({ status: "pending", limit: 500 }),
    ]);

    const proUsers = memberships.filter((item) => item.plan === "pro").length;

    return res.json({
      ok: true,
      admin: {
        email: admin.user.email,
        name: admin.user.name,
      },
      stats: {
        users: users.length,
        proUsers,
        freeUsers: Math.max(0, users.length - proUsers),
        conversations: conversationStats.totalConversations,
        totalMessages: conversationStats.totalMessages,
        totalUserMessages: conversationStats.totalUserMessages,
        revenueInr: billingStats.revenueInr,
        pendingUpgradeRequests: pendingRequests.length,
        approvedUpgradeRequests: billingStats.approvedRequests,
      },
    });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

app.get("/api/admin/settings", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const settings = await getLunaSettings();
    return res.json({ settings });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

app.post("/api/admin/settings/pro-price", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const amountInr = Number(req.body?.amountInr);
    if (!Number.isFinite(amountInr) || amountInr <= 0) {
      return res.status(400).json({ error: "amountInr must be a positive number" });
    }

    const settings = await updateProMonthlyPrice(
      { amountInr, adminUserId: admin.user.id },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    return res.json({ ok: true, settings });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

app.post("/api/admin/settings/pro-prompt", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const proSystemPrompt = typeof req.body?.proSystemPrompt === "string" ? req.body.proSystemPrompt : "";
    const settings = await updateProSystemPrompt(
      { proSystemPrompt, adminUserId: admin.user.id },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    return res.json({ ok: true, settings });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

app.post("/api/admin/referrals", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const code = typeof req.body?.code === "string" ? req.body.code : "";
    const discountPercent = req.body?.discountPercent;
    const expiresAt = req.body?.expiresAt;
    const active = req.body?.active;

    const settings = await upsertReferralCode(
      { code, discountPercent, expiresAt, active, adminUserId: admin.user.id },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    return res.json({ ok: true, settings });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

app.patch("/api/admin/referrals/:code", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const code = req.params.code;
    const discountPercent = req.body?.discountPercent;
    const expiresAt = req.body?.expiresAt;
    const active = req.body?.active;

    const settings = await updateReferralCode(
      { code, discountPercent, expiresAt, active, adminUserId: admin.user.id },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    return res.json({ ok: true, settings });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

app.delete("/api/admin/referrals/:code", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const code = req.params.code;
    const settings = await removeReferralCode(
      { code, adminUserId: admin.user.id },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    return res.json({ ok: true, settings });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

app.get("/api/admin/feedback", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const limit = Number(req.query?.limit || 200);
    const feedback = await listFeedback({ featuredOnly: false, limit });
    return res.json({ feedback });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

app.post("/api/admin/feedback/:id/featured", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const featured = [true, "true", 1, "1", "yes"].includes(req.body?.featured);
    const feedback = await setFeedbackFeatured({
      feedbackId: req.params.id,
      featured,
      adminUserId: admin.user.id,
    });

    return res.json({ ok: true, feedback });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const [users, memberships] = await Promise.all([listUsers(), listMemberships()]);
    const membershipByUser = new Map(memberships.map((item) => [item.userId, item]));
    const today = isoDateKey();

    const enriched = await Promise.all(
      users.map(async (user) => {
        const membership = membershipByUser.get(user.id);
        const plan = membership?.plan === "pro" ? "pro" : "free";
        const usedToday = await countUserMessagesForDate(user.id, today);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          plan,
          activatedAt: membership?.activatedAt || "",
          usageToday: usedToday,
          dailyLimit: plan === "pro" ? null : FREE_DAILY_LIMIT,
          remainingToday: plan === "pro" ? null : Math.max(0, FREE_DAILY_LIMIT - usedToday),
        };
      }),
    );

    return res.json({ users: enriched });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

app.get("/api/admin/upgrade-requests", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const status = sanitizeRequestStatus(req.query?.status);
    const requests = await listUpgradeRequests({ status, limit: 500 });
    return res.json({ requests });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

app.post("/api/admin/upgrade-requests/:id/status", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const status = sanitizeRequestStatus(req.body?.status);
    if (!status) {
      return res.status(400).json({ error: "status must be approved or rejected" });
    }

    const note = typeof req.body?.note === "string" ? req.body.note : "";

    const request = await reviewUpgradeRequest({
      requestId: req.params.id,
      status,
      note,
      adminUserId: admin.user.id,
    });

    return res.json({ ok: true, request });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

app.post("/api/admin/users/:userId/plan", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const userId = typeof req.params?.userId === "string" ? req.params.userId.trim() : "";
    const plan = req.body?.plan === "pro" ? "pro" : "free";
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const users = await listUsers();
    const user = users.find((item) => item.id === userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const membership = await setMembershipPlan({
      userId,
      plan,
      adminUserId: admin.user.id,
      email: user.email,
      name: user.name,
    });

    return res.json({ ok: true, membership });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

async function startServer() {
  try {
    const db = await initDb();
    const modeLabel = `mode=${db.mode}, mongoConfigured=${db.mongoConfigured}`;
    if (db.warning) {
      console.warn(`[db] ${db.warning}`);
    }
    console.log(`[db] Engine: ${db.engine} (${modeLabel})`);
  } catch (error) {
    console.error(`[db] Startup failed: ${error.message}`);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Luna server running on port ${PORT}`);
  });
}

startServer();




















