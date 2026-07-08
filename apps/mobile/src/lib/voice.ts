import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The OpenAI (ChatGPT) voices the server TTS route allows, with short blurbs for
 * the picker. Order = rough fit for a calm devotional read, best-first. Keep the
 * ids in sync with the VOICES allow-list in apps/server/src/routes/tts.ts.
 */
export const TTS_VOICES = [
  { id: "sage", label: "Sage", blurb: "Calm & warm" },
  { id: "onyx", label: "Onyx", blurb: "Deep & steady" },
  { id: "fable", label: "Fable", blurb: "Expressive narrator" },
  { id: "coral", label: "Coral", blurb: "Bright & gentle" },
  { id: "ash", label: "Ash", blurb: "Warm & natural" },
  { id: "ballad", label: "Ballad", blurb: "Soft & measured" },
  { id: "alloy", label: "Alloy", blurb: "Neutral & even" },
  { id: "echo", label: "Echo", blurb: "Smooth & mellow" },
  { id: "nova", label: "Nova", blurb: "Friendly & bright" },
  { id: "shimmer", label: "Shimmer", blurb: "Light & soft" },
  { id: "verse", label: "Verse", blurb: "Rich & versatile" },
] as const;

export type VoiceId = (typeof TTS_VOICES)[number]["id"];

const VALID = new Set<string>(TTS_VOICES.map((v) => v.id));
export const DEFAULT_VOICE: VoiceId = "sage";
const STORAGE_KEY = "@ironsharp/tts_voice";

export function voiceLabel(id: string): string {
  return TTS_VOICES.find((v) => v.id === id)?.label ?? "Sage";
}

/**
 * The user's chosen read-aloud voice, persisted per-device. Starts at the default
 * and hydrates from storage on mount; setVoice writes through immediately.
 */
export function useVoicePreference() {
  const [voice, setVoiceState] = useState<VoiceId>(DEFAULT_VOICE);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (alive && v && VALID.has(v)) setVoiceState(v as VoiceId);
      })
      .catch(() => {
        /* fall back to default */
      });
    return () => {
      alive = false;
    };
  }, []);

  const setVoice = useCallback((v: VoiceId) => {
    setVoiceState(v);
    void AsyncStorage.setItem(STORAGE_KEY, v).catch(() => {});
  }, []);

  return { voice, setVoice };
}
