import { motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { CharacterCards } from "./CharacterCards";
import { CharacterStarterPrompts } from "./CharacterStarterPrompts";
import { Composer } from "./Composer";
import { NativeAppDownloads } from "@/components/NativeAppDownloads";
import { InstallLunaButton } from "./InstallLunaButton";
import { QUICK_CHIPS } from "../constants";
import "../premium-chat.css";

export function WelcomeView({
  user,
  activeCharacter,
  canInstallApp,
  showIosInstallHint,
  handleInstallLuna,
  installingApp,
  characterSearchQuery,
  setCharacterSearchQuery,
  filteredCharacterOptions,
  activeSession,
  handleSelectCharacter,
  membershipPlan,
  inputValue,
  setInputValue,
  sendMessage,
  isTranscribing,
  isTyping,
  voiceActive,
  handleVoiceToggle,
  webSearchMode,
  researchMode,
  imageMode,
  setWebSearchMode,
  handleToggleResearchMode,
  setImageMode,
  handleExportSession,
  setAttachments,
  attachments,
}) {
  const firstName = user?.name ? user.name.split(" ")[0] : "";
  const featuredPrompts = QUICK_CHIPS;

  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
      className="luna-welcome-scroll luna-scrollbar h-full overflow-y-auto"
    >
      <div className="luna-welcome-column px-1 md:px-3">
        <section className="luna-welcome-hero">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="luna-welcome-eyebrow">Luna · your thinking space</span>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <NativeAppDownloads />
              </div>
              {canInstallApp || showIosInstallHint ? (
                <InstallLunaButton
                  compact
                  onInstall={handleInstallLuna}
                  disabled={installingApp}
                />
              ) : null}
            </div>
          </div>
          <h2 className="luna-welcome-title">
            {firstName ? `What’s on your mind, ${firstName}?` : "What’s on your mind?"}
          </h2>
          <p className="luna-welcome-copy">
            A calmer space to explore ideas, make things, and solve difficult problems.
            Start with a prompt or simply ask Luna anything.
          </p>
        </section>

        <section className="luna-welcome-section">
          <div className="luna-section-heading">
            <div>
              <h3 className="luna-section-title">Choose your Luna</h3>
              <p className="luna-section-subtitle">Each persona brings a different style to the conversation.</p>
            </div>
            <span className="hidden rounded-full border border-[var(--luna-border)] px-2.5 py-1 text-[10px] text-[var(--luna-subtle)] sm:inline-flex">
              {activeCharacter.name} selected
            </span>
          </div>

          <label className="relative mb-3 block max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--luna-subtle)]" />
            <input
              value={characterSearchQuery}
              onChange={(event) => setCharacterSearchQuery(event.target.value)}
              placeholder="Search personas…"
              aria-label="Search personas"
              className="w-full rounded-xl border border-[var(--luna-border)] bg-[var(--luna-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--luna-text)] outline-none focus:border-[var(--luna-accent)]"
            />
          </label>

          <CharacterCards
            compact
            options={filteredCharacterOptions}
            selectedCharacterId={activeSession?.characterId}
            onSelect={handleSelectCharacter}
            isPro={membershipPlan === "pro"}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--luna-subtle)]">
              Try a starter
            </span>
            <CharacterStarterPrompts
              prompts={activeCharacter.starterPrompts}
              onSelect={(prompt) => setInputValue(prompt)}
            />
          </div>
        </section>

        <section className="luna-welcome-composer">
          <Composer
            compact
            value={inputValue}
            onChange={setInputValue}
            onSend={() => sendMessage(null, { inputValue })}
            disabled={isTranscribing}
            sendDisabled={isTyping || isTranscribing}
            voiceActive={voiceActive}
            transcribing={isTranscribing}
            onToggleVoice={handleVoiceToggle}
            webSearch={webSearchMode}
            researchMode={researchMode}
            imageMode={imageMode}
            onToggleWebSearch={() => setWebSearchMode((previous) => !previous)}
            onToggleResearchMode={handleToggleResearchMode}
            onToggleImageMode={() => setImageMode((previous) => !previous)}
            onExport={handleExportSession}
            onAttach={(files) => setAttachments((previous) => [...previous, ...files])}
            attachments={attachments}
            onRemoveAttachment={(index) => setAttachments((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
            isPro={membershipPlan === "pro"}
          />
          <p className="luna-welcome-footnote">
            <Sparkles className="mr-1 inline-block h-3 w-3" />
            {membershipPlan === "pro"
              ? "Luna Pro tools are ready when you need them."
              : "Tip: Enter sends your message · Shift + Enter adds a new line."}
          </p>
        </section>

        <section className="luna-welcome-section pb-2">
          <div className="luna-section-heading">
            <div>
              <h3 className="luna-section-title">A head start, if you need it</h3>
              <p className="luna-section-subtitle">Choose a starting point and Luna will put it in the composer.</p>
            </div>
          </div>
          <div className="luna-quick-prompts">
            {featuredPrompts.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setInputValue(chip.prompt)}
                className="luna-quick-prompt"
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
