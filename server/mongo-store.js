import { randomUUID } from "crypto";
import { MongoClient } from "mongodb";

const DEFAULT_SESSION_TTL_DAYS = 30;
const MAX_MESSAGES_PER_CONVERSATION = 300;
const DEFAULT_MEMORY = {
  goals: [],
  subjects: [],
  response_style: "Detailed",
  favorite_topics: [],
  learning_level: "Beginner",
};

function nowIso() {
  return new Date().toISOString();
}

function toIso(value) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return nowIso();
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return nowIso();
  return parsed.toISOString();
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUserId(userId) {
  const safe = normalizeText(userId);
  return safe || "guest";
}

function createId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function createSessionToken() {
  return `sess_${randomUUID().replace(/-/g, "")}`;
}

function getSessionTtlMs() {
  const raw = Number(process.env.SESSION_TTL_DAYS || DEFAULT_SESSION_TTL_DAYS);
  const safeDays = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SESSION_TTL_DAYS;
  return safeDays * 24 * 60 * 60 * 1000;
}

function deriveTitle(messages) {
  const firstUserMessage = (messages || []).find(
    (item) => item.role === "user" && typeof item.text === "string" && item.text.trim().length > 0,
  );

  if (!firstUserMessage) return "New chat";

  const normalized = firstUserMessage.text.replace(/\s+/g, " ").trim();
  return normalized.length <= 54 ? normalized : `${normalized.slice(0, 54)}...`;
}

function sanitizeMessage(raw) {
  const role = raw?.role === "assistant" ? "assistant" : "user";
  const text = normalizeText(raw?.text);
  if (!text) return null;

  return {
    id: normalizeText(raw?.id) || createId(role),
    role,
    text,
    llm: typeof raw?.llm === "string" ? raw.llm : undefined,
    createdAt: toIso(raw?.createdAt),
  };
}

function sanitizeConversation(raw) {
  const safeMessages = Array.isArray(raw?.messages) ? raw.messages.map(sanitizeMessage).filter(Boolean) : [];
  const createdAt = toIso(raw?.createdAt);
  const updatedAt = toIso(raw?.updatedAt || createdAt);

  return {
    id: normalizeText(raw?.id) || createId("chat"),
    userId: normalizeUserId(raw?.userId),
    title: normalizeText(raw?.title) || deriveTitle(safeMessages),
    createdAt,
    updatedAt,
    messages: safeMessages.slice(-MAX_MESSAGES_PER_CONVERSATION),
  };
}

function sanitizeUserRecord(raw) {
  const createdAt = toIso(raw?.createdAt);
  const updatedAt = toIso(raw?.updatedAt || createdAt);
  const passwordHash = normalizeText(raw?.passwordHash);

  return {
    id: normalizeText(raw?.id) || createId("usr"),
    googleSub: normalizeText(raw?.googleSub),
    email: normalizeText(raw?.email),
    name: normalizeText(raw?.name),
    picture: normalizeText(raw?.picture),
    passwordHash,
    hasPassword: Boolean(passwordHash),
    passwordUpdatedAt: normalizeText(raw?.passwordUpdatedAt),
    resetTokenHash: normalizeText(raw?.resetTokenHash),
    resetTokenExpiresAt: normalizeText(raw?.resetTokenExpiresAt),
    resetCodeHash: normalizeText(raw?.resetCodeHash),
    resetCodeExpiresAt: normalizeText(raw?.resetCodeExpiresAt),
    memory: sanitizeUserMemory(raw?.memory),
    createdAt,
    updatedAt,
    lastLoginAt: toIso(raw?.lastLoginAt || updatedAt),
  };
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeText(item)).filter(Boolean);
}

function sanitizeUserMemory(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  return {
    goals: sanitizeStringArray(value.goals),
    subjects: sanitizeStringArray(value.subjects),
    response_style: normalizeText(value.response_style) || DEFAULT_MEMORY.response_style,
    favorite_topics: sanitizeStringArray(value.favorite_topics),
    learning_level: normalizeText(value.learning_level) || DEFAULT_MEMORY.learning_level,
    updated_at: normalizeText(value.updated_at),
  };
}

