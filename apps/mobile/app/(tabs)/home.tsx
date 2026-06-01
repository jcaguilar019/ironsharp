import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Flame, BookOpen, Globe, Sun, Headphones } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { useThemeColor } from "@/components/useThemeColor";
import { useProfile, useActiveDevotional } from "@/lib/queries";

export default function HomeScreen() {
  const router = useRouter();
  const profile = useProfile();
  const { data: active } = useActiveDevotional();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const firstName = (profile.data?.displayName ?? "Friend").split(" ")[0];
  const streak = profile.data?.streakCount ?? 0;

  return (
    <Screen edges={["top"]}>
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-6 py-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="font-serif text-2xl font-bold text-foreground">
            {greeting}, {firstName}
          </Text>
          <View className="flex-row items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
            <Flame size={16} color={primary} />
            <Text className="font-sans-semibold text-sm text-primary">{streak} day streak</Text>
          </View>
        </View>

        {/* Community & Podcast */}
        <View className="mb-6 flex-row gap-3">
          <Pressable
            onPress={() => router.push("/(tabs)/groups")}
            className="flex-1 gap-2.5 rounded-2xl border border-border bg-card p-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Globe size={16} color={primary} />
              </View>
              <Text className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-sans-semibold uppercase tracking-wide text-muted-foreground">
                Soon
              </Text>
            </View>
            <View>
              <Text className="font-sans-semibold text-sm text-foreground">Community</Text>
              <Text className="mt-0.5 text-[11px] text-muted-foreground">— · Day — · — done</Text>
            </View>
          </Pressable>

          <View className="flex-1 gap-2.5 rounded-2xl border border-border bg-card p-4">
            <View className="flex-row items-center justify-between">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Headphones size={16} color={primary} />
              </View>
              <Text className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-sans-semibold uppercase tracking-wide text-muted-foreground">
                Soon
              </Text>
            </View>
            <View>
              <Text className="font-sans-semibold text-sm text-foreground">Podcast</Text>
              <Text className="mt-0.5 text-[11px] text-muted-foreground">Ep. — · — min</Text>
            </View>
          </View>
        </View>

        {/* My Time with God — main highlight */}
        <Pressable
          onPress={() =>
            router.push(
              active ? `/devotional/${active.planId}` : "/(tabs)/plans"
            )
          }
          className="mb-6 w-full rounded-2xl border border-border bg-card p-6"
        >
          <View className="mb-3 flex-row items-center gap-2">
            <Sun size={20} color={primary} />
            <Text className="text-sm font-sans-semibold uppercase tracking-wider text-muted-foreground">
              My Time with God
            </Text>
          </View>
          <Text className="mb-1 text-xs text-muted-foreground">
            {active
              ? `${active.planTitle} · Day ${active.currentDay} of ${active.totalDays}`
              : "Start a plan to begin"}
          </Text>
          <Text className="mb-2 font-serif text-xl font-bold text-foreground">
            {active?.chapter ?? "Choose a Plan"}
          </Text>
          <Text className="mb-3 font-serif-italic text-sm leading-relaxed text-muted-foreground">
            {active?.theme ??
              "Head to Plans to pick your first devotional and start your journey."}
          </Text>
          <View className="flex-row items-center gap-2 pt-1">
            <BookOpen size={16} color={primary} />
            <Text className="font-sans-medium text-sm text-primary">Continue Reading →</Text>
          </View>
        </Pressable>

        {/* Daily quote */}
        <View className="rounded-xl bg-card-deep p-4">
          <Text className="text-center font-serif-italic text-sm text-muted-foreground">
            “As iron sharpens iron, so one person sharpens another.”
          </Text>
          <Text className="mt-1 text-center text-xs font-sans-medium text-muted-foreground">
            Proverbs 27:17
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
