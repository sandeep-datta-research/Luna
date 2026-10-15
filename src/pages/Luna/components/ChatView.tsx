import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, Loader2, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { CharacterCards } from "./CharacterCards";
import { CharacterStarterPrompts } from "./CharacterStarterPrompts";
import { formatHistoryTime } from "../utils";
import "../premium-chat.css";

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

function EmptyThread() {
  return (
    <div className="luna-empty-thread">
      <Sparkles className="mx-auto mb-3 h-5 w-5 text-[var(--luna-accent)]" />
      <p className="text-sm font-medium text-[var(--luna-text)]">Your conversation starts here.</p>
      <p className="mt-2 text-sm leading-6">Ask a question, share a file, or choose a prompt to get moving.</p>
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
  const previousCountRef = useRef(activeMessages.length);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [showCharacterTools, setShowCharacterTools] = useState(false);

  useEffect(() => {
    if (activeMessages.length > previousCountRef.current && showScrollBottom) {
      setHasNewMessage(true);
    }
    previousCountRef.current = activeMessages.length;
  }, [activeMessages.length, showScrollBottom]);

  const handleScroll = () => {
    const node = scrollContainerRef.current;
    if (!node) return;
    const distanceToBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    const nearBottom = distanceToBottom < 120;
    setShowScrollBottom(!nearBottom);
    if (nearBottom) setHasNewMessage(false);
  };

  const scrollToBottom = () => {
    const node = scrollContainerRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    setHasNewMessage(false);
  };

  const activeModes = modePills.filter((pill) =>
    pill === "Live web on" ||
    pill === "Pro research" ||
    pill === "Pro ready" ||
    pill === "Image drafting" ||
    /\d+ files? attached/.test(pill)
  );

  return (
    <motion.div
      key={activeSession?.id || "chat-view"}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="luna-chat-scroll luna-scrollbar relative h-full min-h-0 overflow-y-auto"
    >
      <div className="luna-chat-column mx-auto w-full max-w-[880px] pb-8 pt-2">
        <section className="luna-context-row flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="luna-context-avatar inline-flex shrink-0">
              <img src={activeCharacter.portrait} alt={activeCharacter.name} />
            </span>
            <div className="min-w-0">
              <p className="luna-context-eyebrow">Chatting with</p>
              <p className="luna-context-name truncate">{activeCharacter.name}</p>
              <p className="luna-context-description">{activeCharacter.tagline} · Updated {formatHistoryTime(activeSession?.updatedAt)}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCharacterTools((previous) => !previous)}
            aria-expanded={showCharacterTools}
            aria-controls="luna-character-tools"
            className="luna-soft-button shrink-0"
          >
            {showCharacterTools ? <X className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
            <span>{showCharacterTools ? "Close" : "Persona & prompts"}</span>
          </button>
        </section>

        {activeModes.length > 0 ? (
          <div className="luna-active-modes" aria-label="Active chat modes">
            {activeModes.map((pill) => <span key={pill}>{pill}</span>)}
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {showCharacterTools ? (
            <motion.section
              id="luna-character-tools"
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="luna-persona-panel overflow-hidden"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--luna-text)]">Personalize this chat</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--luna-muted)]">Change Luna’s style or start from a suggested prompt.</p>
                </div>
                <span className="rounded-full border border-[var(--luna-border)] bg-[var(--luna-panel)] px-2.5 py-1 text-[10px] text-[var(--luna-subtle)]">
                  {membershipPlan === "pro" ? "Luna Pro" : "Free"}
                </span>
              </div>
              <label className="relative mb-3 block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--luna-subtle)]" />
                <input
                  value={characterSearchQuery}
                  onChange={(event) => setCharacterSearchQuery(event.target.value)}
                  placeholder="Find a persona…"
                  aria-label="Search personas"
                  className="w-full border px-10 py-2.5 text-sm text-[var(--luna-text)] outline-none"
                />
              </label>
              <CharacterCards
                compact
                options={filteredCharacterOptions}
                selectedCharacterId={activeSession?.characterId}
                onSelect={handleSelectCharacter}
                isPro={membershipPlan === "pro"}
              />
              <div className="mt-4 border-t border-[var(--luna-border)] pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--luna-subtle)]">Try asking</p>
                <CharacterStarterPrompts
                  prompts={activeCharacter.starterPrompts}
                  onSelect={(prompt: string) => {
                    setInputValue(prompt);
                    setShowCharacterTools(false);
                  }}
                />
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>

        <section className="luna-chat-thread">
          {historyLoading ? (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-[var(--luna-border)] bg-[var(--luna-surface)] px-4 py-3 text-sm text-[var(--luna-muted)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--luna-accent)]" />
              Loading your conversation…
            </div>
          ) : null}

          {!historyLoading && activeMessages.length === 0 ? <EmptyThread /> : null}

          <div aria-live="polite" aria-atomic="false" className="space-y-7">
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
        </section>
      </div>

      <AnimatePresence>
        {showScrollBottom ? (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            onClick={scrollToBottom}
            aria-label="Scroll to latest message"
            className={`fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--luna-border-strong)] bg-[var(--luna-panel-raised)] text-[var(--luna-text)] shadow-lg ${hasNewMessage ? "ring-2 ring-[var(--luna-accent)]" : ""}`}
          >
            <ArrowDown className="h-4 w-4" />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
