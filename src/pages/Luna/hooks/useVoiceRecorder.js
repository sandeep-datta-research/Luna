import { useState, useRef, useCallback, useEffect } from "react";
import { fetchApi } from "@/lib/api-client";
import { 
  VOICE_SILENCE_THRESHOLD, 
  VOICE_SILENCE_MS, 
  VOICE_MONITOR_INTERVAL_MS 
} from "../constants";
import { toBase64DataUrl, text } from "../utils";

export function useVoiceRecorder({ onTranscription, onError }) {
  const [voiceActive, setVoiceActive] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const analyserRef = useRef(null);
  const analyserDataRef = useRef(null);
  const silenceStartedAtRef = useRef(null);
  const silenceIntervalRef = useRef(null);
  const autoStoppedBySilenceRef = useRef(false);

  const clearVoiceSilenceMonitor = useCallback(() => {
    if (silenceIntervalRef.current) {
      window.clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }

    silenceStartedAtRef.current = null;
    analyserDataRef.current = null;

    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.disconnect();
      } catch {
        // no-op
      }
      audioSourceRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        // no-op
      }
      analyserRef.current = null;
    }

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") {
      audioContext.close().catch(() => {});
    }
  }, []);

  const stopMediaStreamTracks = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      mediaStreamRef.current = null;
    }
  }, []);

  const beginVoiceSilenceMonitor = useCallback(
    (stream, recorder) => {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        const context = new AudioContextClass();
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.1;
        source.connect(analyser);

        audioContextRef.current = context;
        audioSourceRef.current = source;
        analyserRef.current = analyser;
        analyserDataRef.current = new Uint8Array(analyser.fftSize);
        silenceStartedAtRef.current = null;

        silenceIntervalRef.current = window.setInterval(() => {
          if (!analyserRef.current || !analyserDataRef.current || !recorder || recorder.state === "inactive") {
            return;
          }

          analyserRef.current.getByteTimeDomainData(analyserDataRef.current);
          let sumSquares = 0;

          for (let index = 0; index < analyserDataRef.current.length; index += 1) {
            const value = (analyserDataRef.current[index] - 128) / 128;
            sumSquares += value * value;
          }

          const rms = Math.sqrt(sumSquares / analyserDataRef.current.length);
          const now = Date.now();

          if (rms < VOICE_SILENCE_THRESHOLD) {
            if (!silenceStartedAtRef.current) {
              silenceStartedAtRef.current = now;
            }

            if (now - silenceStartedAtRef.current >= VOICE_SILENCE_MS) {
              autoStoppedBySilenceRef.current = true;
              if (recorder.state !== "inactive") {
                recorder.stop();
              }
              setVoiceActive(false);
            }
          } else {
            silenceStartedAtRef.current = null;
          }
        }, VOICE_MONITOR_INTERVAL_MS);
      } catch {
        // no-op: recording still works without silence auto-stop
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      stopMediaStreamTracks();
      clearVoiceSilenceMonitor();
    };
  }, [clearVoiceSilenceMonitor, stopMediaStreamTracks]);

  const toggleVoice = useCallback(async () => {
    if (isTranscribing) return;

    if (voiceActive) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      autoStoppedBySilenceRef.current = false;
      clearVoiceSilenceMonitor();
      setVoiceActive(false);
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      onError("Microphone is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      autoStoppedBySilenceRef.current = false;

      const preferredType =
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported &&
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "";

      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setVoiceActive(false);
        clearVoiceSilenceMonitor();
        stopMediaStreamTracks();
        onError("Voice capture failed.");
      };

      recorder.onstop = async () => {
        setVoiceActive(false);
        clearVoiceSilenceMonitor();

        const blobType = preferredType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        audioChunksRef.current = [];
        stopMediaStreamTracks();

        if (!audioBlob || audioBlob.size < 128) {
          onError("Voice input was too short.");
          autoStoppedBySilenceRef.current = false;
          return;
        }

        setIsTranscribing(true);

        try {
          const audioBase64 = await toBase64DataUrl(audioBlob);
          const result = await fetchApi("/api/audio/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64,
              mimeType: blobType,
              fileName: `luna-audio-${Date.now()}.webm`
            }),
          });

          if (!result.ok) {
            throw new Error(result.message || "Transcription failed.");
          }

          const transcript = text(result.data?.text);
          if (!transcript) {
            throw new Error("No speech detected.");
          }

          onTranscription(transcript);
        } catch (error) {
          onError(error.message || "Could not transcribe audio.");
        } finally {
          setIsTranscribing(false);
          autoStoppedBySilenceRef.current = false;
        }
      };

      recorder.start();
      beginVoiceSilenceMonitor(stream, recorder);
      setVoiceActive(true);
    } catch (error) {
      onError(error.message || "Unable to access microphone.");
      clearVoiceSilenceMonitor();
      stopMediaStreamTracks();
      setVoiceActive(false);
    }
  }, [
    beginVoiceSilenceMonitor,
    clearVoiceSilenceMonitor,
    isTranscribing,
    onError,
    onTranscription,
    stopMediaStreamTracks,
    voiceActive,
  ]);

  return {
    voiceActive,
    isTranscribing,
    toggleVoice,
  };
}
