import express from "express";
import { 
  listUsers, 
  getConversationStats, 
  getModelUsageStats, 
  getDbInfo, 
  setFeedbackFeatured,
  countUserMessagesForDate
} from "../db-adapter.js";
import { 
  getBillingStats, 
  listMemberships, 
  listUpgradeRequests, 
  reviewUpgradeRequest, 
  setMembershipPlan 
} from "../pro-db.js";
import { 
  listAnnouncements, 
  upsertAnnouncement, 
  updateAnnouncement, 
  removeAnnouncement, 
  updateProMonthlyPrice, 
  updateProSystemPrompt, 
  updateBrandingSettings, 
  getAdminSettings, 
  upsertCharacter, 
  updateCharacter, 
  removeCharacter, 
  upsertReferralCode, 
  updateReferralCode, 
  removeReferralCode, 
  listActiveAnnouncements 
} from "../admin-settings.js";
import { 
  getLunaSettings, 
  normalizeCharacterCatalog 
} from "../services/settings-service.js";
import { 
  buildProviders 
} from "../services/provider-service.js";
import { 
  getDiagnosticsSnapshot 
} from "../observability.js";
import { 
  extractProviderError, 
  isoDateKey 
} from "../utils/common.js";
import { 
  requireAdmin 
} from "../middleware/auth-guard.js";
import { 
  DEFAULT_PRO_MONTHLY_PRICE_INR, 
  DEFAULT_UPI_ID,
  FREE_DAILY_LIMIT
} from "../config.js";
import { listFeedback } from "../db-adapter.js";

const router = express.Router();

