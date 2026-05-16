import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchApi, hydrateUser } from "@/lib/api-client";
import { useBrandingLogo } from "@/lib/branding";
import { getPrimaryNativeDownload } from "@/lib/native-app-links";
import lunaLogo from "@/assets/luna-logo.svg";

// Local Components
import { Sidebar } from "./Luna/components/Sidebar";
import { ModelSelector } from "./Luna/components/ModelSelector";
import { WelcomeView } from "./Luna/components/WelcomeView";
import { ChatView } from "./Luna/components/ChatView";
import { Composer } from "./Luna/components/Composer";
import { InstallLunaButton } from "./Luna/components/InstallLunaButton";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import AnnouncementBanner from "@/components/AnnouncementBanner";

import { useLunaStore } from "@/store/useLunaStore";

// Local Hooks
import { useVoiceRecorder } from "./Luna/hooks/useVoiceRecorder";
import { useLunaSession } from "./Luna/hooks/useLunaSession";
import { useLunaChat } from "./Luna/hooks/useLunaChat";

// Local Utils & Constants
import { 
  loadUser, 
  getDefaultProjects, 
  getCharacterOption, 
  normalizeCharacterId, 
  hydrateCharacterOptions, 
  createId, 
  text, 
  nowIso, 
  formatDateLabel,
  exportSessionToMarkdown 
} from "./Luna/utils";
import { 
  CHARACTER_OPTIONS, 
  MAX_HISTORY_ITEMS 
} from "./Luna/constants";

