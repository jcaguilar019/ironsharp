import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, RotateCcw } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { ProgressRing } from "@/components/ProgressRing";
import { useThemeColor } from "@/components/useThemeColor";
import { usePlans, useProgress, useGroups, useJourney } from "@/lib/queries";
import { ApiClient, ApiError } from "@/lib/api";
import { purgePersonalPlanLocalState } from "@/lib/planLocal";

/** Books in the Bible — the denominator the Journey ring fills toward. */
const TOTAL_BOOKS = 66;

export default function CompletedPlans() {
  const router = useRouter();
  const qc = useQueryClient();
  const progress = useProgress();
  const groups = useGroups();
  const { data: plansData } = usePlans();
  const journey = useJourney(new Date().getFullYear());
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  const planById = new Map((plansData?.plans ?? []).map((p) => [p.id, p]));
  const completed = (progress.data ?? []).filter((p) => p.completedAt);
  const [busy, setBusy] = useState(false);

  const journeyTotals = journey.data?.totals;
  const booksVisited = journeyTotals?.books ?? 0;
  const booksPercent = (booksVisited / TOTAL_BOOKS) * 100;

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
            // Taking a read-through again starts at its introduction, same as
            // a first run — the run is blank, so the threshold repeats. Read
            // off the progress row for the same reason the title is.
            const row = (progress.data ?? []).find((p) => p.planId === planId);
            const readThrough = row?.planHowToUse ?? planById.get(planId)?.howToUse;
            router.push(
              readThrough ? `/devotional/intro/${planId}` : `/devotional/${planId}`
            );
          } catch (err) {
            // A plan can be finished and still not be re-startable — the team
            // may have pulled it back for rewriting. That isn't "try again".
            if (err instanceof ApiError && err.status === 403) {
              Alert.alert("Not available right now", err.message);
            } else {
              Alert.alert("Something went wrong", "Please try again.");
            }
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
        {/* The ground covered, not just the plans finished. Sits above the list
            because it's the bigger picture the finished plans add up to.

            The ring counts BOOKS you've been in, not verses: a verse figure is
            2-5% in even a strong year, which draws as a hairline and reads as
            failure. Books move — open one and the ring gains a point and a half.
            The exact verse truth for every book is on the screen behind this. */}
        <Pressable
          onPress={() => router.push("/plans/journey")}
          className="mb-2 rounded-xl border border-border bg-card p-5 active:bg-muted/40"
        >
          {/* Title stays left-aligned like every other card in the app; the
              chevron rides its line because a stacked card has no middle-right. */}
          <View className="flex-row items-center justify-between gap-2">
            <Text className="font-serif text-xl font-bold text-foreground">
              Your Bible Journey
            </Text>
            <ChevronRight size={18} color={muted} />
          </View>

          <View className="my-4 items-center">
            <ProgressRing percent={booksPercent} size={116} stroke={8} />
          </View>

          <Text className="text-center text-sm text-foreground">
            {booksVisited} of {TOTAL_BOOKS} books this year
          </Text>
          {journeyTotals ? (
            <Text className="mt-1 text-center text-xs text-muted-foreground">
              {journeyTotals.chapters} chapter{journeyTotals.chapters === 1 ? "" : "s"} ·{" "}
              {journeyTotals.days} day{journeyTotals.days === 1 ? "" : "s"} read
              {journeyTotals.booksComplete > 0
                ? ` · ${journeyTotals.booksComplete} finished`
                : ""}
            </Text>
          ) : null}
        </Pressable>

        {completed.length === 0 ? (
          <View className="items-center rounded-xl border border-border bg-card p-8">
            <CheckCircle2 size={26} color={primary} />
            <Text className="mt-3 text-center text-sm text-muted-foreground">
              Finish a plan and it&apos;ll be celebrated here.
            </Text>
          </View>
        ) : (
          completed.map((row) => {
            // The row's own title first — the library list won't hold a plan
            // that's since been pulled from the shelf, but your history does.
            const title = row.planTitle ?? planById.get(row.planId)?.title ?? "Devotional";
            return (
              <Pressable
                key={row.id}
                onPress={() => router.push(`/devotional/history/${row.planId}`)}
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
