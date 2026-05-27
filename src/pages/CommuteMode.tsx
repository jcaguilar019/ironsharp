import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Car, Headphones, Mic, Square, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTTS, useSTT, ttsSupported, sttSupported } from "@/hooks/useSpeech";

type StepId =
  | "intro" | "passage" | "commentary"
  | "q1_intro" | "q1_ready" | "q1_countdown" | "q1_record"
  | "q2_intro" | "q2_ready" | "q2_countdown" | "q2_record"
  | "done";

const STEP_ORDER: StepId[] = [
  "intro", "passage", "commentary",
  "q1_intro", "q1_ready", "q1_countdown", "q1_record",
  "q2_intro", "q2_ready", "q2_countdown", "q2_record",
  "done",
];

interface DayContent {
  chapter: string;
  commentary: string;
  reflection_q1: string;
  reflection_q2: string;
}

const stepLabel: Record<StepId, string> = {
  intro: "Welcome",
  passage: "Reading Passage",
  commentary: "Context",
  q1_intro: "Question One",
  q1_ready: "Ready to Respond?",
  q1_countdown: "Get Ready…",
  q1_record: "Recording",
  q2_intro: "Question Two",
  q2_ready: "Ready to Respond?",
  q2_countdown: "Get Ready…",
  q2_record: "Recording",
  done: "Complete",
};

