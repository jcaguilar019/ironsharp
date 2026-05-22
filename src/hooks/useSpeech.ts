import { useCallback, useEffect, useRef, useState } from "react";

// Browser-native TTS + STT wrappers. Free, works in Chrome/Edge/Safari.

export const ttsSupported = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

export const sttSupported = () =>
  typeof window !== "undefined" &&
  // @ts-ignore
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!ttsSupported() || !text) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 0.95;
    u.onend = () => {
      setSpeaking(false);
      onEnd?.();
    };
    u.onerror = () => {
      setSpeaking(false);
      onEnd?.();
    };
    utterRef.current = u;
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }, []);

  const cancel = useCallback(() => {
    if (ttsSupported()) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  return { speak, cancel, speaking };
}

export function useSTT() {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const start = useCallback(() => {
    if (!sttSupported()) return;
    // @ts-ignore
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setTranscript((finalText + interim).trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setTranscript("");
    setListening(true);
    rec.start();
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { transcript, listening, start, stop, setTranscript };
}