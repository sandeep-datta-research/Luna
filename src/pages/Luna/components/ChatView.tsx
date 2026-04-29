import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock3, Loader2, ArrowDown } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { CharacterCards } from "./CharacterCards";
import { CharacterStarterPrompts } from "./CharacterStarterPrompts";
import { formatHistoryTime } from "../utils";

interface ChatViewProps {
  activeSession: any;
  activeCharacter: any;
  modePills: string[];
  historyLoading: boolean;
  characterSearchQuery: string;
  setCharacterSearchQuery: (q: string) => void;
  filteredCharacterOptions: any[];
  handleSelectCharacter: (c: any) => void;
  membershipPlan: string;
  activeMessages: any[];
  latestAssistantId: string;
  copyMessage: (c: string) => void;
  regenerateLatest: () => void;
  showTyping: boolean;
  listEndRef: any;
  setInputValue: (val: string) => void;
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse px-2 py-4">
      <div className="flex justify-end">
        <div className="h-14 w-[60%] md:w-[40%] rounded-3xl rounded-br-sm bg-[linear-gradient(145deg,#327d74,#184f49)] opacity-40 shadow-sm" />
      </div>
      <div className="flex justify-start">
        <div className="flex w-[85%] flex-col gap-2 items-start">
          <div className="mb-0.5 ml-1 flex items-center gap-2">
            <div className="h-[26px] w-[26px] rounded-full bg-[#1f3135]/50" />
            <div className="h-3 w-20 rounded bg-[#1f3135]/50" />
          </div>
          <div className="h-24 w-full md:w-[70%] rounded-3xl rounded-bl-sm bg-[linear-gradient(180deg,rgba(18,27,31,0.6),rgba(12,20,23,0.6))] border border-[#1f3135]/30" />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="h-10 w-[45%] md:w-[30%] rounded-3xl rounded-br-sm bg-[linear-gradient(145deg,#327d74,#184f49)] opacity-40 shadow-sm" />
      </div>
    </div>
  );
}

