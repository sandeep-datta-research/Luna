import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
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

function normalizeCode(value) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 32);
}

function toPositiveAmount(value, fallback = 90) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return Math.max(1, Math.round(fallback * 100) / 100);
  return Math.round(n * 100) / 100;
}

function toPercent(value, fallback = 0, max = 90) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return Math.max(0, Math.min(max, fallback));
  return Math.max(0, Math.min(max, Math.round(n * 100) / 100));
}

function toUsageCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function toIsoDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function sanitizeReferralCode(raw, defaults) {
  const code = normalizeCode(raw?.code);
  if (!code) return null;

  return {
    id: normalizeText(raw?.id) || `ref-${randomUUID()}`,
    code,
    discountPercent: toPercent(raw?.discountPercent, defaults.defaultReferralDiscountPercent),
    expiresAt: toIsoDate(raw?.expiresAt),
    active: raw?.active !== false,
    usageCount: toUsageCount(raw?.usageCount),
    lastUsedAt: normalizeText(raw?.lastUsedAt),
    createdAt: normalizeText(raw?.createdAt) || nowIso(),
    createdBy: normalizeText(raw?.createdBy),
    updatedAt: normalizeText(raw?.updatedAt) || nowIso(),
    updatedBy: normalizeText(raw?.updatedBy),
  };
}

function sanitizeReferralCodes(rawList, defaults) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((item) => sanitizeReferralCode(item, defaults))
    .filter(Boolean);
}

function normalizeVariant(value) {
  const raw = normalizeText(value).toLowerCase();
  if (["info", "event", "discount"].includes(raw)) return raw;
  return "info";
}

function sanitizeAnnouncement(raw) {
  const title = normalizeText(raw?.title).slice(0, 120);
  const message = normalizeText(raw?.message).slice(0, 500);
  if (!title || !message) return null;

  return {
    id: normalizeText(raw?.id) || `ann-${randomUUID()}`,
    title,
    message,
    variant: normalizeVariant(raw?.variant),
    startAt: toIsoDate(raw?.startAt) || nowIso(),
    endAt: toIsoDate(raw?.endAt),
    active: raw?.active !== false,
    ctaLabel: normalizeText(raw?.ctaLabel).slice(0, 40),
    ctaHref: normalizeText(raw?.ctaHref).slice(0, 200),
    createdAt: normalizeText(raw?.createdAt) || nowIso(),
    createdBy: normalizeText(raw?.createdBy),
    updatedAt: normalizeText(raw?.updatedAt) || nowIso(),
    updatedBy: normalizeText(raw?.updatedBy),
  };
}

function sanitizeAnnouncements(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(sanitizeAnnouncement).filter(Boolean);
}

function normalizeCharacterAccess(value) {
  const raw = normalizeText(value).toLowerCase();
  return raw === "pro" ? "pro" : "free";
}

function sanitizeCharacter(raw) {
  const name = normalizeText(raw?.name).slice(0, 60);
  const prompt = normalizeText(raw?.prompt).slice(0, 5000);
  if (!name || !prompt) return null;

  return {
    id: normalizeText(raw?.id) || `char-${randomUUID()}`,
    name,
    tagline: normalizeText(raw?.tagline).slice(0, 80),
    description: normalizeText(raw?.description).slice(0, 220),
    imageUrl: normalizeText(raw?.imageUrl).slice(0, 2_000_000),
    accentStart: normalizeText(raw?.accentStart).slice(0, 32) || "#7fc7ba",
    accentEnd: normalizeText(raw?.accentEnd).slice(0, 32) || "#0f1f24",
    prompt,
    access: normalizeCharacterAccess(raw?.access),
    active: raw?.active !== false,
    sortOrder: Number.isFinite(Number(raw?.sortOrder)) ? Number(raw.sortOrder) : 0,
    usageCount: Number.isFinite(Number(raw?.usageCount)) ? Number(raw.usageCount) : 0,
    usageCountFree: Number.isFinite(Number(raw?.usageCountFree)) ? Number(raw.usageCountFree) : 0,
    usageCountPro: Number.isFinite(Number(raw?.usageCountPro)) ? Number(raw.usageCountPro) : 0,
    lastUsedAt: normalizeText(raw?.lastUsedAt),
    createdAt: normalizeText(raw?.createdAt) || nowIso(),
    createdBy: normalizeText(raw?.createdBy),
    updatedAt: normalizeText(raw?.updatedAt) || nowIso(),
    updatedBy: normalizeText(raw?.updatedBy),
  };
}

