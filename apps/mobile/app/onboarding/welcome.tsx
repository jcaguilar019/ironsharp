import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useThemeColor } from "@/components/useThemeColor";
import { usePlans } from "@/lib/queries";
import { ApiClient } from "@/lib/api";
import { categoryLabel } from "@/lib/categories";
import { useOnboarding } from "./_layout";

const PERKS = [
  "You + 2 others included",
  "All 5 color themes",
  "Core devotional plans",
  "Read-aloud and voice memos",
];

export default function OnboardingWelcome() {
  const router = useRouter();
  const qc = useQueryClient();
  const { displayName, churchName, role, planId } = useOnboarding();
  const { data } = usePlans();
  const checkColor = useThemeColor("primary");

  const finish = useMutation({
    mutationFn: async () => {
      await ApiClient.updateProfile({
        displayName: displayName || undefined,
        churchName: churchName || undefined,
        primaryRole: role ?? "disciple",
        surveyCompleted: true,
      });
      if (planId) await ApiClient.startPlan(planId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["progress"] });
      router.replace("/(tabs)/home");
    },
  });

  const plans = data?.plans ?? [];

  return (
    <Screen edges={["top"]}>
      <ScrollView
        contentContainerClassName="px-6 pb-28 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center pb-6">
          <Text className="font-serif text-4xl font-bold text-foreground">
            Iron<Text className="text-primary">Sharp</Text>
          </Text>
          <Text className="mt-1 font-serif text-lg text-foreground">
            Welcome to the community.
          </Text>
        </View>

        <View className="rounded-2xl border border-border bg-card p-5">
          <Text className="mb-3 text-[11px] font-sans-semibold uppercase tracking-wider text-muted-foreground">
            Your free account includes
          </Text>
          <View className="gap-2.5">
            {PERKS.map((perk) => (
              <View key={perk} className="flex-row items-center gap-2.5">
                <View className="h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                  <Check size={12} color={checkColor} strokeWidth={3} />
                </View>
                <Text className="text-sm text-foreground">{perk}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text className="mb-1 mt-8 font-serif text-xl font-bold text-foreground">
          Available Plans
        </Text>
        <Text className="mb-4 text-sm text-muted-foreground">
          Scroll through what&apos;s waiting for you.
        </Text>

        <View className="gap-3">
          {plans.map((plan) => (
            <View key={plan.id} className="rounded-xl border border-border bg-card p-4">
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="flex-1 font-serif text-lg font-bold text-foreground">
                  {plan.title}
                </Text>
                <Text className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-sans-medium text-muted-foreground">
                  {categoryLabel(plan.category)}
                </Text>
              </View>
              <Text className="text-xs text-muted-foreground">{plan.totalDays} days</Text>
              {plan.description ? (
                <Text className="mt-1 text-sm text-muted-foreground" numberOfLines={2}>
                  {plan.description}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-6 py-4">
        <Button
          title="Continue to IronSharp →"
          loading={finish.isPending}
          onPress={() => finish.mutate()}
        />
      </View>
    </Screen>
  );
}
