import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { useThemeColor } from "@/components/useThemeColor";
import { usePlans, useProgress } from "@/lib/queries";
import { CATEGORIES } from "@/lib/categories";

export default function PlansScreen() {
  const router = useRouter();
  const { data } = usePlans();
  const progress = useProgress();
  const white = "#FFFFFF";
  const muted = useThemeColor("muted-foreground");

  const countByCategory = data?.countByCategory ?? {};
  const completedCount = (progress.data ?? []).filter((p) => p.completedAt).length;

  const openCategory = (id: string, count: number) => {
    if (count > 0) router.push(`/plans/${id}`);
    else Alert.alert("Coming soon", "New plans for this category are on the way.");
  };

  return (
    <Screen edges={["top"]}>
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-4 py-8"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-xs uppercase tracking-wider text-muted-foreground">
          Browse &amp; Start
        </Text>
        <Text className="mb-5 font-serif text-2xl font-bold text-foreground">Plans</Text>

        <View className="flex-row flex-wrap justify-between">
          {/* Completed tile (pinned first) */}
          <Pressable
            onPress={() =>
              completedCount > 0
                ? router.push("/plans/completed")
                : Alert.alert("Nothing yet", "Finish a plan and it'll show up here.")
            }
            className="mb-3 aspect-[4/5] w-[48%] justify-end overflow-hidden rounded-2xl bg-card-deep p-3"
          >
            <CheckCircle2 size={22} color={muted} />
            <Text className="mt-2 font-serif text-base font-bold uppercase text-foreground">
              Completed
            </Text>
            <Text className="text-xs text-muted-foreground">Your finished plans</Text>
          </Pressable>

          {CATEGORIES.map((cat) => {
            const count = countByCategory[cat.id] ?? 0;
            return (
              <Pressable
                key={cat.id}
                onPress={() => openCategory(cat.id, count)}
                style={{ backgroundColor: cat.tint }}
                className="mb-3 aspect-[4/5] w-[48%] justify-end overflow-hidden rounded-2xl p-3"
              >
                <Text className="font-serif text-base font-bold uppercase text-white">
                  {cat.title}
                </Text>
                <Text className="text-xs text-white/70">
                  {count > 0 ? `${count} Plan${count > 1 ? "s" : ""}` : cat.subtitle}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
