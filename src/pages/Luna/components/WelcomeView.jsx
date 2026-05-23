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
      className="py-3 md:py-5"
    >
      <div className="mx-auto grid w-full max-w-[1560px] gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[28px] border border-[#1d3036] bg-[#0c171a] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] md:p-6">
          <div className="rounded-[24px] border border-[#21343a] bg-[#102126] p-4 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#294249] bg-[#0f1b1f] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#b9cfca]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Fresh workspace
                </span>
                <h2 className="mt-4 max-w-[16ch] text-[2rem] font-semibold leading-[1.05] text-[#f6fbfa] md:text-[3rem]" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {firstName}, build the next thread with {activeCharacter.name}.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#d2e2de] md:text-base">
                  Start with a sharper canvas. Draft, research, debug, and explore with the same Luna features, but in a calmer workspace built for longer sessions.
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:min-w-[240px] lg:items-end">
                <NativeAppDownloads />
                {canInstallApp || showIosInstallHint ? (
                  <InstallLunaButton onInstall={handleInstallLuna} disabled={installingApp} />
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-[22px] border border-[#21343a] bg-[#0f1b1f] p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#b9cfca]">Character board</p>
                    <p className="mt-1 text-sm text-[#d2e2de]">Pick the tone before the thread starts, then use starter prompts to accelerate the first message.</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#294249] bg-[#102126] px-3 py-1.5 text-xs text-[#eef7f4]">
                    <Wand2 className="h-3.5 w-3.5" />
                    Active: {activeCharacter.name}
                  </span>
                </div>

                <input
                  value={characterSearchQuery}
                  onChange={(event) => setCharacterSearchQuery(event.target.value)}
                  placeholder="Search character board"
                  className="mb-3 w-full rounded-[18px] border border-[#21343a] bg-[#102126] px-4 py-3 text-sm text-[#edf5f2] outline-none transition focus:border-[#7fc7ba]/70"
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

              <div className="rounded-[22px] border border-[#21343a] bg-[#0f1b1f] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#b9cfca]">Quick launch</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setInputValue(chip.prompt)}
                      className="rounded-full border border-[#294249] bg-[#102126] px-3 py-2 text-xs text-[#eef7f4] transition hover:border-[#7fc7ba]/60 hover:bg-[#13242a]"
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
          <div className="rounded-[28px] border border-[#1d3036] bg-[#0c171a] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#b9cfca]">Current mode</p>
            <div className="mt-4 rounded-[22px] border border-[#21343a] bg-[#102126] p-4">
              <span className="inline-flex h-16 w-14 overflow-hidden rounded-[18px] border border-white/10">
                <img src={activeCharacter.portrait} alt={activeCharacter.name} className="h-full w-full object-cover" />
              </span>
              <h3 className="mt-4 text-xl font-semibold text-[#f4faf8]" style={{ fontFamily: "'Syne', sans-serif" }}>
                {activeCharacter.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#d2e2de]">{activeCharacter.description}</p>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
