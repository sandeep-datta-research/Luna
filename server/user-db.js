import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "users.json");
const DEFAULT_SESSION_TTL_DAYS = 30;

const EMPTY_DB = {
  version: 1,
  users: [],
  sessions: [],
};

const DEFAULT_MEMORY = {
  goals: [],
  subjects: [],
  response_style: "Detailed",
  favorite_topics: [],
  learning_level: "Beginner",
};

let dbWriteQueue = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
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

function sanitizeUser(raw) {
  const createdAt = normalizeText(raw?.createdAt) || nowIso();
  const updatedAt = normalizeText(raw?.updatedAt) || createdAt;
  const memory = sanitizeUserMemory(raw?.memory);
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
    memory,
    createdAt,
    updatedAt,
    lastLoginAt: normalizeText(raw?.lastLoginAt) || updatedAt,
  };
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function sanitizeUserMemory(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  return {
    goals: sanitizeStringArray(value.goals),
    subjects: sanitizeStringArray(value.subjects),
    response_style: normalizeText(value.response_style) || DEFAULT_MEMORY.response_style,
    favorite_topics: sanitizeStringArray(value.favorite_topics),
    learning_level: normalizeText(value.learning_level) || DEFAULT_MEMORY.learning_level,
    updated_at: normalizeText(value.updated_at) || "",
  };
}

function sanitizeSession(raw) {
  const createdAt = normalizeText(raw?.createdAt) || nowIso();
  const expiresAt = normalizeText(raw?.expiresAt) || new Date(Date.now() + getSessionTtlMs()).toISOString();

  return {
    token: normalizeText(raw?.token) || createSessionToken(),
    userId: normalizeText(raw?.userId) || "",
    createdAt,
    lastSeenAt: normalizeText(raw?.lastSeenAt) || createdAt,
    expiresAt,
  };
}

