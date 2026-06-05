import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, Loader2, PanelRight, Sparkles } from "lucide-react";
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

function EmptyThread() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--luna-border)] bg-[var(--luna-surface-2)] px-5 py-10 text-center">
      <p className="text-sm font-medium text-[var(--luna-text)]">No messages yet.</p>
      <p className="mt-2 text-sm leading-6 text-[var(--luna-muted)]">Start the thread with a prompt, a file, or a character starter.</p>
    </div>
  );
}

function RailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--luna-border)] bg-[var(--luna-surface)] p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--luna-subtle)]">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
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
  const [showMobileRail, setShowMobileRail] = useState(false);

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

  return (
    <motion.div
      key={activeSession?.id || "chat-view"}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="luna-scrollbar relative h-full overflow-y-auto"
    >
      <div className="mx-auto grid w-full max-w-[1500px] gap-4 pb-8 pt-1 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <section className="mb-4 rounded-2xl border border-[var(--luna-border-strong)] bg-[var(--luna-surface)] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.18)]">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-[var(--luna-border)] bg-[var(--luna-panel)]">
                    <img src={activeCharacter.portrait} alt={activeCharacter.name} className="h-full w-full object-cover" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--luna-subtle)]">Active character</p>
                    <p className="truncate text-base font-semibold text-[var(--luna-text)]">{activeCharacter.name}</p>
                    <p className="truncate text-xs text-[var(--luna-muted)]">Updated {formatHistoryTime(activeSession?.updatedAt)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMobileRail((prev) => !prev)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--luna-border)] bg-[var(--luna-panel)] px-4 text-sm text-[var(--luna-text)] xl:hidden"
                >
                  <PanelRight className="h-4 w-4" />
                  {showMobileRail ? "Hide tools" : "Open tools"}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {modePills.map((pill) => (
                  <span key={pill} className="rounded-full border border-[var(--luna-border)] bg-[var(--luna-panel)] px-3 py-1.5 text-xs text-[var(--luna-text)]">
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <AnimatePresence>
            {showMobileRail ? (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 xl:hidden"
              >
                <RailCard title="Character tools">
                  <input
                    value={characterSearchQuery}
                    onChange={(event) => setCharacterSearchQuery(event.target.value)}
                    placeholder="Search characters"
                    className="mb-3 w-full rounded-xl border border-[var(--luna-border)] bg-[var(--luna-panel)] px-4 py-3 text-sm text-[var(--luna-text)] outline-none focus:border-[var(--luna-accent)]"
                  />
                  <CharacterCards
                    options={filteredCharacterOptions}
                    selectedCharacterId={activeSession?.characterId}
                    onSelect={handleSelectCharacter}
                    isPro={membershipPlan === "pro"}
                  />
                  <CharacterStarterPrompts
                    prompts={activeCharacter.starterPrompts}
                    onSelect={(prompt: string) => setInputValue(prompt)}
                  />
                </RailCard>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <section className="mx-auto max-w-[880px]">
            {historyLoading ? (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--luna-border-strong)] bg-[var(--luna-panel-raised)] px-4 py-3 text-sm text-[var(--luna-text)] shadow-[0_10px_24px_rgba(0,0,0,0.14)]">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--luna-accent)]" />
                Loading chat history...
              </div>
            ) : null}

            {!historyLoading && activeMessages.length === 0 ? <EmptyThread /> : null}

            <div aria-live="polite" aria-atomic="false" className="space-y-6">
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

        <aside className="hidden xl:block">
          <div className="sticky top-4 space-y-4">
            <RailCard title="Character tools">
              <div className="rounded-2xl border border-[var(--luna-border-strong)] bg-[var(--luna-panel-raised)] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.14)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-16 w-14 shrink-0 overflow-hidden rounded-2xl border border-[var(--luna-border-strong)]">
                    <img src={activeCharacter.portrait} alt={activeCharacter.name} className="h-full w-full object-cover" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-[var(--luna-text)]">{activeCharacter.name}</p>
                    <p className="mt-1 text-sm leading-5 text-[var(--luna-muted)]">{activeCharacter.tagline}</p>
                  </div>
                </div>
              </div>

              <input
                value={characterSearchQuery}
                onChange={(event) => setCharacterSearchQuery(event.target.value)}
                placeholder="Search characters"
                className="mt-3 w-full rounded-xl border border-[var(--luna-border)] bg-[var(--luna-panel)] px-4 py-3 text-sm text-[var(--luna-text)] outline-none focus:border-[var(--luna-accent)]"
              />

              <div className="mt-3">
                <CharacterCards
                  options={filteredCharacterOptions}
                  selectedCharacterId={activeSession?.characterId}
                  onSelect={handleSelectCharacter}
                  isPro={membershipPlan === "pro"}
                />
              </div>

              <CharacterStarterPrompts
                prompts={activeCharacter.starterPrompts}
                onSelect={(prompt: string) => setInputValue(prompt)}
              />
            </RailCard>

            <RailCard title="Thread help">
            <div className="rounded-2xl border border-[var(--luna-border-strong)] bg-[var(--luna-panel-raised)] px-4 py-3 text-sm leading-6 text-[var(--luna-muted)] shadow-[0_10px_24px_rgba(0,0,0,0.14)]">
                <div className="flex items-center gap-2 text-[var(--luna-text)]">
                  <Sparkles className="h-4 w-4 text-[var(--luna-accent)]" />
                  <span className="font-medium">Use the same tools, with less noise.</span>
                </div>
                <p className="mt-2">Pick a character, use a starter prompt, then send a focused request in the composer below.</p>
              </div>
            </RailCard>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {showScrollBottom ? (
          <motion.button
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            onClick={scrollToBottom}
            className={`fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--luna-border-strong)] bg-[var(--luna-panel-raised)] text-[var(--luna-text)] shadow-[0_14px_28px_rgba(0,0,0,0.32)] xl:right-[364px] ${hasNewMessage ? "ring-2 ring-[var(--luna-accent)]" : ""}`}
            title="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
