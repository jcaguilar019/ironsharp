import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BookOpen, CheckCircle2, Circle, Lock } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { useThemeColor } from "@/components/useThemeColor";
import { withAlpha } from "@/theme/themes";
import { GROUP_TYPE_CONFIG } from "@/lib/groupTypes";
import { usePlan, useDays, useGroups, useProgress, usePlanSubmissions } from "@/lib/queries";

/**
 * Every day of a plan run, and where the reader stands on each one. This is how
 * someone who has fallen behind gets back in: past days are openable, the
 * current day is the obvious next action, and days ahead of the group stay shut
 * so a group doesn't scatter across the plan.
 */
type DayState = "done" | "today" | "missed" | "locked";

export default function PlanDayList() {
  const { planId: planIdParam, groupId: groupIdParam } = useLocalSearchParams<{
    planId: string;
    groupId?: string;
  }>();
  const planId = String(planIdParam);
  const groupId = groupIdParam ?? null;
  const router = useRouter();

  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");

  const planQ = usePlan(planId);
  const daysQ = useDays(planId);
  const groups = useGroups();
  const progress = useProgress();
  const submissionsQ = usePlanSubmissions(planId, groupId);

  const activeGroup = groupId ? (groups.data ?? []).find((g) => g.id === groupId) : null;
  const progressRow = (progress.data ?? []).find((p) => p.planId === planId);
  // Same source of truth as the reader: the group's shared day, or personal progress.
  const liveDay = groupId ? (activeGroup?.currentDay ?? 1) : (progressRow?.currentDay ?? 1);
  const totalDays = planQ.data?.totalDays ?? 0;

  const accent = activeGroup
    ? (GROUP_TYPE_CONFIG[activeGroup.groupType]?.color ?? primary)
    : primary;

  const doneDays = new Set((submissionsQ.data ?? []).map((s) => s.dayNumber));
  const chapterByDay = new Map((daysQ.data ?? []).map((d) => [d.dayNumber, d.chapter]));

  const loading =
    planQ.isLoading || daysQ.isLoading || submissionsQ.isLoading || (!!groupId && groups.isLoading);

  // Answered wins over "today" — finishing today's reading shouldn't leave the
  // row still advertising itself as the thing to do.
  const stateFor = (n: number): DayState => {
    if (doneDays.has(n)) return "done";
    if (n > liveDay) return "locked";
    if (n === liveDay) return "today";
    return "missed";
  };

  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const missedCount = days.filter((n) => stateFor(n) === "missed").length;

  const open = (n: number) => {
    const q = [groupId ? `groupId=${groupId}` : "", `day=${n}`].filter(Boolean).join("&");
    router.push(`/devotional/${planId}?${q}`);
  };

  if (loading) {
    return (
      <Screen center>
        <ActivityIndicator color={primary} />
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <Header
        title={planQ.data?.title ?? "Plan"}
        subtitle={
          totalDays > 0
            ? `Day ${liveDay} of ${totalDays}${activeGroup ? ` · ${activeGroup.name}` : ""}`
            : undefined
        }
      />
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg gap-2 px-4 py-4"
        showsVerticalScrollIndicator={false}
      >
        {missedCount > 0 && (
          <View
            style={{ borderColor: withAlpha(accent, 0.4), backgroundColor: withAlpha(accent, 0.08) }}
            className="mb-2 rounded-xl border p-4"
          >
            <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 14, color: accent }}>
              {missedCount} {missedCount === 1 ? "day is" : "days are"} still open
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Pick one up whenever you like — the group keeps moving either way.
            </Text>
          </View>
        )}

        {days.map((n) => {
          const state = stateFor(n);
          const locked = state === "locked";
          const chapter = chapterByDay.get(n);

          return (
            <Pressable
              key={n}
              onPress={() => !locked && open(n)}
              disabled={locked}
              accessibilityRole="button"
              accessibilityState={{ disabled: locked }}
              accessibilityLabel={`Day ${n}${chapter ? `, ${chapter}` : ""}, ${
                state === "done" ? "completed" : state === "today" ? "today's reading" : state
              }`}
              style={{
                opacity: locked ? 0.45 : 1,
                borderColor: state === "today" ? accent : border,
                borderWidth: state === "today" ? 1.5 : 1,
              }}
              className="flex-row items-center gap-3 rounded-xl bg-card p-4 active:bg-muted/40"
            >
              {state === "done" ? (
                <CheckCircle2 size={20} color={accent} />
              ) : state === "today" ? (
                <BookOpen size={20} color={accent} />
              ) : state === "missed" ? (
                <Circle size={20} color={muted} />
              ) : (
                <Lock size={16} color={muted} />
              )}

              <View className="flex-1">
                <Text
                  style={{ fontFamily: "DMSans_500Medium", fontSize: 15 }}
                  className="text-foreground"
                >
                  Day {n}
                </Text>
                {chapter ? (
                  <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                    {chapter}
                  </Text>
                ) : null}
              </View>

              {state === "today" ? (
                <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 11, color: accent }}>
                  TODAY
                </Text>
              ) : state === "missed" ? (
                <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 11, color: muted }}>
                  Catch up
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
