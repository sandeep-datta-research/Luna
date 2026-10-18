import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

type VoiceMessage = { role?: string; content?: unknown; text?: unknown; parts?: unknown[]; id?: string };

function messageText(message: VoiceMessage | undefined) {
  if (!message) return "";
  const value = message.content ?? message.text ?? message.parts;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((part: any) => typeof part === "string" ? part : part?.text || "").join(" ");
  return "";
}

export function LunaVoiceAssistant({ messages = [] }: { messages?: VoiceMessage[] }) {
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(() => localStorage.getItem("luna-anime-tts") !== "off");
  const [status, setStatus] = useState("Voice off");
  const recognitionRef = useRef<any>(null);
  const lastSpokenRef = useRef("");

  const speak = (text: string) => {
    if (!("speechSynthesis" in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 3500));
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) => /female|samantha|aria|jenny|zira|kyoko|nanami|sora|haruka/i.test(item.name) && /^en/i.test(item.lang))
      || voices.find((item) => /^en/i.test(item.lang));
    if (voice) utterance.voice = voice;
    utterance.pitch = 1.22;
    utterance.rate = 1.03;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!speakReplies || !messages.length) return;
    const latest = [...messages].reverse().find((item) => item?.role === "assistant" || item?.role === "model");
    if (!latest) return;
    const text = messageText(latest).replace(/\s+/g, " ").trim();
    const key = String(latest.id || text);
    if (!text || key === lastSpokenRef.current) return;
    lastSpokenRef.current = key;
    // Wait briefly so streaming replies are less likely to be spoken token-by-token.
    const timer = window.setTimeout(() => speak(text), 900);
    return () => window.clearTimeout(timer);
  }, [messages, speakReplies]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const openMedia = (service: "spotify" | "youtube", query = "") => {
    const encoded = encodeURIComponent(query);
    if (service === "spotify") {
      const url = query ? `https://open.spotify.com/search/${encoded}` : "https://open.spotify.com/";
      window.location.href = `spotify://${query ? "search/" + encoded : ""}`;
      window.setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), 700);
    } else {
      const url = query ? `https://www.youtube.com/results?search_query=${encoded}` : "https://www.youtube.com/";
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleSpeech = (raw: string) => {
    const command = raw.toLowerCase().trim();
    if (command.includes("hey luna") || command.includes("hey, luna") || command === "luna") {
      setStatus("I'm listening ✨");
      speak("Hai! I'm here. What shall we do?");
      return;
    }
    const spotifyMatch = command.match(/(?:play|open|launch|start)\s+(?:on\s+)?spotify(?:\s+(?:play\s+)?(.+))?/i);
    if (spotifyMatch) {
      const query = (spotifyMatch[1] || "").replace(/^(?:the song|song|music)\s+/i, "").trim();
      openMedia("spotify", query);
      speak(query ? `Opening Spotify for ${query}.` : "Opening Spotify. Let's listen!");
      setStatus("Opening Spotify");
      return;
    }
    const youtubeMatch = command.match(/(?:play|open|launch|search|start)\s+(?:on\s+)?youtube(?:\s+(.+))?/i);
    if (youtubeMatch) {
      const query = (youtubeMatch[1] || "").trim();
      openMedia("youtube", query);
      speak(query ? `Searching YouTube for ${query}.` : "Opening YouTube.");
      setStatus("Opening YouTube");
      return;
    }
    if (command.includes("stop talking") || command.includes("mute luna")) {
      window.speechSynthesis.cancel();
      setSpeakReplies(false);
      localStorage.setItem("luna-anime-tts", "off");
      setStatus("Voice replies muted");
      return;
    }
    setStatus(`Heard: “${raw.slice(0, 60)}”`);
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (listening) {
      recognitionRef.current?.stop?.();
      recognitionRef.current = null;
      setListening(false);
      setStatus("Voice off");
      return;
    }
    if (!SpeechRecognition) {
      setStatus("Speech recognition isn't supported here. Try Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result?.isFinal) handleSpeech(result[0]?.transcript || "");
    };
    recognition.onerror = (event: any) => setStatus(event.error === "not-allowed" ? "Allow microphone access to use voice." : "Voice paused — tap the mic to retry.");
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
      setStatus('Say “Hey Luna”, “Play on Spotify”, or “Open YouTube”.');
    } catch {
      setStatus("Couldn't start the microphone. Tap to retry.");
    }
  };

  const toggleTts = () => {
    const next = !speakReplies;
    setSpeakReplies(next);
    localStorage.setItem("luna-anime-tts", next ? "on" : "off");
    if (!next) window.speechSynthesis?.cancel();
    else speak("Voice mode is ready, senpai!");
  };

  return (
    <div className="fixed bottom-24 right-3 z-[65] flex max-w-[calc(100vw-24px)] flex-col items-end gap-2 sm:bottom-5 sm:right-5">
      {listening && <div className="max-w-[min(340px,calc(100vw-24px))] rounded-2xl border border-[#8fb6ff]/30 bg-[#080d1c]/95 px-3 py-2 text-xs text-[#e3eaff] shadow-xl" role="status">{status}<div className="mt-1 text-[10px] text-[#9caed7]">Works while Luna stays open in the foreground.</div></div>}
      <div className="flex items-center gap-2 rounded-2xl border border-[#34446d] bg-[#0b1122]/95 p-2 shadow-2xl backdrop-blur-xl">
        <button type="button" onClick={toggleTts} title={speakReplies ? "Mute anime-style voice replies" : "Enable anime-style voice replies"} aria-label={speakReplies ? "Mute voice replies" : "Enable voice replies"} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#35466f] text-[#dce6ff]">
          {speakReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button type="button" onClick={toggleListening} title={listening ? "Stop voice commands" : "Enable Hey Luna voice commands"} aria-label={listening ? "Stop voice commands" : "Enable Hey Luna voice commands"} className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold ${listening ? "bg-[#8fb6ff] text-[#081020]" : "bg-[#182544] text-[#edf3ff]"}`}>
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {listening ? "Listening" : "Hey Luna"}
        </button>
      </div>
      {!listening && <span className="max-w-[270px] rounded-lg bg-[#080d1c]/90 px-2 py-1 text-[10px] text-[#b9c7e8]">Anime-style TTS · Spotify & YouTube voice shortcuts</span>}
    </div>
  );
}
