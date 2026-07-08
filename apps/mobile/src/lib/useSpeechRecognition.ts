import { useCallback, useRef, useState } from "react";
import { logError } from "./logger";

// Same crash-guard as notifications.ts: expo-speech-recognition's native module
// doesn't exist in Expo Go, and expo-router evaluates every route at startup —
// an unguarded import here takes down the whole app behind the splash screen.
// In a dev/EAS build the require succeeds and behavior is unchanged.
type SpeechModule = typeof import("expo-speech-recognition");

let speech: SpeechModule | null = null;
try {
  speech = require("expo-speech-recognition");
} catch (err) {
  logError("speech:init", err);
}

// `speech` is fixed for the app's lifetime, so hook count stays consistent
// across renders even though the call is conditional.
const useSpeechEvent: SpeechModule["useSpeechRecognitionEvent"] = speech
  ? speech.useSpeechRecognitionEvent
  : () => {};

type Options = {
  /** Fires once with the captured transcript when a turn ends (silence or stop). */
  onFinal?: (text: string) => void;
};

/**
 * On-device live speech-to-text. `continuous: false` lets iOS auto-stop on a
 * natural pause, which is what drives the hands-free "speak, then it moves on"
 * flow. The latest interim transcript is what we keep — iOS doesn't always emit
 * a separate final result before `end`.
 */
export function useSpeechRecognition({ onFinal }: Options = {}) {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latest = useRef("");
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useSpeechEvent("result", (e) => {
    const t = e.results?.[0]?.transcript ?? "";
    latest.current = t;
    setTranscript(t);
  });

  useSpeechEvent("end", () => {
    setIsListening(false);
    onFinalRef.current?.(latest.current.trim());
  });

  useSpeechEvent("error", (e) => {
    setError(String(e.error));
    setIsListening(false);
  });

  const start = useCallback(async () => {
    setError(null);
    setTranscript("");
    latest.current = "";
    if (!speech) {
      setError("unavailable");
      return false;
    }
    const perm = await speech.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError("permission_denied");
      return false;
    }
    setIsListening(true);
    speech.ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: false,
    });
    return true;
  }, []);

  const stop = useCallback(() => {
    // Triggers the "end" event, which delivers the final transcript.
    speech?.ExpoSpeechRecognitionModule.stop();
  }, []);

  return { transcript, isListening, error, start, stop };
}