function sanitizeSessionRecord(raw) {
  const createdAt = toIso(raw?.createdAt);
  const lastSeenAt = toIso(raw?.lastSeenAt || createdAt);
  const expiresAt = toIso(raw?.expiresAt || raw?.expiresAtDate);

  return {
    token: normalizeText(raw?.token),
    userId: normalizeText(raw?.userId),
    createdAt,
    lastSeenAt,
    expiresAt,
  };
}

function clampFeedbackRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function sanitizeFeedbackItem(raw) {
  const createdAt = toIso(raw?.createdAt);
  const updatedAt = toIso(raw?.updatedAt || createdAt);

  return {
    id: normalizeText(raw?.id) || createId("fb"),
    userId: normalizeText(raw?.userId),
    name: normalizeText(raw?.name) || "Luna User",
    email: normalizeText(raw?.email).toLowerCase(),
    message: normalizeText(raw?.message),
    rating: clampFeedbackRating(raw?.rating),
    featured: Boolean(raw?.featured),
    featuredAt: normalizeText(raw?.featuredAt),
    featuredBy: normalizeText(raw?.featuredBy),
    createdAt,
    updatedAt,
  };
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toPublicUser(user) {
  const safeUser = sanitizeUserRecord(user);
  return {
    id: safeUser.id,
    googleSub: safeUser.googleSub,
    email: safeUser.email,
    name: safeUser.name,
    picture: safeUser.picture,
    hasPassword: safeUser.hasPassword,
    passwordUpdatedAt: safeUser.passwordUpdatedAt,
    memory: safeUser.memory,
    createdAt: safeUser.createdAt,
    updatedAt: safeUser.updatedAt,
    lastLoginAt: safeUser.lastLoginAt,
  };
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

function getMongoClientOptions() {
  const maxPoolRaw = Number(process.env.MONGODB_MAX_POOL_SIZE || 10);
  const maxPoolSize = Number.isFinite(maxPoolRaw) && maxPoolRaw > 0 ? maxPoolRaw : 10;
  return { maxPoolSize };
}

export function createMongoStore() {
  const mongoUri = normalizeText(process.env.MONGODB_URI);
  if (!mongoUri) throw new Error("MONGODB_URI is required for Mongo mode");

  const dbName = normalizeText(process.env.MONGODB_DB) || "luna";
  const client = new MongoClient(mongoUri, getMongoClientOptions());

  let db = null;
  let initialized = false;

  const users = () => db.collection("users");
  const sessions = () => db.collection("sessions");
  const conversations = () => db.collection("conversations");
  const feedback = () => db.collection("feedback");

  async function ensureIndexes() {
    await Promise.all([
      users().createIndex({ googleSub: 1 }, { unique: true, sparse: true }),
      users().createIndex(
        { email: 1 },
        { unique: true, partialFilterExpression: { email: { $type: "string", $ne: "" } } },
      ),
      users().createIndex({ lastLoginAt: -1 }),
      sessions().createIndex({ token: 1 }, { unique: true }),
      sessions().createIndex({ expiresAtDate: 1 }, { expireAfterSeconds: 0 }),
      conversations().createIndex({ id: 1, userId: 1 }, { unique: true }),
      conversations().createIndex({ userId: 1, updatedAt: -1 }),
      feedback().createIndex({ id: 1 }, { unique: true }),
      feedback().createIndex({ featured: 1, createdAt: -1 }),
      feedback().createIndex({ createdAt: -1 }),
    ]);
  }

  async function init() {
    if (initialized && db) return;
    await client.connect();
    db = client.db(dbName);
    await ensureIndexes();
    initialized = true;
  }

  async function cleanupExpiredSessions() {
    await init();
    await sessions().deleteMany({ expiresAtDate: { $lte: new Date() } });
  }

  async function upsertGoogleUser({ sub, email, name, picture }) {
    await init();
    await cleanupExpiredSessions();

    const googleSub = normalizeText(sub);
    if (!googleSub) throw new Error("Google sub is required");

    const safeEmail = normalizeText(email).toLowerCase();
    const safeName = normalizeText(name) || "Google User";
    const safePicture = normalizeText(picture);
    const now = nowIso();

    let existing = await users().findOne({ googleSub });
    if (!existing && safeEmail) {
      existing = await users().findOne({ email: safeEmail });
    }

    if (!existing) {
      const nextUser = sanitizeUserRecord({
        id: createId("usr"),
        googleSub,
        email: safeEmail,
        name: safeName,
        picture: safePicture,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });

      await users().insertOne(nextUser);
      return toPublicUser(nextUser);
    }

    const nextUser = {
      ...sanitizeUserRecord(existing),
      googleSub,
      email: safeEmail || normalizeText(existing.email),
      name: safeName || normalizeText(existing.name),
      picture: safePicture || normalizeText(existing.picture),
      updatedAt: now,
      lastLoginAt: now,
    };

    await users().updateOne({ id: nextUser.id }, { $set: nextUser });
    return toPublicUser(nextUser);
  }

  async function upsertLocalUser({ email, name }) {
    await init();
    await cleanupExpiredSessions();

    const safeEmail = normalizeText(email).toLowerCase();
    if (!safeEmail) throw new Error("Email is required");

    const derivedName = safeEmail.split("@")[0] || "Luna User";
    const safeName = normalizeText(name) || derivedName;
    const now = nowIso();

    let existing = await users().findOne({ email: safeEmail });
    if (!existing) {
      const nextUser = sanitizeUserRecord({
        id: createId("usr"),
        googleSub: "",
        email: safeEmail,
        name: safeName,
        picture: "",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });

      await users().insertOne(nextUser);
      return toPublicUser(nextUser);
    }

    const nextUser = {
      ...sanitizeUserRecord(existing),
      email: safeEmail,
      name: safeName || normalizeText(existing.name),
      updatedAt: now,
      lastLoginAt: now,
    };

    await users().updateOne({ id: nextUser.id }, { $set: nextUser });
    return toPublicUser(nextUser);
  }

  async function getUserByEmail(email) {
    await init();
    const safeEmail = normalizeText(email).toLowerCase();
    if (!safeEmail) return null;

    const user = await users().findOne({ email: safeEmail });
    return user ? toPublicUser(user) : null;
  }

  async function getUserAuthByEmail(email) {
    await init();
    const safeEmail = normalizeText(email).toLowerCase();
    if (!safeEmail) return null;

    const user = await users().findOne({ email: safeEmail });
    return user ? sanitizeUserRecord(user) : null;
  }

  async function createLocalUser({ email, name, passwordHash, passwordUpdatedAt = "" }) {
    await init();
    await cleanupExpiredSessions();

    const safeEmail = normalizeText(email).toLowerCase();
    if (!safeEmail) throw new Error("Email is required");

    const safePasswordHash = normalizeText(passwordHash);
    if (!safePasswordHash) throw new Error("Password hash is required");

    const derivedName = safeEmail.split("@")[0] || "Luna User";
    const safeName = normalizeText(name) || derivedName;
    const now = nowIso();
    const existing = await users().findOne({ email: safeEmail });
    if (existing) throw new Error("User already exists");

    const nextUser = sanitizeUserRecord({
      id: createId("usr"),
      googleSub: "",
      email: safeEmail,
      name: safeName,
      picture: "",
      passwordHash: safePasswordHash,
      passwordUpdatedAt: normalizeText(passwordUpdatedAt) || now,
      resetTokenHash: "",
      resetTokenExpiresAt: "",
      resetCodeHash: "",
      resetCodeExpiresAt: "",
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    await users().insertOne(nextUser);
    return toPublicUser(nextUser);
  }

  async function updateUserPassword({
    userId,
    passwordHash,
    passwordUpdatedAt = "",
    resetTokenHash = "",
    resetTokenExpiresAt = "",
    resetCodeHash = "",
    resetCodeExpiresAt = "",
  }) {
    await init();
    const safeUserId = normalizeText(userId);
    if (!safeUserId) throw new Error("userId is required");

    const safePasswordHash = normalizeText(passwordHash);
    if (!safePasswordHash) throw new Error("Password hash is required");

    const existing = await users().findOne({ id: safeUserId });
    if (!existing) throw new Error("User not found");

    const next = {
      ...sanitizeUserRecord(existing),
      passwordHash: safePasswordHash,
      hasPassword: true,
      passwordUpdatedAt: normalizeText(passwordUpdatedAt) || nowIso(),
      resetTokenHash: normalizeText(resetTokenHash),
      resetTokenExpiresAt: normalizeText(resetTokenExpiresAt),
      resetCodeHash: normalizeText(resetCodeHash),
      resetCodeExpiresAt: normalizeText(resetCodeExpiresAt),
      updatedAt: nowIso(),
    };

    await users().updateOne({ id: safeUserId }, { $set: next });
    return toPublicUser(next);
  }

  async function storePasswordResetToken({
    email,
    resetTokenHash,
    resetTokenExpiresAt,
    resetCodeHash = "",
    resetCodeExpiresAt = "",
  }) {
    await init();
    const safeEmail = normalizeText(email).toLowerCase();
    if (!safeEmail) return null;

    const existing = await users().findOne({ email: safeEmail });
    if (!existing) return null;

    const next = {
      ...sanitizeUserRecord(existing),
      resetTokenHash: normalizeText(resetTokenHash),
      resetTokenExpiresAt: normalizeText(resetTokenExpiresAt),
      resetCodeHash: normalizeText(resetCodeHash),
      resetCodeExpiresAt: normalizeText(resetCodeExpiresAt),
      updatedAt: nowIso(),
    };

    await users().updateOne({ id: next.id }, { $set: next });
    return toPublicUser(next);
  }

  async function resetUserPasswordWithToken({
    email,
    resetTokenHash,
    resetCodeHash,
    passwordHash,
    passwordUpdatedAt = "",
  }) {
    await init();
    const safeEmail = normalizeText(email).toLowerCase();
    if (!safeEmail) throw new Error("Email is required");

    const safeResetTokenHash = normalizeText(resetTokenHash);
    if (!safeResetTokenHash) throw new Error("Reset token is required");

    const safeResetCodeHash = normalizeText(resetCodeHash);
    if (!safeResetCodeHash) throw new Error("Verification code is required");

    const safePasswordHash = normalizeText(passwordHash);
    if (!safePasswordHash) throw new Error("Password hash is required");

    const existing = await users().findOne({ email: safeEmail });
    if (!existing) throw new Error("Invalid reset token");

    const user = sanitizeUserRecord(existing);
    const expiresAtMs = new Date(user.resetTokenExpiresAt).getTime();
    const codeExpiresAtMs = new Date(user.resetCodeExpiresAt).getTime();
    if (
      !user.resetTokenHash ||
      user.resetTokenHash !== safeResetTokenHash ||
      !user.resetCodeHash ||
      user.resetCodeHash !== safeResetCodeHash ||
      !Number.isFinite(expiresAtMs) ||
      expiresAtMs <= Date.now() ||
      !Number.isFinite(codeExpiresAtMs) ||
      codeExpiresAtMs <= Date.now()
    ) {
      throw new Error("Invalid or expired reset verification.");
    }

    const next = {
      ...user,
      passwordHash: safePasswordHash,
      hasPassword: true,
      passwordUpdatedAt: normalizeText(passwordUpdatedAt) || nowIso(),
      resetTokenHash: "",
      resetTokenExpiresAt: "",
      resetCodeHash: "",
      resetCodeExpiresAt: "",
      updatedAt: nowIso(),
    };

    await users().updateOne({ id: next.id }, { $set: next });
    return toPublicUser(next);
  }

  async function createSession(userId) {
    await init();
    await cleanupExpiredSessions();

    const safeUserId = normalizeText(userId);
    if (!safeUserId) throw new Error("User id is required");

    const now = nowIso();
    const expiresAtDate = new Date(Date.now() + getSessionTtlMs());
    const session = {
      token: createSessionToken(),
      userId: safeUserId,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: expiresAtDate.toISOString(),
      expiresAtDate,
    };

    await sessions().insertOne(session);
    return sanitizeSessionRecord(session);
  }

  async function validateSessionToken(token) {
    await init();
    const safeToken = normalizeText(token);
    if (!safeToken) return null;

    await cleanupExpiredSessions();

    const session = await sessions().findOne({ token: safeToken });
    if (!session) return null;

    const expiresAtMs = new Date(session.expiresAtDate || session.expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      await sessions().deleteOne({ token: safeToken });
      return null;
    }

    const user = await users().findOne({ id: session.userId });
    if (!user) {
      await sessions().deleteOne({ token: safeToken });
      return null;
    }

    const lastSeenAt = nowIso();
    const expiresAtDate = new Date(Date.now() + getSessionTtlMs());
    await sessions().updateOne(
      { token: safeToken },
      {
        $set: {
          lastSeenAt,
          expiresAt: expiresAtDate.toISOString(),
          expiresAtDate,
        },
      },
    );

    return {
      user: sanitizeUserRecord(user),
      session: sanitizeSessionRecord({ ...session, lastSeenAt, expiresAt: expiresAtDate.toISOString(), expiresAtDate }),
    };
  }

  async function revokeSessionToken(token) {
    await init();
    const safeToken = normalizeText(token);
    if (!safeToken) return false;

    const result = await sessions().deleteOne({ token: safeToken });
    return result.deletedCount > 0;
  }

  async function getUserById(userId) {
    await init();
    const safeUserId = normalizeText(userId);
    if (!safeUserId) return null;

    const user = await users().findOne({ id: safeUserId });
    return user ? toPublicUser(user) : null;
  }

  async function updateUserProfile({ userId, name, picture }) {
    await init();

    const safeUserId = normalizeText(userId);
    if (!safeUserId) throw new Error("userId is required");

    const safeName = typeof name === "string" ? name.trim() : "";
    const safePicture = typeof picture === "string" ? picture.trim() : "";

    if (!safeName && picture === undefined) {
      throw new Error("At least one profile field is required");
    }

    if (safeName && safeName.length > 80) {
      throw new Error("Name is too long");
    }

    if (picture !== undefined && safePicture.length > 400000) {
      throw new Error("Profile image is too large");
    }

    const existing = await users().findOne({ id: safeUserId });
    if (!existing) throw new Error("User not found");

    const next = sanitizeUserRecord(existing);
    if (safeName) next.name = safeName;
    if (picture !== undefined) next.picture = safePicture;
    next.updatedAt = nowIso();

    await users().updateOne({ id: safeUserId }, { $set: next });
    return toPublicUser(next);
  }

  async function listUsers() {
    await init();
    await cleanupExpiredSessions();

    const docs = await users().find({}).sort({ lastLoginAt: -1, updatedAt: -1 }).limit(10000).toArray();
    return docs.map((doc) => toPublicUser(doc));
  }

  async function getUserMemory(userId) {
    await init();
    const safeUserId = normalizeText(userId);
    if (!safeUserId) return { ...DEFAULT_MEMORY };

    const user = await users().findOne({ id: safeUserId }, { projection: { memory: 1 } });
    return {
      ...DEFAULT_MEMORY,
      ...sanitizeUserMemory(user?.memory),
    };
  }

  async function upsertUserMemory(userId, payload = {}) {
    await init();
    const safeUserId = normalizeText(userId);
    if (!safeUserId) throw new Error("userId is required");

    const existing = await users().findOne({ id: safeUserId });
    if (!existing) throw new Error("User not found");

    const memory = {
      ...DEFAULT_MEMORY,
      ...sanitizeUserMemory(payload),
      updated_at: nowIso(),
    };

    await users().updateOne(
      { id: safeUserId },
      { $set: { memory, updatedAt: nowIso() } },
    );

    return clone(memory);
  }

  async function hasUserMemory(userId) {
    const memory = await getUserMemory(userId);
    return Boolean(
      memory.goals.length ||
      memory.subjects.length ||
      memory.favorite_topics.length ||
      normalizeText(memory.response_style) !== DEFAULT_MEMORY.response_style ||
      normalizeText(memory.learning_level) !== DEFAULT_MEMORY.learning_level,
    );
  }

  async function getUserSignupStats(days = 14) {
    await init();
    await cleanupExpiredSessions();

    const countDays = Number.isFinite(Number(days)) ? Math.max(1, Number(days)) : 14;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (countDays - 1));

    const startIso = start.toISOString();
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startIso },
        },
      },
      {
        $addFields: {
          createdDate: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: { $toDate: "$createdAt" },
            },
          },
        },
      },
      {
        $group: {
          _id: "$createdDate",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: 1,
        },
      },
    ];

    const agg = await users().aggregate(pipeline).toArray();
    const total = await users().countDocuments({});

    const buckets = new Map();
    for (let i = 0; i < countDays; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      buckets.set(key, 0);
    }

    for (const item of agg) {
      if (buckets.has(item.date)) {
        buckets.set(item.date, item.count);
      }
    }

    const series = Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
    return { total, series };
  }

  async function getModelUsageStats() {
    await init();

    const pipeline = [
      { $unwind: "$messages" },
      { $match: { "messages.role": "assistant" } },
      {
        $group: {
          _id: { $ifNull: ["$messages.llm", "unknown"] },
          count: { $sum: 1 },
        },
      },
    ];

    const agg = await conversations().aggregate(pipeline).toArray();
    const counts = {};
    let totalAssistantMessages = 0;

    for (const item of agg) {
      const key = typeof item._id === "string" && item._id.trim() ? item._id : "unknown";
      counts[key] = Number(item.count || 0);
      totalAssistantMessages += counts[key];
    }

    return { totalAssistantMessages, counts };
  }

  async function submitFeedback({ userId = "", name = "", email = "", message = "", rating = 5 }) {
    await init();

    const safeMessage = normalizeText(message);
    if (safeMessage.length < 8) throw new Error("Feedback message is too short");
    if (safeMessage.length > 1200) throw new Error("Feedback message is too long");

    const now = nowIso();
    const item = sanitizeFeedbackItem({
      id: createId("fb"),
      userId: normalizeText(userId),
      name: normalizeText(name) || "Luna User",
      email: normalizeText(email).toLowerCase(),
      message: safeMessage,
      rating,
      featured: false,
      featuredAt: "",
      featuredBy: "",
      createdAt: now,
      updatedAt: now,
    });

    await feedback().insertOne(item);
    return clone(item);
  }

  async function listFeedback({ featuredOnly = false, limit = 100 } = {}) {
    await init();

    const max = Number.isFinite(Number(limit)) ? Math.max(1, Number(limit)) : 100;
    const query = featuredOnly ? { featured: true } : {};
    const docs = await feedback().find(query).sort({ createdAt: -1 }).limit(max).toArray();
    return docs.map((doc) => sanitizeFeedbackItem(doc));
  }

  async function setFeedbackFeatured({ feedbackId, featured, adminUserId = "" }) {
    await init();

    const safeId = normalizeText(feedbackId);
    if (!safeId) throw new Error("feedbackId is required");

    const existing = await feedback().findOne({ id: safeId });
    if (!existing) throw new Error("Feedback not found");

    const now = nowIso();
    const isFeatured = Boolean(featured);
    const next = {
      ...sanitizeFeedbackItem(existing),
      featured: isFeatured,
      featuredAt: isFeatured ? now : "",
      featuredBy: isFeatured ? normalizeText(adminUserId) : "",
      updatedAt: now,
    };

    await feedback().updateOne({ id: safeId }, { $set: next });
    return clone(next);
  }

  async function listConversationSummaries(userId = "guest") {
    await init();
    const safeUserId = normalizeUserId(userId);

    const docs = await conversations().find({ userId: safeUserId }).sort({ updatedAt: -1 }).limit(500).toArray();
    return docs.map((doc) => toConversationSummary(sanitizeConversation(doc)));
  }

  async function getConversationById(conversationId, userId = "guest") {
    await init();
    const safeConversationId = normalizeText(conversationId);
    if (!safeConversationId) return null;

    const safeUserId = normalizeUserId(userId);
    const conversation = await conversations().findOne({ id: safeConversationId, userId: safeUserId });

    return conversation ? sanitizeConversation(conversation) : null;
  }

  async function createConversation(title = "New chat", userId = "guest") {
    await init();
    const now = nowIso();

    const conversation = sanitizeConversation({
      id: createId("chat"),
      userId: normalizeUserId(userId),
      title: normalizeText(title) || "New chat",
      createdAt: now,
      updatedAt: now,
      messages: [],
    });

    await conversations().insertOne(conversation);
    return clone(conversation);
  }

  async function ensureConversation(conversationId, userId = "guest") {
    const safeConversationId = normalizeText(conversationId);
    if (!safeConversationId) {
      return createConversation("New chat", userId);
    }

    const existing = await getConversationById(safeConversationId, userId);
    if (existing) return existing;

    return createConversation("New chat", userId);
  }

  async function deleteConversation(conversationId, userId = "guest") {
    await init();

    const safeConversationId = normalizeText(conversationId);
    if (!safeConversationId) return false;

    const safeUserId = normalizeUserId(userId);
    const result = await conversations().deleteOne({ id: safeConversationId, userId: safeUserId });
    return result.deletedCount > 0;
  }

  async function countUserMessagesForDate(userId = "guest", dateKey = "") {
    await init();

    const safeUserId = normalizeUserId(userId);
    const safeDateKey = normalizeText(dateKey);
    if (!safeDateKey) return 0;

    const docs = await conversations().find({ userId: safeUserId }, { projection: { messages: 1 } }).toArray();

    let count = 0;
    for (const doc of docs) {
      const messages = Array.isArray(doc?.messages) ? doc.messages : [];
      for (const message of messages) {
        if (message?.role !== "user") continue;
        const createdAt = normalizeText(message?.createdAt);
        if (createdAt.startsWith(safeDateKey)) count += 1;
      }
    }

    return count;
  }

  async function getConversationStats(userId = "") {
    await init();

    const hasUserFilter = normalizeText(userId).length > 0;
    const query = hasUserFilter ? { userId: normalizeUserId(userId) } : {};
    const docs = await conversations().find(query, { projection: { messages: 1 } }).toArray();

    let totalConversations = 0;
    let totalMessages = 0;
    let totalUserMessages = 0;

    for (const doc of docs) {
      totalConversations += 1;
      const messages = Array.isArray(doc?.messages) ? doc.messages : [];
      totalMessages += messages.length;
      for (const message of messages) {
        if (message?.role === "user") totalUserMessages += 1;
      }
    }

    return { totalConversations, totalMessages, totalUserMessages };
  }

  async function saveConversationTurn({
    conversationId,
    userText,
    assistantText,
    llm,
    userId = "guest",
  }) {
    await init();

    const safeUserText = normalizeText(userText);
    const safeAssistantText = normalizeText(assistantText);
    const safeUserId = normalizeUserId(userId);
    const now = nowIso();
    const targetId = normalizeText(conversationId) || createId("chat");

    const current = await conversations().findOne({ id: targetId, userId: safeUserId });
    const next = current
      ? sanitizeConversation(current)
      : sanitizeConversation({
          id: targetId,
          userId: safeUserId,
          title: "New chat",
          createdAt: now,
          updatedAt: now,
          messages: [],
        });

    if (safeUserText) {
      next.messages.push({ id: createId("user"), role: "user", text: safeUserText, createdAt: now });
    }

    if (safeAssistantText) {
      next.messages.push({
        id: createId("assistant"),
        role: "assistant",
        text: safeAssistantText,
        llm: typeof llm === "string" ? llm : undefined,
        createdAt: nowIso(),
      });
    }

    if (next.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
      next.messages = next.messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
    }

    next.title = deriveTitle(next.messages);
    next.updatedAt = nowIso();

    await conversations().updateOne(
      { id: targetId, userId: safeUserId },
      {
        $set: {
          id: next.id,
          userId: next.userId,
          title: next.title,
          createdAt: next.createdAt,
          updatedAt: next.updatedAt,
          messages: next.messages,
        },
      },
      { upsert: true },
    );

    return clone(next);
  }

  async function close() {
    await client.close();
  }

  return {
    init,
    close,
    upsertGoogleUser,
    upsertLocalUser,
    getUserByEmail,
    getUserAuthByEmail,
    createLocalUser,
    updateUserPassword,
    storePasswordResetToken,
    resetUserPasswordWithToken,
    createSession,
    validateSessionToken,
    revokeSessionToken,
    getUserById,
    updateUserProfile,
    listUsers,
    getUserMemory,
    upsertUserMemory,
    hasUserMemory,
    getUserSignupStats,
    getModelUsageStats,
    submitFeedback,
    listFeedback,
    setFeedbackFeatured,
    listConversationSummaries,
    getConversationById,
    createConversation,
    ensureConversation,
    deleteConversation,
    countUserMessagesForDate,
    getConversationStats,
    saveConversationTurn,
  };
}
