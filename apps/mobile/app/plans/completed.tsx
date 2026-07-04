import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CheckCircle2, ChevronRight } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { useThemeColor } from "@/components/useThemeColor";
import { usePlans, useProgress } from "@/lib/queries";

export default function CompletedPlans() {
  const router = useRouter();
  const progress = useProgress();
  const { data: plansData } = usePlans();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  const planById = new Map((plansData?.plans ?? []).map((p) => [p.id, p]));
  const completed = (progress.data ?? []).filter((p) => p.completedAt);

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
            return (
              <Pressable
                key={row.id}
                onPress={() => router.push(`/plans/review/${row.planId}`)}
                className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 active:bg-muted/40"
              >
                <CheckCircle2 size={22} color={primary} />
                <View className="flex-1">
                  <Text className="font-serif text-lg font-bold text-foreground">
                    {plan?.title ?? "Devotional"}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Completed{" "}
                    {row.completedAt
                      ? new Date(row.completedAt).toLocaleDateString()
                      : ""}
                  </Text>
                </View>
                <ChevronRight size={18} color={muted} />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
