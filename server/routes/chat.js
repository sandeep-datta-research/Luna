import express from "express";
import { 
  listConversationSummaries, 
  getConversationById, 
  createConversation, 
  deleteConversation, 
  updateConversationCharacter,
  ensureConversation,
  toHistoryPayload,
  saveConversationTurn
} from "../db-adapter.js";
import { 
  getLunaSettings, 
  getAvailableCharacterCatalog, 
  resolveCharacterProfile,
  normalizeCharacterCatalog
} from "../services/settings-service.js";
import { 
  resolveRequestUser, 
} from "../utils/auth-helper.js";
import { 
  resolveMembershipContext, 
  enforceDailyLimitOrThrow 
} from "../services/membership.js";
import { 
  fetchUserMemory 
} from "../services/user-memory.js";
import { 
  buildProviderRunners, 
  resolveRequestedModel,
  buildProviders
} from "../services/provider-service.js";
import { 
  buildConversationMessages, 
  prioritizeProviderOrder, 
  wantsDetailedResponse, 
  generateLocalFallbackReply 
} from "../services/chat-service.js";
import { 
  extractProviderError, 
  isShortCasualMessage, 
  clampReplyLength, 
  splitForUiTokens, 
  streamTextChunks 
} from "../utils/common.js";
import { 
  startSseResponse, 
  sendSseEvent 
} from "../utils/sse-helper.js";
import { requireAuthenticatedUser } from "../middleware/auth-guard.js";
import { 
  LUNA_MAX_RESPONSE_MS, 
  LUNA_MAX_PROVIDER_ATTEMPTS, 
  MAX_HISTORY_MESSAGES,
  DEFAULT_CHARACTER_PROFILE,
  DEFAULT_PRO_MONTHLY_PRICE_INR,
  DEFAULT_UPI_ID,
  GROQ_API_KEY,
  FREE_DAILY_LIMIT
} from "../config.js";
import { 
  classifyMessage, 
  CATEGORY_LABELS 
} from "../luna-classifier.js";
import { getRoutingPlan, runRoutedProviders, runRoutedProvidersStream } from "../luna-router.js";
import { 
  planToolCalls, 
  executeToolCalls, 
  formatToolResults, 
  extractToolSources 
} from "../luna-tools.js";
import { 
  recordToolResults, 
  recordProviderAttempts 
} from "../observability.js";
import { incrementCharacterUsage } from "../admin-settings.js";

const router = express.Router();

router.post("/audio/transcribe", async (req, res) => {
  try {
    const apiKey = GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "GROQ_API_KEY is not configured on the server" });
    }

    const audioBase64Raw = typeof req.body?.audioBase64 === "string" ? req.body.audioBase64.trim() : "";
    const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType.trim() : "audio/webm";
    const fileName = typeof req.body?.fileName === "string" ? req.body.fileName.trim() : "audio.webm";

    if (!audioBase64Raw) {
      return res.status(400).json({ error: "audioBase64 is required" });
    }

    const audioBase64 = audioBase64Raw.includes(",") ? audioBase64Raw.split(",").pop() : audioBase64Raw;
    const audioBuffer = Buffer.from(audioBase64 || "", "base64");

    if (!audioBuffer || audioBuffer.length < 64) {
      return res.status(400).json({ error: "Invalid audio payload" });
    }

    if (audioBuffer.length > 15 * 1024 * 1024) {
      return res.status(413).json({ error: "Audio is too large. Please keep it under 15MB." });
    }

    const form = new FormData();
    form.append("file", new Blob([audioBuffer], { type: mimeType || "audio/webm" }), fileName || "audio.webm");
    form.append("model", "whisper-large-v3");
    form.append("temperature", "0");
    form.append("response_format", "verbose_json");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const raw = await response.text();
    let data = null;

    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      return res.status(response.status || 500).json({
        error: data?.error?.message || data?.message || "Transcription failed",
      });
    }

    const text = typeof data?.text === "string" ? data.text.trim() : "";
    return res.json({ ok: true, text, transcription: data });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(error.status || n.status || 500).json({ error: error.message || n.providerMessage });
  }
});

