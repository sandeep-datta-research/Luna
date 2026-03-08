import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "feedback.json");

const EMPTY_DB = {
  version: 1,
  feedback: [],
};

let writeQueue = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function clampRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function sanitizeItem(raw) {
  return {
    id: normalizeText(raw?.id) || createId("fb"),
    userId: normalizeText(raw?.userId),
    name: normalizeText(raw?.name) || "Anonymous",
    email: normalizeText(raw?.email).toLowerCase(),
    message: normalizeText(raw?.message),
    rating: clampRating(raw?.rating),
    featured: Boolean(raw?.featured),
    createdAt: normalizeText(raw?.createdAt) || nowIso(),
    updatedAt: normalizeText(raw?.updatedAt) || nowIso(),
    featuredAt: normalizeText(raw?.featuredAt),
    featuredBy: normalizeText(raw?.featuredBy),
  };
}

function sanitizeDb(raw) {
  if (!raw || typeof raw !== "object") return { ...EMPTY_DB };
  return {
    version: 1,
    feedback: Array.isArray(raw.feedback) ? raw.feedback.map(sanitizeItem) : [],
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

async function mutate(mutator) {
  writeQueue = writeQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  });

  return writeQueue;
}

export async function submitFeedback({ userId = "", name = "", email = "", message = "", rating = 5 }) {
  const safeMessage = normalizeText(message);
  if (safeMessage.length < 8) {
    throw new Error("Feedback message is too short");
  }

  if (safeMessage.length > 1200) {
    throw new Error("Feedback message is too long");
  }

  const safeName = normalizeText(name) || "Luna User";
  const safeEmail = normalizeText(email).toLowerCase();
  const now = nowIso();

  return mutate((db) => {
    const item = sanitizeItem({
      id: createId("fb"),
      userId,
      name: safeName,
      email: safeEmail,
      message: safeMessage,
      rating,
      featured: false,
      createdAt: now,
      updatedAt: now,
      featuredAt: "",
      featuredBy: "",
    });

    db.feedback.unshift(item);
    if (db.feedback.length > 5000) db.feedback = db.feedback.slice(0, 5000);
    return clone(item);
  });
}

export async function listFeedback({ featuredOnly = false, limit = 100 } = {}) {
  const db = await readDb();
  const max = Number.isFinite(Number(limit)) ? Math.max(1, Number(limit)) : 100;

  let items = db.feedback.slice();
  if (featuredOnly) items = items.filter((item) => item.featured === true);

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return clone(items.slice(0, max));
}

export async function setFeedbackFeatured({ feedbackId, featured, adminUserId = "" }) {
  const safeId = normalizeText(feedbackId);
  if (!safeId) throw new Error("feedbackId is required");

  return mutate((db) => {
    const item = db.feedback.find((entry) => entry.id === safeId);
    if (!item) throw new Error("Feedback not found");

    const now = nowIso();
    item.featured = Boolean(featured);
    item.updatedAt = now;
    item.featuredAt = item.featured ? now : "";
    item.featuredBy = item.featured ? normalizeText(adminUserId) : "";

    return clone(item);
  });
}