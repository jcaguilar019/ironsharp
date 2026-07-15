import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Mic, Volume2, CheckCircle2, RotateCcw, Pause, Play, ChevronRight, Lock } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { useProgress, useGroups, useDiscipleships, useCustomQuestion } from "@/lib/queries";
import { ApiClient } from "@/lib/api";
import { useGuidedSession, type GuidedStep, type GuidedAnswers } from "@/lib/useGuidedSession";
import { deferDailyNudgeToTomorrow } from "@/lib/notifications";
import { useVoicePreference, voiceLabel } from "@/lib/voice";
import { segmentText } from "@/lib/useTts";
import { VoicePicker } from "@/components/VoicePicker";
import { withAlpha } from "@/theme/themes";

function localDateString(): string {
  return new Date().toLocaleDateString("en-CA");
}

const VOICE_INSTRUCTIONS =
  "Read slowly, calmly and warmly — like a pastor gently guiding a quiet, reflective devotional. Unhurried, with space to breathe.";

export default function GuidedDevotional() {
  const { planId: rawPlanId, groupId: groupIdParam } = useLocalSearchParams<{ planId: string; groupId?: string }>();
  const planId = String(rawPlanId);
  const groupId = groupIdParam ?? null;
  const router = useRouter();
  const qc = useQueryClient();

  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const fg = useThemeColor("foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const primaryFg = useThemeColor("primary-foreground");

  const progress = useProgress();
  const progressRow = (progress.data ?? []).find((p) => p.planId === planId);
  const groups = useGroups();
  const activeGroup = groupId ? (groups.data ?? []).find((g) => g.id === groupId) : null;
  // Group runs follow the group's day; personal runs follow personal progress.
  const currentDay = groupId ? (activeGroup?.currentDay ?? 1) : (progressRow?.currentDay ?? 1);

  // If this is a disciple reading their one-on-one, surface the discipler's Q3.
  const discipleships = useDiscipleships();
  const discipleRel = groupId
    ? (discipleships.data ?? []).find((r) => r.groupId === groupId && r.role === "disciple" && r.status === "active")
    : undefined;
  const customQuestionQ = useCustomQuestion(discipleRel?.id, localDateString());
  const q3 = customQuestionQ.data ?? null;

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
    if (q3) s.push({ kind: "prompt", label: "Daily Question", field: "response3", question: q3.questionText });
    if (day.prayerPrompt) s.push({ kind: "prompt", label: "Pray", field: "prayer", question: day.prayerPrompt });
    return s;
  }, [dayQ.data, q3]);

  // Captured at submit time: after a last-day completion the plan clears and
  // the live isLastDay flips false, which would swap the done heading back to
  // "Come back tomorrow" on the plan-complete screen.
  const [finishedLastDay, setFinishedLastDay] = useState(false);
  const onComplete = useCallback(
    async (answers: GuidedAnswers) => {
      setFinishedLastDay(isLastDay);
      await ApiClient.saveSubmission({
        planId,
        dayNumber: currentDay,
        response1: answers.response1,
        response2: answers.response2,
        // Only send Q3 when the disciple was actually asked one.
        response3: q3 ? answers.response3 : undefined,
        q3Question: q3 ? q3.questionText : undefined,
        prayer: answers.prayer,
        submissionSource: "voice",
        groupId,
      });
      if (groupId) {
        await ApiClient.updateGroupProgress(groupId, {
          nextDay: isLastDay ? undefined : currentDay + 1,
          completed: isLastDay,
        });
      } else if (progressRow) {
        if (isLastDay) await ApiClient.updateProgress(planId, { completed: true });
        else await ApiClient.updateProgress(planId, { currentDay: currentDay + 1 });
      }

      // Mirror the reader: lock the plan until local midnight so Home /
      // Devotionals show "Done today". Scoped per instance (personal vs group).
      const midnight = new Date();
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      const lockKey = groupId
        ? `@ironsharp/devotional_locked_until_${planId}_${groupId}`
        : `@ironsharp/devotional_locked_until_${planId}`;
      const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
      await AsyncStorage.setItem(lockKey, String(midnight.getTime()));

      await qc.invalidateQueries({ queryKey: ["progress"] });
      await qc.invalidateQueries({ queryKey: ["progress", "active"] });
      if (groupId) await qc.invalidateQueries({ queryKey: ["groups"] });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      // Today's reading is done — skip tonight's nudge (same as the reader).
      deferDailyNudgeToTomorrow().catch(() => {});
    },
    [planId, currentDay, isLastDay, qc, groupId, q3, progressRow]
  );

  const { voice, setVoice } = useVoicePreference();
  const [voiceSheet, setVoiceSheet] = useState(false);
  const voiceOpts = useMemo(() => ({ voice, instructions: VOICE_INSTRUCTIONS }), [voice]);
  const session = useGuidedSession(steps, voiceOpts, onComplete);

  // Clean up audio/recognition if the user leaves mid-session.
  const exitRef = useRef(session.exit);
  exitRef.current = session.exit;
  useEffect(() => () => exitRef.current(), []);

  // Warm the (long) opening reading for the chosen voice while the user is still
  // on the intro. TTS generation is the slow part, so this moves the wait behind
  // the "Find a quiet space" screen and makes Begin play almost immediately. The
  // server caches by (text, voice, instructions); fire-and-forget, and it simply
  // regenerates on Begin if it hasn't finished yet.
  useEffect(() => {
    if (session.phase !== "ready") return;
    const first = steps[0];
    if (first?.kind !== "read") return;
    // Warm the first *segment* — that's what plays first, and it matches useTts's
    // segmentation so Begin hits a warm cache. The rest generates while it plays.
    const firstSegment = segmentText(first.text)[0];
    if (firstSegment) ApiClient.prepareTts(firstSegment, { voice, instructions: VOICE_INSTRUCTIONS }).catch(() => {});
  }, [session.phase, steps, voice]);

  // A single pulse used by the "speaking" / "pause" / "listening" indicators.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const active =
      (session.phase === "reading" && session.ttsStatus !== "paused") ||
      session.phase === "pause" ||
      session.phase === "listening";
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
  }, [session.phase, session.ttsStatus, pulse]);

  const close = () => {
    session.exit();
    router.back();
  };

  if (
    planQ.isLoading ||
    dayQ.isLoading ||
    progress.isLoading ||
    (!!groupId && (groups.isLoading || discipleships.isLoading)) ||
    customQuestionQ.isLoading
  ) {
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
          title="Couldn't start Commute Mode"
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
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Exit Commute Mode" hitSlop={12} className="p-2">
          <X size={24} color={muted} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-lg grow px-6 pb-10" showsVerticalScrollIndicator={false}>
        {/* READY — intro */}
        {session.phase === "ready" ? (
          <View className="grow items-center justify-center gap-5">
            <Volume2 size={40} color={primary} />
            <Text className="text-center font-serif text-3xl font-bold text-foreground">Commute Mode</Text>
            <Text className="text-center text-base leading-relaxed text-muted-foreground">
              {planQ.data?.title} · Day {currentDay}{totalDays > 0 ? ` of ${totalDays}` : ""}
              {"\n\n"}Find a quiet space. I'll read aloud, then pause so you can respond out loud — hands-free.
            </Text>
            <Pressable
              onPress={() => setVoiceSheet(true)}
              accessibilityRole="button"
              accessibilityLabel="Choose the reading voice"
              className="mt-2 w-full flex-row items-center justify-between rounded-xl border border-border px-4 py-3"
            >
              <View className="flex-row items-center gap-2">
                <Volume2 size={16} color={muted} />
                <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 14 }}>Voice</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Text style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{voiceLabel(voice)}</Text>
                <ChevronRight size={16} color={muted} />
              </View>
            </Pressable>
            <View className="w-full">
              <Button title="Begin" onPress={session.begin} />
            </View>
          </View>
        ) : null}

        {/* READING / PAUSE / LISTENING / CAPTURED — the active step */}
        {session.phase === "reading" || session.phase === "pause" || session.phase === "listening" || session.phase === "captured" || session.phase === "awaitingReturn" ? (
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
                session.ttsStatus === "preparing" ? (
                  <>
                    <ActivityIndicator size="small" color={primary} />
                    <Text className="text-base text-muted-foreground">Loading…</Text>
                  </>
                ) : (
                  <>
                    <Animated.View style={pulseStyle}>
                      <Volume2 size={22} color={primary} />
                    </Animated.View>
                    <Text className="text-base text-muted-foreground">
                      {session.ttsStatus === "paused" ? "Paused" : "Reading…"}
                    </Text>
                  </>
                )
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
              {session.phase === "awaitingReturn" ? (
                <>
                  <Lock size={20} color={muted} />
                  <Text className="text-base text-muted-foreground">Return to the app to answer aloud</Text>
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
            {session.saveError ? (
              <Text className="text-sm text-destructive">{session.saveError}</Text>
            ) : null}
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
              {finishedLastDay ? "Plan complete." : "Done. Come back tomorrow."}
            </Text>
            <View className="mt-2 w-full">
              <Button title="Close" onPress={close} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Reading control bar — persistent progress + pause/resume while reading */}
      {session.phase === "reading" ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: border,
            backgroundColor: card,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
          <View
            style={{
              height: 3,
              borderRadius: 2,
              backgroundColor: withAlpha(primary, 0.2),
              overflow: "hidden",
              marginBottom: 10,
            }}
          >
            <View
              style={{
                height: 3,
                borderRadius: 2,
                backgroundColor: primary,
                width: `${Math.round((session.ttsProgress || 0) * 100)}%`,
              }}
            />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Volume2 size={18} color={muted} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>
                {step?.label ?? "Reading"}
              </Text>
              <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 12 }}>
                {session.ttsStatus === "preparing" ? "Loading…" : session.ttsStatus === "paused" ? "Paused" : "Playing"}
              </Text>
            </View>
            <Pressable
              onPress={session.ttsStatus === "paused" ? session.resumeReading : session.pauseReading}
              disabled={session.ttsStatus === "preparing"}
              accessibilityRole="button"
              accessibilityLabel={session.ttsStatus === "paused" ? "Resume reading" : "Pause reading"}
              style={{
                height: 46,
                width: 46,
                borderRadius: 23,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: primary,
                opacity: session.ttsStatus === "preparing" ? 0.5 : 1,
              }}
            >
              {session.ttsStatus === "paused" ? (
                <Play size={20} color={primaryFg} fill={primaryFg} />
              ) : (
                <Pause size={20} color={primaryFg} fill={primaryFg} />
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      <VoicePicker
        visible={voiceSheet}
        selected={voice}
        onSelect={setVoice}
        onClose={() => setVoiceSheet(false)}
      />
    </Screen>
  );
}

function stepNumber(steps: GuidedStep[], index: number): number {
  let n = 0;
  for (let i = 0; i <= index && i < steps.length; i++) if (steps[i].kind === "prompt") n++;
  return n;
}
