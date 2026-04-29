import { getAdminSettings } from "../admin-settings.js";
import { 
  DEFAULT_PRO_MONTHLY_PRICE_INR, 
  DEFAULT_UPI_ID, 
  DEFAULT_CHARACTER_PROFILE 
} from "../config.js";
import { sanitizePromptText, sanitizeLogoUrl } from "../utils/common.js";

export function normalizeCharacterCatalog(items = []) {
  const list = Array.isArray(items) ? items : [];
  const normalized = list
    .map((item, index) => ({
      id: `${item?.id || ""}`.trim() || `char-${index + 1}`,
      name: `${item?.name || ""}`.trim() || `Character ${index + 1}`,
      tagline: `${item?.tagline || ""}`.trim(),
      description: `${item?.description || ""}`.trim(),
      imageUrl: `${item?.imageUrl || ""}`.trim(),
      accentStart: `${item?.accentStart || DEFAULT_CHARACTER_PROFILE.accentStart}`.trim() || DEFAULT_CHARACTER_PROFILE.accentStart,
      accentEnd: `${item?.accentEnd || DEFAULT_CHARACTER_PROFILE.accentEnd}`.trim() || DEFAULT_CHARACTER_PROFILE.accentEnd,
      prompt: `${item?.prompt || ""}`.trim(),
      starterPrompts: Array.isArray(item?.starterPrompts)
        ? item.starterPrompts.map((entry) => `${entry || ""}`.trim()).filter(Boolean).slice(0, 6)
        : DEFAULT_CHARACTER_PROFILE.starterPrompts,
      promptVersions: Array.isArray(item?.promptVersions)
        ? item.promptVersions
          .map((entry) => ({
            id: `${entry?.id || ""}`.trim(),
            prompt: `${entry?.prompt || ""}`.trim(),
            createdAt: `${entry?.createdAt || ""}`.trim(),
            createdBy: `${entry?.createdBy || ""}`.trim(),
          }))
          .filter((entry) => entry.prompt)
          .slice(0, 12)
        : [],
      access: `${item?.access || "free"}`.trim().toLowerCase() === "pro" ? "pro" : "free",
      active: item?.active !== false,
      sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index,
      usageCount: Number.isFinite(Number(item?.usageCount)) ? Number(item.usageCount) : 0,
      usageCountFree: Number.isFinite(Number(item?.usageCountFree)) ? Number(item.usageCountFree) : 0,
      usageCountPro: Number.isFinite(Number(item?.usageCountPro)) ? Number(item.usageCountPro) : 0,
      lastUsedAt: `${item?.lastUsedAt || ""}`.trim(),
    }))
    .filter((item) => item.name && item.prompt)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || a.name.localeCompare(b.name));

  return normalized.length > 0 ? normalized : [DEFAULT_CHARACTER_PROFILE];
}

export function resolveCharacterProfile(value, catalog = []) {
  const characters = normalizeCharacterCatalog(catalog);
  const key = `${value || ""}`.trim().toLowerCase();
  return characters.find((item) => item.id.toLowerCase() === key) || characters[0] || DEFAULT_CHARACTER_PROFILE;
}

export function getAvailableCharacterCatalog(catalog = [], membershipContext = null) {
  const characters = normalizeCharacterCatalog(catalog).filter((item) => item.active !== false);
  const isPro = membershipContext?.plan === "pro";
  return characters.filter((item) => item.access !== "pro" || isPro);
}

export async function getLunaSettings() {
  try {
    const settings = await getAdminSettings({
      defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR,
      defaultUpiId: DEFAULT_UPI_ID,
    });

    return {
      proMonthlyPriceInr: Number(settings?.proMonthlyPriceInr || DEFAULT_PRO_MONTHLY_PRICE_INR),
      upiId: `${settings?.upiId || DEFAULT_UPI_ID}`.trim() || DEFAULT_UPI_ID,
      proSystemPrompt: sanitizePromptText(settings?.proSystemPrompt),
      logoUrl: sanitizeLogoUrl(settings?.logoUrl),
      referralCodes: Array.isArray(settings?.referralCodes) ? settings.referralCodes : [],
      characters: normalizeCharacterCatalog(settings?.characters),
      updatedAt: settings?.updatedAt || "",
      updatedBy: settings?.updatedBy || "",
    };
  } catch {
    return {
      proMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR,
      upiId: DEFAULT_UPI_ID,
      proSystemPrompt: "",
      logoUrl: "",
      referralCodes: [],
      characters: [DEFAULT_CHARACTER_PROFILE],
      updatedAt: "",
      updatedBy: "",
    };
  }
}
