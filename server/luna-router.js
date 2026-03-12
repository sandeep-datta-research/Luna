import { CATEGORY_LABELS } from "./luna-classifier.js";

const ROUTE_TABLE = {
  [CATEGORY_LABELS.TECHNICAL]: {
    profile: "strong-reasoning",
    order: ["gpt", "glm45air", "glm43", "gemini", "nvidia", "hf"],
  },
  [CATEGORY_LABELS.PROGRAMMING]: {
    profile: "strong-reasoning",
    order: ["gpt", "glm45air", "glm43", "gemini", "nvidia", "hf"],
  },
  [CATEGORY_LABELS.EDUCATIONAL]: {
    profile: "explanatory",
    order: ["gemini", "gpt", "glm45air", "glm43", "nvidia", "hf"],
  },
  [CATEGORY_LABELS.MOTIVATIONAL]: {
    profile: "conversational",
    order: ["gpt", "gemini", "glm45air", "nvidia", "glm43", "hf"],
  },
  [CATEGORY_LABELS.CASUAL]: {
    profile: "fast",
    order: ["glm43", "gemini", "gpt", "nvidia", "glm45air", "hf"],
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

export function shouldRetryProvider(normalizedError) {
  if (!normalizedError) return true;
  if (isRateLimitError(normalizedError)) return true;

  const status = Number(normalizedError.status || 0);
  if (!status) return true;
  if (status >= 500) return true;
  if (status === 408) return true;

  const message = `${normalizedError?.providerMessage || normalizedError?.error || ""}`.toLowerCase();
  return message.includes("timeout") || message.includes("network") || message.includes("temporarily");
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

      if (shouldRetryProvider(normalized)) {
        continue;
      }
    }
  }

  const failure = new Error("No provider returned a valid response");
  failure.responseData = { attempts };
  failure.status = 503;
  throw failure;
}

export async function runRoutedProvidersStream({ order, runners, normalizeError, onToken }) {
  const attempts = [];
  let tokensEmitted = 0;

  const safeOnToken = (chunk) => {
    if (!chunk) return;
    tokensEmitted += 1;
    if (typeof onToken === "function") {
      onToken(chunk);
    }
  };

  for (const key of order) {
    const runner = runners[key];

    if (!runner || !runner.enabled) {
      attempts.push({ llm: key, error: "Not configured or disabled" });
      continue;
    }

    try {
      if (typeof runner.stream === "function") {
        const reply = await runner.stream(safeOnToken);
        if (reply && reply.trim()) {
          return { llm: key, rawReply: reply.trim(), attempts };
        }
        attempts.push({ llm: key, error: "Empty response" });
        continue;
      }

      if (typeof runner.run === "function") {
        const reply = await runner.run();
        if (reply && reply.trim()) {
          safeOnToken(reply);
          return { llm: key, rawReply: reply.trim(), attempts };
        }
        attempts.push({ llm: key, error: "Empty response" });
      }
    } catch (error) {
      const normalized = normalizeError(error);
      attempts.push({ llm: key, status: normalized.status, error: normalized.providerMessage });

      if (tokensEmitted > 0) {
        throw error;
      }

      if (shouldRetryProvider(normalized)) {
        continue;
      }
    }
  }

  const failure = new Error("No provider returned a valid streamed response");
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