router.get("/overview", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

      const [users, conversationStats, billingStats, memberships, pendingRequests] = await Promise.all([
        listUsers(),
        getConversationStats(),
        getBillingStats(),
        listMemberships(),
        listUpgradeRequests({ status: "pending", limit: 500 }),
      ]);

      const modelUsage = await getModelUsageStats();
      const providerStatus = buildProviders([], false).map((provider) => ({
        llm: provider.llm,
        configured: provider.enabled,
      }));

    const proUsers = memberships.filter((item) => item.plan === "pro").length;

    return res.json({
      ok: true,
      admin: {
        email: admin.user.email,
        name: admin.user.name,
      },
        stats: {
          users: users.length,
          proUsers,
          freeUsers: Math.max(0, users.length - proUsers),
          conversations: conversationStats.totalConversations,
          totalMessages: conversationStats.totalMessages,
          totalUserMessages: conversationStats.totalUserMessages,
          modelUsage,
          providerStatus,
          revenueInr: billingStats.revenueInr,
          pendingUpgradeRequests: pendingRequests.length,
          approvedUpgradeRequests: billingStats.approvedRequests,
        },
      });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

router.get("/diagnostics", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const providerStatus = buildProviders([], false).map((provider) => ({
      llm: provider.llm,
      configured: provider.enabled,
    }));
    const diagnostics = getDiagnosticsSnapshot({
      db: getDbInfo(),
      providerStatus,
    });

    return res.json({ ok: true, diagnostics });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

router.get("/announcements", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const announcements = await listAnnouncements({
      defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR,
      defaultUpiId: DEFAULT_UPI_ID,
    });

    return res.json({ announcements });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

router.post("/announcements", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const payload = {
      title: req.body?.title,
      message: req.body?.message,
      variant: req.body?.variant,
      startAt: req.body?.startAt,
      endAt: req.body?.endAt,
      active: req.body?.active,
      ctaLabel: req.body?.ctaLabel,
      ctaHref: req.body?.ctaHref,
      adminUserId: admin.user.id,
    };

    const announcement = await upsertAnnouncement(payload, {
      defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR,
      defaultUpiId: DEFAULT_UPI_ID,
    });

    return res.json({ ok: true, announcement });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.patch("/announcements/:id", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const announcement = await updateAnnouncement(
      {
        id: req.params.id,
        title: req.body?.title,
        message: req.body?.message,
        variant: req.body?.variant,
        startAt: req.body?.startAt,
        endAt: req.body?.endAt,
        active: req.body?.active,
        ctaLabel: req.body?.ctaLabel,
        ctaHref: req.body?.ctaHref,
        adminUserId: admin.user.id,
      },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    return res.json({ ok: true, announcement });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.delete("/announcements/:id", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    await removeAnnouncement(
      { id: req.params.id, adminUserId: admin.user.id },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    return res.json({ ok: true });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.get("/settings", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const settings = await getLunaSettings();
    return res.json({ settings });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

router.post("/settings/pro-price", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const amountInr = Number(req.body?.amountInr);
    if (!Number.isFinite(amountInr) || amountInr <= 0) {
      return res.status(400).json({ error: "amountInr must be a positive number" });
    }

    const settings = await updateProMonthlyPrice(
      { amountInr, adminUserId: admin.user.id },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    return res.json({ ok: true, settings });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.post("/settings/pro-prompt", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const proSystemPrompt = typeof req.body?.proSystemPrompt === "string" ? req.body.proSystemPrompt : "";
    const settings = await updateProSystemPrompt(
      { proSystemPrompt, adminUserId: admin.user.id },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    return res.json({ ok: true, settings });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.post("/settings/branding", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const settings = await updateBrandingSettings(
      {
        logoUrl: req.body?.logoUrl,
        adminUserId: admin.user.id,
      },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    return res.json({ ok: true, settings });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.get("/characters", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const settings = await getAdminSettings({
      defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR,
      defaultUpiId: DEFAULT_UPI_ID,
    });
    const characters = normalizeCharacterCatalog(settings?.characters);
    return res.json({ characters });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(500).json({ error: error.message || n.providerMessage });
  }
});

router.post("/characters", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const character = await upsertCharacter(
      {
        name: req.body?.name,
        tagline: req.body?.tagline,
        description: req.body?.description,
        imageUrl: req.body?.imageUrl,
        accentStart: req.body?.accentStart,
        accentEnd: req.body?.accentEnd,
        prompt: req.body?.prompt,
        starterPrompts: req.body?.starterPrompts,
        access: req.body?.access,
        active: req.body?.active,
        sortOrder: req.body?.sortOrder,
        adminUserId: admin.user.id,
      },
      {
        defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR,
        defaultUpiId: DEFAULT_UPI_ID,
      },
    );
    return res.json({ ok: true, character });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.patch("/characters/:id", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const character = await updateCharacter(
      {
        id: req.params.id,
        name: req.body?.name,
        tagline: req.body?.tagline,
        description: req.body?.description,
        imageUrl: req.body?.imageUrl,
        accentStart: req.body?.accentStart,
        accentEnd: req.body?.accentEnd,
        prompt: req.body?.prompt,
        starterPrompts: req.body?.starterPrompts,
        access: req.body?.access,
        active: req.body?.active,
        sortOrder: req.body?.sortOrder,
        adminUserId: admin.user.id,
      },
      {
        defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR,
        defaultUpiId: DEFAULT_UPI_ID,
      },
    );
    return res.json({ ok: true, character });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.delete("/characters/:id", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    await removeCharacter(
      { id: req.params.id, adminUserId: admin.user.id },
      {
        defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR,
        defaultUpiId: DEFAULT_UPI_ID,
      },
    );
    return res.json({ ok: true });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.post("/referrals", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const code = typeof req.body?.code === "string" ? req.body.code : "";
    const discountPercent = req.body?.discountPercent;
    const expiresAt = req.body?.expiresAt;
    const active = req.body?.active;

    const settings = await upsertReferralCode(
      { code, discountPercent, expiresAt, active, adminUserId: admin.user.id },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    return res.json({ ok: true, settings });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.patch("/referrals/:code", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const code = req.params.code;
    const discountPercent = req.body?.discountPercent;
    const expiresAt = req.body?.expiresAt;
    const active = req.body?.active;

    const settings = await updateReferralCode(
      { code, discountPercent, expiresAt, active, adminUserId: admin.user.id },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    return res.json({ ok: true, settings });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.delete("/referrals/:code", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const code = req.params.code;
    const settings = await removeReferralCode(
      { code, adminUserId: admin.user.id },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    return res.json({ ok: true, settings });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.get("/feedback", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const limit = Number(req.query?.limit || 200);
    const feedback = await listFeedback({ featuredOnly: false, limit });
    return res.json({ feedback });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

router.post("/feedback/:id/featured", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const featured = [true, "true", 1, "1", "yes"].includes(req.body?.featured);
    const feedback = await setFeedbackFeatured({
      feedbackId: req.params.id,
      featured,
      adminUserId: admin.user.id,
    });

    return res.json({ ok: true, feedback });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.get("/users", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const [users, memberships] = await Promise.all([listUsers(), listMemberships()]);
    const membershipByUser = new Map(memberships.map((item) => [item.userId, item]));
    const today = isoDateKey();

    const enriched = await Promise.all(
      users.map(async (user) => {
        const membership = membershipByUser.get(user.id);
        const plan = membership?.plan === "pro" ? "pro" : "free";
        const usedToday = await countUserMessagesForDate(user.id, today);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          plan,
          activatedAt: membership?.activatedAt || "",
          usageToday: usedToday,
          dailyLimit: plan === "pro" ? null : FREE_DAILY_LIMIT,
          remainingToday: plan === "pro" ? null : Math.max(0, FREE_DAILY_LIMIT - usedToday),
        };
      }),
    );

    return res.json({ users: enriched });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

router.get("/upgrade-requests", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const status = (req.query?.status || "").trim().toLowerCase();
    const requests = await listUpgradeRequests({ status, limit: 500 });
    return res.json({ requests });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

router.post("/upgrade-requests/:id/status", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const status = (req.body?.status || "").trim().toLowerCase();
    if (status !== "approved" && status !== "rejected") {
      return res.status(400).json({ error: "status must be approved or rejected" });
    }

    const note = typeof req.body?.note === "string" ? req.body.note : "";

    const request = await reviewUpgradeRequest({
      requestId: req.params.id,
      status,
      note,
      adminUserId: admin.user.id,
    });

    return res.json({ ok: true, request });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.post("/users/:userId/plan", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const userId = typeof req.params?.userId === "string" ? req.params.userId.trim() : "";
    const plan = req.body?.plan === "pro" ? "pro" : "free";
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const users = await listUsers();
    const user = users.find((item) => item.id === userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const membership = await setMembershipPlan({
      userId,
      plan,
      adminUserId: admin.user.id,
      email: user.email,
      name: user.name,
    });

    return res.json({ ok: true, membership });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

export default router;
