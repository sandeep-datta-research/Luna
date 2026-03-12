import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "pro.json");

const EMPTY_DB = {
  version: 1,
  memberships: [],
  upgradeRequests: [],
};

let dbWriteQueue = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCode(value) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 32);
}

function normalizePlan(value) {
  return value === "pro" ? "pro" : "free";
}

function normalizeStatus(value) {
  if (value === "approved" || value === "rejected") return value;
  return "pending";
}

function createId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function toAmount(value, fallback = 90) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.round(num * 100) / 100;
}

function toPercent(value, fallback = 0, max = 90) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return Math.max(0, Math.min(max, fallback));
  return Math.max(0, Math.min(max, Math.round(num * 100) / 100));
}

function sanitizeMembership(raw) {
  return {
    userId: normalizeText(raw?.userId),
    email: normalizeText(raw?.email).toLowerCase(),
    name: normalizeText(raw?.name),
    plan: normalizePlan(raw?.plan),
    activatedAt: normalizeText(raw?.activatedAt),
    activatedBy: normalizeText(raw?.activatedBy),
    createdAt: normalizeText(raw?.createdAt) || nowIso(),
    updatedAt: normalizeText(raw?.updatedAt) || nowIso(),
  };
}

function sanitizeUpgradeRequest(raw) {
  const amountInr = toAmount(raw?.amountInr, 90);
  const baseAmountInr = toAmount(raw?.baseAmountInr ?? raw?.amountInr, amountInr);

  return {
    id: normalizeText(raw?.id) || createId("upr"),
    userId: normalizeText(raw?.userId),
    userEmail: normalizeText(raw?.userEmail).toLowerCase(),
    userName: normalizeText(raw?.userName),
    transactionId: normalizeText(raw?.transactionId),
    amountInr,
    baseAmountInr,
    discountPercent: toPercent(raw?.discountPercent, 0),
    referralCode: normalizeCode(raw?.referralCode),
    status: normalizeStatus(raw?.status),
    note: normalizeText(raw?.note),
    createdAt: normalizeText(raw?.createdAt) || nowIso(),
    updatedAt: normalizeText(raw?.updatedAt) || nowIso(),
    reviewedAt: normalizeText(raw?.reviewedAt),
    reviewedBy: normalizeText(raw?.reviewedBy),
  };
}

function sanitizeDb(raw) {
  if (!raw || typeof raw !== "object") return { ...EMPTY_DB };

  return {
    version: 1,
    memberships: Array.isArray(raw.memberships) ? raw.memberships.map(sanitizeMembership) : [],
    upgradeRequests: Array.isArray(raw.upgradeRequests) ? raw.upgradeRequests.map(sanitizeUpgradeRequest) : [],
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

async function runDbMutation(mutator) {
  dbWriteQueue = dbWriteQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  });

  return dbWriteQueue;
}

function findMembership(db, userId) {
  const safeUserId = normalizeText(userId);
  if (!safeUserId) return null;
  return db.memberships.find((item) => item.userId === safeUserId) || null;
}

function upsertMembership(db, payload) {
  const safeUserId = normalizeText(payload?.userId);
  if (!safeUserId) {
    throw new Error("userId is required");
  }

  const now = nowIso();
  let membership = findMembership(db, safeUserId);

  if (!membership) {
    membership = sanitizeMembership({
      userId: safeUserId,
      email: payload?.email,
      name: payload?.name,
      plan: payload?.plan || "free",
      activatedAt: payload?.activatedAt,
      activatedBy: payload?.activatedBy,
      createdAt: now,
      updatedAt: now,
    });
    db.memberships.unshift(membership);
    return membership;
  }

  if (payload?.email) membership.email = normalizeText(payload.email).toLowerCase();
  if (payload?.name) membership.name = normalizeText(payload.name);
  if (payload?.plan) membership.plan = normalizePlan(payload.plan);
  if (payload?.activatedAt !== undefined) membership.activatedAt = normalizeText(payload.activatedAt);
  if (payload?.activatedBy !== undefined) membership.activatedBy = normalizeText(payload.activatedBy);
  membership.updatedAt = now;

  return membership;
}

export async function ensureMembershipUser({ userId, email, name }) {
  if (!normalizeText(userId)) return null;

  return runDbMutation((db) => {
    const membership = upsertMembership(db, { userId, email, name, plan: findMembership(db, userId)?.plan || "free" });
    return clone(membership);
  });
}

export async function getMembershipByUserId(userId) {
  const safeUserId = normalizeText(userId);
  if (!safeUserId) return null;

  const db = await readDb();
  const membership = findMembership(db, safeUserId);
  return membership ? clone(membership) : null;
}

