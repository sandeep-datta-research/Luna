import { motion } from "framer-motion";
import { Sparkles, Wand2 } from "lucide-react";
import { CharacterCards } from "./CharacterCards";
import { CharacterStarterPrompts } from "./CharacterStarterPrompts";
import { Composer } from "./Composer";
import { NativeAppDownloads } from "@/components/NativeAppDownloads";
import { InstallLunaButton } from "./InstallLunaButton";
import { QUICK_CHIPS } from "../constants";

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
  const firstName = user?.name ? user.name.split(" ")[0] : "there";

  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      className="py-2 md:py-4"
    >
      <div className="mx-auto grid w-full max-w-[1500px] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-[var(--luna-border)] bg-[var(--luna-surface)] p-4 md:p-5">
          <div className="rounded-2xl border border-[var(--luna-border)] bg-[var(--luna-panel)] p-4 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--luna-border-strong)] bg-[var(--luna-surface-2)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--luna-muted)]">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--luna-accent)]" />
                  Luna workspace
                </span>
                <h2 className="mt-4 max-w-[16ch] text-[1.9rem] font-semibold leading-tight text-[var(--luna-text)] md:text-[2.7rem]" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {firstName}, start a cleaner thread with {activeCharacter.name}.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--luna-muted)] md:text-base">
                  Pick a character, choose a starter if you want one, then send a focused prompt. The same Luna features are here without the clutter.
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:min-w-[240px] lg:items-end">
                <NativeAppDownloads />
                {canInstallApp || showIosInstallHint ? <InstallLunaButton onInstall={handleInstallLuna} disabled={installingApp} /> : null}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="rounded-2xl border border-[var(--luna-border)] bg-[var(--luna-surface-2)] p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--luna-subtle)]">Character board</p>
                    <p className="mt-1 text-sm text-[var(--luna-muted)]">Choose the voice for this thread, then use a starter prompt if it helps.</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--luna-border-strong)] bg-[var(--luna-panel)] px-3 py-1.5 text-xs text-[var(--luna-text)]">
                    <Wand2 className="h-3.5 w-3.5" />
                    Active: {activeCharacter.name}
                  </span>
                </div>

                <input
                  value={characterSearchQuery}
                  onChange={(event) => setCharacterSearchQuery(event.target.value)}
                  placeholder="Search characters"
                  className="mb-3 w-full rounded-xl border border-[var(--luna-border-strong)] bg-[var(--luna-panel)] px-4 py-3 text-sm text-[var(--luna-text)] outline-none focus:border-[var(--luna-accent)]"
                />

                <CharacterCards
                  compact
                  options={filteredCharacterOptions}
                  selectedCharacterId={activeSession?.characterId}
                  onSelect={handleSelectCharacter}
                  isPro={membershipPlan === "pro"}
                />

                <CharacterStarterPrompts prompts={activeCharacter.starterPrompts} onSelect={(prompt) => setInputValue(prompt)} />
              </div>

              <div className="rounded-2xl border border-[var(--luna-border)] bg-[var(--luna-surface-2)] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--luna-subtle)]">Quick prompts</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setInputValue(chip.prompt)}
                      className="rounded-full border border-[var(--luna-border-strong)] bg-[var(--luna-panel)] px-3 py-2 text-xs text-[var(--luna-text)] transition hover:border-[var(--luna-accent)] hover:bg-[var(--luna-panel-raised)]"
                    >
                      <span className="mr-1.5 text-[var(--luna-accent-2)]">{chip.icon}</span>
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5">
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
                onToggleWebSearch={() => setWebSearchMode((prev) => !prev)}
                onToggleResearchMode={handleToggleResearchMode}
                onToggleImageMode={() => setImageMode((prev) => !prev)}
                onExport={handleExportSession}
                onAttach={(files) => setAttachments((prev) => [...prev, ...files])}
                attachments={attachments}
                onRemoveAttachment={(index) => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                isPro={membershipPlan === "pro"}
              />
            </div>
          </div>
        </section>

        <aside className="hidden xl:block">
          <div className="rounded-2xl border border-[var(--luna-border)] bg-[var(--luna-surface)] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--luna-subtle)]">Current character</p>
            <div className="mt-4 rounded-2xl border border-[var(--luna-border)] bg-[var(--luna-panel)] p-4">
              <span className="inline-flex h-16 w-14 overflow-hidden rounded-2xl border border-[var(--luna-border-strong)]">
                <img src={activeCharacter.portrait} alt={activeCharacter.name} className="h-full w-full object-cover" />
              </span>
              <h3 className="mt-4 text-xl font-semibold text-[var(--luna-text)]" style={{ fontFamily: "'Syne', sans-serif" }}>
                {activeCharacter.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--luna-muted)]">{activeCharacter.description}</p>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