function sanitizeCharacters(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((item) => sanitizeCharacter(item))
    .filter(Boolean)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || a.name.localeCompare(b.name));
}

function sanitizeSettings(raw, defaults) {
  return {
    proMonthlyPriceInr: toPositiveAmount(raw?.proMonthlyPriceInr, defaults.defaultMonthlyPriceInr),
    proSystemPrompt: normalizeText(raw?.proSystemPrompt).slice(0, 5000),
    upiId: normalizeText(raw?.upiId) || defaults.defaultUpiId,
    referralCodes: sanitizeReferralCodes(raw?.referralCodes, defaults),
    announcements: sanitizeAnnouncements(raw?.announcements),
    characters: sanitizeCharacters(raw?.characters),
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
    defaultReferralDiscountPercent: toPercent(overrides.defaultReferralDiscountPercent, 0),
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

export async function listCharacters(overrides = {}) {
  const settings = await getAdminSettings(overrides);
  return Array.isArray(settings?.characters) ? clone(settings.characters) : [];
}

export async function listActiveCharacters(overrides = {}) {
  const items = await listCharacters(overrides);
  return items.filter((item) => item.active !== false);
}

export async function upsertCharacter(
  { id = "", name, tagline, description, imageUrl, accentStart, accentEnd, prompt, access = "free", active = true, sortOrder = 0, adminUserId = "" },
  overrides = {},
) {
  const defaults = getDefaults(overrides);

  return mutate(defaults, (db) => {
    const now = nowIso();
    const list = Array.isArray(db.settings.characters) ? db.settings.characters : [];
    const safeId = normalizeText(id);
    const incoming = sanitizeCharacter({
      id: safeId || `char-${randomUUID()}`,
      name,
      tagline,
      description,
      imageUrl,
      accentStart,
      accentEnd,
      prompt,
      access,
      active,
      sortOrder,
      createdAt: now,
      createdBy: normalizeText(adminUserId),
      updatedAt: now,
      updatedBy: normalizeText(adminUserId),
    });

    if (!incoming) throw new Error("Character name and prompt are required");

    const existingIndex = list.findIndex((item) => item.id === incoming.id);
    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        ...incoming,
        createdAt: list[existingIndex].createdAt || now,
        createdBy: list[existingIndex].createdBy || normalizeText(adminUserId),
        updatedAt: now,
        updatedBy: normalizeText(adminUserId),
      };
    } else {
      list.push(incoming);
    }

    db.settings.characters = sanitizeCharacters(list);
    db.settings.updatedAt = now;
    db.settings.updatedBy = normalizeText(adminUserId);
    return clone(incoming);
  });
}

export async function updateCharacter(
  { id, name, tagline, description, imageUrl, accentStart, accentEnd, prompt, access, active, sortOrder, adminUserId = "" },
  overrides = {},
) {
  const defaults = getDefaults(overrides);
  const safeId = normalizeText(id);
  if (!safeId) throw new Error("Character id is required");

  return mutate(defaults, (db) => {
    const list = Array.isArray(db.settings.characters) ? db.settings.characters : [];
    const existing = list.find((item) => item.id === safeId);
    if (!existing) throw new Error("Character not found");

    const now = nowIso();
    if (name !== undefined) existing.name = normalizeText(name).slice(0, 60);
    if (tagline !== undefined) existing.tagline = normalizeText(tagline).slice(0, 80);
    if (description !== undefined) existing.description = normalizeText(description).slice(0, 220);
    if (imageUrl !== undefined) existing.imageUrl = normalizeText(imageUrl).slice(0, 2_000_000);
    if (accentStart !== undefined) existing.accentStart = normalizeText(accentStart).slice(0, 32) || existing.accentStart;
    if (accentEnd !== undefined) existing.accentEnd = normalizeText(accentEnd).slice(0, 32) || existing.accentEnd;
    if (prompt !== undefined) existing.prompt = normalizeText(prompt).slice(0, 5000);
    if (access !== undefined) existing.access = normalizeCharacterAccess(access);
    if (active !== undefined) existing.active = Boolean(active);
    if (sortOrder !== undefined) existing.sortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : existing.sortOrder;
    if (!existing.name || !existing.prompt) throw new Error("Character name and prompt are required");

    existing.updatedAt = now;
    existing.updatedBy = normalizeText(adminUserId);
    db.settings.characters = sanitizeCharacters(list);
    db.settings.updatedAt = now;
    db.settings.updatedBy = normalizeText(adminUserId);
    return clone(existing);
  });
}

