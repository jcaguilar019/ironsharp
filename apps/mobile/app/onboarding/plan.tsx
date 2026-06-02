import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BookOpen } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useThemeColor } from "@/components/useThemeColor";
import { usePlans } from "@/lib/queries";
import { useOnboarding } from "./_layout";

export default function PlanSelect() {
  const router = useRouter();
  const { planId, set } = useOnboarding();
  const { data, isLoading } = usePlans();
  const selectedIcon = useThemeColor("primary-foreground");
  const mutedIcon = useThemeColor("muted-foreground");
  const spinner = useThemeColor("primary");

  const plans = data?.plans ?? [];

  return (
    <Screen className="px-8">
      <ScrollView
        contentContainerClassName="flex-grow justify-center py-12"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-serif text-3xl font-bold text-foreground">Choose a Plan</Text>
        <Text className="mb-8 mt-2 text-sm text-muted-foreground">
          Pick a devotional to start with your group
        </Text>

        {isLoading ? (
          <ActivityIndicator color={spinner} />
        ) : (
          <View className="gap-3">
            {plans.map((plan) => {
              const active = planId === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => set({ planId: plan.id })}
                  className={`flex-row items-start gap-4 rounded-xl border-2 p-4 ${
                    active ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <View
                    className={`h-10 w-10 items-center justify-center rounded-lg ${
                      active ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <BookOpen size={20} color={active ? selectedIcon : mutedIcon} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans-semibold text-base text-foreground">
                      {plan.title}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {plan.totalDays} days
                    </Text>
                    {plan.description ? (
                      <Text className="mt-1 text-sm text-muted-foreground" numberOfLines={2}>
                        {plan.description}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View className="mt-6">
          <Button
            title="Continue"
            disabled={plans.length > 0 && !planId}
            onPress={() => router.push("/onboarding/welcome")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
