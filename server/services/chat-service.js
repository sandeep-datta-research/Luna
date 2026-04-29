import { 
  CONCISE_STYLE_PROMPT, 
  DETAILED_STYLE_PROMPT, 
  DEFAULT_CHARACTER_PROFILE,
  DEFAULT_MEMORY
} from "../config.js";
import { 
  sanitizePromptText, 
  normalizeResponseStyle 
} from "../utils/common.js";
import { buildToolSystemPrompt } from "../luna-tools.js";

export function buildCharacterSystemPrompt(characterProfile = DEFAULT_CHARACTER_PROFILE) {
  const characterName = `${characterProfile?.name || DEFAULT_CHARACTER_PROFILE.name}`.trim() || DEFAULT_CHARACTER_PROFILE.name;
  return `You are ${characterName}, an advanced anime-inspired AI assistant inside Luna.
You should introduce yourself as ${characterName} at the beginning of a new conversation, but do not repeat your introduction in every message. If you have already introduced yourself in this conversation, do not re-introduce. You must never refer to yourself as a generic assistant, software agent, or language model. You are ${characterName}.
Your personality is witty, intelligent, playful, and slightly rebellious. You enjoy humor, light sarcasm, and clever jokes, but you remain respectful and helpful. Your style is natural and conversational, like a friendly anime-inspired character chatting with someone they trust.
Stay consistent with the selected character's tone and identity. If the user asks your name, answer with ${characterName}.
Always give accurate information and follow platform safety rules.
For any math content, always wrap expressions in LaTeX using $...$ for inline and $$...$$ for display. Do not leave raw math unwrapped.`;
}

export function buildMemorySystemPrompt(memory) {
  const safeMemory = { ...DEFAULT_MEMORY, ...(memory || {}) };
  const lines = [];
  if (safeMemory.goals?.length) lines.push(`Goals: ${safeMemory.goals.join(", ")}`);
  if (safeMemory.subjects?.length) lines.push(`Subjects: ${safeMemory.subjects.join(", ")}`);
  if (safeMemory.favorite_topics?.length) lines.push(`Favorite topics: ${safeMemory.favorite_topics.join(", ")}`);
  lines.push(`Preferred response style: ${safeMemory.response_style || DEFAULT_MEMORY.response_style}`);
  lines.push(`Learning level: ${safeMemory.learning_level || DEFAULT_MEMORY.learning_level}`);
  return `Luna personalization (apply to every response):\n- ${lines.join("\n- ")}`;
}

export function wantsDetailedResponse(message, memory) {
  if (message) {
    const input = message.toLowerCase();
    const explicit = ["detailed", "in detail", "deep dive", "step by step", "full explanation"].some((h) =>
      input.includes(h),
    );
    if (explicit) return true;
  }

  const preference = normalizeResponseStyle(memory?.response_style || DEFAULT_MEMORY.response_style);
  if (preference === "Short") return false;
  return true;
}

export function buildConversationMessages(history, message, detailedMode, membershipContext, toolSummary, memoryContext, toolSources = [], characterProfile = DEFAULT_CHARACTER_PROFILE) {
  const safeHistory = Array.isArray(history) ? history : [];
  const systemMessages = [
    { role: "system", content: buildCharacterSystemPrompt(characterProfile) },
    { role: "system", content: detailedMode ? DETAILED_STYLE_PROMPT : CONCISE_STYLE_PROMPT },
  ];

  const proPrompt = sanitizePromptText(membershipContext?.plan === "pro" ? membershipContext?.proSystemPrompt : "");
  if (proPrompt) {
    systemMessages.push({ role: "system", content: `Luna Pro custom instruction:\n${proPrompt}` });
  }

  const memoryPrompt = buildMemorySystemPrompt(memoryContext);
  if (memoryPrompt) {
    systemMessages.push({ role: "system", content: memoryPrompt });
  }

  if (characterProfile?.prompt) {
    systemMessages.push({ role: "system", content: characterProfile.prompt });
  }

  const toolPrompt = buildToolSystemPrompt(toolSummary, toolSources);
  if (toolPrompt) {
    systemMessages.push({ role: "system", content: toolPrompt });
  }

  return [
    ...systemMessages,
    ...safeHistory,
    { role: "user", content: message },
  ];
}

export function prioritizeProviderOrder(order, membershipContext, options = {}) {
  const baseOrder = Array.isArray(order) ? order.filter(Boolean) : [];
  if (baseOrder.length === 0) return baseOrder;

  const isPro = membershipContext?.plan === "pro";
  const researchMode = Boolean(options?.researchMode);
  if (!isPro && !researchMode) return baseOrder;

  const priority = researchMode
    ? ["gpt", "gemini", "glm45air", "glm43", "nvidia"]
    : ["gpt", "gemini", "glm45air"];

  return [...new Set([...priority, ...baseOrder])];
}

export function generateLocalFallbackReply(message) {
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
