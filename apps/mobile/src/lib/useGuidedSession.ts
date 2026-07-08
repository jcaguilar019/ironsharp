import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useTts } from "./useTts";
import { useSpeechRecognition } from "./useSpeechRecognition";

export type GuidedStep =
  | { kind: "read"; label: string; text: string }
  | { kind: "prompt"; label: string; field: "response1" | "response2" | "response3" | "prayer"; question: string };

export type GuidedPhase =
  | "ready"
  | "reading"
  | "pause"
  | "listening"
  | "awaitingReturn"
  | "captured"
  | "summary"
  | "saving"
  | "done";

export type GuidedAnswers = { response1?: string; response2?: string; response3?: string; prayer?: string };

const PAUSE_MS = 1500; // a beat to process after a question, before we listen
const CAPTURED_MS = 1300; // show what was heard before moving on

/**
 * Drives the hands-free guided devotional: for each step it reads aloud (TTS),
 * and for question steps it then pauses, listens (STT), captures the spoken
 * answer, and advances — all chained off the TTS "done" and STT "final" events
 * so it runs itself. Refs hold the live step/answers so the event callbacks
 * never read stale state.
 */
export function useGuidedSession(
  steps: GuidedStep[],
  voiceOpts: { voice?: string; instructions?: string },
  onComplete: (answers: GuidedAnswers) => Promise<void>
) {
  const [phase, setPhase] = useState<GuidedPhase>("ready");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<GuidedAnswers>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const stepRef = useRef(0);
  const answersRef = useRef<GuidedAnswers>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingListenRef = useRef(false); // a listen turn deferred until the app is foregrounded
  const runStepRef = useRef<(i: number) => void>(() => {});

  const tts = useTts();

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleFinal = useCallback(
    (text: string) => {
      const i = stepRef.current;
      const step = steps[i];
      if (step?.kind === "prompt" && text) {
        const next = { ...answersRef.current, [step.field]: text };
        answersRef.current = next;
        setAnswers(next);
      }
      setPhase("captured");
      clearTimer();
      timerRef.current = setTimeout(() => runStepRef.current(i + 1), CAPTURED_MS);
    },
    [steps]
  );

  const stt = useSpeechRecognition({ onFinal: handleFinal });

  const runStep = useCallback(
    (i: number) => {
      clearTimer();
      stepRef.current = i;
      setStepIndex(i);
      if (i >= steps.length) {
        setPhase("summary");
        return;
      }
      const step = steps[i];
      setPhase("reading");
      if (step.kind === "read") {
        tts.speak(step.text, { ...voiceOpts, title: step.label, onDone: () => runStepRef.current(i + 1) });
      } else {
        tts.speak(step.question, {
          ...voiceOpts,
          title: step.label,
          onDone: () => {
            setPhase("pause");
            clearTimer();
            timerRef.current = setTimeout(() => {
              // The question plays fine on the lock screen, but capturing a spoken
              // answer needs the app foregrounded. If we're backgrounded, defer the
              // listen turn until the user returns (see the AppState effect below).
              if (AppState.currentState === "active") {
                setPhase("listening");
                stt.start();
              } else {
                pendingListenRef.current = true;
                setPhase("awaitingReturn");
              }
            }, PAUSE_MS);
          },
        });
      }
    },
    [steps, tts, stt, voiceOpts]
  );
  runStepRef.current = runStep;

  // When a listen turn was deferred because the phone was locked, start it as soon
  // as the app comes back to the foreground. Ref-wrapped so the listener subscribes
  // once yet always calls the latest stt.
  const resumeListenRef = useRef(() => {});
  resumeListenRef.current = () => {
    if (!pendingListenRef.current) return;
    pendingListenRef.current = false;
    setPhase("listening");
    stt.start();
  };
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") resumeListenRef.current();
    });
    return () => sub.remove();
  }, []);

  const begin = useCallback(() => {
    answersRef.current = {};
    setAnswers({});
    runStep(0);
  }, [runStep]);

  // Manual "I'm done speaking" — ends the listen turn, which delivers the final.
  const doneSpeaking = useCallback(() => stt.stop(), [stt]);

  // Re-listen to the current question.
  const redo = useCallback(() => {
    clearTimer();
    if (steps[stepRef.current]?.kind === "prompt") {
      setPhase("listening");
      stt.start();
    }
  }, [steps, stt]);

  const exit = useCallback(() => {
    clearTimer();
    pendingListenRef.current = false;
    tts.stop();
    stt.stop();
  }, [tts, stt]);

  const submit = useCallback(async () => {
    setSaveError(null);
    setPhase("saving");
    try {
      await onComplete(answersRef.current);
      setPhase("done");
    } catch {
      setSaveError("Couldn't save — check your connection and try again.");
      setPhase("summary");
    }
  }, [onComplete]);

  return {
    phase,
    stepIndex,
    steps,
    answers,
    saveError,
    liveTranscript: stt.transcript,
    isListening: stt.isListening,
    sttError: stt.error,
    isUsingCloud: tts.isUsingCloud,
    ttsStatus: tts.status,
    ttsProgress: tts.progress,
    pauseReading: tts.pause,
    resumeReading: tts.resume,
    begin,
    doneSpeaking,
    redo,
    exit,
    submit,
  };
}