export async function removeCharacter({ id, adminUserId = "" }, overrides = {}) {
  const defaults = getDefaults(overrides);
  const safeId = normalizeText(id);
  if (!safeId) throw new Error("Character id is required");

  return mutate(defaults, (db) => {
    const list = Array.isArray(db.settings.characters) ? db.settings.characters : [];
    const nextList = list.filter((item) => item.id !== safeId);
    if (nextList.length === list.length) throw new Error("Character not found");

    db.settings.characters = sanitizeCharacters(nextList);
    db.settings.updatedAt = nowIso();
    db.settings.updatedBy = normalizeText(adminUserId);
    return true;
  });
}

export async function incrementCharacterUsage({ id, plan = "free", adminUserId = "system" }, overrides = {}) {
  const defaults = getDefaults(overrides);
  const safeId = normalizeText(id);
  if (!safeId) return null;

  return mutate(defaults, (db) => {
    const list = Array.isArray(db.settings.characters) ? db.settings.characters : [];
    const existing = list.find((item) => item.id === safeId);
    if (!existing) return null;

    const now = nowIso();
    existing.usageCount = Number(existing.usageCount || 0) + 1;
    if (plan === "pro") {
      existing.usageCountPro = Number(existing.usageCountPro || 0) + 1;
    } else {
      existing.usageCountFree = Number(existing.usageCountFree || 0) + 1;
    }
    existing.lastUsedAt = now;
    existing.updatedAt = now;
    existing.updatedBy = normalizeText(adminUserId) || "system";

    db.settings.characters = sanitizeCharacters(list);
    db.settings.updatedAt = now;
    db.settings.updatedBy = normalizeText(adminUserId) || "system";
    return clone(existing);
  });
}

function isReferralExpired(referral) {
  if (!referral?.expiresAt) return false;
  const expiresTime = Date.parse(referral.expiresAt);
  if (Number.isNaN(expiresTime)) return true;
  return Date.now() > expiresTime;
}

export async function upsertReferralCode(
  { code, discountPercent, expiresAt, active = true, adminUserId = "" },
  overrides = {},
) {
  const defaults = getDefaults(overrides);
  const safeCode = normalizeCode(code);
  if (!safeCode) throw new Error("Referral code is required");

  const percent = toPercent(discountPercent, defaults.defaultReferralDiscountPercent);
  if (percent <= 0 || percent > 90) throw new Error("discountPercent must be between 1 and 90");

  const expiresIso = toIsoDate(expiresAt);
  if (!expiresIso) throw new Error("expiresAt is required");

  return mutate(defaults, (db) => {
    const now = nowIso();
    const list = Array.isArray(db.settings.referralCodes) ? db.settings.referralCodes : [];
    const existing = list.find((item) => normalizeCode(item.code) === safeCode);

    if (existing) {
      existing.discountPercent = percent;
      existing.expiresAt = expiresIso;
      existing.active = Boolean(active);
      existing.updatedAt = now;
      existing.updatedBy = normalizeText(adminUserId);
    } else {
      list.unshift(
        sanitizeReferralCode(
          {
            id: `ref-${randomUUID()}`,
            code: safeCode,
            discountPercent: percent,
            expiresAt: expiresIso,
            active: Boolean(active),
            usageCount: 0,
            lastUsedAt: "",
            createdAt: now,
            createdBy: normalizeText(adminUserId),
            updatedAt: now,
            updatedBy: normalizeText(adminUserId),
          },
          defaults,
        ),
      );
    }

    db.settings.referralCodes = list.filter(Boolean);
    db.settings.updatedAt = now;
    db.settings.updatedBy = normalizeText(adminUserId);
    return clone(db.settings);
  });
}

