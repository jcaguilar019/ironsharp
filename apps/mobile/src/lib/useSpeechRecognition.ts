import { useCallback, useRef, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

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
    setError(null);
    setTranscript("");
    latest.current = "";
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError("permission_denied");
      return false;
    }
    setIsListening(true);
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: false,
    });
    return true;
  }, []);

  const stop = useCallback(() => {
    // Triggers the "end" event, which delivers the final transcript.
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { transcript, isListening, error, start, stop };
}