function sanitizeDb(raw) {
  if (!raw || typeof raw !== "object") return { ...EMPTY_DB };

  return {
    version: 1,
    users: Array.isArray(raw.users) ? raw.users.map(sanitizeUser) : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions.map(sanitizeSession) : [],
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toPublicUser(user) {
  const safeUser = sanitizeUser(user);
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

function cleanupExpiredSessions(db) {
  const now = Date.now();
  db.sessions = db.sessions.filter((session) => {
    const expiresAtMs = new Date(session.expiresAt).getTime();
    return Number.isFinite(expiresAtMs) && expiresAtMs > now;
  });
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

async function runDbMutation(mutator) {
  dbWriteQueue = dbWriteQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  });

  return dbWriteQueue;
}

export async function upsertGoogleUser({ sub, email, name, picture }) {
  const googleSub = normalizeText(sub);
  if (!googleSub) {
    throw new Error("Google sub is required");
  }

  const safeEmail = normalizeText(email).toLowerCase();
  const safeName = normalizeText(name) || "Google User";
  const safePicture = normalizeText(picture);

  return runDbMutation((db) => {
    cleanupExpiredSessions(db);

    let user = db.users.find((item) => item.googleSub === googleSub);
    const now = nowIso();

    if (!user && safeEmail) {
      user = db.users.find((item) => item.email === safeEmail);
    }

    if (!user) {
      user = {
        id: createId("usr"),
        googleSub,
        email: safeEmail,
        name: safeName,
        picture: safePicture,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };
      db.users.unshift(user);
    } else {
      user.googleSub = googleSub;
      if (safeEmail) user.email = safeEmail;
      if (safeName) user.name = safeName;
      if (safePicture) user.picture = safePicture;
      user.updatedAt = now;
      user.lastLoginAt = now;
    }

    return toPublicUser(user);
  });
}

export async function upsertLocalUser({ email, name }) {
  const safeEmail = normalizeText(email).toLowerCase();
  if (!safeEmail) {
    throw new Error("Email is required");
  }

  const derivedName = safeEmail.split("@")[0] || "Luna User";
  const safeName = normalizeText(name) || derivedName;
  const now = nowIso();

  return runDbMutation((db) => {
    cleanupExpiredSessions(db);

    let user = db.users.find((item) => item.email === safeEmail);
    if (!user) {
      user = {
        id: createId("usr"),
        googleSub: "",
        email: safeEmail,
        name: safeName,
        picture: "",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };
      db.users.unshift(user);
    } else {
      user.email = safeEmail;
      if (safeName) user.name = safeName;
      user.updatedAt = now;
      user.lastLoginAt = now;
    }

    return toPublicUser(user);
  });
}

export async function getUserByEmail(email) {
  const safeEmail = normalizeText(email).toLowerCase();
  if (!safeEmail) return null;

  const db = await readDb();
  cleanupExpiredSessions(db);
  const user = db.users.find((item) => item.email === safeEmail);
  return user ? toPublicUser(user) : null;
}

export async function getUserAuthByEmail(email) {
  const safeEmail = normalizeText(email).toLowerCase();
  if (!safeEmail) return null;

  const db = await readDb();
  cleanupExpiredSessions(db);
  const user = db.users.find((item) => item.email === safeEmail);
  return user ? clone(sanitizeUser(user)) : null;
}

export async function createLocalUser({ email, name, passwordHash, passwordUpdatedAt = "" }) {
  const safeEmail = normalizeText(email).toLowerCase();
  if (!safeEmail) throw new Error("Email is required");

  const safePasswordHash = normalizeText(passwordHash);
  if (!safePasswordHash) throw new Error("Password hash is required");

  const derivedName = safeEmail.split("@")[0] || "Luna User";
  const safeName = normalizeText(name) || derivedName;
  const now = nowIso();

  return runDbMutation((db) => {
    cleanupExpiredSessions(db);

    const existing = db.users.find((item) => item.email === safeEmail);
    if (existing) throw new Error("User already exists");

    const user = {
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
    };

    db.users.unshift(user);
    return toPublicUser(user);
  });
}

export async function updateUserPassword({
  userId,
  passwordHash,
  passwordUpdatedAt = "",
  resetTokenHash = "",
  resetTokenExpiresAt = "",
  resetCodeHash = "",
  resetCodeExpiresAt = "",
}) {
  const safeUserId = normalizeText(userId);
  if (!safeUserId) throw new Error("userId is required");
  const safePasswordHash = normalizeText(passwordHash);
  if (!safePasswordHash) throw new Error("Password hash is required");

  return runDbMutation((db) => {
    cleanupExpiredSessions(db);

    const user = db.users.find((item) => item.id === safeUserId);
    if (!user) throw new Error("User not found");

    user.passwordHash = safePasswordHash;
    user.passwordUpdatedAt = normalizeText(passwordUpdatedAt) || nowIso();
    user.resetTokenHash = normalizeText(resetTokenHash);
    user.resetTokenExpiresAt = normalizeText(resetTokenExpiresAt);
    user.resetCodeHash = normalizeText(resetCodeHash);
    user.resetCodeExpiresAt = normalizeText(resetCodeExpiresAt);
    user.updatedAt = nowIso();
    return toPublicUser(user);
  });
}

export async function storePasswordResetToken({
  email,
  resetTokenHash,
  resetTokenExpiresAt,
  resetCodeHash = "",
  resetCodeExpiresAt = "",
}) {
  const safeEmail = normalizeText(email).toLowerCase();
  if (!safeEmail) return null;

  return runDbMutation((db) => {
    cleanupExpiredSessions(db);

    const user = db.users.find((item) => item.email === safeEmail);
    if (!user) return null;

    user.resetTokenHash = normalizeText(resetTokenHash);
    user.resetTokenExpiresAt = normalizeText(resetTokenExpiresAt);
    user.resetCodeHash = normalizeText(resetCodeHash);
    user.resetCodeExpiresAt = normalizeText(resetCodeExpiresAt);
    user.updatedAt = nowIso();
    return toPublicUser(user);
  });
}

export async function resetUserPasswordWithToken({
  email,
  resetTokenHash,
  resetCodeHash,
  passwordHash,
  passwordUpdatedAt = "",
}) {
  const safeEmail = normalizeText(email).toLowerCase();
  if (!safeEmail) throw new Error("Email is required");

  const safeResetTokenHash = normalizeText(resetTokenHash);
  if (!safeResetTokenHash) throw new Error("Reset token is required");

  const safeResetCodeHash = normalizeText(resetCodeHash);
  if (!safeResetCodeHash) throw new Error("Verification code is required");

  const safePasswordHash = normalizeText(passwordHash);
  if (!safePasswordHash) throw new Error("Password hash is required");

  return runDbMutation((db) => {
    cleanupExpiredSessions(db);

    const user = db.users.find((item) => item.email === safeEmail);
    if (!user) throw new Error("Invalid reset token");

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

    user.passwordHash = safePasswordHash;
    user.passwordUpdatedAt = normalizeText(passwordUpdatedAt) || nowIso();
    user.resetTokenHash = "";
    user.resetTokenExpiresAt = "";
    user.resetCodeHash = "";
    user.resetCodeExpiresAt = "";
    user.updatedAt = nowIso();
    return toPublicUser(user);
  });
}

export async function createSession(userId) {
  const safeUserId = normalizeText(userId);
  if (!safeUserId) {
    throw new Error("User id is required");
  }

  return runDbMutation((db) => {
    cleanupExpiredSessions(db);

    const now = nowIso();
    const expiresAt = new Date(Date.now() + getSessionTtlMs()).toISOString();
    const session = {
      token: createSessionToken(),
      userId: safeUserId,
      createdAt: now,
      lastSeenAt: now,
      expiresAt,
    };

    db.sessions.unshift(session);
    if (db.sessions.length > 10000) {
      db.sessions = db.sessions.slice(0, 10000);
    }

    return clone(session);
  });
}

export async function validateSessionToken(token) {
  const safeToken = normalizeText(token);
  if (!safeToken) return null;

  return runDbMutation((db) => {
    cleanupExpiredSessions(db);

    const session = db.sessions.find((item) => item.token === safeToken);
    if (!session) return null;

    const user = db.users.find((item) => item.id === session.userId);
    if (!user) {
      db.sessions = db.sessions.filter((item) => item.token !== safeToken);
      return null;
    }

    const now = nowIso();
    session.lastSeenAt = now;
    session.expiresAt = new Date(Date.now() + getSessionTtlMs()).toISOString();
    return {
      user: clone(user),
      session: clone(session),
    };
  });
}

export async function revokeSessionToken(token) {
  const safeToken = normalizeText(token);
  if (!safeToken) return false;

  return runDbMutation((db) => {
    const before = db.sessions.length;
    db.sessions = db.sessions.filter((item) => item.token !== safeToken);
    return db.sessions.length !== before;
  });
}

export async function getUserById(userId) {
  const safeUserId = normalizeText(userId);
  if (!safeUserId) return null;

  const db = await readDb();
  cleanupExpiredSessions(db);
  const user = db.users.find((item) => item.id === safeUserId);
  return user ? toPublicUser(user) : null;
}

export async function updateUserProfile({ userId, name, picture }) {
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

  return runDbMutation((db) => {
    cleanupExpiredSessions(db);

    const user = db.users.find((item) => item.id === safeUserId);
    if (!user) throw new Error("User not found");

    if (safeName) user.name = safeName;
    if (picture !== undefined) user.picture = safePicture;
    user.updatedAt = nowIso();

    return toPublicUser(user);
  });
}

export async function listUsers() {
  const db = await readDb();
  cleanupExpiredSessions(db);
  return clone(db.users)
    .map((user) => toPublicUser(user))
    .sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime());
}

export async function getUserMemory(userId) {
  const safeUserId = normalizeText(userId);
  if (!safeUserId) return { ...DEFAULT_MEMORY };

  const db = await readDb();
  cleanupExpiredSessions(db);
  const user = db.users.find((item) => item.id === safeUserId);
  if (!user) return { ...DEFAULT_MEMORY };
  return {
    ...DEFAULT_MEMORY,
    ...sanitizeUserMemory(user.memory),
  };
}

export async function upsertUserMemory(userId, payload = {}) {
  const safeUserId = normalizeText(userId);
  if (!safeUserId) {
    throw new Error("userId is required");
  }

  return runDbMutation((db) => {
    cleanupExpiredSessions(db);

    const user = db.users.find((item) => item.id === safeUserId);
    if (!user) throw new Error("User not found");

    user.memory = {
      ...DEFAULT_MEMORY,
      ...sanitizeUserMemory(payload),
      updated_at: nowIso(),
    };
    user.updatedAt = nowIso();

    return clone(user.memory);
  });
}

export async function hasUserMemory(userId) {
  const safeUserId = normalizeText(userId);
  if (!safeUserId) return false;

  const db = await readDb();
  cleanupExpiredSessions(db);
  const user = db.users.find((item) => item.id === safeUserId);
  if (!user?.memory) return false;

  const memory = sanitizeUserMemory(user.memory);
  return Boolean(
    memory.goals.length ||
    memory.subjects.length ||
    memory.favorite_topics.length ||
    normalizeText(memory.response_style) !== DEFAULT_MEMORY.response_style ||
    normalizeText(memory.learning_level) !== DEFAULT_MEMORY.learning_level,
  );
}

export async function getUserSignupStats(days = 14) {
  const db = await readDb();
  cleanupExpiredSessions(db);

  const total = db.users.length;
  const countDays = Number.isFinite(Number(days)) ? Math.max(1, Number(days)) : 14;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (countDays - 1));

  const buckets = new Map();
  for (let i = 0; i < countDays; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  for (const user of db.users) {
    const createdAt = typeof user?.createdAt === "string" ? user.createdAt : "";
    if (!createdAt) continue;
    const dateKey = new Date(createdAt).toISOString().slice(0, 10);
    if (!buckets.has(dateKey)) continue;
    buckets.set(dateKey, (buckets.get(dateKey) || 0) + 1);
  }

  const series = Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
  return { total, series };
}
