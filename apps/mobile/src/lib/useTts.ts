import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { ApiClient, ttsStreamUrl } from "./api";
import { getAuthToken } from "./auth-client";

export type SpeakOptions = {
  voice?: string;
  instructions?: string;
  title?: string; // shown on the lock screen while this reading plays
  onDone?: () => void;
};

export type TtsStatus = "idle" | "preparing" | "playing" | "paused";

// If the first segment's stream never loads (dead URL, evicted cache, network),
// fall back to the on-device voice rather than hang forever on "Loading…".
const LOAD_TIMEOUT_MS = 8000;

/**
 * Splits a reading into playback segments: the first sentence alone (so audio can
 * start after a short generation instead of waiting for the whole passage), then
 * the rest grouped into ~600-char chunks. Short text (a question, a sample) stays
 * a single segment. Segments are generated with one-ahead look-ahead so later ones
 * are usually ready by the time the current finishes.
 */
export function segmentText(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  const sentences = t.match(/[^.!?]+[.!?]*\s*/g)?.map((s) => s.trim()).filter(Boolean);
  if (!sentences || sentences.length <= 1) return [t];
  const segs: string[] = [sentences[0]];
  let buf = "";
  for (let i = 1; i < sentences.length; i++) {
    buf = buf ? `${buf} ${sentences[i]}` : sentences[i];
    if (buf.length >= 600) {
      segs.push(buf);
      buf = "";
    }
  }
  if (buf) segs.push(buf);
  return segs;
}

/**
 * Speaks text aloud, preferring the cloud (ChatGPT-grade) voice and falling back
 * to the on-device voice if the cloud is unavailable (no API key, offline, quota,
 * or a load failure). Either way the caller's onDone fires when the reading
 * finishes, so a guided flow always advances.
 *
 * Long readings play in segments (see segmentText) through a single player via
 * replace(), so the first words start fast, the lock-screen now-playing stays
 * continuous, and the next segment generates while the current one plays.
 *
 * Single-flight: every speak() bumps a call id and any older in-flight call aborts
 * at its next checkpoint — this is what stops two readings from overlapping. Also
 * exposes pause/resume/stop plus a reactive `status` and `progress` for UI.
 */
export function useTts() {
  const [status, setStatus] = useState<TtsStatus>("idle");
  const [progress, setProgress] = useState(0); // 0..1 across the whole reading
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
        playerRef.current.clearLockScreenControls();
      } catch {
        /* not active on the lock screen */
      }
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
      const segs = segmentText(text);
      if (!segs.length) {
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
        Speech.speak(segs.join(" "), { rate: 0.96, onDone: finish, onStopped: () => {}, onError: finish });
      };

      // Generate (or hit cache for) a segment's audio id. warm() fires-and-forgets
      // so the next segment is usually cached by the time we need it.
      const idFor = (i: number) => ApiClient.prepareTts(segs[i], { voice: opts.voice, instructions: opts.instructions });
      const warm = (i: number) => {
        if (i < segs.length) idFor(i).catch(() => {});
      };

      lastProgressRef.current = 0;
      setProgress(0);
      setStatus("preparing");
      try {
        const { id } = await idFor(0);
        if (stale()) return;
        const token = await getAuthToken();
        if (stale()) return;
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: true });
        if (stale()) return;

        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const player = createAudioPlayer({ uri: ttsStreamUrl(id), headers });
        playerRef.current = player;
        usingCloudRef.current = true;
        let seg = 0;
        let advancing = false;
        warm(1); // start generating the next segment while this one plays

        // Lock-screen / Control Center now-playing + remote play/pause. Remote
        // actions flow back through the status listener, so the in-app bar stays
        // in sync. One player for the whole reading (replace() per segment), so
        // the now-playing entry never churns. No seek — a read isn't scrubbable.
        try {
          player.setActiveForLockScreen(
            true,
            { title: opts.title ?? "Commute Mode", artist: "IronSharp" },
            { showSeekForward: false, showSeekBackward: false }
          );
        } catch {
          /* lock-screen controls unavailable on this platform */
        }

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
            // Progress spans all segments: completed segments + the current one.
            const p = Math.min(1, (seg + Math.min(1, s.currentTime / s.duration)) / segs.length);
            if (p >= 1 || Math.abs(p - lastProgressRef.current) >= 0.01) {
              lastProgressRef.current = p;
              setProgress(p);
            }
          }
          if (s?.playing && !done) setStatus("playing");
          if (s?.didJustFinish && !advancing) {
            const next = seg + 1;
            if (next >= segs.length) {
              finish();
              return;
            }
            // Swap in the next segment on the SAME player (keeps the lock screen).
            advancing = true;
            seg = next;
            warm(next + 1);
            idFor(next)
              .then(({ id: nextId }) => {
                if (stale()) return;
                advancing = false;
                player.replace({ uri: ttsStreamUrl(nextId), headers });
                player.play();
              })
              .catch(() => finish()); // a mid-reading failure just ends gracefully
          }
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
