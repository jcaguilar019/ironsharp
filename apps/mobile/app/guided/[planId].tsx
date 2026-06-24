import { useCallback, useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Mic, Volume2, CheckCircle2, RotateCcw } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { useProgress } from "@/lib/queries";
import { ApiClient } from "@/lib/api";
import { useGuidedSession, type GuidedStep, type GuidedAnswers } from "@/lib/useGuidedSession";

const VOICE_OPTS = {
  voice: "sage",
  instructions:
    "Read slowly, calmly and warmly — like a pastor gently guiding a quiet, reflective devotional. Unhurried, with space to breathe.",
};

export default function GuidedDevotional() {
  const { planId: rawPlanId } = useLocalSearchParams<{ planId: string }>();
  const planId = String(rawPlanId);
  const router = useRouter();
  const qc = useQueryClient();

  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const fg = useThemeColor("foreground");

  const progress = useProgress();
  const progressRow = (progress.data ?? []).find((p) => p.planId === planId);
  const currentDay = progressRow?.currentDay ?? 1;

  const planQ = useQuery({ queryKey: ["plan", planId], queryFn: () => ApiClient.getPlan(planId).then((r) => r.plan) });
  const dayQ = useQuery({
    queryKey: ["day", planId, currentDay],
    queryFn: () => ApiClient.getDay(planId, currentDay).then((r) => r.day),
    enabled: !!planId,
  });

  const totalDays = planQ.data?.totalDays ?? 0;
  const isLastDay = totalDays > 0 && currentDay >= totalDays;

  const steps = useMemo<GuidedStep[]>(() => {
    const day = dayQ.data;
    if (!day) return [];
    const s: GuidedStep[] = [];
    const content = [day.chapter ? `Today's reading. ${day.chapter}.` : null, day.theme, day.reflection]
      .filter(Boolean)
      .join(" ");
    if (content) s.push({ kind: "read", label: "Reading", text: content });
    if (day.reflectionQ1) s.push({ kind: "prompt", label: "Reflect", field: "response1", question: day.reflectionQ1 });
    if (day.reflectionQ2) s.push({ kind: "prompt", label: "Act", field: "response2", question: day.reflectionQ2 });
    if (day.prayerPrompt) s.push({ kind: "prompt", label: "Pray", field: "prayer", question: day.prayerPrompt });
    return s;
  }, [dayQ.data]);

  const onComplete = useCallback(
    async (answers: GuidedAnswers) => {
      await ApiClient.saveSubmission({
        planId,
        dayNumber: currentDay,
        response1: answers.response1,
        response2: answers.response2,
        prayer: answers.prayer,
        submissionSource: "voice",
      });
      if (isLastDay) await ApiClient.updateProgress(planId, { completed: true });
      else await ApiClient.updateProgress(planId, { currentDay: currentDay + 1 });

      // Mirror the reader: lock the plan until local midnight so Home /
      // Devotionals show "Done today".
      const midnight = new Date();
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
      await AsyncStorage.setItem(`@ironsharp/devotional_locked_until_${planId}`, String(midnight.getTime()));

      await qc.invalidateQueries({ queryKey: ["progress"] });
      await qc.invalidateQueries({ queryKey: ["progress", "active"] });
      await qc.invalidateQueries({ queryKey: ["profile"] });
    },
    [planId, currentDay, isLastDay, qc]
  );

  const session = useGuidedSession(steps, VOICE_OPTS, onComplete);

  // Clean up audio/recognition if the user leaves mid-session.
  const exitRef = useRef(session.exit);
  exitRef.current = session.exit;
  useEffect(() => () => exitRef.current(), []);

  // A single pulse used by the "speaking" / "pause" / "listening" indicators.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const active = session.phase === "reading" || session.phase === "pause" || session.phase === "listening";
    if (!active) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [session.phase, pulse]);

  const close = () => {
    session.exit();
    router.back();
  };

  if (planQ.isLoading || dayQ.isLoading || progress.isLoading) {
    return (
      <Screen center>
        <ActivityIndicator color={primary} />
      </Screen>
    );
  }
  if (planQ.isError || dayQ.isError || steps.length === 0) {
    return (
      <Screen>
        <ErrorState
          title="Couldn't start the guided reading"
          message="We couldn't load today's devotional. Check your connection and try again."
          onRetry={() => {
            planQ.refetch();
            dayQ.refetch();
          }}
        />
      </Screen>
    );
  }

  const step = steps[session.stepIndex];
  const pulseStyle = { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] };

  return (
    <Screen edges={["top", "bottom"]}>
      {/* Close */}
      <View className="flex-row justify-end px-4 pt-2">
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Exit guided reading" hitSlop={12} className="p-2">
          <X size={24} color={muted} />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="mx-auto w-full max-w-lg grow px-6 pb-10" showsVerticalScrollIndicator={false}>
        {/* READY — intro */}
        {session.phase === "ready" ? (
          <View className="grow items-center justify-center gap-5">
            <Volume2 size={40} color={primary} />
            <Text className="text-center font-serif text-3xl font-bold text-foreground">Guided reading</Text>
            <Text className="text-center text-base leading-relaxed text-muted-foreground">
              {planQ.data?.title} · Day {currentDay}
              {"\n\n"}Find a quiet space. I'll read aloud, then pause so you can respond out loud — hands-free.
            </Text>
            <View className="mt-2 w-full">
              <Button title="Begin" onPress={session.begin} />
            </View>
          </View>
        ) : null}

        {/* READING / PAUSE / LISTENING / CAPTURED — the active step */}
        {session.phase === "reading" || session.phase === "pause" || session.phase === "listening" || session.phase === "captured" ? (
          <View className="grow justify-center gap-6 py-6">
            <Text className="text-sm uppercase tracking-wider text-muted-foreground">
              {step?.label}
              {step?.kind === "prompt" ? ` · question ${stepNumber(steps, session.stepIndex)}` : ""}
            </Text>

            <Text className="font-serif text-2xl leading-relaxed text-foreground">
              {step?.kind === "read" ? step.text : step?.kind === "prompt" ? step.question : ""}
            </Text>

            {/* status */}
            <View className="mt-2 flex-row items-center gap-3">
              {session.phase === "reading" ? (
                <>
                  <Animated.View style={pulseStyle}>
                    <Volume2 size={22} color={primary} />
                  </Animated.View>
                  <Text className="text-base text-muted-foreground">Reading…</Text>
                </>
              ) : null}
              {session.phase === "pause" ? (
                <>
                  <Animated.View style={[pulseStyle, { height: 12, width: 12, borderRadius: 6, backgroundColor: primary }]} />
                  <Text className="text-base text-muted-foreground">Take a moment…</Text>
                </>
              ) : null}
              {session.phase === "listening" ? (
                <>
                  <Animated.View style={pulseStyle}>
                    <Mic size={22} color={primary} />
                  </Animated.View>
                  <Text className="text-base text-primary">Listening — speak now</Text>
                </>
              ) : null}
              {session.phase === "captured" ? (
                <>
                  <CheckCircle2 size={22} color={primary} />
                  <Text className="text-base text-muted-foreground">Got it</Text>
                </>
              ) : null}
            </View>

            {/* live transcript */}
            {(session.phase === "listening" || session.phase === "captured") && session.liveTranscript ? (
              <Text className="font-serif-italic text-lg leading-relaxed text-foreground">“{session.liveTranscript}”</Text>
            ) : null}

            {session.sttError === "permission_denied" ? (
              <Text className="text-sm text-destructive">Microphone/speech permission is needed to capture your response.</Text>
            ) : null}

            {/* listening controls */}
            {session.phase === "listening" ? (
              <View className="mt-2 flex-row gap-3">
                <View className="flex-1">
                  <Button title="Done speaking" onPress={session.doneSpeaking} />
                </View>
                <Pressable
                  onPress={session.redo}
                  accessibilityRole="button"
                  accessibilityLabel="Restart this response"
                  className="h-12 w-12 items-center justify-center rounded-xl border border-border"
                >
                  <RotateCcw size={18} color={muted} />
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* SUMMARY */}
        {session.phase === "summary" ? (
          <View className="grow gap-5 py-6">
            <Text className="font-serif text-3xl font-bold text-foreground">Your reflection</Text>
            {steps
              .filter((s): s is Extract<GuidedStep, { kind: "prompt" }> => s.kind === "prompt")
              .map((s) => (
                <View key={s.field} className="gap-1 rounded-xl border border-border bg-card p-4">
                  <Text className="text-sm text-muted-foreground">{s.question}</Text>
                  <Text style={{ color: fg }} className="font-serif-italic text-lg leading-relaxed">
                    {session.answers[s.field]?.trim() ? `“${session.answers[s.field]}”` : "— (skipped)"}
                  </Text>
                </View>
              ))}
            <View className="mt-2 gap-3">
              <Button title="Save & finish" onPress={session.submit} />
            </View>
          </View>
        ) : null}

        {/* SAVING */}
        {session.phase === "saving" ? (
          <View className="grow items-center justify-center gap-3">
            <ActivityIndicator color={primary} />
            <Text className="text-base text-muted-foreground">Saving your reflection…</Text>
          </View>
        ) : null}

        {/* DONE */}
        {session.phase === "done" ? (
          <View className="grow items-center justify-center gap-5">
            <CheckCircle2 size={44} color={primary} />
            <Text className="text-center font-serif text-3xl font-bold text-foreground">
              {isLastDay ? "Plan complete." : "Done. Come back tomorrow."}
            </Text>
            <View className="mt-2 w-full">
              <Button title="Close" onPress={close} />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function stepNumber(steps: GuidedStep[], index: number): number {
  let n = 0;
  for (let i = 0; i <= index && i < steps.length; i++) if (steps[i].kind === "prompt") n++;
  return n;
}
