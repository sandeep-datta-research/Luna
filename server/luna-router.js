import { CATEGORY_LABELS } from "./luna-classifier.js";

const ROUTE_TABLE = {
  [CATEGORY_LABELS.TECHNICAL]: {
    profile: "strong-reasoning",
    order: ["gpt", "glm45air", "glm43", "gemini", "nvidia"],
  },
  [CATEGORY_LABELS.PROGRAMMING]: {
    profile: "strong-reasoning",
    order: ["gpt", "glm45air", "glm43", "gemini", "nvidia"],
  },
  [CATEGORY_LABELS.EDUCATIONAL]: {
    profile: "explanatory",
    order: ["gemini", "gpt", "glm45air", "glm43", "nvidia"],
  },
  [CATEGORY_LABELS.MOTIVATIONAL]: {
    profile: "conversational",
    order: ["gpt", "gemini", "glm45air", "nvidia", "glm43"],
  },
  [CATEGORY_LABELS.CASUAL]: {
    profile: "fast",
    order: ["glm43", "gemini", "gpt", "nvidia", "glm45air"],
  },
  [CATEGORY_LABELS.COMMAND]: {
    profile: "tool",
    order: [],
  },
};

export function getRoutingPlan(label) {
  return ROUTE_TABLE[label] || ROUTE_TABLE[CATEGORY_LABELS.CASUAL];
}

export function isRateLimitError(normalizedError) {
  const status = Number(normalizedError?.status || 0);
  if (status === 429) return true;

  const message = `${normalizedError?.providerMessage || normalizedError?.error || ""}`.toLowerCase();
  return message.includes("rate limit") || message.includes("quota") || message.includes("too many requests");
}

export async function runRoutedProviders({ order, runners, normalizeError }) {
  const attempts = [];

  for (const key of order) {
    const runner = runners[key];

    if (!runner || !runner.enabled || typeof runner.run !== "function") {
      attempts.push({ llm: key, error: "Not configured or disabled" });
      continue;
    }

    try {
      const reply = await runner.run();
      if (reply && reply.trim()) {
        return { llm: key, rawReply: reply.trim(), attempts };
      }

      attempts.push({ llm: key, error: "Empty response" });
    } catch (error) {
      const normalized = normalizeError(error);
      attempts.push({ llm: key, status: normalized.status, error: normalized.providerMessage });

      if (isRateLimitError(normalized)) {
        continue;
      }
    }
  }

  const failure = new Error("No provider returned a valid response");
  failure.responseData = { attempts };
  failure.status = 503;
  throw failure;
}

export function handleToolCommand(message) {
  const safeMessage = typeof message === "string" ? message.trim() : "";

  return {
    reply: "Tool request detected. No tool integration is configured yet.",
    tool: {
      requested: true,
      message: safeMessage,
    },
  };
}
