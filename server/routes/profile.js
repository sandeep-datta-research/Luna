import express from "express";
import { 
  getUserById, 
  updateUserProfile, 
  submitFeedback, 
  listFeedback 
} from "../db-adapter.js";
import { 
  listUpgradeRequests, 
  submitUpgradeRequest, 
  ensureMembershipUser 
} from "../pro-db.js";
import { 
  validateReferralCode, 
  incrementReferralUsage 
} from "../admin-settings.js";
import { 
  getLunaSettings 
} from "../services/settings-service.js";
import { 
  resolveRequestUser, 
  isAuthenticatedUserContext 
} from "../utils/auth-helper.js";
import { 
  resolveMembershipContext, 
  getUsageSummary 
} from "../services/membership.js";
import { 
  upsertUserMemory, 
  hasUserMemory 
} from "../services/user-memory.js";
import { 
  normalizeMemoryPayload 
} from "../services/user-memory.js"; // Wait, I put this in services/user-memory.js as a local function, need to export it or move it
import { 
  extractProviderError, 
  buildAccountSecurity 
} from "../utils/common.js";
import { requireAuthenticatedUser } from "../middleware/auth-guard.js";
import { 
  DEFAULT_UPI_ID, 
  DEFAULT_PRO_MONTHLY_PRICE_INR 
} from "../config.js";

const router = express.Router();

router.post("/onboarding", async (req, res) => {
  try {
    const auth = await requireAuthenticatedUser(req, res);
    if (!auth) return;
    const existingUser = await getUserById(auth.userId);
    if (!existingUser) {
      return res.status(403).json({ error: "User not found." });
    }

    const payload = req.body || {}; // Logic was inside upsertUserMemory
    const saved = await upsertUserMemory(auth.userId, payload, auth.user?.email);

    return res.json({ ok: true, memory: saved });
  } catch (error) {
    const normalized = extractProviderError(error);
    return res.status(error.status || normalized.status || 500).json({ error: error.message || normalized.providerMessage });
  }
});

router.get("/onboarding/status", async (req, res) => {
  try {
    const userContext = await resolveRequestUser(req, res);
    if (!isAuthenticatedUserContext(userContext)) {
      return res.json({ answered: false, guest: true });
    }

    const answered = await hasUserMemory(userContext.userId, userContext.user?.email);
    return res.json({ answered });
  } catch (error) {
    const normalized = extractProviderError(error);
    return res.status(error.status || normalized.status || 500).json({ error: error.message || normalized.providerMessage });
  }
});

