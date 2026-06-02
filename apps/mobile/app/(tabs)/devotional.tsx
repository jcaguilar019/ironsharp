import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BookOpen, ChevronRight } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useThemeColor } from "@/components/useThemeColor";
import { usePlans, useProgress } from "@/lib/queries";

export default function DevotionalHub() {
  const router = useRouter();
  const progress = useProgress();
  const { data: plansData } = usePlans();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  const planById = new Map((plansData?.plans ?? []).map((p) => [p.id, p]));
  const rows = progress.data ?? [];
  const active = rows.filter((r) => !r.completedAt);

  return (
    <Screen edges={["top"]}>
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-6 py-8"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-xs uppercase tracking-wider text-muted-foreground">
          My Time with God
        </Text>
        <Text className="mb-6 font-serif text-2xl font-bold text-foreground">Devotionals</Text>

        {progress.isLoading ? (
          <ActivityIndicator color={primary} />
        ) : active.length === 0 ? (
          <View className="items-center rounded-2xl border border-border bg-card p-8">
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <BookOpen size={22} color={primary} />
            </View>
            <Text className="mb-1 font-serif text-lg font-bold text-foreground">
              No active devotional
            </Text>
            <Text className="mb-5 text-center text-sm text-muted-foreground">
              Pick a plan and start your first day. Your group grows when you do.
            </Text>
            <Button title="Browse Plans" onPress={() => router.push("/(tabs)/plans")} />
          </View>
        ) : (
          <View className="gap-3">
            {active.map((row) => {
              const plan = planById.get(row.planId);
              return (
                <Pressable
                  key={row.id}
                  onPress={() => router.push(`/devotional/${row.planId}`)}
                  className="flex-row items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <View className="flex-1">
                    <Text className="font-serif text-lg font-bold text-foreground">
                      {plan?.title ?? "Devotional"}
                    </Text>
                    <Text className="mt-0.5 text-xs font-sans-medium text-primary">
                      Continue · Day {row.currentDay}
                      {plan ? ` of ${plan.totalDays}` : ""}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={muted} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
