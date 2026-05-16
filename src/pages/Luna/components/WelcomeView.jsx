import { motion } from "framer-motion";
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
  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="flex h-full flex-col items-center justify-center py-6 md:py-10"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center xl:max-w-7xl">
        <div className="luna-fade-lift w-full rounded-[36px] border border-[#1f3135] bg-[linear-gradient(180deg,rgba(9,16,19,0.92),rgba(7,12,14,0.98))] px-5 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.24)] md:px-10 md:py-12 xl:px-12">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-3 text-center text-[11px] uppercase tracking-[0.26em] text-[#88a7a1]"
          >
            Luna Chat
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", duration: 0.7 }}
            className="mx-auto mb-3 max-w-[18ch] text-center text-[2rem] font-semibold leading-tight text-[#f5f8f7] sm:text-[2.4rem] md:text-[3rem]"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Hi {user?.name ? user.name.split(" ")[0] : "there"}, what should {activeCharacter.name} help you with?
          </motion.h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-7 text-[#90a7a2] md:text-base">
            Ask for research, writing, debugging, strategy, summaries, or image prompts. The composer stays centered so you can get straight to work.
          </p>
          <div className="mb-6 flex flex-col items-center gap-3">
            <NativeAppDownloads />
            {(canInstallApp || showIosInstallHint) ? (
              <InstallLunaButton onInstall={handleInstallLuna} disabled={installingApp} />
            ) : null}
          </div>
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#88a7a1]">Character Mode</p>
                <p className="mt-1 text-sm text-[#9ab3ae]">Pick who users talk to before the thread starts.</p>
              </div>
              <span className="rounded-full border border-[#274149] bg-[#102126] px-3 py-1 text-xs text-[#d7e8e5]">
                Active: {activeCharacter.name}
              </span>
            </div>
            <div className="mb-3">
              <input
                value={characterSearchQuery}
                onChange={(event) => setCharacterSearchQuery(event.target.value)}
                placeholder="Search character board..."
                className="w-full rounded-2xl border border-[#274149] bg-[#0c1719] px-4 py-2.5 text-sm text-[#e7f0ee] outline-none placeholder:text-[#69807b]"
              />
            </div>
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

          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05 } },
            }}
            className="luna-scrollbar mt-5 flex w-full flex-wrap justify-center gap-2 pb-1"
          >
            {QUICK_CHIPS.map((chip) => (
              <motion.button
                key={chip.label}
                whileTap={{ scale: 0.97 }}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                onClick={() => setInputValue(chip.prompt)}
                className="rounded-full border border-[#274149] bg-[#0f1f24] px-3 py-2 text-xs text-[#d7e8e5] transition duration-150 hover:-translate-y-0.5 hover:border-[#4f7c75] hover:bg-[#102126]"
              >
                <span className="mr-1.5 text-[#e1ba6d]">{chip.icon}</span>
                {chip.label}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