router.get("/profile", async (req, res) => {
  try {
    const lunaSettings = await getLunaSettings();
    const userContext = await resolveRequestUser(req, res);
    const membershipContext = await resolveMembershipContext(userContext, lunaSettings);
    const usage = await getUsageSummary(userContext, membershipContext);

    const requests = isAuthenticatedUserContext(userContext)
      ? await listUpgradeRequests({ userId: userContext.userId, limit: 25 })
      : [];

    return res.json({
      user: userContext.user,
      userId: userContext.userId,
      isGuest: !isAuthenticatedUserContext(userContext),
      account: buildAccountSecurity(userContext.user),
      membership: {
        plan: membershipContext.plan,
        activatedAt: membershipContext.membership?.activatedAt || "",
      },
      usage,
      billing: {
        upiId: membershipContext.upiId,
        monthlyPriceInr: membershipContext.monthlyPriceInr,
      },
      upgradeRequests: requests,
    });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

router.patch("/profile", async (req, res) => {
  try {
    const auth = await requireAuthenticatedUser(req, res);
    if (!auth) return;

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const hasPictureField = Object.prototype.hasOwnProperty.call(req.body || {}, "picture");
    const picture = hasPictureField && typeof req.body?.picture === "string" ? req.body.picture.trim() : undefined;

    if (!name && picture === undefined) {
      return res.status(400).json({ error: "name or picture is required" });
    }

    const updatedUser = await updateUserProfile({
      userId: auth.user.id,
      name,
      picture,
    });

    await ensureMembershipUser({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
    });

    return res.json({
      ok: true,
      user: updatedUser,
      message: "Profile updated successfully.",
    });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.post("/referrals/validate", async (req, res) => {
  try {
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    const lunaSettings = await getLunaSettings();
    const baseAmountInr = Number(lunaSettings?.proMonthlyPriceInr || DEFAULT_PRO_MONTHLY_PRICE_INR);

    const validation = await validateReferralCode(
      { code, amountInr: baseAmountInr },
      { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
    );

    if (!validation.ok) {
      return res.status(400).json({ error: validation.message || "Invalid referral code", valid: false });
    }

    return res.json({
      ok: true,
      valid: true,
      code: validation.code,
      discountPercent: validation.discountPercent,
      baseAmountInr: validation.baseAmountInr,
      finalAmountInr: validation.finalAmountInr,
      expiresAt: validation.expiresAt || "",
    });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.post("/payments/upgrade-request", async (req, res) => {
  try {
    const auth = await requireAuthenticatedUser(req, res);
    if (!auth) return;

    const lunaSettings = await getLunaSettings();
    const transactionId = typeof req.body?.transactionId === "string" ? req.body.transactionId : "";
    const referralCode = typeof req.body?.referralCode === "string" ? req.body.referralCode : "";
    const baseAmountInr = Number(lunaSettings.proMonthlyPriceInr || DEFAULT_PRO_MONTHLY_PRICE_INR);
    let finalAmountInr = baseAmountInr;
    let discountPercent = 0;
    let appliedReferralCode = "";

    if (referralCode.trim()) {
      const validation = await validateReferralCode(
        { code: referralCode, amountInr: baseAmountInr },
        { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
      );

      if (!validation.ok) {
        return res.status(400).json({ error: validation.message || "Invalid referral code" });
      }

      finalAmountInr = validation.finalAmountInr;
      discountPercent = validation.discountPercent;
      appliedReferralCode = validation.code;
    }

    await ensureMembershipUser({ userId: auth.user.id, email: auth.user.email, name: auth.user.name });

    const request = await submitUpgradeRequest({
      userId: auth.user.id,
      userEmail: auth.user.email,
      userName: auth.user.name,
      transactionId,
      amountInr: finalAmountInr,
      baseAmountInr,
      discountPercent,
      referralCode: appliedReferralCode,
    });

    if (appliedReferralCode) {
      try {
        await incrementReferralUsage(
          { code: appliedReferralCode, adminUserId: auth.user.id },
          { defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR, defaultUpiId: DEFAULT_UPI_ID },
        );
      } catch (error) {
        console.warn(`[referrals] Usage update failed: ${error.message}`);
      }
    }

    return res.status(201).json({
      ok: true,
      request,
      message: "Payment proof submitted. Admin will verify and activate Luna Pro.",
    });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.get("/payments/my-requests", async (req, res) => {
  try {
    const auth = await requireAuthenticatedUser(req, res);
    if (!auth) return;

    const requests = await listUpgradeRequests({ userId: auth.user.id, limit: 50 });
    return res.json({ requests });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

router.post("/feedback", async (req, res) => {
  try {
    const userContext = await resolveRequestUser(req, res);
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const rating = Number(req.body?.rating || 5);

    const fallbackName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const fallbackEmail = typeof req.body?.email === "string" ? req.body.email.trim() : "";

    const name = userContext?.user?.name || fallbackName || "Luna User";
    const email = userContext?.user?.email || fallbackEmail || "";

    const feedback = await submitFeedback({
      userId: userContext?.userId || "",
      name,
      email,
      message,
      rating,
    });

    return res.status(201).json({
      ok: true,
      feedback,
      message: "Thanks for your feedback. Luna team received it.",
    });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 400).json({ error: error.message || n.providerMessage });
  }
});

router.get("/feedback", async (req, res) => {
  try {
    const featuredOnly = ["1", "true", "yes"].includes(`${req.query?.featured || ""}`.toLowerCase());
    const limit = Number(req.query?.limit || 40);

    const feedback = await listFeedback({ featuredOnly, limit });
    return res.json({ feedback });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

export default router;
