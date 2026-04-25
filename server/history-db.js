import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "history.json");
const MAX_MESSAGES_PER_CONVERSATION = 300;

const EMPTY_DB = {
  version: 1,
  conversations: [],
};

let dbWriteQueue = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function normalizeText(input) {
  return typeof input === "string" ? input.trim() : "";
}

function normalizeUserId(userId) {
  const normalized = normalizeText(userId);
  return normalized || "guest";
}

function sanitizeSources(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      const link = normalizeText(item?.link || item?.url);
      if (!link) return null;

      return {
        id: normalizeText(item?.id) || `src-${index + 1}`,
        title: normalizeText(item?.title) || "Untitled source",
        link,
        source: normalizeText(item?.source) || "",
        snippet: normalizeText(item?.snippet || item?.summary),
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function deriveTitle(messages) {
  const firstUserMessage = (messages || []).find(
    (item) => item.role === "user" && typeof item.text === "string" && item.text.trim().length > 0,
  );

  if (!firstUserMessage) {
    return "New chat";
  }

  const normalized = firstUserMessage.text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 54) {
    return normalized;
  }

  return `${normalized.slice(0, 54)}...`;
}

function sanitizeMessage(raw) {
  const role = raw?.role === "assistant" ? "assistant" : "user";
  const text = normalizeText(raw?.text);

  if (!text) {
    return null;
  }

  return {
    id: typeof raw?.id === "string" ? raw.id : createId(role),
    role,
    text,
    llm: typeof raw?.llm === "string" ? raw.llm : undefined,
    sources: sanitizeSources(raw?.sources),
    createdAt: typeof raw?.createdAt === "string" ? raw.createdAt : nowIso(),
  };
}

function sanitizeConversation(raw) {
  const safeMessages = Array.isArray(raw?.messages)
    ? raw.messages.map(sanitizeMessage).filter(Boolean)
    : [];

  const createdAt = typeof raw?.createdAt === "string" ? raw.createdAt : nowIso();
  const updatedAt = typeof raw?.updatedAt === "string" ? raw.updatedAt : createdAt;
  const title = normalizeText(raw?.title) || deriveTitle(safeMessages);

  return {
    id: typeof raw?.id === "string" ? raw.id : createId("chat"),
    userId: normalizeUserId(raw?.userId),
    title: title || "New chat",
    createdAt,
    updatedAt,
    messages: safeMessages.slice(-MAX_MESSAGES_PER_CONVERSATION),
  };
}

function sanitizeDb(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_DB };
  }

  const conversations = Array.isArray(raw.conversations)
    ? raw.conversations.map(sanitizeConversation)
    : [];

  return {
    version: 1,
    conversations,
  };
}

async function ensureDbFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify(EMPTY_DB, null, 2), "utf8");
  }
}

async function readDb() {
  await ensureDbFile();
  const content = await fs.readFile(DB_FILE, "utf8");

  try {
    return sanitizeDb(JSON.parse(content));
  } catch {
    return { ...EMPTY_DB };
  }
}

async function writeDb(nextDb) {
  await ensureDbFile();
  await fs.writeFile(DB_FILE, JSON.stringify(nextDb, null, 2), "utf8");
}

function cloneConversation(conversation) {
  return JSON.parse(JSON.stringify(conversation));
}

function toConversationSummary(conversation) {
  const messageCount = conversation.messages.length;
  const lastMessage = messageCount > 0 ? conversation.messages[messageCount - 1] : null;

  return {
    id: conversation.id,
    title: conversation.title || "New chat",
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount,
    preview: lastMessage?.text ? lastMessage.text.slice(0, 120) : "",
  };
}

async function runDbMutation(mutator) {
  dbWriteQueue = dbWriteQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  });

  return dbWriteQueue;
}

export async function listConversationSummaries(userId = "guest") {
  const db = await readDb();
  const safeUserId = normalizeUserId(userId);

  return db.conversations
    .filter((conversation) => normalizeUserId(conversation.userId) === safeUserId)
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map(toConversationSummary);
}

export async function getConversationById(conversationId, userId = "guest") {
  if (!conversationId) {
    return null;
  }

  const db = await readDb();
  const safeUserId = normalizeUserId(userId);
  const conversation = db.conversations.find(
    (item) => item.id === conversationId && normalizeUserId(item.userId) === safeUserId,
  );

  return conversation ? cloneConversation(conversation) : null;
}

