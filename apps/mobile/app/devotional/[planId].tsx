import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Car, Headphones, Play } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { useThemeColor } from "@/components/useThemeColor";
import { ApiClient } from "@/lib/api";
import { useProgress } from "@/lib/queries";

export default function DevotionalReader() {
  const { planId: planIdParam } = useLocalSearchParams<{ planId: string }>();
  const planId = String(planIdParam);
  const router = useRouter();
  const qc = useQueryClient();

  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const accent = useThemeColor("primary");
  const cardBg = useThemeColor("card");
  const borderColor = useThemeColor("border");
  const fgColor = useThemeColor("foreground");

  const [showPlayMenu, setShowPlayMenu] = useState(false);

  const progress = useProgress();
  const progressRow = (progress.data ?? []).find((p) => p.planId === planId);
  const currentDay = progressRow?.currentDay ?? 1;

  const planQ = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => ApiClient.getPlan(planId).then((r) => r.plan),
  });
  const dayQ = useQuery({
    queryKey: ["day", planId, currentDay],
    queryFn: () => ApiClient.getDay(planId, currentDay).then((r) => r.day),
    enabled: !!planId,
  });
  const submissionQ = useQuery({
    queryKey: ["submission", planId, currentDay],
    queryFn: () => ApiClient.getSubmission(planId, currentDay).then((r) => r.submission),
    enabled: !!planId,
  });

  const [response1, setResponse1] = useState("");
  const [response2, setResponse2] = useState("");
  const [prayer, setPrayer] = useState("");
  const [q1Private, setQ1Private] = useState(false);
  const [q2Private, setQ2Private] = useState(false);
  const [prayerPrivate, setPrayerPrivate] = useState(true);
  const [done, setDone] = useState(false);

  // Prefill from any existing submission for this day.
  useEffect(() => {
    const s = submissionQ.data;
    if (s) {
      setResponse1(s.response1 ?? "");
      setResponse2(s.response2 ?? "");
      setPrayer(s.prayer ?? "");
      setQ1Private(s.q1Private);
      setQ2Private(s.q2Private);
      setPrayerPrivate(s.prayerPrivate);
    }
  }, [submissionQ.data]);

  const plan = planQ.data;
  const day = dayQ.data;
  const totalDays = plan?.totalDays ?? 0;
  const isLastDay = totalDays > 0 && currentDay >= totalDays;

  const submit = useMutation({
    mutationFn: async () => {
      await ApiClient.saveSubmission({
        planId,
        dayNumber: currentDay,
        response1,
        response2,
        prayer,
        q1Private,
        q2Private,
        prayerPrivate,
        submissionSource: "typed",
      });
      // Advance the plan: next day, or mark complete on the final day.
      if (progressRow) {
        if (isLastDay) await ApiClient.updateProgress(planId, { completed: true });
        else await ApiClient.updateProgress(planId, { currentDay: currentDay + 1 });
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["progress"] });
      await qc.invalidateQueries({ queryKey: ["progress", "active"] });
      setDone(true);
    },
  });

  const loading = planQ.isLoading || dayQ.isLoading || progress.isLoading;

  if (loading) {
    return (
      <Screen center>
        <ActivityIndicator color={primary} />
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen edges={["top"]}>
        <Header subtitle={isLastDay ? "Plan complete" : "Today's reading"} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-2 text-center font-serif text-3xl font-bold text-foreground">
            {isLastDay ? "Plan complete." : "Done. Come back tomorrow."}
          </Text>
          <Text className="mb-8 text-center text-sm text-muted-foreground">
            {isLastDay
              ? `You finished all ${totalDays} days. Well done.`
              : `Day ${currentDay} of ${totalDays} complete`}
          </Text>
          <View className="w-full max-w-xs">
            <Button title="Back to Devotionals" onPress={() => router.replace("/(tabs)/devotional")} />
          </View>
        </View>
      </Screen>
    );
  }

  const inputClass =
    "min-h-[100px] rounded-xl border border-input bg-card p-4 font-sans text-base text-foreground";

  return (
    <Screen edges={["top"]}>
      <Header
        subtitle={plan?.title ?? "Devotional"}
        rightAction={
          day ? (
            <Pressable
              onPress={() => setShowPlayMenu(true)}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 active:opacity-70"
            >
              <Play size={16} color={primary} fill={primary} />
            </Pressable>
          ) : null
        }
      />

      {/* Play mode picker */}
      {showPlayMenu && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowPlayMenu(false)}>
          <Pressable
            className="flex-1"
            onPress={() => setShowPlayMenu(false)}
          >
            <View className="absolute right-4 top-14 w-64 overflow-hidden rounded-2xl border border-border shadow-lg" style={{ backgroundColor: cardBg }}>
              {/* Listen Only */}
              <Pressable
                onPress={() => {
                  setShowPlayMenu(false);
                  // TTS listen-only — future feature, no-op for now
                }}
                className="flex-row items-start gap-3 px-4 py-3.5 active:opacity-70"
              >
                <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Headphones size={16} color={muted} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-semibold text-sm text-foreground">Listen Only</Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground">Reads the devotional aloud</Text>
                </View>
              </Pressable>

              <View style={{ height: 1, backgroundColor: borderColor }} />

              {/* Commute Mode */}
              <Pressable
                onPress={() => {
                  setShowPlayMenu(false);
                  router.push(`/commute/${planId}?day=${currentDay}`);
                }}
                className="flex-row items-start gap-3 rounded-b-2xl bg-primary/8 px-4 py-3.5 active:opacity-80"
              >
                <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                  <Car size={16} color={primary} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-semibold text-sm text-foreground">Commute Mode</Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground">Hands-free — reads and records</Text>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="mx-auto w-full max-w-lg gap-5 px-6 pb-10 pt-2"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Day + chapter */}
          <View>
            <Text className="text-xs uppercase tracking-wider text-muted-foreground">
              Day {currentDay} of {totalDays}
            </Text>
            <Text className="mt-1 font-serif text-2xl font-bold text-foreground">
              {day?.chapter}
            </Text>
            {day?.theme ? (
              <Text className="mt-1 font-serif-italic text-base text-muted-foreground">
                {day.theme}
              </Text>
            ) : null}
          </View>

          {/* Commentary / context */}
          <View className="rounded-xl border border-border bg-card p-5">
            <Text className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              Context · {day?.chapter}
            </Text>
            <Text className="font-serif text-base leading-relaxed text-foreground">
              {day?.commentary}
            </Text>
          </View>

          {/* Reflect */}
          <View className="gap-2">
            <Text className="font-sans-semibold text-base text-foreground">Reflect</Text>
            <Text className="text-sm leading-relaxed text-muted-foreground">
              {day?.reflectionQ1}
            </Text>
            <TextInput
              value={response1}
              onChangeText={setResponse1}
              placeholder="Share your honest reflection..."
              placeholderTextColor={muted}
              multiline
              textAlignVertical="top"
              className={inputClass}
            />
            <PrivacyToggle value={q1Private} onChange={setQ1Private} color={accent} />
          </View>

          {/* Apply */}
          <View className="gap-2">
            <Text className="font-sans-semibold text-base text-foreground">Apply</Text>
            <Text className="text-sm leading-relaxed text-muted-foreground">
              {day?.reflectionQ2}
            </Text>
            <TextInput
              value={response2}
              onChangeText={setResponse2}
              placeholder="What's the invitation here?"
              placeholderTextColor={muted}
              multiline
              textAlignVertical="top"
              className={inputClass}
            />
            <PrivacyToggle value={q2Private} onChange={setQ2Private} color={accent} />
          </View>

          {/* Prayer */}
          <View className="gap-2">
            <Text className="font-sans-semibold text-base text-foreground">
              Prayer / Praise (optional)
            </Text>
            <TextInput
              value={prayer}
              onChangeText={setPrayer}
              placeholder="A personal prayer or praise..."
              placeholderTextColor={muted}
              multiline
              textAlignVertical="top"
              className="min-h-[80px] rounded-xl border border-input bg-card p-4 font-sans text-base text-foreground"
            />
            <PrivacyToggle value={prayerPrivate} onChange={setPrayerPrivate} color={accent} />
          </View>

          <Button
            title={submit.isPending ? "Submitting..." : "Submit"}
            loading={submit.isPending}
            disabled={!response1.trim() || !response2.trim()}
            onPress={() => submit.mutate()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function PrivacyToggle({
  value,
  onChange,
  color,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-serif-italic text-[11px] text-muted-foreground">
        {value
          ? "Only you will see this — your group sees you submitted, not this response."
          : "Visible to your group."}
      </Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: color }} />
    </View>
  );
}
