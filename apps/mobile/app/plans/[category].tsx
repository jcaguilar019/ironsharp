import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { BookOpen, ChevronRight } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { usePlansByCategory, useProgress, useGroups } from "@/lib/queries";
import { ApiClient } from "@/lib/api";
import { categoryLabel } from "@/lib/categories";

export default function PlanList() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const cat = String(category);
  const { data: plans, isLoading, isError, refetch } = usePlansByCategory(cat);
  const progress = useProgress();
  const groups = useGroups();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  const progressByPlan = new Map((progress.data ?? []).map((p) => [p.planId, p]));

  const [assigning, setAssigning] = useState(false);

  // Plans selected here are personal — they live on your home page. Assigning a
  // plan to a group happens only in the group flow (app/plans/new.tsx).
  const handlePlanTap = async (planId: string) => {
    if (assigning) return;
    const prog = progressByPlan.get(planId);
    // Already started personally — just open it.
    if (prog) {
      router.push(`/devotional/${planId}`);
      return;
    }
    // One active personal devotional at a time. Plans being read in a group
    // don't count against this personal limit.
    const groupPlanIds = new Set(
      (groups.data ?? []).map((g) => g.plan?.id).filter(Boolean)
    );
    const activePersonalCount = (progress.data ?? []).filter(
      (p) => !p.completedAt && !groupPlanIds.has(p.planId)
    ).length;
    if (activePersonalCount >= 1) {
      Alert.alert(
        "One at a time.",
        "You already have an active personal devotional. Finish what is in front of you — depth with one thing beats scattered attention across many."
      );
      return;
    }

    setAssigning(true);
    try {
      await ApiClient.startPlan(planId, false);
      await qc.invalidateQueries({ queryKey: ["progress"] });
      router.push(`/devotional/${planId}`);
    } catch {
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title={categoryLabel(cat)} subtitle="Plans" />
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg gap-3 px-4 py-4"
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={primary} />
        ) : isError ? (
          <ErrorState
            message="We couldn't load these plans. Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : (plans ?? []).length === 0 ? (
          <View className="items-center rounded-xl border border-border bg-card p-8">
            <BookOpen size={26} color={primary} />
            <Text className="mt-3 font-serif text-xl font-semibold text-foreground">
              Coming Soon
            </Text>
            <Text className="mt-1 text-center text-sm text-muted-foreground">
              New plans for this category are on the way.
            </Text>
          </View>
        ) : (
          (plans ?? []).map((plan) => {
            const prog = progressByPlan.get(plan.id);
            const completed = !!prog?.completedAt;
            const actionLabel = !prog
              ? "Start Plan"
              : prog.completedAt
                ? "Completed"
                : "Continue";
            const meta = `${plan.totalDays} days${
              plan.bookSummary ? ` · ${plan.bookSummary}` : ""
            }`;
            return (
              <Pressable
                key={plan.id}
                onPress={() => handlePlanTap(plan.id)}
                disabled={assigning}
                className="rounded-xl border border-border bg-card p-4"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <Text className="flex-1 font-serif text-lg font-bold text-foreground">
                    {plan.title}
                  </Text>
                  <View className="flex-row items-center gap-0.5 pt-1">
                    <Text
                      className="text-xs font-sans-medium"
                      style={{ color: completed ? muted : primary }}
                    >
                      {completed ? "Completed ✓" : actionLabel}
                    </Text>
                    {!completed ? <ChevronRight size={16} color={primary} /> : null}
                  </View>
                </View>

                {plan.description ? (
                  <Text className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {plan.description}
                  </Text>
                ) : null}

                <Text className="mt-2 text-xs font-sans-medium text-muted-foreground">
                  {meta}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
