import "./load-env.js";
import * as fileHistory from "./history-db.js";
import * as fileUsers from "./user-db.js";
import * as fileFeedback from "./feedback-db.js";
import { createMongoStore } from "./mongo-store.js";

let activeEngine = "file";
let activeStore = null;
let initPromise = null;
let initWarning = "";

function isProduction() {
  return (process.env.NODE_ENV || "").trim().toLowerCase() === "production";
}

function normalizeMode(rawMode) {
  const value = typeof rawMode === "string" ? rawMode.trim().toLowerCase() : "";
  if (value === "mongo" || value === "file" || value === "auto") {
    return value;
  }
  return "auto";
}

function readDbConfig() {
  const mode = normalizeMode(process.env.LUNA_DB_MODE || "auto");
  const mongoUri = typeof process.env.MONGODB_URI === "string" ? process.env.MONGODB_URI.trim() : "";
  const hasMongoUri = mongoUri.length > 0;
  const useMongo = mode === "mongo" || (mode === "auto" && hasMongoUri);

  return {
    mode,
    hasMongoUri,
    useMongo,
  };
}

async function initializeDb() {
  const config = readDbConfig();
  initWarning = "";
  const requireMongo = config.mode === "mongo" || (isProduction() && config.mode !== "file");

  if (!config.useMongo) {
    if (requireMongo) {
      throw new Error(
        "MongoDB is required in production unless LUNA_DB_MODE=file is set explicitly.",
      );
    }
    activeEngine = "file";
    activeStore = null;
    return;
  }

  if (!config.hasMongoUri) {
    throw new Error("MONGODB_URI is required when LUNA_DB_MODE=mongo");
  }

  try {
    const mongoStore = createMongoStore();
    await mongoStore.init();
    activeStore = mongoStore;
    activeEngine = "mongo";
  } catch (error) {
    if (requireMongo) {
      throw error;
    }

    activeStore = null;
    activeEngine = "file";
    initWarning = `MongoDB unavailable (${error.message}). Falling back to file storage.`;
    console.warn(`[db] ${initWarning}`);
  }
}

