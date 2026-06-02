import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Pressable,
  StatusBar,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { ArrowLeft, Car, Mic, MicOff, Square } from "lucide-react-native";
import { ApiClient } from "@/lib/api";
import { useProgress } from "@/lib/queries";

// ─── Constants ───────────────────────────────────────────────────────────────

const DARK = {
  bg: "#0E0E10",
  card: "#1A1A1F",
  border: "#2A2A32",
  fg: "#F0EFE9",
  muted: "#7A7A8A",
  primary: "#89B4C9",
  record: "#C4937A",
  dot: "#3A3A45",
};

const COUNTDOWN_SECS = 12;
const SPEECH_OPTS = { rate: 0.95, pitch: 0.95 };

type StepKind = "auto" | "countdown" | "user-tap" | "record";

interface Step {
  id: number;
  kind: StepKind;
  icon: "intro" | "passage" | "commentary" | "q1" | "pause" | "mic" | "done";
  label: string;
}

const STEPS: Step[] = [
  { id: 1,  kind: "auto",      icon: "intro",      label: "Intro" },
  { id: 2,  kind: "auto",      icon: "passage",    label: "Scripture" },
  { id: 3,  kind: "auto",      icon: "commentary", label: "Context" },
  { id: 4,  kind: "auto",      icon: "q1",         label: "Question 1" },
  { id: 5,  kind: "countdown", icon: "pause",      label: "Reflect" },
  { id: 6,  kind: "user-tap",  icon: "mic",        label: "Ready?" },
  { id: 7,  kind: "record",    icon: "mic",        label: "Record Q1" },
  { id: 8,  kind: "auto",      icon: "q1",         label: "Question 2" },
  { id: 9,  kind: "countdown", icon: "pause",      label: "Reflect" },
  { id: 10, kind: "user-tap",  icon: "mic",        label: "Ready?" },
  { id: 11, kind: "record",    icon: "mic",        label: "Record Q2" },
  { id: 12, kind: "user-tap",  icon: "done",       label: "Complete" },
];

// ─── Step icon glyphs ─────────────────────────────────────────────────────────

function StepCircle({
  icon,
  isRecording,
  pulseAnim,
}: {
  icon: Step["icon"];
  isRecording: boolean;
  pulseAnim: Animated.Value;
}) {
  const color = icon === "mic" ? (isRecording ? DARK.record : DARK.primary) : DARK.primary;

  const label =
    icon === "intro"      ? "✦" :
    icon === "passage"    ? "📖" :
    icon === "commentary" ? "💬" :
    icon === "q1"         ? "?" :
    icon === "pause"      ? "⏸" :
    icon === "mic"        ? (isRecording ? "■" : "🎙") :
    icon === "done"       ? "✓" : "•";

  return (
    <View className="items-center justify-center">
      {isRecording && (
        <Animated.View
          style={{
            position: "absolute",
            width: 80 + 30,
            height: 80 + 30,
            borderRadius: (80 + 30) / 2,
            backgroundColor: DARK.record,
            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.4] }),
            transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
          }}
        />
      )}
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: color + "22",
          borderWidth: 2,
          borderColor: color,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 28, color: color }}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={{ height: 2, backgroundColor: DARK.border }}>
      <View
        style={{
          height: 2,
          width: `${((step - 1) / (STEPS.length - 1)) * 100}%`,
          backgroundColor: DARK.primary,
        }}
      />
    </View>
  );
}

// ─── Step dots ────────────────────────────────────────────────────────────────

