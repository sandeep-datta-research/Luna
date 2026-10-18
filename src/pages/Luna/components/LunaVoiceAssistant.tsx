import { useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

type NativeVoiceEvent = { transcript?: string; status?: string };
type LunaNativeVoice = {
  startWakeWord(): Promise<void>;
  stopWakeWord(): Promise<void>;
  speakText(options: { text: string }): Promise<void>;
  stopSpeech(): Promise<void>;
  openMedia(options: { service: "spotify" | "youtube"; query?: string }): Promise<{ opened: boolean }>;
  addListener(
    eventName: "wakeWord" | "command" | "status",
    listenerFunc: (event: NativeVoiceEvent) => void,
  ): Promise<{ remove: () => Promise<void> }>;
};
const NativeLunaVoice = registerPlugin<LunaNativeVoice>("LunaVoice");

type VoiceMessage = {
  role?: string;
  content?: unknown;
  text?: unknown;
  parts?: unknown[];
  id?: string;
  streaming?: boolean;
};

function messageText(message: VoiceMessage | undefined) {
  if (!message) return "";
  const value = message.content ?? message.text ?? message.parts;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((part: any) => typeof part === "string" ? part : part?.text || "").join(" ");
  }
  return "";
}

export function LunaVoiceAssistant({
  messages = [],
  isTyping = false,
  onCommand,
}: {
  messages?: VoiceMessage[];
  isTyping?: boolean;
  onCommand?: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(() =>
    typeof window !== "undefined" && window.localStorage.getItem("luna-anime-tts") !== "off"
  );
  const [status, setStatus] = useState("Voice off");
  const recognitionRef = useRef<any>(null);
  const nativeMode = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  const lastSpokenRef = useRef("");
  const speakingRef = useRef(false);
  const ignoreUntilRef = useRef(0);
  const onCommandRef = useRef(onCommand);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  const speak = (text: string) => {
    if (!text.trim()) return;
    if (nativeMode) {
      speakingRef.current = true;
      void NativeLunaVoice.speakText({ text: text.slice(0, 3500) }).catch(() => {
        if ("speechSynthesis" in window) {
          const fallback = new SpeechSynthesisUtterance(text.slice(0, 3500));
          fallback.pitch = 1.22;
          fallback.rate = 1.03;
          fallback.onend = () => { speakingRef.current = false; };
          fallback.onerror = () => { speakingRef.current = false; };
          window.speechSynthesis.speak(fallback);
        } else {
          speakingRef.current = false;
        }
      });
      return;
    }
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 3500));
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) =>
      /female|samantha|aria|jenny|zira|kyoko|nanami|sora|haruka/i.test(item.name) && /^en/i.test(item.lang)
    ) || voices.find((item) => /^en/i.test(item.lang));
    if (voice) utterance.voice = voice;
    utterance.pitch = 1.22;
    utterance.rate = 1.03;
    utterance.volume = 1;
    speakingRef.current = true;
    utterance.onend = () => { speakingRef.current = false; };
    utterance.onerror = () => { speakingRef.current = false; };
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!speakReplies || isTyping || !messages.length) return;
    const latest = [...messages].reverse().find((item) => item?.role === "assistant" || item?.role === "model");
    if (!latest || latest.streaming) return;
    const text = messageText(latest).replace(/\s+/g, " ").trim();
    const key = String(latest.id || text) + ":" + text;
    if (!text || key === lastSpokenRef.current) return;
    // Wait until streaming is complete, then speak the completed answer instead of partial tokens.
    const timer = window.setTimeout(() => {
      if (lastSpokenRef.current === key) return;
      lastSpokenRef.current = key;
      speak(text);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [messages, speakReplies, isTyping]);

  useEffect(() => {
    if (!nativeMode) return;
    let disposed = false;
    let wakeHandle: { remove: () => Promise<void> } | undefined;
    let commandHandle: { remove: () => Promise<void> } | undefined;
    let statusHandle: { remove: () => Promise<void> } | undefined;

    NativeLunaVoice.addListener("wakeWord", () => {
      setStatus("Luna is awake. Ask your question.");
    }).then((handle) => {
      if (disposed) void handle.remove();
      else wakeHandle = handle;
    }).catch(() => {});

    NativeLunaVoice.addListener("command", (event) => {
      const command = event?.transcript?.trim();
      if (command) handleSpeech(command, true);
    }).then((handle) => {
      if (disposed) void handle.remove();
      else commandHandle = handle;
    }).catch(() => {});

    NativeLunaVoice.addListener("status", (event) => {
      if (event?.status) {
        setStatus(String(event.status));
        if (/listening is off|unavailable|unable to start|microphone permission/i.test(event.status)) {
          setListening(false);
        }
      }
    }).then((handle) => {
      if (disposed) void handle.remove();
      else statusHandle = handle;
    }).catch(() => {});

    return () => {
      disposed = true;
      void wakeHandle?.remove();
      void commandHandle?.remove();
      void statusHandle?.remove();
    };
  }, [nativeMode]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        speakingRef.current = false;
      }
    };
  }, []);

  const openMedia = (service: "spotify" | "youtube", query = "") => {
    if (nativeMode) {
      void NativeLunaVoice.openMedia({ service, query }).catch(() => {
        const encoded = encodeURIComponent(query.trim());
        const url = service === "spotify"
          ? (query ? `https://open.spotify.com/search/${encoded}` : "https://open.spotify.com/")
          : (query ? `https://www.youtube.com/results?search_query=${encoded}` : "https://www.youtube.com/");
        window.location.href = url;
      });
      return;
    }

    const encoded = encodeURIComponent(query.trim());
    if (service === "spotify") {
      const webUrl = query ? `https://open.spotify.com/search/${encoded}` : "https://open.spotify.com/";
      window.location.href = query ? `spotify:search:${encoded}` : "spotify:";
      window.setTimeout(() => {
        if (!document.hidden) window.location.href = webUrl;
      }, 900);
    } else {
      const url = query
        ? `https://www.youtube.com/results?search_query=${encoded}`
        : "https://www.youtube.com/";
      window.location.href = url;
    }
  };

  const handleSpeech = (raw: string, fromNative = false) => {
    if ((!fromNative && speakingRef.current) || Date.now() < ignoreUntilRef.current) return;
    let command = raw.trim();
    if (!command) return;

    const wake = command.match(/\bhey\s+(?:luna|loona)\b[,.:;!? -]*/i);
    if (!fromNative && wake) {
      const remainder = command.slice(wake.index! + wake[0].length).trim();
      if (!remainder) {
        setStatus("Hai! I'm here. Ask your question.");
        speak("Hai! I'm here. What shall we do?");
        ignoreUntilRef.current = Date.now() + 2500;
        return;
      }
      command = remainder;
    } else if (!fromNative && /^luna[.!?]*$/i.test(command)) {
      setStatus("Hai! I'm here. Ask your question.");
      speak("Hai! I'm here. What shall we do?");
      ignoreUntilRef.current = Date.now() + 2500;
      return;
    }

    const lower = command.toLowerCase();
    if (/^(?:stop listening|turn off wake word|disable wake word)$/.test(lower)) {
      if (nativeMode) {
        void NativeLunaVoice.stopWakeWord().catch(() => {});
      } else {
        recognitionRef.current?.stop?.();
        recognitionRef.current = null;
      }
      setListening(false);
      setStatus("Voice activation turned off.");
      return;
    }

    if (/stop talking|mute luna|mute voice replies/.test(lower)) {
      if (nativeMode) void NativeLunaVoice.stopSpeech().catch(() => {});
      else window.speechSynthesis?.cancel();
      speakingRef.current = false;
      setSpeakReplies(false);
      localStorage.setItem("luna-anime-tts", "off");
      setStatus("Voice replies muted.");
      return;
    }

    const spotifyOn = lower.match(/^(?:play|open|launch|start)\s+(.+?)\s+(?:on|in)\s+spotify[.!?]*$/i);
    const spotifyApp = lower.match(/^(?:play|open|launch|start)\s+(?:on\s+)?spotify(?:\s+(.+))?[.!?]*$/i);
    if (spotifyOn || spotifyApp) {
      const query = (spotifyOn?.[1] || spotifyApp?.[1] || "").replace(/^(?:the song|song|music)\s+/i, "").trim();
      openMedia("spotify", query);
      setStatus(query ? `Opening Spotify search for ${query}.` : "Opening Spotify.");
      return;
    }

    const youtubeOn = lower.match(/^(?:play|open|launch|search|start)\s+(.+?)\s+(?:on|in)\s+youtube[.!?]*$/i);
    const youtubeApp = lower.match(/^(?:play|open|launch|search|start)\s+(?:on\s+)?youtube(?:\s+(.+))?[.!?]*$/i);
    if (youtubeOn || youtubeApp) {
      const query = (youtubeOn?.[1] || youtubeApp?.[1] || "").trim();
      openMedia("youtube", query);
      setStatus(query ? `Searching YouTube for ${query}.` : "Opening YouTube.");
      return;
    }

    setStatus("Sending your voice message to Luna…");
    onCommandRef.current?.(command);
  };

  const toggleListening = async () => {
    if (nativeMode) {
      try {
        if (listening) {
          await NativeLunaVoice.stopWakeWord();
          setListening(false);
          setStatus("Wake-word listening is off.");
        } else {
          await NativeLunaVoice.startWakeWord();
          setListening(true);
          setStatus("Starting Android voice service…");
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not start native voice service.");
        setListening(false);
      }
      return;
    }

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
    recognition.onerror = (event: any) => {
      setStatus(event.error === "not-allowed"
        ? "Allow microphone access to use voice."
        : "Voice paused — tap the mic to retry.");
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
      setStatus('Say “Hey Luna” or ask a question. Media commands can open Spotify and YouTube.');
    } catch {
      setStatus("Couldn't start the microphone. Tap to retry.");
    }
  };

  const toggleTts = () => {
    const next = !speakReplies;
    setSpeakReplies(next);
    localStorage.setItem("luna-anime-tts", next ? "on" : "off");
    if (!next) {
      if (nativeMode) void NativeLunaVoice.stopSpeech().catch(() => {});
      else window.speechSynthesis?.cancel();
      speakingRef.current = false;
    } else {
      speak("Voice mode is ready, senpai!");
    }
  };

  return (
    <div className="fixed bottom-24 right-3 z-[65] flex max-w-[calc(100vw-24px)] flex-col items-end gap-2 sm:bottom-5 sm:right-5">
      {listening && (
        <div className="max-w-[min(340px,calc(100vw-24px))] rounded-2xl border border-[#8fb6ff]/30 bg-[#080d1c]/95 px-3 py-2 text-xs text-[#e3eaff] shadow-xl" role="status">
          {status}
          <div className="mt-1 text-[10px] text-[#9caed7]">
            {nativeMode
              ? "Android foreground microphone service. A persistent notification stays visible; Android may still restrict background use."
              : "Browser voice needs Luna open in the foreground."}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-2xl border border-[#34446d] bg-[#0b1122]/95 p-2 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={toggleTts}
          title={speakReplies ? "Mute anime-style voice replies" : "Enable anime-style voice replies"}
          aria-label={speakReplies ? "Mute voice replies" : "Enable voice replies"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#35466f] text-[#dce6ff]"
        >
          {speakReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={toggleListening}
          title={listening ? "Stop voice commands" : "Enable Hey Luna voice commands"}
          aria-label={listening ? "Stop voice commands" : "Enable Hey Luna voice commands"}
          className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold ${listening ? "bg-[#8fb6ff] text-[#081020]" : "bg-[#182544] text-[#edf3ff]"}`}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {listening ? "Listening" : "Hey Luna"}
        </button>
      </div>
      {!listening && (
        <span className="max-w-[270px] rounded-lg bg-[#080d1c]/90 px-2 py-1 text-[10px] text-[#b9c7e8]">
          Anime-style TTS · {nativeMode ? "Android wake-word service" : "foreground voice"} · Spotify & YouTube shortcuts
        </span>
      )}
    </div>
  );
}
