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

  return {
    id: normalizeText(raw?.id) || createId("usr"),
    googleSub: normalizeText(raw?.googleSub),
    email: normalizeText(raw?.email),
    name: normalizeText(raw?.name),
    picture: normalizeText(raw?.picture),
    createdAt,
    updatedAt,
    lastLoginAt: normalizeText(raw?.lastLoginAt) || updatedAt,
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

    return clone(user);
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

    return clone(user);
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

    session.lastSeenAt = nowIso();
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
  return user ? clone(user) : null;
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

    return clone(user);
  });
}

export async function listUsers() {
  const db = await readDb();
  cleanupExpiredSessions(db);
  return clone(db.users).sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime());
}
