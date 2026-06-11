import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { useThemeColor } from "@/components/useThemeColor";
import { useDays, usePlan, useProgress } from "@/lib/queries";

export default function CompletedPlanReview() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const id = String(planId ?? "");

  const plan = usePlan(id);
  const days = useDays(id);
  const progress = useProgress();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  const row = (progress.data ?? []).find((p) => p.planId === id);
  const completedAt = row?.completedAt
    ? new Date(row.completedAt).toLocaleDateString()
    : null;

  return (
    <Screen edges={["top"]}>
      <Header
        title={plan.data?.title ?? "Plan"}
        subtitle={completedAt ? `Completed ${completedAt}` : "Plan review"}
      />
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-4 pb-12 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {plan.data?.description ? (
          <View className="mb-4 rounded-xl border border-border bg-card p-4">
            <Text className="text-sm leading-relaxed text-muted-foreground">
              {plan.data.description}
            </Text>
          </View>
        ) : null}

        <Text className="mb-2 px-1 text-[11px] font-sans-semibold uppercase tracking-wider text-muted-foreground">
          {(days.data?.length ?? plan.data?.totalDays ?? 0)} days
        </Text>

        {(days.data ?? []).map((d) => (
          <View
            key={d.id}
            className="mb-2 rounded-xl border border-border bg-card p-4"
          >
            <View className="mb-1 flex-row items-center gap-2">
              <View
                className="h-6 w-6 items-center justify-center rounded-full"
                style={{ backgroundColor: primary + "1A" }}
              >
                <Text className="font-sans-semibold text-[11px] text-primary">
                  {d.dayNumber}
                </Text>
              </View>
              <Text className="flex-1 font-serif text-base font-bold text-foreground">
                {d.chapter}
              </Text>
              <CheckCircle2 size={16} color={muted} />
            </View>
            {d.theme ? (
              <Text className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                {d.theme}
              </Text>
            ) : null}
            <Text
              className="text-sm leading-relaxed text-muted-foreground"
              numberOfLines={4}
            >
              {d.studyNotes?.[0]?.note ?? ""}
            </Text>
          </View>
        ))}

        {days.isLoading ? (
          <Text className="mt-4 text-center text-sm text-muted-foreground">
            Loading days…
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