router.get("/history", async (req, res) => {
  try {
    const { userId } = await resolveRequestUser(req, res);
    const conversations = await listConversationSummaries(userId);
    return res.json({ conversations });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(500).json({ error: n.providerMessage });
  }
});

router.get("/history/:conversationId", async (req, res) => {
  try {
    const { userId } = await resolveRequestUser(req, res);
    const conversation = await getConversationById(req.params.conversationId, userId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    return res.json({ conversation });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(500).json({ error: n.providerMessage });
  }
});

router.post("/history", async (req, res) => {
  try {
    const { userId } = await resolveRequestUser(req, res);
    const title = typeof req.body?.title === "string" ? req.body.title : "New chat";
    const characterId = typeof req.body?.characterId === "string" ? req.body.characterId : "luna-classic";
    const conversation = await createConversation(title, userId, characterId);
    return res.status(201).json({ conversation });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(500).json({ error: n.providerMessage });
  }
});

router.get("/characters", async (req, res) => {
  try {
    const auth = await requireAuthenticatedUser(req, res);
    if (!auth) return;

    const lunaSettings = await getLunaSettings();
    const userContext = { userId: auth.userId, user: auth.user, token: auth.token };
    const membershipContext = await resolveMembershipContext(userContext, lunaSettings);
    const characters = normalizeCharacterCatalog(lunaSettings.characters)
      .filter((item) => item.active !== false)
      .map((item) => ({
        ...item,
        locked: item.access === "pro" && membershipContext.plan !== "pro",
      }));

    return res.json({
      characters,
      membership: {
        plan: membershipContext.plan,
        activatedAt: membershipContext.membership?.activatedAt || "",
      },
    });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(500).json({ error: n.providerMessage });
  }
});

router.delete("/history/:conversationId", async (req, res) => {
  try {
    const { userId } = await resolveRequestUser(req, res);
    const deleted = await deleteConversation(req.params.conversationId, userId);
    if (!deleted) return res.status(404).json({ error: "Conversation not found" });
    return res.json({ ok: true });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(500).json({ error: n.providerMessage });
  }
});

router.patch("/history/:conversationId", async (req, res) => {
  try {
    const { userId } = await resolveRequestUser(req, res);
    const characterId = typeof req.body?.characterId === "string" ? req.body.characterId : "";
    const conversation = await updateConversationCharacter(req.params.conversationId, userId, characterId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    return res.json({ conversation });
  } catch (error) {
    const n = extractProviderError(error);
    return res.status(500).json({ error: n.providerMessage });
  }
});

router.post("/luna/stream", async (req, res) => {
  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return;

  const message = req.body?.message?.trim();
  const requestedConversationId = typeof req.body?.conversationId === "string" ? req.body.conversationId.trim() : "";

  if (!message) return res.status(400).json({ error: "message is required" });

  startSseResponse(res);
  sendSseEvent(res, "start", { ok: true });

  let closed = false;
  const abortController = new AbortController();

  req.on("close", () => {
    closed = true;
    abortController.abort();
  });

  let reply = "";
  const sendToken = (chunk) => {
    if (closed || !chunk) return;
    const uiTokens = splitForUiTokens(chunk);
    if (uiTokens.length === 0) return;

    for (const token of uiTokens) {
      reply += token;
      sendSseEvent(res, "token", { token });
    }
  };

  try {
    const lunaSettings = await getLunaSettings();
    const userContext = { userId: auth.userId, user: auth.user, token: auth.token };
    const membershipContext = await resolveMembershipContext(userContext, lunaSettings);
    const usageBefore = await enforceDailyLimitOrThrow(userContext, membershipContext);
    const webSearchMode = Boolean(req.body?.webSearchMode);
    const researchModeRequested = Boolean(req.body?.researchMode);
    const researchMode = membershipContext.plan === "pro" && researchModeRequested;
    const researchWarning = researchModeRequested && !researchMode
      ? "Research mode is available on Luna Pro only."
      : "";
    const availableCharacters = getAvailableCharacterCatalog(lunaSettings.characters, membershipContext);
    const requestedCharacter = resolveCharacterProfile(req.body?.characterId, lunaSettings.characters);
    const characterProfile = availableCharacters.find((item) => item.id === requestedCharacter.id) || availableCharacters[0] || DEFAULT_CHARACTER_PROFILE;
    const characterWarning = requestedCharacter.id !== characterProfile.id
      ? `${requestedCharacter.name} is available on Luna Pro only. Switched to ${characterProfile.name}.`
      : "";

    const conversation = await ensureConversation(requestedConversationId, userContext.userId);
    const classification = classifyMessage(message);
    let routingPlan = getRoutingPlan(classification.label);
    if (routingPlan.profile === "tool") {
      routingPlan = getRoutingPlan(CATEGORY_LABELS.CASUAL);
    }
    const forceFast = isShortCasualMessage(message, classification.label);
    const maxAttempts = forceFast ? 1 : Math.max(1, LUNA_MAX_PROVIDER_ATTEMPTS);
    const selectedOrder = routingPlan.order.slice(0, routingPlan.profile === "fast" || forceFast ? 1 : maxAttempts);
    const memoryContext = await fetchUserMemory(userContext.userId, userContext.user?.email);
    const detailedMode = wantsDetailedResponse(message, memoryContext);
    const history = toHistoryPayload(conversation, MAX_HISTORY_MESSAGES);
    const toolPlan = forceFast ? [] : planToolCalls(message, { researchMode, webSearchMode });
    const toolResults = toolPlan.length ? await executeToolCalls(toolPlan) : [];
    recordToolResults(toolResults);
    const toolSummary = formatToolResults(toolResults);
    const toolSources = extractToolSources(toolResults);

    const conversationMessages = buildConversationMessages(
      history,
      message,
      detailedMode,
      membershipContext,
      toolSummary,
      memoryContext,
      toolSources,
      characterProfile,
    );
    const providerRunners = buildProviderRunners(conversationMessages, detailedMode, abortController.signal);
    const requestedModel = resolveRequestedModel(req.body?.llm, providerRunners);
    const effectiveOrder = requestedModel
      ? [requestedModel]
      : prioritizeProviderOrder(selectedOrder, membershipContext, { researchMode });

    let llm = "";
    let warning = [researchWarning, characterWarning].filter(Boolean).join(" | ");
    let details = null;

    try {
        const routed = await runRoutedProvidersStream({
          order: effectiveOrder,
          runners: providerRunners,
          normalizeError: extractProviderError,
          onToken: sendToken,
          maxDurationMs: LUNA_MAX_RESPONSE_MS,
        });
        llm = routed.llm;
        reply = routed.rawReply || reply;
        recordProviderAttempts(routed.attempts, routed.llm, "stream");
        details = {
          attempts: routed.attempts,
          category: classification.label,
          profile: routingPlan.profile,
          tools: toolResults,
          sources: toolSources,
          researchMode,
          webSearchMode,
        };
      } catch (providerErr) {
        const normalized = extractProviderError(providerErr);
        warning = [researchWarning, characterWarning, normalized.providerMessage].filter(Boolean).join(" | ");
        recordProviderAttempts(providerErr?.responseData?.attempts || [], "", "stream");
        details = normalized.responseData || {
          category: classification.label,
          profile: routingPlan.profile,
          tools: toolResults,
          sources: toolSources,
          researchMode,
          webSearchMode,
        };
        if (toolSummary) {
          llm = "tool";
          reply = toolSummary;
          streamTextChunks(reply, sendToken);
        } else {
          llm = "local-fallback";
          reply = generateLocalFallbackReply(message);
          streamTextChunks(reply, sendToken);
        }
      }

    if (!reply) {
      if (toolSummary) {
        llm = "tool";
        reply = toolSummary;
        streamTextChunks(reply, sendToken);
      } else {
        llm = "local-fallback";
        reply = generateLocalFallbackReply(message);
        streamTextChunks(reply, sendToken);
      }
    }

    const updatedConversation = await saveConversationTurn({
      conversationId: conversation.id,
      userText: message,
      assistantText: reply,
      assistantSources: toolSources,
      characterId: characterProfile.id,
      llm,
      userId: userContext.userId,
    });
    await incrementCharacterUsage(
      { id: characterProfile.id, plan: membershipContext.plan, adminUserId: userContext.userId },
      {
        defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR,
        defaultUpiId: DEFAULT_UPI_ID,
      },
    ).catch(() => null);

    const usageAfter = membershipContext.plan === "pro"
      ? {
          date: usageBefore.date,
          usedToday: usageBefore.usedToday + 1,
          remainingToday: null,
          dailyLimit: null,
          unlimited: true,
        }
      : {
          date: usageBefore.date,
          usedToday: usageBefore.usedToday + 1,
          remainingToday: Math.max(0, FREE_DAILY_LIMIT - (usageBefore.usedToday + 1)),
          dailyLimit: FREE_DAILY_LIMIT,
          unlimited: false,
        };

    sendSseEvent(res, "done", {
      reply,
      llm,
      category: classification.label,
      routing: {
        profile: routingPlan.profile,
        order: effectiveOrder,
      },
      selectedBy: llm === "local-fallback" ? "fallback" : "auto",
      warning,
      details,
      tools: toolResults,
      sources: toolSources,
      characterId: characterProfile.id,
      webSearchMode,
      conversationId: updatedConversation.id,
      conversation: updatedConversation,
      membership: {
        plan: membershipContext.plan,
        activatedAt: membershipContext.membership?.activatedAt || "",
      },
      usage: usageAfter,
    });
  } catch (error) {
    const n = extractProviderError(error);
    const payload = {
      error: error.message || n.providerMessage,
    };

    if (error.responseData && typeof error.responseData === "object") {
      Object.assign(payload, error.responseData);
    }

    sendSseEvent(res, "error", payload);
  } finally {
    res.end();
  }
});

router.post("/luna", async (req, res) => {
  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return;

  const message = req.body?.message?.trim();
  const requestedConversationId = typeof req.body?.conversationId === "string" ? req.body.conversationId.trim() : "";

  if (!message) return res.status(400).json({ error: "message is required" });

  try {
    const lunaSettings = await getLunaSettings();
    const userContext = { userId: auth.userId, user: auth.user, token: auth.token };
    const membershipContext = await resolveMembershipContext(userContext, lunaSettings);
    const usageBefore = await enforceDailyLimitOrThrow(userContext, membershipContext);
    const webSearchMode = Boolean(req.body?.webSearchMode);
    const researchModeRequested = Boolean(req.body?.researchMode);
    const researchMode = membershipContext.plan === "pro" && researchModeRequested;
    const researchWarning = researchModeRequested && !researchMode
      ? "Research mode is available on Luna Pro only."
      : "";
    const availableCharacters = getAvailableCharacterCatalog(lunaSettings.characters, membershipContext);
    const requestedCharacter = resolveCharacterProfile(req.body?.characterId, lunaSettings.characters);
    const characterProfile = availableCharacters.find((item) => item.id === requestedCharacter.id) || availableCharacters[0] || DEFAULT_CHARACTER_PROFILE;
    const characterWarning = requestedCharacter.id !== characterProfile.id
      ? `${requestedCharacter.name} is available on Luna Pro only. Switched to ${characterProfile.name}.`
      : "";

    const conversation = await ensureConversation(requestedConversationId, userContext.userId);
    const classification = classifyMessage(message);
    let routingPlan = getRoutingPlan(classification.label);
    if (routingPlan.profile === "tool") {
      routingPlan = getRoutingPlan(CATEGORY_LABELS.CASUAL);
    }
    const forceFast = isShortCasualMessage(message, classification.label);
    const maxAttempts = forceFast ? 1 : Math.max(1, LUNA_MAX_PROVIDER_ATTEMPTS);
    const selectedOrder = routingPlan.order.slice(0, routingPlan.profile === "fast" || forceFast ? 1 : maxAttempts);
    const memoryContext = await fetchUserMemory(userContext.userId, userContext.user?.email);
    const detailedMode = wantsDetailedResponse(message, memoryContext);
    const history = toHistoryPayload(conversation, MAX_HISTORY_MESSAGES);
    const toolPlan = forceFast ? [] : planToolCalls(message, { researchMode, webSearchMode });
    const toolResults = toolPlan.length ? await executeToolCalls(toolPlan) : [];
    recordToolResults(toolResults);
    const toolSummary = formatToolResults(toolResults);
    const toolSources = extractToolSources(toolResults);

    const conversationMessages = buildConversationMessages(
      history,
      message,
      detailedMode,
      membershipContext,
      toolSummary,
      memoryContext,
      toolSources,
      characterProfile,
    );
    const providerRunners = buildProviderRunners(conversationMessages, detailedMode);
    const requestedModel = resolveRequestedModel(req.body?.llm, providerRunners);
    const effectiveOrder = requestedModel
      ? [requestedModel]
      : prioritizeProviderOrder(selectedOrder, membershipContext, { researchMode });

    let reply = "";
    let llm = "";
    let warning = [researchWarning, characterWarning].filter(Boolean).join(" | ");
    let details = null;

    try {
        const routed = await runRoutedProviders({
          order: effectiveOrder,
          runners: providerRunners,
          normalizeError: extractProviderError,
          maxDurationMs: LUNA_MAX_RESPONSE_MS,
        });
        llm = routed.llm;
        reply = clampReplyLength(routed.rawReply);
        recordProviderAttempts(routed.attempts, routed.llm, "chat");
        details = {
          attempts: routed.attempts,
          category: classification.label,
          profile: routingPlan.profile,
          tools: toolResults,
          sources: toolSources,
          researchMode,
          webSearchMode,
        };
      } catch (providerErr) {
        const normalized = extractProviderError(providerErr);
        warning = [researchWarning, characterWarning, normalized.providerMessage].filter(Boolean).join(" | ");
        recordProviderAttempts(providerErr?.responseData?.attempts || [], "", "chat");
        details = normalized.responseData || {
          category: classification.label,
          profile: routingPlan.profile,
          tools: toolResults,
          sources: toolSources,
          researchMode,
          webSearchMode,
        };
        if (toolSummary) {
          llm = "tool";
          reply = toolSummary;
        } else {
          llm = "local-fallback";
          reply = generateLocalFallbackReply(message);
        }
      }

    if (!reply) {
      if (toolSummary) {
        llm = "tool";
        reply = toolSummary;
      } else {
        llm = "local-fallback";
        reply = generateLocalFallbackReply(message);
      }
    }

    const updatedConversation = await saveConversationTurn({
      conversationId: conversation.id,
      userText: message,
      assistantText: reply,
      assistantSources: toolSources,
      characterId: characterProfile.id,
      llm,
      userId: userContext.userId,
    });
    await incrementCharacterUsage(
      { id: characterProfile.id, plan: membershipContext.plan, adminUserId: userContext.userId },
      {
        defaultMonthlyPriceInr: DEFAULT_PRO_MONTHLY_PRICE_INR,
        defaultUpiId: DEFAULT_UPI_ID,
      },
    ).catch(() => null);

    const usageAfter = membershipContext.plan === "pro"
      ? {
          date: usageBefore.date,
          usedToday: usageBefore.usedToday + 1,
          remainingToday: null,
          dailyLimit: null,
          unlimited: true,
        }
      : {
          date: usageBefore.date,
          usedToday: usageBefore.usedToday + 1,
          remainingToday: Math.max(0, FREE_DAILY_LIMIT - (usageBefore.usedToday + 1)),
          dailyLimit: FREE_DAILY_LIMIT,
          unlimited: false,
        };

    return res.json({
      reply,
      llm,
      category: classification.label,
      routing: {
        profile: routingPlan.profile,
        order: effectiveOrder,
      },
      selectedBy: llm === "local-fallback" ? "fallback" : "auto",
      warning,
      details,
      tools: toolResults,
      sources: toolSources,
      characterId: characterProfile.id,
      webSearchMode,
      conversationId: updatedConversation.id,
      conversation: updatedConversation,
      membership: {
        plan: membershipContext.plan,
        activatedAt: membershipContext.membership?.activatedAt || "",
      },
      usage: usageAfter,
    });
  } catch (error) {
    const n = extractProviderError(error);
    const payload = {
      error: error.message || n.providerMessage,
    };

    if (error.responseData && typeof error.responseData === "object") {
      Object.assign(payload, error.responseData);
    }

    return res.status(error.status || n.status || 500).json(payload);
  }
});

export default router;
