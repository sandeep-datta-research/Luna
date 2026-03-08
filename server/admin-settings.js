import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const SETTINGS_FILE = path.join(DATA_DIR, "admin-settings.json");

let writeQueue = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toPositiveAmount(value, fallback = 90) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return Math.max(1, Math.round(fallback * 100) / 100);
  return Math.round(n * 100) / 100;
}

function sanitizeSettings(raw, defaults) {
  return {
    proMonthlyPriceInr: toPositiveAmount(raw?.proMonthlyPriceInr, defaults.defaultMonthlyPriceInr),
    proSystemPrompt: normalizeText(raw?.proSystemPrompt).slice(0, 5000),
    upiId: normalizeText(raw?.upiId) || defaults.defaultUpiId,
    updatedAt: normalizeText(raw?.updatedAt),
    updatedBy: normalizeText(raw?.updatedBy),
  };
}

function sanitizeDb(raw, defaults) {
  return {
    version: 1,
    settings: sanitizeSettings(raw?.settings || {}, defaults),
  };
}

async function ensureFile(defaults) {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(SETTINGS_FILE);
  } catch {
    const initial = sanitizeDb({}, defaults);
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readDb(defaults) {
  await ensureFile(defaults);
  const raw = await fs.readFile(SETTINGS_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return sanitizeDb(parsed, defaults);
  } catch {
    return sanitizeDb({}, defaults);
  }
}

async function writeDb(db, defaults) {
  await ensureFile(defaults);
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(sanitizeDb(db, defaults), null, 2), "utf8");
}

async function mutate(defaults, mutator) {
  writeQueue = writeQueue.then(async () => {
    const db = await readDb(defaults);
    const result = await mutator(db);
    await writeDb(db, defaults);
    return result;
  });

  return writeQueue;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getDefaults(overrides = {}) {
  return {
    defaultMonthlyPriceInr: toPositiveAmount(overrides.defaultMonthlyPriceInr, 90),
    defaultUpiId: normalizeText(overrides.defaultUpiId) || "9366183700@fam",
  };
}

export async function getAdminSettings(overrides = {}) {
  const defaults = getDefaults(overrides);
  const db = await readDb(defaults);
  return clone(db.settings);
}

export async function updateProMonthlyPrice({ amountInr, adminUserId = "" }, overrides = {}) {
  const defaults = getDefaults(overrides);

  return mutate(defaults, (db) => {
    db.settings.proMonthlyPriceInr = toPositiveAmount(amountInr, defaults.defaultMonthlyPriceInr);
    db.settings.updatedAt = nowIso();
    db.settings.updatedBy = normalizeText(adminUserId);
    return clone(db.settings);
  });
}

export async function updateProSystemPrompt({ proSystemPrompt, adminUserId = "" }, overrides = {}) {
  const defaults = getDefaults(overrides);

  return mutate(defaults, (db) => {
    const safePrompt = normalizeText(proSystemPrompt).slice(0, 5000);
    db.settings.proSystemPrompt = safePrompt;
    db.settings.updatedAt = nowIso();
    db.settings.updatedBy = normalizeText(adminUserId);
    return clone(db.settings);
  });
}