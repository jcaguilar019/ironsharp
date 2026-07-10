import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, RotateCcw } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { useThemeColor } from "@/components/useThemeColor";
import { usePlans, useProgress, useGroups } from "@/lib/queries";
import { ApiClient } from "@/lib/api";
import { purgePersonalPlanLocalState } from "@/lib/planLocal";

export default function CompletedPlans() {
  const router = useRouter();
  const qc = useQueryClient();
  const progress = useProgress();
  const groups = useGroups();
  const { data: plansData } = usePlans();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  const planById = new Map((plansData?.plans ?? []).map((p) => [p.id, p]));
  const completed = (progress.data ?? []).filter((p) => p.completedAt);
  const [busy, setBusy] = useState(false);

  // Take a finished plan again from day 1 — the completed run keeps its
  // reflections; the new run starts blank. Same one-active rule as starting.
  const restartPlan = (planId: string, title: string) => {
    const groupPlanIds = new Set((groups.data ?? []).map((g) => g.plan?.id).filter(Boolean));
    const activePersonalCount = (progress.data ?? []).filter(
      (p) => !p.completedAt && !groupPlanIds.has(p.planId)
    ).length;
    if (activePersonalCount >= 1) {
      Alert.alert(
        "One at a time.",
        "You already have an active personal devotional. Finish what is in front of you first."
      );
      return;
    }
    Alert.alert(`Do "${title}" again?`, "It starts over from day 1. The reflections you wrote last time are kept.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start over",
        onPress: async () => {
          if (busy) return;
          setBusy(true);
          try {
            await purgePersonalPlanLocalState(planId);
            await ApiClient.restartPlan(planId);
            await qc.invalidateQueries({ queryKey: ["progress"] });
            await qc.invalidateQueries({ queryKey: ["progress", "active"] });
            router.push(`/devotional/${planId}`);
          } catch {
            Alert.alert("Something went wrong", "Please try again.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title="Completed" subtitle="Finished plans" />
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg gap-3 px-4 py-4"
        showsVerticalScrollIndicator={false}
      >
        {completed.length === 0 ? (
          <View className="items-center rounded-xl border border-border bg-card p-8">
            <CheckCircle2 size={26} color={primary} />
            <Text className="mt-3 text-center text-sm text-muted-foreground">
              Finish a plan and it&apos;ll be celebrated here.
            </Text>
          </View>
        ) : (
          completed.map((row) => {
            const plan = planById.get(row.planId);
            const title = plan?.title ?? "Devotional";
            return (
              <Pressable
                key={row.id}
                onPress={() => router.push(`/plans/review/${row.planId}`)}
                className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 active:bg-muted/40"
              >
                <CheckCircle2 size={22} color={primary} />
                <View className="flex-1">
                  <Text className="font-serif text-lg font-bold text-foreground">{title}</Text>
                  <Text className="text-xs text-muted-foreground">
                    Completed{" "}
                    {row.completedAt ? new Date(row.completedAt).toLocaleDateString() : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => restartPlan(row.planId, title)}
                  disabled={busy}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Do ${title} again`}
                  className="h-9 w-9 items-center justify-center rounded-full bg-muted active:opacity-70"
                >
                  <RotateCcw size={15} color={primary} />
                </Pressable>
                <ChevronRight size={18} color={muted} />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