export async function updateReferralCode(
  { code, discountPercent, expiresAt, active, adminUserId = "" },
  overrides = {},
) {
  const defaults = getDefaults(overrides);
  const safeCode = normalizeCode(code);
  if (!safeCode) throw new Error("Referral code is required");

  return mutate(defaults, (db) => {
    const now = nowIso();
    const list = Array.isArray(db.settings.referralCodes) ? db.settings.referralCodes : [];
    const existing = list.find((item) => normalizeCode(item.code) === safeCode);

    if (!existing) {
      throw new Error("Referral code not found");
    }

    if (discountPercent !== undefined) {
      const percent = toPercent(discountPercent, existing.discountPercent);
      if (percent <= 0 || percent > 90) throw new Error("discountPercent must be between 1 and 90");
      existing.discountPercent = percent;
    }

    if (expiresAt !== undefined) {
      const expiresIso = toIsoDate(expiresAt);
      if (!expiresIso) throw new Error("expiresAt is required");
      existing.expiresAt = expiresIso;
    }

    if (active !== undefined) {
      existing.active = Boolean(active);
    }

    existing.updatedAt = now;
    existing.updatedBy = normalizeText(adminUserId);
    db.settings.updatedAt = now;
    db.settings.updatedBy = normalizeText(adminUserId);
    db.settings.referralCodes = list;
    return clone(db.settings);
  });
}

export async function incrementReferralUsage({ code, adminUserId = "" }, overrides = {}) {
  const defaults = getDefaults(overrides);
  const safeCode = normalizeCode(code);
  if (!safeCode) return null;

  return mutate(defaults, (db) => {
    const now = nowIso();
    const list = Array.isArray(db.settings.referralCodes) ? db.settings.referralCodes : [];
    const existing = list.find((item) => normalizeCode(item.code) === safeCode);
    if (!existing) return null;

    existing.usageCount = toUsageCount(existing.usageCount) + 1;
    existing.lastUsedAt = now;
    existing.updatedAt = now;
    existing.updatedBy = normalizeText(adminUserId) || "system";

    db.settings.updatedAt = now;
    db.settings.updatedBy = normalizeText(adminUserId) || "system";
    db.settings.referralCodes = list;
    return clone(existing);
  });
}

export async function removeReferralCode({ code, adminUserId = "" }, overrides = {}) {
  const defaults = getDefaults(overrides);
  const safeCode = normalizeCode(code);
  if (!safeCode) throw new Error("Referral code is required");

  return mutate(defaults, (db) => {
    const now = nowIso();
    const list = Array.isArray(db.settings.referralCodes) ? db.settings.referralCodes : [];
    const nextList = list.filter((item) => normalizeCode(item.code) !== safeCode);

    if (nextList.length === list.length) {
      throw new Error("Referral code not found");
    }

    db.settings.referralCodes = nextList;
    db.settings.updatedAt = now;
    db.settings.updatedBy = normalizeText(adminUserId);
    return clone(db.settings);
  });
}

export async function validateReferralCode({ code, amountInr }, overrides = {}) {
  const defaults = getDefaults(overrides);
  const safeCode = normalizeCode(code);
  if (!safeCode) {
    return { ok: false, message: "Referral code is required" };
  }

  const settings = await getAdminSettings(defaults);
  const referrals = Array.isArray(settings?.referralCodes) ? settings.referralCodes : [];
  const referral = referrals.find((item) => normalizeCode(item.code) === safeCode);

  if (!referral) {
    return { ok: false, message: "Referral code not found" };
  }
  if (!referral.active) {
    return { ok: false, message: "Referral code is inactive" };
  }
  if (isReferralExpired(referral)) {
    return { ok: false, message: "Referral code expired" };
  }

  const baseAmountInr = toPositiveAmount(amountInr, defaults.defaultMonthlyPriceInr);
  const discountPercent = toPercent(referral.discountPercent, 0);
  if (discountPercent <= 0) {
    return { ok: false, message: "Referral code has no discount" };
  }

  const discountValue = Math.round(baseAmountInr * (discountPercent / 100) * 100) / 100;
  const finalAmountInr = Math.max(1, Math.round((baseAmountInr - discountValue) * 100) / 100);

  return {
    ok: true,
    referral: clone(referral),
    code: referral.code,
    discountPercent,
    baseAmountInr,
    finalAmountInr,
    expiresAt: referral.expiresAt,
  };
}