export async function createConversation(title = "New chat", userId = "guest") {
  return runDbMutation((db) => {
    const now = nowIso();
    const conversation = {
      id: createId("chat"),
      userId: normalizeUserId(userId),
      title: normalizeText(title) || "New chat",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    db.conversations.unshift(conversation);
    return cloneConversation(conversation);
  });
}

export async function ensureConversation(conversationId, userId = "guest") {
  if (!conversationId) {
    return createConversation("New chat", userId);
  }

  const existing = await getConversationById(conversationId, userId);
  if (existing) {
    return existing;
  }

  return createConversation("New chat", userId);
}

export async function deleteConversation(conversationId, userId = "guest") {
  if (!conversationId) {
    return false;
  }

  const safeUserId = normalizeUserId(userId);

  return runDbMutation((db) => {
    const before = db.conversations.length;
    db.conversations = db.conversations.filter(
      (item) => !(item.id === conversationId && normalizeUserId(item.userId) === safeUserId),
    );
    return db.conversations.length !== before;
  });
}

export async function saveConversationTurn({
  conversationId,
  userText,
  assistantText,
  assistantSources = [],
  llm,
  userId = "guest",
}) {
  const safeUserText = normalizeText(userText);
  const safeAssistantText = normalizeText(assistantText);
  const safeUserId = normalizeUserId(userId);

  return runDbMutation((db) => {
    let conversation = db.conversations.find(
      (item) => item.id === conversationId && normalizeUserId(item.userId) === safeUserId,
    );
    const now = nowIso();

    if (!conversation) {
      conversation = {
        id: conversationId || createId("chat"),
        userId: safeUserId,
        title: "New chat",
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      db.conversations.unshift(conversation);
    }

    if (safeUserText) {
      conversation.messages.push({
        id: createId("user"),
        role: "user",
        text: safeUserText,
        createdAt: now,
      });
    }

    if (safeAssistantText) {
      conversation.messages.push({
        id: createId("assistant"),
        role: "assistant",
        text: safeAssistantText,
        llm: typeof llm === "string" ? llm : undefined,
        sources: sanitizeSources(assistantSources),
        createdAt: nowIso(),
      });
    }

    if (conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
      conversation.messages = conversation.messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
    }

    conversation.title = deriveTitle(conversation.messages);
    conversation.updatedAt = nowIso();

    db.conversations.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    return cloneConversation(conversation);
  });
}

export function toHistoryPayload(conversation, maxMessages = 20) {
  if (!conversation || !Array.isArray(conversation.messages)) {
    return [];
  }

  return conversation.messages
    .map((entry) => ({
      role: entry.role === "assistant" ? "assistant" : "user",
      content: normalizeText(entry.text),
    }))
    .filter((entry) => entry.content.length > 0)
    .slice(-maxMessages);
}

export async function countUserMessagesForDate(userId = "guest", dateKey = "") {
  const safeUserId = normalizeUserId(userId);
  const safeDateKey = normalizeText(dateKey);
  if (!safeDateKey) return 0;

  const db = await readDb();
  let count = 0;

  for (const conversation of db.conversations) {
    if (normalizeUserId(conversation.userId) !== safeUserId) continue;
    for (const message of conversation.messages || []) {
      if (message.role !== "user") continue;
      const createdAt = normalizeText(message.createdAt);
      if (createdAt.startsWith(safeDateKey)) {
        count += 1;
      }
    }
  }

  return count;
}

export async function getConversationStats(userId = "") {
  const db = await readDb();
  const safeUserId = normalizeText(userId);

  let totalConversations = 0;
  let totalMessages = 0;
  let totalUserMessages = 0;

  for (const conversation of db.conversations) {
    if (safeUserId && normalizeUserId(conversation.userId) !== normalizeUserId(safeUserId)) {
      continue;
    }

    totalConversations += 1;

    for (const message of conversation.messages || []) {
      totalMessages += 1;
      if (message.role === "user") {
        totalUserMessages += 1;
      }
    }
  }

  return {
    totalConversations,
    totalMessages,
    totalUserMessages,
  };
}

export async function getModelUsageStats() {
  const db = await readDb();
  const counts = {};
  let totalAssistantMessages = 0;

  for (const conversation of db.conversations) {
    for (const message of conversation.messages || []) {
      if (message.role !== "assistant") continue;
      totalAssistantMessages += 1;
      const llm = normalizeText(message.llm) || "unknown";
      counts[llm] = (counts[llm] || 0) + 1;
    }
  }

  return { totalAssistantMessages, counts };
}
