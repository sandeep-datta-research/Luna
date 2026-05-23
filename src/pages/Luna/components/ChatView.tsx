import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, Loader2, Sparkles } from "lucide-react";
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
    <div className="space-y-5 px-1 py-4">
      <div className="flex justify-end">
        <div className="h-14 w-[65%] rounded-[26px] rounded-br-md bg-[linear-gradient(135deg,rgba(127,199,186,0.22),rgba(60,115,105,0.22))]" />
      </div>
      <div className="w-[88%] space-y-2">
        <div className="h-4 w-28 rounded-full bg-white/8" />
        <div className="h-24 rounded-[28px] rounded-bl-md bg-white/[0.04]" />
      </div>
      <div className="flex justify-end">
        <div className="h-12 w-[46%] rounded-[26px] rounded-br-md bg-[linear-gradient(135deg,rgba(127,199,186,0.22),rgba(60,115,105,0.22))]" />
      </div>
    </div>
  );
}

function RailCard({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[30px] border border-white/6 bg-[linear-gradient(180deg,rgba(10,20,24,0.94),rgba(7,14,17,0.98))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.18)]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#7f9a94]">{title}</p>
      {body ? <p className="mt-2 text-sm leading-6 text-[#96afa9]">{body}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
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
  const [showMobileRail, setShowMobileRail] = useState(false);
  const previousCountRef = useRef(activeMessages.length);

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
    const isNearBottom = distanceToBottom < 120;
    setShowScrollBottom(!isNearBottom);
    if (isNearBottom) setHasNewMessage(false);
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.24 }}
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="luna-scrollbar relative h-full overflow-y-auto"
    >
      <div className="mx-auto grid w-full max-w-[1560px] gap-6 pb-8 pt-2 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <section className="sticky top-0 z-20 mb-4 rounded-[28px] border border-white/6 bg-[linear-gradient(180deg,rgba(9,18,21,0.94),rgba(7,14,17,0.9))] p-3 shadow-[0_14px_32px_rgba(0,0,0,0.14)] backdrop-blur-xl md:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <div className="inline-flex min-w-0 items-center gap-3 rounded-[20px] border border-[#2c454b] bg-[#102126] px-3 py-2">
                  <span className="inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-white/10">
                    <img src={activeCharacter.portrait} alt={activeCharacter.name} className="h-full w-full object-cover" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#84a7a0]">Thread voice</p>
                    <p className="truncate text-sm font-semibold text-[#eef7f4]">{activeCharacter.name}</p>
                  </div>
                </div>

                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-[#90aaa5]">
                  Updated {formatHistoryTime(activeSession?.updatedAt)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {modePills.map((pill) => (
                  <span key={pill} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-[#d5e7e3]">
                    {pill}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setShowMobileRail((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-[#d7ebe7] xl:hidden"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {showMobileRail ? "Hide controls" : "Open controls"}
                </button>
              </div>
            </div>
          </section>

          <AnimatePresence>
            {showMobileRail ? (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 space-y-4 xl:hidden"
              >
                <RailCard title="Character Board" body={`This thread currently speaks as ${activeCharacter.name}.`}>
                  <input
                    value={characterSearchQuery}
                    onChange={(event) => setCharacterSearchQuery(event.target.value)}
                    placeholder="Search character board"
                    className="mb-3 w-full rounded-[18px] border border-white/8 bg-[#0b171a] px-4 py-3 text-sm text-[#e7f1ef] outline-none focus:border-[#7fc7ba]/70"
                  />
                  <CharacterCards
                    options={filteredCharacterOptions}
                    selectedCharacterId={activeSession?.characterId}
                    onSelect={handleSelectCharacter}
                    isPro={membershipPlan === "pro"}
                  />
                </RailCard>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <section className="mx-auto max-w-[960px] pb-12">
            {historyLoading ? (
              <div className="mb-5 flex items-center gap-3 rounded-[22px] border border-white/6 bg-white/[0.03] px-4 py-3 text-sm text-[#dcece9]">
                <Loader2 className="h-4 w-4 animate-spin text-[#7fc7ba]" />
                Loading your chats...
              </div>
            ) : null}

            {activeMessages.length === 0 && !historyLoading ? <ChatSkeleton /> : null}

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
          <div className="sticky top-3 space-y-4">
            <RailCard
              title="Character Board"
              body={`This thread currently speaks as ${activeCharacter.name}. Swap voice, prompts, and style without leaving the conversation.`}
            >
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-16 w-14 shrink-0 overflow-hidden rounded-[18px] border border-white/10">
                    <img src={activeCharacter.portrait} alt={activeCharacter.name} className="h-full w-full object-cover" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-[#eef7f4]">{activeCharacter.name}</p>
                    <p className="mt-1 text-xs leading-5 text-[#8ca59f]">{activeCharacter.tagline}</p>
                  </div>
                </div>
                <CharacterStarterPrompts
                  prompts={activeCharacter.starterPrompts}
                  onSelect={(prompt: string) => setInputValue(prompt)}
                />
              </div>

              <input
                value={characterSearchQuery}
                onChange={(event) => setCharacterSearchQuery(event.target.value)}
                placeholder="Search character board"
                className="mt-3 w-full rounded-[18px] border border-white/8 bg-[#0b171a] px-4 py-3 text-sm text-[#e7f1ef] outline-none focus:border-[#7fc7ba]/70"
              />

              <div className="mt-3">
                <CharacterCards
                  options={filteredCharacterOptions}
                  selectedCharacterId={activeSession?.characterId}
                  onSelect={handleSelectCharacter}
                  isPro={membershipPlan === "pro"}
                />
              </div>
            </RailCard>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {showScrollBottom ? (
          <motion.button
            initial={{ opacity: 0, scale: 0.84, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.84, y: 10 }}
            onClick={scrollToBottom}
            className={`fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#325057] bg-[#143038] text-[#edf7f4] shadow-[0_14px_34px_rgba(0,0,0,0.28)] transition hover:border-[#7fc7ba] md:right-6 xl:right-[388px] ${hasNewMessage ? "ring-2 ring-[#7fc7ba]/50" : ""}`}
            title="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
