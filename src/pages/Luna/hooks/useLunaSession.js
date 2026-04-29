import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { fetchApi } from "@/lib/api-client";
import { 
  createSession, 
  mapConversationSummaryToSession, 
  mapConversationMessages, 
  text, 
  normalizeCharacterId, 
  nowIso,
  shortTitle
} from "../utils";
import { CHARACTER_OPTIONS, MAX_HISTORY_ITEMS } from "../constants";

export function useLunaSession({ user, isSignedIn, projects, showErrorToast }) {
  const [sessions, setSessions] = useState(() => [createSession(projects?.[0]?.id || "")]);
  const [activeSessionId, setActiveSessionId] = useState(sessions[0].id);
  const [historyLoading, setHistoryLoading] = useState(false);
  const loadedConversationIdsRef = useRef(new Set());
  const historyLoadedRef = useRef(false);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    [sessions],
  );

  const activeSession = useMemo(() => {
    const direct = sessions.find((item) => item.id === activeSessionId);
    return direct || sortedSessions[0] || null;
  }, [activeSessionId, sessions, sortedSessions]);

  const activeMessages = useMemo(
    () => (Array.isArray(activeSession?.messages) ? activeSession.messages : []),
    [activeSession?.messages],
  );

  const updateSession = useCallback((sessionId, updater) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        return updater(session);
      }),
    );
  }, []);

  const loadConversationMessages = useCallback(
    async (sessionId, conversationId) => {
      const session = sessions.find((item) => item.id === sessionId);
      const targetId = text(conversationId || session?.backendConversationId || session?.id);
      if (!targetId) return;

      if (loadedConversationIdsRef.current.has(targetId) && session?.messages?.length) {
        return;
      }

      const result = await fetchApi(
        `/api/history/${targetId}`,
        {},
        { includeAuth: true, includeGuest: false },
      );

      if (!result.ok) {
        showErrorToast(result.message || "Unable to load this chat.");
        return;
      }

      const conversation = result.data?.conversation;
      if (!conversation) return;

      const messages = mapConversationMessages(conversation);
      loadedConversationIdsRef.current.add(targetId);

      updateSession(sessionId, (current) => ({
        ...current,
        title: text(conversation?.title) || current.title,
        messages,
        updatedAt: text(conversation?.updatedAt) || current.updatedAt,
        characterId: normalizeCharacterId(conversation?.characterId || current.characterId),
        backendConversationId: text(conversation?.id) || current.backendConversationId,
      }));
    },
    [sessions, showErrorToast, updateSession],
  );

  const createFreshSession = useCallback(
    (projectId = "", characterId = "") => {
      const next = createSession(
        projectId || projects?.[0]?.id || "",
        characterId || activeSession?.characterId || CHARACTER_OPTIONS[0].id,
      );
      setSessions((prev) => [next, ...prev]);
      setActiveSessionId(next.id);
      
      if (isSignedIn) {
        fetchApi(
          "/api/history",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New chat", characterId: next.characterId }),
          },
          { includeAuth: true, includeGuest: false },
        ).then((result) => {
          if (result.ok && result.data?.conversation?.id) {
            const conversationId = text(result.data.conversation.id);
            loadedConversationIdsRef.current.add(conversationId);
            setSessions((prev) =>
              prev.map((session) =>
                session.id === next.id
                  ? {
                      ...session,
                      id: conversationId,
                      backendConversationId: conversationId,
                      title: text(result.data.conversation.title) || session.title,
                      createdAt: text(result.data.conversation.createdAt) || session.createdAt,
                      updatedAt: text(result.data.conversation.updatedAt) || session.updatedAt,
                      characterId: normalizeCharacterId(result.data.conversation.characterId || session.characterId),
                    }
                  : session,
              ),
            );
            setActiveSessionId(conversationId);
          }
        });
      }
      return next;
    },
    [activeSession?.characterId, isSignedIn, projects],
  );

  const handleDeleteSession = useCallback(
    (sessionId) => {
      const target = sessions.find((item) => item.id === sessionId);
      const conversationId = text(target?.backendConversationId || target?.id);
      if (conversationId && isSignedIn) {
        fetchApi(`/api/history/${conversationId}`, { method: "DELETE" }, { includeAuth: true, includeGuest: false }).catch(() => null);
      }
      if (conversationId) {
        loadedConversationIdsRef.current.delete(conversationId);
      }

      setSessions((prev) => prev.filter((item) => item.id !== sessionId));

      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((item) => item.id !== sessionId);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          const next = createSession(projects?.[0]?.id || "", activeSession?.characterId || CHARACTER_OPTIONS[0].id);
          setSessions([next]);
          setActiveSessionId(next.id);
        }
      }
    },
    [activeSession?.characterId, activeSessionId, isSignedIn, projects, sessions],
  );

  useEffect(() => {
    let canceled = false;

    const loadServerHistory = async () => {
      if (!isSignedIn) {
        historyLoadedRef.current = false;
        return;
      }
      if (historyLoadedRef.current) return;

      historyLoadedRef.current = true;
      setHistoryLoading(true);
      loadedConversationIdsRef.current = new Set();

      const result = await fetchApi(
        "/api/history",
        {},
        { includeAuth: true, includeGuest: false },
      );

      if (canceled) return;

      if (!result.ok) {
        setHistoryLoading(false);
        showErrorToast(result.message || "Unable to load chat history.");
        return;
      }

      const conversations = Array.isArray(result.data?.conversations)
        ? result.data.conversations
        : [];
      const baseProjectId = projects?.[0]?.id || "";

      if (conversations.length === 0) {
        const next = createSession(baseProjectId);
        setSessions([next]);
        setActiveSessionId(next.id);
        setHistoryLoading(false);
        return;
      }

      const preferredId = conversations[0]?.id;

      let preferredConversation = null;
      if (preferredId) {
        const detail = await fetchApi(
          `/api/history/${preferredId}`,
          {},
          { includeAuth: true, includeGuest: false },
        );
        if (detail.ok) {
          preferredConversation = detail.data?.conversation || null;
          if (preferredConversation?.id) {
            loadedConversationIdsRef.current.add(preferredConversation.id);
          }
        }
      }

      const nextSessions = conversations.map((summary) => {
        const session = mapConversationSummaryToSession(summary, baseProjectId);
        if (summary.id === preferredConversation?.id) {
          return {
            ...session,
            messages: mapConversationMessages(preferredConversation),
          };
        }
        return session;
      });

      setSessions(nextSessions);
      setActiveSessionId(preferredId || nextSessions[0]?.id || "");
      setHistoryLoading(false);
    };

    loadServerHistory();
    return () => {
      canceled = true;
    };
  }, [isSignedIn, projects, showErrorToast]);

  return {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    activeMessages,
    sortedSessions,
    updateSession,
    loadConversationMessages,
    createFreshSession,
    handleDeleteSession,
    historyLoading,
  };
}
