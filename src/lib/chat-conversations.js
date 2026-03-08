export const CHAT_STORAGE_KEYS = {
  conversations: "luna.chat.conversations.v2",
  activeConversation: "luna.chat.active.v2",
};

export const WELCOME_TEXT = "Hi, I am Luna. Ask me anything.";

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createMessage(role, text, meta = {}) {
  return {
    id: createId(role),
    role,
    text,
    createdAt: new Date().toISOString(),
    ...meta,
  };
}

export function getWelcomeMessage() {
  return createMessage("assistant", WELCOME_TEXT, { llm: "system" });
}

export function deriveConversationTitle(messages, fallback = "New chat") {
  const firstUserMessage = messages.find(
    (item) => item.role === "user" && typeof item.text === "string" && item.text.trim().length > 0,
  );

  if (!firstUserMessage) {
    return fallback;
  }

  const normalized = firstUserMessage.text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 44) {
    return normalized;
  }

  return `${normalized.slice(0, 44)}...`;
}

export function createConversation() {
  const now = new Date().toISOString();

  return {
    id: createId("chat"),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [getWelcomeMessage()],
  };
}

function sanitizeMessage(raw) {
  const role = raw?.role === "assistant" ? "assistant" : "user";
  const text = typeof raw?.text === "string" ? raw.text.trim() : "";

  if (!text) {
    return null;
  }

  return {
    id: typeof raw?.id === "string" ? raw.id : createId(role),
    role,
    text,
    llm: raw?.llm,
    createdAt: raw?.createdAt,
  };
}

function sanitizeConversation(raw) {
  const safeMessages = Array.isArray(raw?.messages)
    ? raw.messages.map(sanitizeMessage).filter(Boolean)
    : [];

  const messages = safeMessages.length > 0 ? safeMessages : [getWelcomeMessage()];
  const fallbackTitle = deriveConversationTitle(messages, "New chat");

  return {
    id: typeof raw?.id === "string" ? raw.id : createId("chat"),
    title:
      typeof raw?.title === "string" && raw.title.trim().length > 0
        ? raw.title.trim()
        : fallbackTitle,
    createdAt: raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt || raw?.createdAt || new Date().toISOString(),
    messages,
  };
}

function loadConversationsFromStorage() {
  if (typeof window === "undefined") {
    return [createConversation()];
  }

  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEYS.conversations);
    if (!raw) {
      return [createConversation()];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createConversation()];
    }

    return parsed.map(sanitizeConversation);
  } catch {
    return [createConversation()];
  }
}

function getInitialActiveConversationId(conversations) {
  if (!Array.isArray(conversations) || conversations.length === 0) {
    return "";
  }

  if (typeof window === "undefined") {
    return conversations[0].id;
  }

  const stored = window.localStorage.getItem(CHAT_STORAGE_KEYS.activeConversation);
  if (stored && conversations.some((item) => item.id === stored)) {
    return stored;
  }

  return conversations[0].id;
}

export function loadInitialChatState() {
  const conversations = loadConversationsFromStorage();

  return {
    conversations,
    activeConversationId: getInitialActiveConversationId(conversations),
  };
}