export async function initDb() {
  if (!initPromise) {
    initPromise = initializeDb().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
  return getDbInfo();
}

export function getDbInfo() {
  const config = readDbConfig();
  return {
    engine: activeEngine,
    mode: config.mode,
    mongoConfigured: config.hasMongoUri,
    warning: initWarning,
  };
}

async function runWithStore(fileFn, mongoFn) {
  await initDb();
  if (activeEngine === "mongo" && activeStore) {
    return mongoFn(activeStore);
  }
  return fileFn();
}

export const toHistoryPayload = fileHistory.toHistoryPayload;

export async function listConversationSummaries(userId = "guest") {
  return runWithStore(
    () => fileHistory.listConversationSummaries(userId),
    (store) => store.listConversationSummaries(userId),
  );
}

export async function getConversationById(conversationId, userId = "guest") {
  return runWithStore(
    () => fileHistory.getConversationById(conversationId, userId),
    (store) => store.getConversationById(conversationId, userId),
  );
}

export async function createConversation(title = "New chat", userId = "guest") {
  return runWithStore(
    () => fileHistory.createConversation(title, userId),
    (store) => store.createConversation(title, userId),
  );
}

export async function ensureConversation(conversationId, userId = "guest") {
  return runWithStore(
    () => fileHistory.ensureConversation(conversationId, userId),
    (store) => store.ensureConversation(conversationId, userId),
  );
}

export async function deleteConversation(conversationId, userId = "guest") {
  return runWithStore(
    () => fileHistory.deleteConversation(conversationId, userId),
    (store) => store.deleteConversation(conversationId, userId),
  );
}

export async function saveConversationTurn(payload) {
  return runWithStore(
    () => fileHistory.saveConversationTurn(payload),
    (store) => store.saveConversationTurn(payload),
  );
}

export async function countUserMessagesForDate(userId = "guest", dateKey = "") {
  return runWithStore(
    () => fileHistory.countUserMessagesForDate(userId, dateKey),
    (store) => store.countUserMessagesForDate(userId, dateKey),
  );
}

export async function getConversationStats(userId = "") {
  return runWithStore(
    () => fileHistory.getConversationStats(userId),
    (store) => store.getConversationStats(userId),
  );
}

export async function upsertGoogleUser(payload) {
  return runWithStore(
    () => fileUsers.upsertGoogleUser(payload),
    (store) => store.upsertGoogleUser(payload),
  );
}

export async function upsertLocalUser(payload) {
  return runWithStore(
    () => fileUsers.upsertLocalUser(payload),
    (store) => store.upsertLocalUser(payload),
  );
}

export async function getUserByEmail(email) {
  return runWithStore(
    () => fileUsers.getUserByEmail(email),
    (store) => store.getUserByEmail(email),
  );
}

export async function getUserAuthByEmail(email) {
  return runWithStore(
    () => fileUsers.getUserAuthByEmail(email),
    (store) => store.getUserAuthByEmail(email),
  );
}

export async function createLocalUser(payload) {
  return runWithStore(
    () => fileUsers.createLocalUser(payload),
    (store) => store.createLocalUser(payload),
  );
}

export async function updateUserPassword(payload) {
  return runWithStore(
    () => fileUsers.updateUserPassword(payload),
    (store) => store.updateUserPassword(payload),
  );
}

export async function storePasswordResetToken(payload) {
  return runWithStore(
    () => fileUsers.storePasswordResetToken(payload),
    (store) => store.storePasswordResetToken(payload),
  );
}

export async function resetUserPasswordWithToken(payload) {
  return runWithStore(
    () => fileUsers.resetUserPasswordWithToken(payload),
    (store) => store.resetUserPasswordWithToken(payload),
  );
}

export async function createSession(userId) {
  return runWithStore(
    () => fileUsers.createSession(userId),
    (store) => store.createSession(userId),
  );
}

export async function validateSessionToken(token) {
  return runWithStore(
    () => fileUsers.validateSessionToken(token),
    (store) => store.validateSessionToken(token),
  );
}

export async function revokeSessionToken(token) {
  return runWithStore(
    () => fileUsers.revokeSessionToken(token),
    (store) => store.revokeSessionToken(token),
  );
}

export async function getUserById(userId) {
  return runWithStore(
    () => fileUsers.getUserById(userId),
    (store) => store.getUserById(userId),
  );
}

export async function updateUserProfile(payload) {
  return runWithStore(
    () => fileUsers.updateUserProfile(payload),
    (store) => store.updateUserProfile(payload),
  );
}

export async function listUsers() {
  return runWithStore(
    () => fileUsers.listUsers(),
    (store) => store.listUsers(),
  );
}

export async function getUserMemory(userId) {
  return runWithStore(
    () => fileUsers.getUserMemory(userId),
    (store) => store.getUserMemory(userId),
  );
}

export async function upsertUserMemory(userId, payload) {
  return runWithStore(
    () => fileUsers.upsertUserMemory(userId, payload),
    (store) => store.upsertUserMemory(userId, payload),
  );
}

export async function hasUserMemory(userId) {
  return runWithStore(
    () => fileUsers.hasUserMemory(userId),
    (store) => store.hasUserMemory(userId),
  );
}

export async function getUserSignupStats(days = 14) {
  return runWithStore(
    () => fileUsers.getUserSignupStats(days),
    (store) => store.getUserSignupStats(days),
  );
}

export async function getModelUsageStats() {
  return runWithStore(
    () => fileHistory.getModelUsageStats(),
    (store) => store.getModelUsageStats(),
  );
}

export async function submitFeedback(payload) {
  return runWithStore(
    () => fileFeedback.submitFeedback(payload),
    (store) => store.submitFeedback(payload),
  );
}

export async function listFeedback(params = {}) {
  return runWithStore(
    () => fileFeedback.listFeedback(params),
    (store) => store.listFeedback(params),
  );
}

export async function setFeedbackFeatured(payload) {
  return runWithStore(
    () => fileFeedback.setFeedbackFeatured(payload),
    (store) => store.setFeedbackFeatured(payload),
  );
}
