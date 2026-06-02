import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
      <Header subtitle={plan?.title ?? "Devotional"} />
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