export function ChatView({
  activeSession,
  activeCharacter,
  modePills,
  historyLoading,
  characterSearchQuery,
  setCharacterSearchQuery,
  filteredCharacterOptions,
  handleSelectCharacter,
  membershipPlan,
  activeMessages,
  latestAssistantId,
  copyMessage,
  regenerateLatest,
  showTyping,
  listEndRef,
  setInputValue,
}: ChatViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const prevMessageCountRef = useRef(activeMessages.length);

  useEffect(() => {
    // If a new message arrives and we are not at the bottom, flash the button
    if (activeMessages.length > prevMessageCountRef.current) {
      if (showScrollBottom) {
        setHasNewMessage(true);
      }
    }
    prevMessageCountRef.current = activeMessages.length;
  }, [activeMessages.length, showScrollBottom]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceToBottom < 120;
    
    setShowScrollBottom(!isAtBottom);
    if (isAtBottom) {
      setHasNewMessage(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
    setHasNewMessage(false);
  };

  return (
    <motion.div
      key={activeSession?.id || "messages"}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.25 }}
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="luna-scrollbar relative h-full overflow-y-auto pr-1"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-4 pb-6 pt-3 xl:grid-cols-[minmax(0,1.65fr)_360px] xl:items-start md:pb-8">
        <div className="min-w-0 relative">
          <div className="luna-fade-lift sticky top-0 z-10 mb-2 rounded-[28px] border border-[#1f3135] bg-[linear-gradient(180deg,rgba(9,16,19,0.95),rgba(7,12,14,0.9))] px-4 py-4 backdrop-blur xl:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#274149] bg-[#102126] px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-[#89aba4]">
                    <Zap className="h-3.5 w-3.5" />
                    Active workspace
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#6f5624] bg-[#2d2413] px-3 py-1 text-[11px] text-[#f0d79b]">
                    <Clock3 className="h-3.5 w-3.5" />
                    Updated {formatHistoryTime(activeSession?.updatedAt)}
                  </span>
                </div>
                <h2 className="truncate text-2xl font-semibold text-[#f4f8f7]" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {activeSession?.title || "New chat"}
                </h2>
                <p className="mt-1 text-sm text-[#89a49f]">
                  Use the controls below to shift between research, drafting, and media generation without leaving the thread.
                </p>
                <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-[#274149] bg-[#0f1f24] py-1 pl-1 pr-4">
                  <img
                    src={activeCharacter.portrait}
                    alt={activeCharacter.name}
                    className="h-10 w-10 rounded-full border border-white/10 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#84a7a0]">Character</p>
                    <p className="truncate text-sm font-medium text-[#edf5f2]">{activeCharacter.name}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {modePills.map((pill) => (
                  <span key={pill} className="rounded-full border border-[#274149] bg-[#0f1f24] px-3 py-1.5 text-xs text-[#d4e6e2] transition duration-300 hover:-translate-y-0.5 hover:border-[#4f7c75] hover:bg-[#102126]">
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {historyLoading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[#1f3135] bg-[#0b1518] px-4 py-3 text-sm text-[#d6e8e4]">
              <Loader2 className="h-4 w-4 animate-spin text-[#7fc7ba]" />
              Loading your chats...
            </div>
          ) : null}
          <div className="mb-2 rounded-[28px] border border-[#1f3135] bg-[linear-gradient(180deg,rgba(9,16,19,0.92),rgba(7,12,14,0.98))] p-4 xl:hidden">
            <button
              onClick={() => setIsMobileSwitchboardOpen(!isMobileSwitchboardOpen)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#84a7a0]">Character Switchboard</p>
                <p className="mt-1 text-sm text-[#97b0ab]">
                  Current: {activeCharacter.name}
                </p>
              </div>
              <span className="text-xs text-[#d7e8e5] bg-[#1a2b2f] px-3 py-1 rounded-full border border-[#274149]">
                {isMobileSwitchboardOpen ? "Close" : "Change"}
              </span>
            </button>
            <AnimatePresence>
              {isMobileSwitchboardOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mb-3">
                    <input
                      value={characterSearchQuery}
                      onChange={(event) => setCharacterSearchQuery(event.target.value)}
                      placeholder="Search character board..."
                      className="w-full rounded-2xl border border-[#274149] bg-[#0c1719] px-4 py-2.5 text-sm text-[#e7f0ee] outline-none placeholder:text-[#69807b]"
                    />
                  </div>
                  <CharacterCards
                    options={filteredCharacterOptions}
                    selectedCharacterId={activeSession?.characterId}
                    onSelect={(c) => { handleSelectCharacter(c); setIsMobileSwitchboardOpen(false); }}
                    isPro={membershipPlan === "pro"}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div aria-live="polite" aria-atomic="false">
            {activeMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                showLunaHeader={message.role === "assistant"}
                isLatestAssistant={message.id === latestAssistantId}
                onCopy={copyMessage}
                onRegenerate={regenerateLatest}
                character={activeCharacter}
              />
            ))}
          </div>

          {showTyping ? <TypingIndicator character={activeCharacter} /> : null}
          <div ref={listEndRef} className="h-2" />
        </div>
        <aside className="hidden xl:block">
          <div className="sticky top-3 space-y-4">
            <div className="rounded-[28px] border border-[#1f3135] bg-[linear-gradient(180deg,rgba(9,16,19,0.95),rgba(7,12,14,0.98))] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#84a7a0]">Character Switchboard</p>
              <p className="mt-1 text-sm text-[#97b0ab]">
                This thread speaks as {activeCharacter.name}. Switch styles without leaving desktop chat.
              </p>
              <div className="mt-3 rounded-[24px] border border-[#274149] bg-[#0f1f24] p-3">
                <div className="flex items-center gap-3">
                  <img
                    src={activeCharacter.portrait}
                    alt={activeCharacter.name}
                    className="h-16 w-14 rounded-[16px] border border-white/10 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#84a7a0]">Active character</p>
                    <p className="truncate text-base font-semibold text-[#edf5f2]">{activeCharacter.name}</p>
                    <p className="mt-1 text-xs text-[#9ab3ae]">{activeCharacter.tagline}</p>
                  </div>
                </div>
                <CharacterStarterPrompts
                  prompts={activeCharacter.starterPrompts}
                  onSelect={(prompt: string) => setInputValue(prompt)}
                />
              </div>
              <div className="mt-3">
                <input
                  value={characterSearchQuery}
                  onChange={(event) => setCharacterSearchQuery(event.target.value)}
                  placeholder="Search character board..."
                  className="w-full rounded-2xl border border-[#274149] bg-[#0c1719] px-4 py-2.5 text-sm text-[#e7f0ee] outline-none placeholder:text-[#69807b]"
                />
              </div>
              <div className="mt-3">
                <CharacterCards
                  options={filteredCharacterOptions}
                  selectedCharacterId={activeSession?.characterId}
                  onSelect={handleSelectCharacter}
                  isPro={membershipPlan === "pro"}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={scrollToBottom}
            className={`fixed bottom-24 right-6 xl:right-[380px] z-50 flex h-10 w-10 items-center justify-center rounded-full border border-[#2d474e] bg-[#112024] text-[#a4b5b2] shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all hover:border-[#4f7c75] hover:text-[#e4f0ed] ${hasNewMessage ? "ring-2 ring-emerald-500/50" : ""}`}
            title="Scroll to bottom"
          >
            <ArrowDown className="h-5 w-5" />
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
