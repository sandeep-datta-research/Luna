import { useState, useCallback, useRef } from "react";
import { fetchApi, streamApi } from "@/lib/api-client";
import { 
  text, 
  nowIso, 
  createId, 
  shortTitle, 
  normalizeCharacterId 
} from "../utils";
import { CHARACTER_OPTIONS } from "../constants";

export function useLunaChat({
  sessions,
  activeSession,
  setActiveSessionId,
  setSessions,
  updateSession,
  isSignedIn,
  supportsStreaming,
  selectedModel,
  webSearchMode,
  researchMode,
  imageMode,
  attachments,
  setInputValue,
  setAttachments,
  setMembershipPlan,
  showErrorToast,
  setToast,
}) {
  const [isTyping, setIsTyping] = useState(false);
  const streamAbortRef = useRef(null);
  const STREAM_ABORT_MS = researchMode ? 60000 : 45000;

  const resolveTargetSession = useCallback(
    (sessionId = "") => {
      const normalizedId = text(sessionId);
      if (normalizedId) {
        const matched = sessions.find((item) => item.id === normalizedId || item.backendConversationId === normalizedId);
        if (matched) return matched;
      }

      return activeSession;
    },
    [activeSession, sessions],
  );

  const buildPromptPayload = useCallback(
    (prompt, options = { applyToggles: true }) => {
      const clean = text(prompt);
      if (!clean) return "";

      if (!options.applyToggles) return clean;

      const context = [];
      if (webSearchMode) context.push("Web search mode is ON. Prefer current, verifiable information.");
      if (researchMode) context.push("Research mode is ON. Prioritize source-backed findings, recent context, and explicit evidence.");
      if (imageMode) context.push("Image mode is ON. If relevant, provide image generation style prompt details.");
      if (attachments.length > 0) context.push(`Attached files: ${attachments.join(", ")}`);

      if (context.length === 0) return clean;

      return `${clean}\n\nContext:\n- ${context.join("\n- ")}`;
    },
    [attachments, imageMode, researchMode, webSearchMode],
  );

  const requestLuna = useCallback(
    async (session, prompt, options = { applyToggles: true }) => {
      let conversationId = text(session?.backendConversationId || session?.id);
      if (!conversationId && isSignedIn) {
        const created = await fetchApi(
          "/api/history",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New chat", characterId: session?.characterId || CHARACTER_OPTIONS[0].id }),
          },
          { includeAuth: true, includeGuest: false },
        );
        if (created.ok && created.data?.conversation?.id) {
          conversationId = text(created.data.conversation.id);
          setSessions((prev) =>
            prev.map((item) =>
              item.id === session.id
                ? {
                    ...item,
                    backendConversationId: conversationId,
                    title: text(created.data.conversation.title) || item.title,
                    createdAt: text(created.data.conversation.createdAt) || item.createdAt,
                    updatedAt: text(created.data.conversation.updatedAt) || item.updatedAt,
                    characterId: normalizeCharacterId(created.data.conversation.characterId || item.characterId),
                  }
                : item,
            ),
          );
          setActiveSessionId(session.id);
        }
      }

      const payloadPrompt = buildPromptPayload(prompt, options);
      const result = await fetchApi("/api/luna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: payloadPrompt,
          conversationId,
          llm: selectedModel,
          characterId: session?.characterId || CHARACTER_OPTIONS[0].id,
          webSearchMode,
          researchMode,
        }),
      });

      if (!result.ok) {
        throw new Error(result.message || result.data?.error || "Failed to fetch response.");
      }

      return {
        reply: text(result.data?.reply) || "I could not generate a reply. Please retry.",
        llm: text(result.data?.llm),
        conversationId: text(result.data?.conversationId),
        membershipPlan: result.data?.membership?.plan === "pro" ? "pro" : "free",
        warning: text(result.data?.warning),
        sources: Array.isArray(result.data?.sources) ? result.data.sources : [],
        tokenUsage: result.data?.tokenUsage && typeof result.data.tokenUsage === "object" ? result.data.tokenUsage : null,
      };
    },
    [buildPromptPayload, isSignedIn, researchMode, selectedModel, setSessions, setActiveSessionId, webSearchMode],
  );

  const requestLunaStream = useCallback(
    async (session, prompt, handlers = {}, options = { applyToggles: true }) => {
      let conversationId = text(session?.backendConversationId || session?.id);
      if (!conversationId && isSignedIn) {
        const created = await fetchApi(
          "/api/history",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New chat", characterId: session?.characterId || CHARACTER_OPTIONS[0].id }),
          },
          { includeAuth: true, includeGuest: false },
        );
        if (created.ok && created.data?.conversation?.id) {
          conversationId = text(created.data.conversation.id);
          setSessions((prev) =>
            prev.map((item) =>
              item.id === session.id
                ? {
                    ...item,
                    backendConversationId: conversationId,
                    title: text(created.data.conversation.title) || item.title,
                    createdAt: text(created.data.conversation.createdAt) || item.createdAt,
                    updatedAt: text(created.data.conversation.updatedAt) || item.updatedAt,
                    characterId: normalizeCharacterId(created.data.conversation.characterId || item.characterId),
                  }
                : item,
            ),
          );
          setActiveSessionId(session.id);
        }
      }

      const payloadPrompt = buildPromptPayload(prompt, options);
      return streamApi(
        "/api/luna/stream",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: payloadPrompt,
            conversationId,
            llm: selectedModel,
            characterId: session?.characterId || CHARACTER_OPTIONS[0].id,
            webSearchMode,
            researchMode,
          }),
          signal: handlers.signal,
        },
        handlers,
      );
    },
    [buildPromptPayload, isSignedIn, researchMode, selectedModel, setSessions, setActiveSessionId, webSearchMode],
  );

  const sendMessage = useCallback(
    async (manualPrompt, options = { regenerate: false, applyToggles: true, sessionId: "", inputValue: "" }) => {
      const basePrompt = text(manualPrompt ?? options.inputValue);
      if (!basePrompt || isTyping) return;

      const sessionId = options.sessionId || activeSession?.id;
      if (!sessionId) return;
      const targetSession = resolveTargetSession(sessionId);
      if (!targetSession) return;

      setToast(null);

      if (!options.regenerate) {
        const userMessage = {
          id: createId("user"),
          role: "user",
          content: basePrompt,
          createdAt: nowIso(),
          llm: "",
        };

        updateSession(sessionId, (session) => {
          const nextMessages = [...session.messages, userMessage];
          const title = session.title === "New chat"
            ? shortTitle(basePrompt, "New chat")
            : session.title;

          return {
            ...session,
            title,
            messages: nextMessages,
            updatedAt: nowIso(),
          };
        });

        setInputValue("");
        setAttachments([]);
      }

      setIsTyping(true);

      let assistantId = "";
      let assistantAdded = false;
      let streamedText = "";
      let streamedUsage = null;
      let pendingChunkBuffer = "";
      let flushFrameId = 0;

      const ensureAssistant = (initialContent = "") => {
        if (assistantAdded) return;
        assistantId = createId("assistant");
        assistantAdded = true;
        updateSession(sessionId, (session) => ({
          ...session,
          messages: [
            ...session.messages,
            {
              id: assistantId,
              role: "assistant",
              content: initialContent,
              createdAt: nowIso(),
              llm: "",
            },
          ],
          updatedAt: nowIso(),
        }));
      };

      const flushPendingChunks = () => {
        flushFrameId = 0;
        if (!pendingChunkBuffer || !assistantId) return;

        const chunk = pendingChunkBuffer;
        pendingChunkBuffer = "";
        updateSession(sessionId, (session) => ({
          ...session,
          messages: session.messages.map((msg) =>
            msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg,
          ),
          updatedAt: nowIso(),
        }));
      };

      const scheduleChunkFlush = () => {
        if (flushFrameId || typeof window === "undefined") return;
        flushFrameId = window.requestAnimationFrame(flushPendingChunks);
      };

      const applyChunk = (chunk) => {
        if (!chunk || !assistantId) return;
        pendingChunkBuffer += chunk;
        scheduleChunkFlush();
      };

      const appendChunk = (chunk) => {
        if (!chunk) return;
        streamedText += chunk;
        if (!assistantAdded) {
          ensureAssistant("");
          setIsTyping(false);
        }
        applyChunk(chunk);
      };

      let streamTimeout = null;

      try {
        if (!supportsStreaming) {
          const response = await requestLuna(targetSession, basePrompt, { applyToggles: options.applyToggles });
          setMembershipPlan(response.membershipPlan === "pro" ? "pro" : "free");
          if (response.warning) {
            setToast({ id: createId("toast"), message: response.warning });
          }
          const assistantMessage = {
            id: createId("assistant"),
            role: "assistant",
            content: response.reply,
            createdAt: nowIso(),
            llm: response.llm,
            sources: Array.isArray(response.sources) ? response.sources : [],
            usage: response.tokenUsage,
          };

          updateSession(sessionId, (session) => ({
            ...session,
            messages: [...session.messages, assistantMessage],
            backendConversationId: response.conversationId || session.backendConversationId,
            updatedAt: nowIso(),
          }));
          return;
        }

        const abortController = new AbortController();
        streamAbortRef.current = abortController;
        streamTimeout = window.setTimeout(() => {
          abortController.abort();
        }, STREAM_ABORT_MS);

        const streamResult = await requestLunaStream(
          targetSession,
          basePrompt,
          {
            signal: abortController.signal,
            onToken: appendChunk,
            onDone: () => setIsTyping(false),
          },
          { applyToggles: options.applyToggles },
        );

        if (!streamResult.ok) {
          throw new Error(streamResult.message || streamResult.data?.error || "Streaming failed.");
        }

        const payload = streamResult.data || {};
        const finalReply = text(payload.reply) || streamedText || "I could not generate a reply. Please retry.";
        const llm = text(payload.llm);
        const payloadConversationId = text(payload.conversationId);
        const payloadSources = Array.isArray(payload.sources) ? payload.sources : [];
        const payloadPlan = payload.membership?.plan === "pro" ? "pro" : "free";
        streamedUsage = payload.tokenUsage && typeof payload.tokenUsage === "object" ? payload.tokenUsage : null;
        
        setMembershipPlan(payloadPlan);
        if (payload.warning) {
          setToast({ id: createId("toast"), message: text(payload.warning) });
        }

        if (flushFrameId && typeof window !== "undefined") {
          window.cancelAnimationFrame(flushFrameId);
          flushPendingChunks();
        } else {
          flushPendingChunks();
        }

        if (!assistantAdded) {
          ensureAssistant("");
        }

        updateSession(sessionId, (session) => ({
          ...session,
          messages: session.messages.map((msg) =>
            msg.id === assistantId ? { ...msg, content: finalReply, llm, sources: payloadSources, usage: streamedUsage } : msg,
          ),
          backendConversationId: payloadConversationId || session.backendConversationId,
          updatedAt: nowIso(),
        }));

      } catch (error) {
        if (!streamedText) {
          try {
            const response = await requestLuna(targetSession, basePrompt, { applyToggles: options.applyToggles });
            setMembershipPlan(response.membershipPlan === "pro" ? "pro" : "free");
            if (response.warning) {
              setToast({ id: createId("toast"), message: response.warning });
            }
            const assistantMessage = {
              id: createId("assistant"),
              role: "assistant",
              content: response.reply,
              createdAt: nowIso(),
              llm: response.llm,
              sources: Array.isArray(response.sources) ? response.sources : [],
              usage: response.tokenUsage,
            };

            updateSession(sessionId, (session) => ({
              ...session,
              messages: [...session.messages, assistantMessage],
              backendConversationId: response.conversationId || session.backendConversationId,
              updatedAt: nowIso(),
            }));
            return;
          } catch (fallbackError) {
            showErrorToast(fallbackError.message || "Luna request failed.", {
              type: options.regenerate ? "regenerate" : "send",
              prompt: basePrompt,
              sessionId,
            });
          }
        } else {
          showErrorToast(error.message || "Stream failed.", {
            type: options.regenerate ? "regenerate" : "send",
            prompt: basePrompt,
            sessionId,
          });
        }
      } finally {
        if (flushFrameId && typeof window !== "undefined") {
          window.cancelAnimationFrame(flushFrameId);
        }
        flushPendingChunks();
        if (streamTimeout) {
          clearTimeout(streamTimeout);
        }
        streamAbortRef.current = null;
        setIsTyping(false);
      }
    },
    [
      isTyping,
      activeSession,
      resolveTargetSession,
      setToast,
      updateSession,
      setInputValue,
      setAttachments,
      supportsStreaming,
      requestLuna,
      setMembershipPlan,
      requestLunaStream,
      STREAM_ABORT_MS,
      showErrorToast
    ],
  );

  const regenerateLatest = useCallback(async () => {
    if (!activeSession || activeSession.messages.length === 0 || isTyping) return;

    let assistantIndex = -1;
    for (let i = activeSession.messages.length - 1; i >= 0; i -= 1) {
      if (activeSession.messages[i].role === "assistant") {
        assistantIndex = i;
        break;
      }
    }

    if (assistantIndex < 0) return;

    let userPrompt = "";
    for (let i = assistantIndex - 1; i >= 0; i -= 1) {
      if (activeSession.messages[i].role === "user") {
        userPrompt = activeSession.messages[i].content;
        break;
      }
    }

    if (!userPrompt) return;

    updateSession(activeSession.id, (draft) => ({
      ...draft,
      messages: draft.messages.filter((item) => item.id !== activeSession.messages[assistantIndex].id),
      updatedAt: nowIso(),
    }));

    await sendMessage(userPrompt, {
      regenerate: true,
      applyToggles: false,
      sessionId: activeSession.id,
    });
  }, [activeSession, isTyping, sendMessage, updateSession]);

  return {
    isTyping,
    setIsTyping,
    sendMessage,
    regenerateLatest,
    buildPromptPayload,
  };
}
