import { useCallback, useRef, useState } from "react";

// `expo-speech-recognition` is a native module that is NOT bundled in Expo Go —
// it requires a dev/standalone build. Importing it eagerly throws
// "Cannot find native module 'ExpoSpeechRecognition'" and crashes the whole app.
// Load it defensively so the app degrades gracefully (STT simply unavailable)
// instead of hard-crashing when the guided/commute screen opens in Expo Go.
let SpeechModule: typeof import("expo-speech-recognition") | null = null;
try {
  SpeechModule = require("expo-speech-recognition");
} catch {
  SpeechModule = null;
}

const ExpoSpeechRecognitionModule = SpeechModule?.ExpoSpeechRecognitionModule ?? null;
const nativeUseSpeechRecognitionEvent = SpeechModule?.useSpeechRecognitionEvent ?? null;

/** True only in a build that actually bundles the native speech module (i.e. not Expo Go). */
export const SPEECH_RECOGNITION_AVAILABLE =
  !!ExpoSpeechRecognitionModule && !!nativeUseSpeechRecognitionEvent;

// SPEECH_RECOGNITION_AVAILABLE is a module-level constant — it never changes at
// runtime — so this conditional hook call has a stable order across every render
// and is safe under the rules of hooks.
function useSpeechRecognitionEvent(event: string, handler: (e: any) => void) {
  if (SPEECH_RECOGNITION_AVAILABLE) {
    nativeUseSpeechRecognitionEvent!(event as never, handler as never);
  }
}

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

  useSpeechRecognitionEvent("result", (e) => {
    const t = e.results?.[0]?.transcript ?? "";
    latest.current = t;
    setTranscript(t);
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    onFinalRef.current?.(latest.current.trim());
  });

  useSpeechRecognitionEvent("error", (e) => {
    setError(String(e.error));
    setIsListening(false);
  });

  const start = useCallback(async () => {
    if (!SPEECH_RECOGNITION_AVAILABLE) {
      setError("unavailable");
      return false;
    }
    setError(null);
    setTranscript("");
    latest.current = "";
    const perm = await ExpoSpeechRecognitionModule!.requestPermissionsAsync();
    if (!perm.granted) {
      setError("permission_denied");
      return false;
    }
    setIsListening(true);
    ExpoSpeechRecognitionModule!.start({
      lang: "en-US",
      interimResults: true,
      continuous: false,
    });
    return true;
  }, []);

  const stop = useCallback(() => {
    if (!SPEECH_RECOGNITION_AVAILABLE) return;
    // Triggers the "end" event, which delivers the final transcript.
    ExpoSpeechRecognitionModule!.stop();
  }, []);

  return { transcript, isListening, error, start, stop };
}