const CommuteMode = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const planId = params.get("plan");
  const dayParam = parseInt(params.get("day") || "1", 10);

  const [day, setDay] = useState<DayContent | null>(null);
  const [scripture, setScripture] = useState<string>("");
  const [stepIdx, setStepIdx] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [q1Text, setQ1Text] = useState("");
  const [q2Text, setQ2Text] = useState("");

  const { speak, cancel } = useTTS();
  const { transcript, listening, start: startSTT, stop: stopSTT, setTranscript } = useSTT();

  const step = STEP_ORDER[stepIdx];
  const progress = ((stepIdx + 1) / STEP_ORDER.length) * 100;

  // Load day content + scripture
  useEffect(() => {
    if (!planId) return;
    (async () => {
      const { data } = await supabase
        .from("devotional_days")
        .select("chapter, commentary, reflection_q1, reflection_q2")
        .eq("plan_id", planId)
        .eq("day_number", dayParam)
        .single();
      if (data) {
        setDay(data as DayContent);
        try {
          const res = await fetch(`https://bible-api.com/${encodeURIComponent(data.chapter)}?translation=kjv`);
          const json = await res.json();
          const text = (json.verses || []).map((v: any) => v.text.trim()).join(" ");
          setScripture(text || data.chapter);
        } catch {
          setScripture(data.chapter);
        }
      }
    })();
  }, [planId, dayParam]);

  const advance = () => setStepIdx((i) => Math.min(STEP_ORDER.length - 1, i + 1));

  // Drive auto-speak steps
  useEffect(() => {
    if (!day) return;
    const texts: Partial<Record<StepId, string>> = {
      intro: "Welcome to Commute Mode. Sit back and let IronSharp guide you through today's devotional.",
      passage: scripture ? `Today's passage. ${day.chapter}. ${scripture}` : "",
      commentary: `Context. ${day.commentary}`,
      q1_intro: `Reflection question one. ${day.reflection_q1}`,
      q2_intro: `Reflection question two. ${day.reflection_q2}`,
    };
    if (step in texts) {
      const t = texts[step];
      if (t) speak(t, () => advance());
      else advance();
    }
    if (step === "done") {
      speak("Great work. Your devotional is complete. Tap submit when you're ready.");
    }
    return () => cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, day, scripture]);

  // Countdown steps
  useEffect(() => {
    if (step !== "q1_countdown" && step !== "q2_countdown") return;
    setCountdown(3);
    speak("3");
    const t1 = setTimeout(() => speak("2"), 1000);
    const t2 = setTimeout(() => speak("1"), 2000);
    const t3 = setTimeout(() => { setCountdown(0); advance(); }, 3000);
    const tick = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Record steps — start STT
  useEffect(() => {
    if (step === "q1_record" || step === "q2_record") {
      setTranscript("");
      if (sttSupported()) startSTT();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const finishRecording = () => {
    stopSTT();
    const t = transcript.trim();
    if (step === "q1_record") setQ1Text(t);
    if (step === "q2_record") setQ2Text(t);
    setTimeout(() => advance(), 1200);
  };

  const exitMode = () => {
    cancel(); stopSTT();
    navigate("/devotional", { state: { commute: { q1: q1Text, q2: q2Text } } });
  };

  const submit = async () => {
    cancel(); stopSTT();
    if (planId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const uid = user.id;
      const { error } = await supabase
        .from("devotional_submissions")
        .upsert(
          {
            user_id: uid,
            plan_id: planId,
            day_number: dayParam,
            response1: q1Text || null,
            response2: q2Text || null,
            submission_source: "commute",
          },
          { onConflict: "user_id,plan_id,day_number" }
        );
      if (error) {
        toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
        return;
      }
    }
    toast({ title: "Devotional submitted 🙏", description: "Recorded via Commute Mode" });
    navigate("/devotional");
  };

  const Icon = useMemo(() => {
    if (step === "done") return Check;
    if (step.endsWith("_record") || step.endsWith("_ready")) return Mic;
    return Headphones;
  }, [step]);

  const isCountdown = step === "q1_countdown" || step === "q2_countdown";
  const currentQuestion =
    step.startsWith("q1") ? day?.reflection_q1 :
    step.startsWith("q2") ? day?.reflection_q2 : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button onClick={exitMode} aria-label="Exit" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted/40">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[2px] text-muted-foreground">Commute Mode</p>
          <p className="font-serif text-sm">{day?.chapter || "—"}</p>
        </div>
        <Car className="h-5 w-5 text-[hsl(var(--commute-blue))]" />
      </div>

      {/* Progress bar */}
      <div className="mx-5 h-[3px] overflow-hidden rounded-full bg-muted/40">
        <div
          className="h-full bg-[hsl(var(--commute-blue))] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div
          className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border"
          style={{
            backgroundColor: "hsl(var(--commute-blue) / 0.15)",
            borderColor: "hsl(var(--commute-blue) / 0.4)",
          }}
        >
          {isCountdown ? (
            <span className="font-serif text-4xl font-bold text-[hsl(var(--commute-blue))]">
              {countdown}
            </span>
          ) : (
            <Icon className="h-9 w-9 text-[hsl(var(--commute-blue))]" strokeWidth={1.6} />
          )}
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground">
          {stepLabel[step]}
        </p>

        {currentQuestion && (step.endsWith("_intro") || step.endsWith("_ready") || step.endsWith("_record")) && (
          <p className="mt-6 max-w-md font-serif text-xl italic leading-relaxed">
            "{currentQuestion}"
          </p>
        )}

        {(step === "q1_record" || step === "q2_record") && (
          <div
            className="mt-6 w-full max-w-md rounded-2xl px-5 py-4 text-left"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {listening ? "Listening…" : "Transcript"}
            </p>
            <p className="mt-2 min-h-[48px] text-sm leading-relaxed">
              {transcript || (sttSupported() ? "Speak when ready…" : "Voice recognition not supported in this browser.")}
            </p>
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="px-6 pb-8">
        {step.endsWith("_ready") && (
          <Button
            onClick={advance}
            className="h-14 w-full rounded-2xl bg-[hsl(var(--commute-blue))] text-base font-semibold text-white hover:bg-[hsl(var(--commute-blue))]/90"
          >
            I'm Ready
          </Button>
        )}
        {step.endsWith("_record") && (
          <Button
            onClick={finishRecording}
            className="h-14 w-full rounded-2xl bg-[hsl(var(--commute-blue))] text-base font-semibold text-white hover:bg-[hsl(var(--commute-blue))]/90"
          >
            <Square className="mr-2 h-4 w-4 fill-current" /> Stop &amp; Save
          </Button>
        )}
        {step === "done" && (
          <Button
            onClick={submit}
            className="h-14 w-full rounded-2xl bg-[hsl(var(--commute-blue))] text-base font-semibold text-white hover:bg-[hsl(var(--commute-blue))]/90"
          >
            Submit My Devotional
          </Button>
        )}
        {!ttsSupported() && stepIdx < 2 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Audio playback not supported in this browser.
          </p>
        )}

        {/* Step dots */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {STEP_ORDER.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIdx
                  ? "w-5 bg-[hsl(var(--commute-blue))]"
                  : i < stepIdx
                  ? "w-1.5 bg-[hsl(var(--commute-blue))]/60"
                  : "w-1.5 bg-muted-foreground/25"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommuteMode;