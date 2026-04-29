import express from "express";
import { 
  initDb, 
  getDbInfo, 
  getUserSignupStats 
} from "../db-adapter.js";
import { 
  getLunaSettings 
} from "../services/settings-service.js";
import { 
  buildProviders 
} from "../services/provider-service.js";
import { 
  extractProviderError 
} from "../utils/common.js";
import { 
  listActiveAnnouncements 
} from "../admin-settings.js";
import { 
  DEFAULT_PRO_MONTHLY_PRICE_INR, 
  DEFAULT_UPI_ID 
} from "../config.js";

const router = express.Router();

router.get("/", (_req, res) => {
  return res.status(200).json({ ok: true, service: "luna-backend" });
});

router.get("/health", async (_req, res) => {
  try {
    await initDb();
    return res.status(200).json({ ok: true, db: getDbInfo() });
  } catch (error) {
    return res.status(200).json({ ok: false, error: error.message, db: getDbInfo() });
  }
});

router.get("/api/providers/status", (_req, res) => {
  const providers = buildProviders([], false).map((p) => ({ llm: p.llm, configured: p.enabled }));
  res.json({ providers });
});

router.get("/api/metrics/users", async (req, res) => {
  try {
    const rawDays = Number(req.query?.days || 14);
    const days = Number.isFinite(rawDays) ? Math.max(1, Math.min(60, rawDays)) : 14;
    const stats = await getUserSignupStats(days);
    return res.json({ ok: true, ...stats, days });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(500).json({ error: n.providerMessage });
  }
});

router.get("/api/branding", async (_req, res) => {
  try {
    const settings = await getLunaSettings();
    return res.json({
      branding: {
        logoUrl: settings.logoUrl || "",
      },
    });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

router.get("/api/announcements", async (_req, res) => {
  try {
    const announcements = await listActiveAnnouncements({
      defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR,
      defaultUpiId: DEFAULT_UPI_ID,
    });

    return res.json({ announcements });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

export default router;
