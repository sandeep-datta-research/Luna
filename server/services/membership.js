import { 
  countUserMessagesForDate 
} from "../db-adapter.js";
import { 
  ensureMembershipUser, 
  getMembershipByUserId 
} from "../pro-db.js";
import { 
  FREE_DAILY_LIMIT, 
  DEFAULT_UPI_ID, 
  DEFAULT_PRO_MONTHLY_PRICE_INR 
} from "../config.js";
import { 
  isoDateKey, 
  isAuthenticatedUserContext, 
  sanitizePromptText 
} from "../utils/common.js";

export async function resolveMembershipContext(userContext, lunaSettings) {
  const upiId = `${lunaSettings?.upiId || DEFAULT_UPI_ID}`.trim() || DEFAULT_UPI_ID;
  const monthlyPriceInr = Number(lunaSettings?.proMonthlyPriceInr || DEFAULT_PRO_MONTHLY_PRICE_INR);
  const proSystemPrompt = sanitizePromptText(lunaSettings?.proSystemPrompt);

  if (!isAuthenticatedUserContext(userContext)) {
    return {
      plan: "free",
      membership: null,
      isPro: false,
      dailyLimit: FREE_DAILY_LIMIT,
      upiId,
      monthlyPriceInr,
      proSystemPrompt,
    };
  }

  await ensureMembershipUser({
    userId: userContext.user.id,
    email: userContext.user.email,
    name: userContext.user.name,
  });

  const membership = await getMembershipByUserId(userContext.user.id);
  const plan = membership?.plan === "pro" ? "pro" : "free";

  return {
    plan,
    membership,
    isPro: plan === "pro",
    dailyLimit: FREE_DAILY_LIMIT,
    upiId,
    monthlyPriceInr,
    proSystemPrompt,
  };
}

export async function getUsageSummary(userContext, membershipContext) {
  const today = isoDateKey();
  const plan = membershipContext?.plan === "pro" ? "pro" : "free";

  const canCount = Boolean(userContext?.userId);
  const usedToday = canCount ? await countUserMessagesForDate(userContext.userId, today) : 0;

  if (plan === "pro") {
    return {
      date: today,
      usedToday,
      remainingToday: null,
      dailyLimit: null,
      unlimited: true,
    };
  }

  return {
    date: today,
    usedToday,
    remainingToday: Math.max(0, FREE_DAILY_LIMIT - usedToday),
    dailyLimit: FREE_DAILY_LIMIT,
    unlimited: false,
  };
}

export async function enforceDailyLimitOrThrow(userContext, membershipContext) {
  const usage = await getUsageSummary(userContext, membershipContext);
  if (membershipContext?.plan === "pro") return usage;

  if (usage.usedToday >= FREE_DAILY_LIMIT) {
    throw Object.assign(new Error("Daily free limit reached. Upgrade to Luna Pro for unlimited messages."), {
      status: 429,
      responseData: {
        code: "DAILY_LIMIT_REACHED",
        plan: "free",
        limit: FREE_DAILY_LIMIT,
        usedToday: usage.usedToday,
        remainingToday: 0,
        upgradeRequired: true,
        upiId: membershipContext?.upiId || DEFAULT_UPI_ID,
        monthlyPriceInr: Number(membershipContext?.monthlyPriceInr || DEFAULT_PRO_MONTHLY_PRICE_INR),
      },
    });
  }

  return usage;
}
