import { CHARACTER_OPTIONS } from "./constants";
import { getStoredUser } from "@/lib/api-client";

export function nowIso() {
  return new Date().toISOString();
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function shortTitle(input, fallback = "New chat") {
  const normalized = text(input).replace(/\s+/g, " ");
  if (!normalized) return fallback;
  return normalized.length <= 52 ? normalized : `${normalized.slice(0, 52)}...`;
}

export function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatHistoryTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function normalizeCharacterId(value, options = CHARACTER_OPTIONS) {
  const normalized = text(value).toLowerCase();
  if (!normalized) return options[0]?.id || CHARACTER_OPTIONS[0].id;
  return options.some((item) => item.id === normalized) ? normalized : normalized;
}

export function getCharacterOption(value, options = CHARACTER_OPTIONS) {
  const id = normalizeCharacterId(value, options);
  return options.find((item) => item.id === id) || options[0] || CHARACTER_OPTIONS[0];
}

export function hydrateCharacterOptions(rawList) {
  if (!Array.isArray(rawList) || rawList.length === 0) return CHARACTER_OPTIONS;

  return rawList
    .map((item, index) => {
      const fallback = CHARACTER_OPTIONS[index % CHARACTER_OPTIONS.length];
      const id = text(item?.id) || fallback.id;
      return {
        id,
        name: text(item?.name) || fallback.name,
        tagline: text(item?.tagline) || fallback.tagline,
        description: text(item?.description) || fallback.description,
        portrait: text(item?.imageUrl) || fallback.portrait,
        accentStart: text(item?.accentStart) || fallback.accentStart,
        accentEnd: text(item?.accentEnd) || fallback.accentEnd,
        starterPrompts: Array.isArray(item?.starterPrompts)
          ? item.starterPrompts.map((entry) => text(entry)).filter(Boolean).slice(0, 6)
          : fallback.starterPrompts,
        access: text(item?.access) === "pro" ? "pro" : "free",
        active: item?.active !== false,
        locked: Boolean(item?.locked),
        usageCount: Number(item?.usageCount || 0),
        usageCountFree: Number(item?.usageCountFree || 0),
        usageCountPro: Number(item?.usageCountPro || 0),
        lastUsedAt: text(item?.lastUsedAt),
      };
    })
    .filter((item) => item.active !== false);
}

export function sanitizeMessage(raw) {
  const role = raw?.role === "assistant" ? "assistant" : "user";
  const content = text(raw?.content || raw?.text);
  if (!content) return null;

  const sources = Array.isArray(raw?.sources)
    ? raw.sources
      .map((item, index) => {
        const link = text(item?.link || item?.url);
        if (!link) return null;
        return {
          id: text(item?.id) || `src-${index + 1}`,
          title: text(item?.title) || "Untitled source",
          link,
          source: text(item?.source),
          snippet: text(item?.snippet || item?.summary),
        };
      })
      .filter(Boolean)
    : [];

  const usage = raw?.usage && typeof raw.usage === "object"
    ? {
        provider: text(raw.usage?.provider),
        promptTokens: Number(raw.usage?.promptTokens || 0),
        completionTokens: Number(raw.usage?.completionTokens || 0),
        totalTokens: Number(raw.usage?.totalTokens || 0),
        reasoningTokens: Number(raw.usage?.reasoningTokens || 0),
        cachedPromptTokens: Number(raw.usage?.cachedPromptTokens || 0),
      }
    : null;

  return {
    id: text(raw?.id) || createId(role),
    role,
    content,
    createdAt: text(raw?.createdAt) || nowIso(),
    llm: text(raw?.llm),
    sources,
    usage,
  };
}

export function createSession(projectId = "", characterId = CHARACTER_OPTIONS[0].id) {
  return {
    id: createId("session"),
    title: "New chat",
    messages: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    projectId: text(projectId),
    characterId: normalizeCharacterId(characterId, CHARACTER_OPTIONS),
    backendConversationId: "",
  };
}

export function getDefaultProjects() {
  return [
    { id: "project-general", name: "General", createdAt: nowIso() },
    { id: "project-notes", name: "Notes", createdAt: nowIso() },
  ];
}

export function loadUser() {
  if (typeof window === "undefined") {
    return { name: "Guest", email: "guest@luna.ai", picture: "" };
  }

  const user = getStoredUser();
  if (!user) return { name: "Guest", email: "guest@luna.ai", picture: "" };

  return {
    name: text(user?.name) || "Guest",
    email: text(user?.email) || "guest@luna.ai",
    picture: text(user?.picture),
  };
}

export function mapConversationSummaryToSession(summary, projectId = "") {
  const id = text(summary?.id) || createId("session");
  const createdAt = text(summary?.createdAt) || nowIso();
  const updatedAt = text(summary?.updatedAt) || createdAt;
  const title = text(summary?.title) || shortTitle(summary?.preview, "New chat");

  return {
    id,
    title,
    messages: [],
    createdAt,
    updatedAt,
    projectId: text(projectId),
    characterId: normalizeCharacterId(summary?.characterId, CHARACTER_OPTIONS),
    backendConversationId: id,
  };
}

export function formatDateLabel(value = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(value);
}

export function mapConversationMessages(conversation) {
  const rawMessages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  return rawMessages
    .map((message) =>
      sanitizeMessage({
        ...message,
        content: message?.content ?? message?.text,
      }),
    )
    .filter(Boolean);
}

export function exportSessionToMarkdown(session) {
  const title = text(session?.title) || "Luna Chat";
  const character = getCharacterOption(session?.characterId);
  const messages = Array.isArray(session?.messages) ? session.messages : [];
  const lines = [`# ${title}`, "", `Character: ${character.name}`, `Exported: ${nowIso()}`, ""];

  for (const message of messages) {
    const label = message.role === "assistant" ? character.name : "You";
    lines.push(`## ${label}`);
    lines.push("");
    lines.push(text(message.content) || "");
    lines.push("");
  }

  return lines.join("\n");
}

export function toBase64DataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read audio blob."));
    reader.readAsDataURL(blob);
  });
}
