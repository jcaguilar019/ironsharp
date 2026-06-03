import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { PlanCard } from "@/components/PlanCard";
import { useThemeColor } from "@/components/useThemeColor";
import { usePlansByCategory, useProgress } from "@/lib/queries";
import { ApiClient } from "@/lib/api";
import { categoryLabel } from "@/lib/categories";

export default function PlanList() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const cat = String(category);
  const { data: plans, isLoading } = usePlansByCategory(cat);
  const progress = useProgress();
  const primary = useThemeColor("primary");

  const progressByPlan = new Map((progress.data ?? []).map((p) => [p.planId, p]));

  const start = useMutation({
    mutationFn: (planId: string) => ApiClient.startPlan(planId),
    onSuccess: async (_res, planId) => {
      await qc.invalidateQueries({ queryKey: ["progress"] });
      router.push(`/devotional/${planId}`);
    },
  });

  return (
    <Screen edges={["top"]}>
      <Header title={categoryLabel(cat)} subtitle="Plans" />
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg gap-3 px-4 py-4"
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={primary} />
        ) : (plans ?? []).length === 0 ? (
          <View className="items-center rounded-xl border border-border bg-card p-8">
            <BookOpen size={26} color={primary} />
            <Text className="mt-3 font-serif text-lg font-semibold text-foreground">
              Coming Soon
            </Text>
            <Text className="mt-1 text-center text-sm text-muted-foreground">
              New plans for this category are on the way.
            </Text>
          </View>
        ) : (
          (plans ?? []).map((plan) => {
            const prog = progressByPlan.get(plan.id);
            const status = !prog
              ? "Start Plan"
              : prog.completedAt
                ? "Completed ✓"
                : `Continue · Day ${prog.currentDay}`;
            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                status={status}
                onPress={() =>
                  prog ? router.push(`/devotional/${plan.id}`) : start.mutate(plan.id)
                }
              />
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