export async function setMembershipPlan({ userId, plan, adminUserId = "", email = "", name = "" }) {
  const safeUserId = normalizeText(userId);
  if (!safeUserId) throw new Error("userId is required");

  const nextPlan = normalizePlan(plan);

  return runDbMutation((db) => {
    const now = nowIso();
    const membership = upsertMembership(db, {
      userId: safeUserId,
      email,
      name,
      plan: nextPlan,
      activatedAt: nextPlan === "pro" ? now : "",
      activatedBy: nextPlan === "pro" ? normalizeText(adminUserId) : "",
    });

    return clone(membership);
  });
}

export async function listMemberships() {
  const db = await readDb();
  return clone(db.memberships).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function submitUpgradeRequest({
  userId,
  userEmail,
  userName,
  transactionId,
  amountInr = 90,
  baseAmountInr,
  discountPercent = 0,
  referralCode = "",
}) {
  const safeUserId = normalizeText(userId);
  const safeTxn = normalizeText(transactionId);

  if (!safeUserId) throw new Error("userId is required");
  if (!safeTxn || safeTxn.length < 6) throw new Error("A valid transaction id / UPI reference is required");

  const safeBaseAmount = toAmount(baseAmountInr ?? amountInr, 90);
  const safeAmountInr = toAmount(amountInr, safeBaseAmount);
  const safeDiscountPercent = toPercent(discountPercent, 0);
  const safeReferralCode = normalizeCode(referralCode);

  return runDbMutation((db) => {
    const now = nowIso();
    const existingPending = db.upgradeRequests.find(
      (item) => item.userId === safeUserId && item.status === "pending" && item.transactionId.toLowerCase() === safeTxn.toLowerCase(),
    );

    if (existingPending) {
      return clone(existingPending);
    }

    upsertMembership(db, {
      userId: safeUserId,
      email: userEmail,
      name: userName,
      plan: findMembership(db, safeUserId)?.plan || "free",
    });

    const request = sanitizeUpgradeRequest({
      id: createId("upr"),
      userId: safeUserId,
      userEmail,
      userName,
      transactionId: safeTxn,
      amountInr: safeAmountInr,
      baseAmountInr: safeBaseAmount,
      discountPercent: safeDiscountPercent,
      referralCode: safeReferralCode,
      status: "pending",
      note: "",
      createdAt: now,
      updatedAt: now,
      reviewedAt: "",
      reviewedBy: "",
    });

    db.upgradeRequests.unshift(request);
    return clone(request);
  });
}

export async function listUpgradeRequests({ status = "", userId = "", limit = 200 } = {}) {
  const db = await readDb();
  const safeStatus = normalizeText(status).toLowerCase();
  const safeUserId = normalizeText(userId);

  let items = db.upgradeRequests.slice();
  if (safeStatus) {
    items = items.filter((item) => item.status === normalizeStatus(safeStatus));
  }
  if (safeUserId) {
    items = items.filter((item) => item.userId === safeUserId);
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const max = Number.isFinite(Number(limit)) ? Math.max(1, Number(limit)) : 200;
  return clone(items.slice(0, max));
}

export async function reviewUpgradeRequest({ requestId, status, adminUserId = "", note = "" }) {
  const safeRequestId = normalizeText(requestId);
  if (!safeRequestId) throw new Error("requestId is required");

  const nextStatus = normalizeStatus(status);
  if (nextStatus === "pending") throw new Error("status must be approved or rejected");

  return runDbMutation((db) => {
    const request = db.upgradeRequests.find((item) => item.id === safeRequestId);
    if (!request) {
      throw new Error("Upgrade request not found");
    }

    const now = nowIso();
    request.status = nextStatus;
    request.note = normalizeText(note);
    request.updatedAt = now;
    request.reviewedAt = now;
    request.reviewedBy = normalizeText(adminUserId);

    if (nextStatus === "approved") {
      upsertMembership(db, {
        userId: request.userId,
        email: request.userEmail,
        name: request.userName,
        plan: "pro",
        activatedAt: now,
        activatedBy: normalizeText(adminUserId),
      });
    }

    return clone(request);
  });
}

export async function getBillingStats() {
  const db = await readDb();
  const approved = db.upgradeRequests.filter((item) => item.status === "approved");
  const pending = db.upgradeRequests.filter((item) => item.status === "pending");

  const revenueInr = approved.reduce((sum, item) => sum + toAmount(item.amountInr, 0), 0);

  return {
    totalRequests: db.upgradeRequests.length,
    pendingRequests: pending.length,
    approvedRequests: approved.length,
    rejectedRequests: db.upgradeRequests.filter((item) => item.status === "rejected").length,
    revenueInr,
  };
}