function StepDots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
      {STEPS.map((s) => {
        const isCurrent = s.id === step;
        const isPast = s.id < step;
        return (
          <View
            key={s.id}
            style={{
              height: 6,
              width: isCurrent ? 20 : 6,
              borderRadius: 3,
              backgroundColor: isCurrent ? DARK.primary : isPast ? DARK.primary + "88" : DARK.dot,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CommuteMode() {
  const { planId: planIdParam, day: dayParam } = useLocalSearchParams<{
    planId: string;
    day: string;
  }>();
  const planId = String(planIdParam);
  const dayNumber = Number(dayParam ?? "1");
  const router = useRouter();
  const qc = useQueryClient();

  const planQ = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => ApiClient.getPlan(planId).then((r) => r.plan),
  });
  const dayQ = useQuery({
    queryKey: ["day", planId, dayNumber],
    queryFn: () => ApiClient.getDay(planId, dayNumber).then((r) => r.day),
    enabled: !!planId,
  });
  const progress = useProgress();

  const plan = planQ.data;
  const day = dayQ.data;

  const [step, setStep] = useState(1);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [q1Path, setQ1Path] = useState<string | null>(null);
  const [q2Path, setQ2Path] = useState<string | null>(null);
  const [recordConfirmed, setRecordConfirmed] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // ── Pulse animation for recording ─────────────────────────────────────────
  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    pulseLoop.current.start();
  };
  const stopPulse = () => { pulseLoop.current?.stop(); pulseAnim.setValue(0); };

  // ── Speech ────────────────────────────────────────────────────────────────
  const speak = (text: string, onDone?: () => void) => {
    Speech.stop();
    Speech.speak(text, { ...SPEECH_OPTS, onDone });
  };

  // ── Step logic ────────────────────────────────────────────────────────────
  const advance = () => setStep((s) => Math.min(s + 1, STEPS.length));

  useEffect(() => {
    if (!day) return;

    Speech.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setCountdown(COUNTDOWN_SECS);
    setRecordConfirmed(false);

    switch (step) {
      case 1:
        speak(
          "Welcome to Commute Mode. Sit back and let IronSharp guide you through today's devotional. Let's begin.",
          advance
        );
        break;

      case 2:
        speak(`Today's passage. ${day.chapter}. ${day.commentary}`, advance);
        break;

      case 3:
        speak(`Context. ${day.commentary}`, advance);
        break;

      case 4:
        speak(`Reflection question one. ${day.reflectionQ1}`, advance);
        break;

      case 5:
        // countdown
        setCountdown(COUNTDOWN_SECS);
        timerRef.current = setInterval(() => {
          setCountdown((c) => {
            if (c <= 1) {
              clearInterval(timerRef.current!);
              timerRef.current = null;
              advance();
              return 0;
            }
            return c - 1;
          });
        }, 1000);
        break;

      case 6:
        speak("Are you ready to record your response?");
        break;

      case 7:
        speak("Recording. Speak your response now.");
        break;

      case 8:
        speak(`Reflection question two. ${day.reflectionQ2}`, advance);
        break;

      case 9:
        setCountdown(COUNTDOWN_SECS);
        timerRef.current = setInterval(() => {
          setCountdown((c) => {
            if (c <= 1) {
              clearInterval(timerRef.current!);
              timerRef.current = null;
              advance();
              return 0;
            }
            return c - 1;
          });
        }, 1000);
        break;

      case 10:
        speak("Are you ready to record your response?");
        break;

      case 11:
        speak("Recording. Speak your response now.");
        break;

      case 12:
        speak("Great work. Your devotional is complete. Tap submit when you are ready.");
        break;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, day]);

  // ── Recording helpers ─────────────────────────────────────────────────────
  const requestMicPermission = async (): Promise<boolean> => {
    const { status } = await Audio.requestPermissionsAsync();
    const granted = status === "granted";
    setMicPermission(granted);
    return granted;
  };

  const startRecording = async () => {
    let permitted = micPermission;
    if (permitted === null) permitted = await requestMicPermission();
    if (!permitted) {
      Alert.alert(
        "Microphone Access Needed",
        "IronSharp needs microphone access to record your responses. Please allow access in Settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    recordingRef.current = rec;
    setIsRecording(true);
    startPulse();
  };

  const stopRecording = async (): Promise<string | null> => {
    if (!recordingRef.current) return null;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      stopPulse();
      return uri ?? null;
    } catch {
      recordingRef.current = null;
      setIsRecording(false);
      stopPulse();
      return null;
    }
  };

  const handleRecordToggle = async () => {
    if (!isRecording) {
      await startRecording();
    } else {
      const uri = await stopRecording();
      if (step === 7) setQ1Path(uri);
      if (step === 11) setQ2Path(uri);
      setRecordConfirmed(true);
      setTimeout(advance, 1500);
    }
  };

  // ── Submit mutation ───────────────────────────────────────────────────────
  const progressRow = (progress.data ?? []).find((p) => p.planId === planId);
  const totalDays = plan?.totalDays ?? 0;
  const isLastDay = totalDays > 0 && dayNumber >= totalDays;

  const submit = useMutation({
    mutationFn: async () => {
      await ApiClient.saveSubmission({
        planId,
        dayNumber,
        response1: q1Path ? "Recorded via Commute Mode" : undefined,
        response2: q2Path ? "Recorded via Commute Mode" : undefined,
        audioQ1Url: q1Path ?? undefined,
        audioQ2Url: q2Path ?? undefined,
        submissionSource: "commute",
      });
      if (progressRow) {
        if (isLastDay) await ApiClient.updateProgress(planId, { completed: true });
        else await ApiClient.updateProgress(planId, { currentDay: dayNumber + 1 });
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["progress"] });
      await qc.invalidateQueries({ queryKey: ["progress", "active"] });
      router.replace("/(tabs)/home");
    },
  });

  // ── Back handler ──────────────────────────────────────────────────────────
  const handleBack = async () => {
    Speech.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordingRef.current) await stopRecording();
    router.back();
  };

  // ── Current step meta ─────────────────────────────────────────────────────
  const current = STEPS[step - 1];
  const isCountdown = current.kind === "countdown";
  const isRecordStep = current.kind === "record";
  const loading = planQ.isLoading || dayQ.isLoading;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: DARK.bg, alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />
        <Text style={{ color: DARK.primary, fontSize: 16 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: DARK.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={DARK.bg} />

      {/* ── Top bar ── */}
      <View style={{ paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable onPress={handleBack} hitSlop={12} style={{ marginRight: 12 }}>
            <ArrowLeft size={22} color={DARK.muted} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: DARK.primary, fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>
              Commute Mode
            </Text>
            <Text style={{ color: DARK.muted, fontSize: 13, marginTop: 1 }}>
              {day?.chapter ?? ""}
            </Text>
          </View>
          <Car size={20} color={DARK.muted} />
        </View>
      </View>

      <ProgressBar step={step} />

      {/* ── Main content ── */}
      <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: "center", alignItems: "center" }}>

        {/* Circle indicator */}
        <StepCircle icon={current.icon} isRecording={isRecording} pulseAnim={pulseAnim} />

        {/* Step label */}
        <Text style={{ color: DARK.muted, fontSize: 12, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 20 }}>
          {current.label}
        </Text>

        {/* Step content */}
        {isCountdown && (
          <View style={{ alignItems: "center", marginTop: 32 }}>
            <Text style={{ color: DARK.fg, fontSize: 64, fontWeight: "700" }}>{countdown}</Text>
            <Text style={{ color: DARK.muted, fontSize: 15, marginTop: 8, textAlign: "center" }}>
              Take a moment with this question.
            </Text>
          </View>
        )}

        {(step === 4 || step === 8) && day && (
          <Text style={{ color: DARK.fg, fontSize: 17, lineHeight: 26, textAlign: "center", marginTop: 28 }}>
            {step === 4 ? day.reflectionQ1 : day.reflectionQ2}
          </Text>
        )}

        {isRecordStep && (
          <Text style={{ color: DARK.muted, fontSize: 15, textAlign: "center", marginTop: 24 }}>
            {recordConfirmed ? "Response saved ✓" : isRecording ? "Recording your response…" : "Tap to start recording"}
          </Text>
        )}

        {step === 12 && (
          <Text style={{ color: DARK.fg, fontSize: 15, textAlign: "center", marginTop: 24, lineHeight: 24 }}>
            Great work. Your devotional is complete.
          </Text>
        )}
      </View>

      {/* ── Bottom actions ── */}
      <View style={{ paddingHorizontal: 28, paddingBottom: 52, gap: 12 }}>

        {/* Countdown skip */}
        {isCountdown && (
          <Pressable
            onPress={() => {
              if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
              advance();
            }}
            style={{ alignItems: "center", paddingVertical: 12 }}
          >
            <Text style={{ color: DARK.primary, fontSize: 14, fontWeight: "600" }}>
              Skip — I'm Ready Now
            </Text>
          </Pressable>
        )}

        {/* Ready to record tap */}
        {(step === 6 || step === 10) && (
          <Pressable
            onPress={advance}
            style={{
              height: 64,
              borderRadius: 16,
              backgroundColor: DARK.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#0E0E10", fontSize: 16, fontWeight: "700" }}>
              I'm Ready — Start Recording
            </Text>
          </Pressable>
        )}

        {/* Record button */}
        {isRecordStep && !recordConfirmed && (
          <Pressable
            onPress={handleRecordToggle}
            style={{
              height: 72,
              borderRadius: 16,
              backgroundColor: isRecording ? DARK.record : DARK.primary,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 12,
            }}
          >
            {isRecording
              ? <Square size={22} color="#0E0E10" />
              : <Mic size={22} color="#0E0E10" />
            }
            <Text style={{ color: "#0E0E10", fontSize: 16, fontWeight: "700" }}>
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Text>
          </Pressable>
        )}

        {/* Submit */}
        {step === 12 && (
          <Pressable
            onPress={() => submit.mutate()}
            disabled={submit.isPending}
            style={{
              height: 64,
              borderRadius: 16,
              backgroundColor: submit.isPending ? DARK.primary + "88" : DARK.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#0E0E10", fontSize: 16, fontWeight: "700" }}>
              {submit.isPending ? "Submitting…" : "Submit My Devotional"}
            </Text>
          </Pressable>
        )}

        {/* Step dots */}
        <View style={{ paddingTop: 8 }}>
          <StepDots step={step} />
        </View>
      </View>
    </View>
  );
}