export default function Luna() {
  const brandLogo = useBrandingLogo(lunaLogo);
  const navigate = useNavigate();

  // Basic User/Membership State
  const initialUser = useMemo(() => loadUser(), []);
  const [user, setUser] = useState(initialUser);
  const isSignedIn = useMemo(() => Boolean(user?.email && user.email !== "guest@luna.ai"), [user?.email]);
  const [membershipPlan, setMembershipPlan] = useState("free");

  // Project State
  const defaultProjects = useMemo(() => getDefaultProjects(), []);
  const [projects, setProjects] = useState(defaultProjects);
  const [expandedProjectId, setExpandedProjectId] = useState("");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // UI State from Zustand
  const {
    isSidebarOpen, setIsSidebarOpen,
    mobileSidebarOpen, setMobileSidebarOpen,
    searchQuery, setSearchQuery,
    characterSearchQuery, setCharacterSearchQuery,
    toast, setToast,
    lastRetryPayload, setLastRetryPayload,
    inputValue, setInputValue,
    selectedModel, setSelectedModel,
    webSearchMode, setWebSearchMode,
    researchMode, setResearchMode,
    imageMode, setImageMode,
    attachments, setAttachments
  } = useLunaStore();

  const [onboardingState, setOnboardingState] = useState({ loading: true, answered: false });

  // PWA State
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [installSupported, setInstallSupported] = useState(false);
  const [installingApp, setInstallingApp] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);

  // Character Options State
  const [characterOptions, setCharacterOptions] = useState(CHARACTER_OPTIONS);

  const showErrorToast = useCallback((message, retryPayload = null) => {
    setLastRetryPayload(retryPayload);
    setToast({ id: createId("toast"), message: text(message) || "Something went wrong." });
  }, []);

  // Custom Hooks
  const {
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
  } = useLunaSession({ user, isSignedIn, projects, showErrorToast });

  const supportsStreaming = useMemo(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator?.userAgent || "";
    const isNativeShell = Boolean(window.Capacitor?.isNativePlatform?.() || window.Capacitor);
    return typeof ReadableStream !== "undefined" && (isNativeShell || !/iPad|iPhone|iPod/i.test(ua));
  }, []);

  const {
    isTyping,
    sendMessage,
    regenerateLatest,
  } = useLunaChat({
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
  });

  const {
    voiceActive,
    isTranscribing,
    toggleVoice,
  } = useVoiceRecorder({
    onTranscription: (transcript) => setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript)),
    onError: (msg) => showErrorToast(msg),
  });

  // Derived Values
  const activeCharacter = useMemo(
    () => getCharacterOption(activeSession?.characterId, characterOptions),
    [activeSession?.characterId, characterOptions],
  );

  const filteredCharacterOptions = useMemo(() => {
    const query = characterSearchQuery.trim().toLowerCase();
    if (!query) return characterOptions;
    return characterOptions.filter((item) =>
      [item.name, item.tagline, item.description]
        .filter(Boolean)
        .some((val) => val.toLowerCase().includes(query)),
    );
  }, [characterOptions, characterSearchQuery]);

  const latestAssistantId = useMemo(() => {
    for (let i = activeMessages.length - 1; i >= 0; i -= 1) {
      if (activeMessages[i].role === "assistant") return activeMessages[i].id;
    }
    return "";
  }, [activeMessages]);

  const historyList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sortedSessions
      .filter((s) => !query || s.title.toLowerCase().includes(query))
      .slice(0, MAX_HISTORY_ITEMS);
  }, [searchQuery, sortedSessions]);

  const canInstallApp = installSupported && !isStandaloneApp && !installingApp;

  const modePills = useMemo(() => {
    const pills = [activeCharacter.name];
    pills.push(webSearchMode ? "Live web on" : "Live web off");
    pills.push(researchMode ? "Pro research" : membershipPlan === "pro" ? "Pro ready" : "Free plan");
    pills.push(imageMode ? "Image drafting" : "Text drafting");
    if (attachments.length) pills.push(`${attachments.length} file${attachments.length > 1 ? "s" : ""} attached`);
    return pills;
  }, [activeCharacter.name, webSearchMode, researchMode, membershipPlan, imageMode, attachments.length]);

  const showTyping = useMemo(() => {
    if (!isTyping) return false;
    const last = activeMessages[activeMessages.length - 1];
    return !last || last.role !== "assistant" || !text(last.content);
  }, [activeMessages, isTyping]);

  // Callbacks
  const handleSelectCharacter = useCallback((character) => {
    const nextId = normalizeCharacterId(character?.id, characterOptions);
    const targetId = activeSession?.id;
    if (!targetId) return;

    if (character?.access === "pro" && membershipPlan !== "pro") {
      showErrorToast(`${character.name} is available on Luna Pro only.`);
      return;
    }

    updateSession(targetId, (s) => ({ ...s, characterId: nextId, updatedAt: nowIso() }));

    const conversationId = text(activeSession?.backendConversationId || activeSession?.id);
    if (isSignedIn && conversationId) {
      fetchApi(`/api/history/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: nextId }),
      }, { includeAuth: true }).catch(() => null);
    }
  }, [activeSession, characterOptions, isSignedIn, membershipPlan, showErrorToast, updateSession]);

  const handleSelectSession = useCallback((id) => {
    setActiveSessionId(id);
    setMobileSidebarOpen(false);
    const target = sessions.find((s) => s.id === id);
    const convId = text(target?.backendConversationId || target?.id);
    if (convId) loadConversationMessages(id, convId);
  }, [loadConversationMessages, sessions, setActiveSessionId]);

  const handleCreateProject = useCallback(() => {
    const name = text(newProjectName);
    if (!name) return;
    const project = { id: createId("project"), name, createdAt: nowIso() };
    setProjects((prev) => [project, ...prev]);
    setExpandedProjectId(project.id);
    setNewProjectName("");
    setNewProjectOpen(false);
  }, [newProjectName]);

  const handleInstallLuna = useCallback(async () => {
    if (installPromptEvent) {
      setInstallingApp(true);
      try {
        await installPromptEvent.prompt();
        await installPromptEvent.userChoice;
      } catch {
        setToast({ id: createId("toast"), message: "Install prompt could not be opened." });
      } finally {
        setInstallPromptEvent(null);
        setInstallSupported(false);
        setInstallingApp(false);
      }
      return;
    }
    if (showIosInstallHint) {
      setToast({ id: createId("toast"), message: "On iPhone or iPad, tap Share and choose Add to Home Screen." });
      return;
    }

    const nativeDownload = getPrimaryNativeDownload();
    if (nativeDownload?.href) {
      window.location.assign(nativeDownload.href);
      return;
    }

    setToast({ id: createId("toast"), message: "Install is not available in this browser yet." });
  }, [installPromptEvent, showIosInstallHint]);

  const handleRetry = useCallback(async () => {
    if (!lastRetryPayload) return;
    setToast(null);
    await sendMessage(lastRetryPayload.prompt, {
      regenerate: lastRetryPayload.type === "regenerate",
      applyToggles: lastRetryPayload.type !== "regenerate",
      sessionId: lastRetryPayload.sessionId,
    });
  }, [lastRetryPayload, sendMessage]);

  const handleToggleResearchMode = useCallback(() => {
    if (membershipPlan !== "pro") {
      showErrorToast("Research mode is available on Luna Pro only.");
      return;
    }
    setResearchMode((prev) => !prev);
  }, [membershipPlan, showErrorToast]);

  const handleExportSession = useCallback(() => {
    if (membershipPlan !== "pro") {
      showErrorToast("Chat export is available on Luna Pro only.");
      return;
    }
    if (!activeSession || activeMessages.length === 0) {
      showErrorToast("There is no chat to export yet.");
      return;
    }

    const markdown = exportSessionToMarkdown(activeSession);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeTitle = (text(activeSession.title) || "luna-chat").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    anchor.href = url;
    anchor.download = `${safeTitle || "luna-chat"}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    setToast({ id: createId("toast"), message: "Chat exported to Markdown." });
  }, [activeMessages.length, activeSession, membershipPlan, showErrorToast]);

  // Effects
  useEffect(() => {
    const sync = () => hydrateUser().then(() => setUser(loadUser())).catch(() => setUser(loadUser()));
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("luna-auth-changed", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("luna-auth-changed", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    let canceled = false;
    const loadMembership = async () => {
      if (!isSignedIn) {
        if (!canceled) { setMembershipPlan("free"); setResearchMode(false); }
        return;
      }
      const res = await fetchApi("/api/profile");
      if (canceled) return;
      const plan = res.ok && res.data?.membership?.plan === "pro" ? "pro" : "free";
      setMembershipPlan(plan);
      if (plan !== "pro") setResearchMode(false);
    };
    loadMembership();
    return () => { canceled = true; };
  }, [isSignedIn, user?.email]);

  useEffect(() => {
    let canceled = false;
    const loadOnboarding = async () => {
      const isGuest = !user?.email || user.email === "guest@luna.ai";
      if (isGuest) { if (!canceled) setOnboardingState({ loading: false, answered: true }); return; }
      setOnboardingState((p) => ({ ...p, loading: true }));
      const res = await fetchApi("/api/onboarding/status");
      if (canceled) return;
      setOnboardingState({ loading: false, answered: res.ok && Boolean(res.data?.answered) });
    };
    loadOnboarding();
    return () => { canceled = true; };
  }, [user?.email]);

  useEffect(() => {
    const listEnd = document.getElementById("list-end");
    if (listEnd) listEnd.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeMessages, isTyping]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator?.userAgent || "";
    const isIos = /iPad|iPhone|iPod/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    setShowIosInstallHint(isIos && isSafari && !window.navigator?.standalone);
    const onPrompt = (e) => { e.preventDefault(); setInstallPromptEvent(e); setInstallSupported(true); };
    const onInstalled = () => { setInstallPromptEvent(null); setInstallSupported(false); setInstallingApp(false); setIsStandaloneApp(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  useEffect(() => {
    let timer;
    if (toast) timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let canceled = false;
    const loadChars = async () => {
      if (!isSignedIn) { setCharacterOptions(CHARACTER_OPTIONS); return; }
      const res = await fetchApi("/api/characters", {}, { includeAuth: true });
      if (canceled || !res.ok) return;
      setCharacterOptions(hydrateCharacterOptions(res.data?.characters));
      setMembershipPlan(res.data?.membership?.plan === "pro" ? "pro" : "free");
    };
    loadChars();
    return () => { canceled = true; };
  }, [isSignedIn]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#071013] text-zinc-100 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl rounded-[32px] border border-[#1f3135] bg-[linear-gradient(180deg,rgba(9,16,19,0.96),rgba(7,12,14,0.98))] p-8 text-center shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#5c857d]/30 bg-[#143038]">
            <img src={brandLogo} alt="Luna Logo" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-white">Sign in to access the Luna workspace</h1>
          <p className="mt-2 text-sm text-[#8ca19d]">Persistent workspace layout with history and preferences.</p>
          <div className="mt-6 flex justify-center">
            <button onClick={() => navigate("/signin")} className="rounded-full bg-[linear-gradient(135deg,#e1ba6d,#a77f36)] px-6 py-2 text-sm font-semibold text-[#102126] hover:brightness-105">
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const visibleMain = activeMessages.length > 0 || historyLoading;

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative min-h-[100dvh] overflow-hidden bg-[#071013] text-[#eef6f3]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        .luna-scrollbar { scrollbar-width: thin; scrollbar-color: #21353a transparent; }
        .luna-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .luna-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .luna-scrollbar::-webkit-scrollbar-thumb { background: #21353a; border-radius: 999px; }
        @keyframes lunaDot { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-4px); opacity: 1; } }
        .luna-dot { animation: lunaDot 1s ease-in-out infinite; }
        @keyframes lunaWave { 0%, 100% { transform: scaleY(0.65); opacity: 0.7; } 50% { transform: scaleY(1); opacity: 1; } }
        .luna-wave { animation: lunaWave 0.8s ease-in-out infinite; transform-origin: bottom; }
        @keyframes lunaFadeLift { 0% { opacity: 0; transform: translateY(12px) scale(0.985); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        .luna-fade-lift { animation: lunaFadeLift 0.42s cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(71,120,112,0.25),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(225,186,109,0.12),transparent_24%),radial-gradient(circle_at_50%_45%,rgba(18,47,51,0.65),transparent_58%)]" />

      <div className="relative z-10 flex min-h-[100dvh]">
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          brandLogo={brandLogo}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          navigate={navigate}
          createFreshSession={createFreshSession}
          historyList={historyList}
          activeSession={activeSession}
          handleSelectSession={handleSelectSession}
          handleDeleteSession={handleDeleteSession}
          user={user}
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
        />

        <section className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-white/6 px-3 py-3 md:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <button onClick={() => setMobileSidebarOpen(true)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#274149] bg-[#0f1f24] text-[#d2e7e2]">
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#7a938e]">Luna Workspace</p>
                <h1 className="truncate text-base font-semibold text-[#f4f8f7]" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {activeSession?.title || "New chat"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(canInstallApp || showIosInstallHint) && <InstallLunaButton compact onInstall={handleInstallLuna} disabled={installingApp} />}
              <button onClick={() => createFreshSession()} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#274149] bg-[#0f1f24] text-[#d2e7e2]">
                <Plus className="h-4 w-4" />
              </button>
              <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} />
            </div>
          </div>

          <div className="mx-auto w-full max-w-7xl px-3 pt-3 md:px-6 md:pt-4">
            <AnnouncementBanner className="mb-3" />
          </div>
          
          <div className="mx-auto hidden w-full max-w-7xl items-center justify-between px-3 md:flex md:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#78938d]">Workspace briefing</p>
                <h1 className="truncate text-2xl font-semibold text-[#f5f8f7]" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {activeSession?.title || "New chat"}
                </h1>
              </div>
              <div className="hidden lg:flex items-center gap-2">
                {modePills.map((pill) => <span key={pill} className="rounded-full border border-[#274149] bg-[#0f1f24] px-3 py-1 text-xs text-[#d0e2de]">{pill}</span>)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(canInstallApp || showIosInstallHint) && <InstallLunaButton onInstall={handleInstallLuna} disabled={installingApp} />}
              <div className="rounded-full border border-[#274149] bg-[#0f1f24] px-3 py-1.5 text-xs text-[#8fb0aa]">{formatDateLabel()}</div>
              <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} />
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden px-3 pb-3 pt-2 md:px-6">
            {!onboardingState.loading && !onboardingState.answered && (
              <div className="mb-6 flex justify-center"><OnboardingFlow onComplete={() => setOnboardingState({ loading: false, answered: true })} /></div>
            )}
            <AnimatePresence mode="wait">
              {!visibleMain ? (
                <WelcomeView
                  user={user}
                  activeCharacter={activeCharacter}
                  canInstallApp={canInstallApp}
                  showIosInstallHint={showIosInstallHint}
                  handleInstallLuna={handleInstallLuna}
                  installingApp={installingApp}
                  characterSearchQuery={characterSearchQuery}
                  setCharacterSearchQuery={setCharacterSearchQuery}
                  filteredCharacterOptions={filteredCharacterOptions}
                  activeSession={activeSession}
                  handleSelectCharacter={handleSelectCharacter}
                  membershipPlan={membershipPlan}
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  sendMessage={sendMessage}
                  isTranscribing={isTranscribing}
                  isTyping={isTyping}
                  voiceActive={voiceActive}
                  handleVoiceToggle={toggleVoice}
                  webSearchMode={webSearchMode}
                  researchMode={researchMode}
                  imageMode={imageMode}
                  setWebSearchMode={setWebSearchMode}
                  handleToggleResearchMode={handleToggleResearchMode}
                  setImageMode={setImageMode}
                  handleExportSession={handleExportSession}
                  setAttachments={setAttachments}
                  attachments={attachments}
                />
              ) : (
                <ChatView
                  activeSession={activeSession}
                  activeCharacter={activeCharacter}
                  modePills={modePills}
                  historyLoading={historyLoading}
                  characterSearchQuery={characterSearchQuery}
                  setCharacterSearchQuery={setCharacterSearchQuery}
                  filteredCharacterOptions={filteredCharacterOptions}
                  handleSelectCharacter={handleSelectCharacter}
                  membershipPlan={membershipPlan}
                  activeMessages={activeMessages}
                  latestAssistantId={latestAssistantId}
                  copyMessage={(c) => { navigator.clipboard.writeText(c); setToast({ id: createId("t"), message: "Copied" }); }}
                  regenerateLatest={regenerateLatest}
                  showTyping={showTyping}
                  listEndRef={(el) => { if (el) el.scrollIntoView({ behavior: "smooth" }); }}
                  setInputValue={setInputValue}
                />
              )}
            </AnimatePresence>
          </div>

          {visibleMain && (
            <div className="border-t border-white/6 bg-[#071013]/92 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-6">
              <div className="mx-auto max-w-5xl xl:max-w-7xl">
                <Composer
                  value={inputValue}
                  onChange={setInputValue}
                  onSend={() => sendMessage(null, { inputValue })}
                  disabled={isTranscribing}
                  sendDisabled={isTyping || isTranscribing}
                  voiceActive={voiceActive}
                  transcribing={isTranscribing}
                  onToggleVoice={toggleVoice}
                  webSearch={webSearchMode}
                  researchMode={researchMode}
                  imageMode={imageMode}
                  onToggleWebSearch={() => setWebSearchMode((prev) => !prev)}
                  onToggleResearchMode={handleToggleResearchMode}
                  onToggleImageMode={() => setImageMode((prev) => !prev)}
                  onExport={handleExportSession}
                  onAttach={(f) => setAttachments((p) => [...p, ...f])}
                  attachments={attachments}
                  onRemoveAttachment={(i) => setAttachments((p) => p.filter((_, idx) => idx !== i))}
                  isPro={membershipPlan === "pro"}
                />
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Project Modal */}
      <AnimatePresence>
        {newProjectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-[28px] border border-[#1f3135] bg-[#091013] p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Create Project</h3>
                <button onClick={() => setNewProjectOpen(false)} className="p-1.5"><X className="h-4 w-4" /></button>
              </div>
              <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Project name" className="w-full rounded-2xl border border-[#1f3135] bg-[#0c1719] px-3 py-2 outline-none" />
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setNewProjectOpen(false)} className="px-3 py-1.5 text-sm">Cancel</button>
                <button onClick={handleCreateProject} className="rounded-xl bg-[#e1ba6d]/20 px-3 py-1.5 text-sm text-[#f3dfae]">Create</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, x: 26 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="fixed bottom-5 right-5 z-[70] w-[min(92vw,360px)] rounded-2xl border border-[#1f3135] bg-[#0a1214] p-3 text-sm shadow-2xl">
            <p>{toast.message}</p>
            <div className="mt-2 flex justify-end gap-2">
              {lastRetryPayload && <button onClick={handleRetry} className="text-[#f5dfad] text-xs">Retry</button>}
              <button onClick={() => setToast(null)} className="text-xs">Dismiss</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
