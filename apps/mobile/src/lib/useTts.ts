import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { ApiClient, ttsStreamUrl } from "./api";
import { getAuthToken } from "./auth-client";

export type SpeakOptions = {
  voice?: string;
  instructions?: string;
  onDone?: () => void;
};

export type TtsStatus = "idle" | "preparing" | "playing" | "paused";

// If the cloud stream never loads (dead URL, evicted cache, network), fall back
// to the on-device voice rather than hang forever on "Preparing…".
const LOAD_TIMEOUT_MS = 8000;

/**
 * Speaks text aloud, preferring the cloud (ChatGPT-grade) voice and falling back
 * to the on-device voice if the cloud is unavailable (no API key, offline, quota,
 * or a load failure). Either way the caller's onDone fires when the reading
 * finishes, so a guided flow always advances.
 *
 * Single-flight: every speak() bumps a call id and any older in-flight call aborts
 * at its next checkpoint — this is what stops two readings from overlapping. Also
 * exposes pause/resume/stop plus a reactive `status` for driving playback UI.
 */
export function useTts() {
  const [status, setStatus] = useState<TtsStatus>("idle");
  const [progress, setProgress] = useState(0); // 0..1 through the current reading
  const playerRef = useRef<AudioPlayer | null>(null);
  const subRef = useRef<{ remove: () => void } | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usingCloudRef = useRef(false);
  // Monotonic; bumped by every speak()/stop(). Async continuations compare against
  // it and bail if a newer call has since started (or we've stopped/unmounted).
  const callIdRef = useRef(0);
  const lastProgressRef = useRef(0); // throttles how often progress re-renders

  const teardown = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    subRef.current?.remove();
    subRef.current = null;
    if (playerRef.current) {
      try {
        playerRef.current.remove();
      } catch {
        /* already gone */
      }
      playerRef.current = null;
    }
    try {
      Speech.stop();
    } catch {
      /* nothing speaking */
    }
    usingCloudRef.current = false;
  }, []);

  // Void any in-flight speak and release audio when the owner unmounts.
  useEffect(() => {
    return () => {
      callIdRef.current += 1;
      teardown();
    };
  }, [teardown]);

  const stop = useCallback(() => {
    callIdRef.current += 1;
    teardown();
    lastProgressRef.current = 0;
    setProgress(0);
    setStatus("idle");
  }, [teardown]);

  const speak = useCallback(
    async (text: string, opts: SpeakOptions = {}) => {
      const myId = (callIdRef.current += 1);
      teardown();
      const trimmed = text.trim();
      if (!trimmed) {
        opts.onDone?.();
        return;
      }

      const stale = () => callIdRef.current !== myId;
      let done = false;
      const finish = () => {
        if (done || stale()) return;
        done = true;
        setStatus("idle");
        opts.onDone?.();
      };

      const speakOnDevice = () => {
        if (stale()) return;
        usingCloudRef.current = false;
        setStatus("playing");
        Speech.speak(trimmed, { rate: 0.96, onDone: finish, onStopped: () => {}, onError: finish });
      };

      lastProgressRef.current = 0;
      setProgress(0);
      setStatus("preparing");
      try {
        const { id } = await ApiClient.prepareTts(trimmed, {
          voice: opts.voice,
          instructions: opts.instructions,
        });
        if (stale()) return;
        const token = await getAuthToken();
        if (stale()) return;
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
        if (stale()) return;

        const player = createAudioPlayer({
          uri: ttsStreamUrl(id),
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        playerRef.current = player;
        usingCloudRef.current = true;

        watchdogRef.current = setTimeout(() => {
          if (stale() || done || player.isLoaded) return;
          teardown(); // drop the dead cloud player…
          speakOnDevice(); // …and read on-device so the flow never stalls
        }, LOAD_TIMEOUT_MS);

        subRef.current = player.addListener("playbackStatusUpdate", (s) => {
          if (stale()) return;
          if (s?.isLoaded && watchdogRef.current) {
            clearTimeout(watchdogRef.current);
            watchdogRef.current = null;
          }
          if (s && s.duration > 0) {
            const p = Math.min(1, s.currentTime / s.duration);
            // Only re-render on ~1% moves (or completion) to avoid churn.
            if (p >= 1 || Math.abs(p - lastProgressRef.current) >= 0.01) {
              lastProgressRef.current = p;
              setProgress(p);
            }
          }
          if (s?.playing && !done) setStatus("playing");
          if (s?.didJustFinish) finish();
        });
        player.play();
      } catch {
        // Cloud unavailable → on-device voice, so the experience still works.
        speakOnDevice();
      }
    },
    [teardown]
  );

  const pause = useCallback(() => {
    if (usingCloudRef.current && playerRef.current) {
      try {
        playerRef.current.pause();
        setStatus("paused");
      } catch {
        /* nothing to pause */
      }
    } else if (Platform.OS === "ios") {
      // expo-speech pause/resume is iOS-only; on Android the fallback can't pause.
      try {
        Speech.pause();
        setStatus("paused");
      } catch {
        /* not pausable */
      }
    }
  }, []);

  const resume = useCallback(() => {
    if (usingCloudRef.current && playerRef.current) {
      try {
        playerRef.current.play();
        setStatus("playing");
      } catch {
        /* nothing to resume */
      }
    } else if (Platform.OS === "ios") {
      try {
        Speech.resume();
        setStatus("playing");
      } catch {
        /* not resumable */
      }
    }
  }, []);

  return { speak, pause, resume, stop, status, progress, isUsingCloud: () => usingCloudRef.current };
}