function isAnnouncementActive(announcement, now = Date.now()) {
  if (!announcement?.active) return false;
  const start = announcement.startAt ? Date.parse(announcement.startAt) : 0;
  const end = announcement.endAt ? Date.parse(announcement.endAt) : 0;
  if (Number.isFinite(start) && start && now < start) return false;
  if (Number.isFinite(end) && end && now > end) return false;
  return true;
}

export async function listAnnouncements(overrides = {}) {
  const settings = await getAdminSettings(overrides);
  return Array.isArray(settings?.announcements) ? clone(settings.announcements) : [];
}

export async function listActiveAnnouncements(overrides = {}) {
  const items = await listAnnouncements(overrides);
  const now = Date.now();
  return items.filter((item) => isAnnouncementActive(item, now));
}

export async function upsertAnnouncement(
  { id = "", title, message, variant, startAt, endAt, active = true, ctaLabel, ctaHref, adminUserId = "" },
  overrides = {},
) {
  const defaults = getDefaults(overrides);

  return mutate(defaults, (db) => {
    const now = nowIso();
    const list = Array.isArray(db.settings.announcements) ? db.settings.announcements : [];
    const safeId = normalizeText(id);
    const incoming = sanitizeAnnouncement({
      id: safeId || `ann-${randomUUID()}`,
      title,
      message,
      variant,
      startAt: startAt || now,
      endAt: endAt || "",
      active,
      ctaLabel,
      ctaHref,
      createdAt: now,
      createdBy: normalizeText(adminUserId),
      updatedAt: now,
      updatedBy: normalizeText(adminUserId),
    });

    if (!incoming) throw new Error("Announcement title and message are required");

    const existingIndex = list.findIndex((item) => item.id === incoming.id);
    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        ...incoming,
        createdAt: list[existingIndex].createdAt || now,
        createdBy: list[existingIndex].createdBy || normalizeText(adminUserId),
        updatedAt: now,
        updatedBy: normalizeText(adminUserId),
      };
    } else {
      list.unshift(incoming);
    }

    db.settings.announcements = list;
    db.settings.updatedAt = now;
    db.settings.updatedBy = normalizeText(adminUserId);
    return clone(incoming);
  });
}

export async function updateAnnouncement(
  { id, title, message, variant, startAt, endAt, active, ctaLabel, ctaHref, adminUserId = "" },
  overrides = {},
) {
  const defaults = getDefaults(overrides);
  const safeId = normalizeText(id);
  if (!safeId) throw new Error("Announcement id is required");

  return mutate(defaults, (db) => {
    const list = Array.isArray(db.settings.announcements) ? db.settings.announcements : [];
    const existing = list.find((item) => item.id === safeId);
    if (!existing) throw new Error("Announcement not found");

    const now = nowIso();
    if (title !== undefined) existing.title = normalizeText(title).slice(0, 120);
    if (message !== undefined) existing.message = normalizeText(message).slice(0, 500);
    if (variant !== undefined) existing.variant = normalizeVariant(variant);
    if (startAt !== undefined) existing.startAt = toIsoDate(startAt) || existing.startAt;
    if (endAt !== undefined) existing.endAt = toIsoDate(endAt) || "";
    if (active !== undefined) existing.active = Boolean(active);
    if (ctaLabel !== undefined) existing.ctaLabel = normalizeText(ctaLabel).slice(0, 40);
    if (ctaHref !== undefined) existing.ctaHref = normalizeText(ctaHref).slice(0, 200);

    existing.updatedAt = now;
    existing.updatedBy = normalizeText(adminUserId);

    db.settings.announcements = list;
    db.settings.updatedAt = now;
    db.settings.updatedBy = normalizeText(adminUserId);
    return clone(existing);
  });
}

export async function removeAnnouncement({ id, adminUserId = "" }, overrides = {}) {
  const defaults = getDefaults(overrides);
  const safeId = normalizeText(id);
  if (!safeId) throw new Error("Announcement id is required");

  return mutate(defaults, (db) => {
    const list = Array.isArray(db.settings.announcements) ? db.settings.announcements : [];
    const nextList = list.filter((item) => item.id !== safeId);
    if (nextList.length === list.length) throw new Error("Announcement not found");

    db.settings.announcements = nextList;
    db.settings.updatedAt = nowIso();
    db.settings.updatedBy = normalizeText(adminUserId);
    return true;
  });
}
