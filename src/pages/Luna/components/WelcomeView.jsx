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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="py-4 md:py-6"
    >
      <div className="mx-auto grid w-full max-w-[1560px] gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[38px] border border-white/6 bg-[linear-gradient(180deg,rgba(9,18,21,0.96),rgba(7,13,16,1))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.22)] md:p-7">
          <div className="rounded-[30px] border border-white/6 bg-[radial-gradient(circle_at_top_left,rgba(127,199,186,0.12),transparent_38%),linear-gradient(180deg,rgba(16,33,38,0.94),rgba(9,18,21,0.96))] p-5 md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#2b4348] bg-[#11252a] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#8faca6]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Fresh workspace
                </span>
                <h2 className="mt-4 max-w-[16ch] text-[2.35rem] font-semibold leading-[1.02] text-[#f6fbfa] md:text-[3.3rem]" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {firstName}, build the next thread with {activeCharacter.name}.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#91aaa4] md:text-base">
                  Start with a sharper canvas. Draft, research, debug, and explore with the same Luna features, but in a calmer workspace built for longer sessions.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:items-end">
                <NativeAppDownloads />
                {canInstallApp || showIosInstallHint ? (
                  <InstallLunaButton onInstall={handleInstallLuna} disabled={installingApp} />
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-[28px] border border-white/6 bg-[#0b171a]/90 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#82a29b]">Character board</p>
                    <p className="mt-1 text-sm text-[#96afa9]">Pick the tone before the thread starts, then use starter prompts to accelerate the first message.</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-[#def0ec]">
                    <Wand2 className="h-3.5 w-3.5" />
                    Active: {activeCharacter.name}
                  </span>
                </div>

                <input
                  value={characterSearchQuery}
                  onChange={(event) => setCharacterSearchQuery(event.target.value)}
                  placeholder="Search character board"
                  className="mb-3 w-full rounded-[18px] border border-white/8 bg-[#0c171a] px-4 py-3 text-sm text-[#edf5f2] outline-none transition focus:border-[#7fc7ba]/70"
                />

                <CharacterCards
                  compact
                  options={filteredCharacterOptions}
                  selectedCharacterId={activeSession?.characterId}
                  onSelect={handleSelectCharacter}
                  isPro={membershipPlan === "pro"}
                />

                <CharacterStarterPrompts
                  prompts={activeCharacter.starterPrompts}
                  onSelect={(prompt) => setInputValue(prompt)}
                />
              </div>

              <div className="rounded-[28px] border border-white/6 bg-[#0b171a]/90 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#82a29b]">Quick launch</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setInputValue(chip.prompt)}
                      className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-[#d6e8e3] transition hover:border-[#7fc7ba]/60 hover:bg-white/[0.05]"
                    >
                      <span className="mr-1.5 text-[#e1ba6d]">{chip.icon}</span>
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
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
          <div className="rounded-[34px] border border-white/6 bg-[linear-gradient(180deg,rgba(9,18,21,0.96),rgba(7,13,16,1))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#7f9a94]">Current mode</p>
            <div className="mt-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <span className="inline-flex h-16 w-14 overflow-hidden rounded-[18px] border border-white/10">
                <img src={activeCharacter.portrait} alt={activeCharacter.name} className="h-full w-full object-cover" />
              </span>
              <h3 className="mt-4 text-xl font-semibold text-[#f4faf8]" style={{ fontFamily: "'Syne', sans-serif" }}>
                {activeCharacter.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#8ea6a1]">{activeCharacter.description}</p>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
