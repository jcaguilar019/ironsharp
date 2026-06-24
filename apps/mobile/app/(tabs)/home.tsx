import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BookOpen, CheckCircle2, Globe, Sun, Headphones } from "lucide-react-native";
import { PopIn } from "@/components/PopIn";
import { Screen } from "@/components/Screen";
import { StreakFlame } from "@/components/StreakFlame";
import { useThemeColor } from "@/components/useThemeColor";
import { useProfile, useActiveDevotional, useCommunityToday } from "@/lib/queries";
import { useLocalDoneToday } from "@/lib/useLocalDoneToday";

export default function HomeScreen() {
  const router = useRouter();
  const profile = useProfile();
  const { data: active } = useActiveDevotional();
  // Server `doneToday` covers fresh installs; the local lock covers the
  // evening gap when the UTC day has rolled over but the user's hasn't.
  const localDone = useLocalDoneToday(active?.planId);
  const doneToday = !!active?.doneToday || localDone;
  const community = useCommunityToday();
  const todayDevo = community.data?.devotional ?? null;
  const communityResponded = !!community.data?.myResponse;
  const communityCount = community.data?.feed.length ?? 0;
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
          <Text className="font-serif text-3xl font-bold text-foreground">
            {greeting}, {firstName}
          </Text>
          <StreakFlame streak={streak} size={32} />
        </View>

        {/* Community & Podcast */}
        <View className="mb-6 flex-row gap-3">
          <Pressable
            onPress={() => router.push("/community")}
            className="flex-1 gap-3 rounded-2xl border border-border bg-card p-5"
          >
            <View className="flex-row items-center justify-between">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Globe size={18} color={primary} />
              </View>
              {todayDevo && !communityResponded ? (
                <Text style={{ color: primary }} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-sans-semibold uppercase tracking-wide">
                  New
                </Text>
              ) : communityResponded ? (
                <CheckCircle2 size={16} color={primary} />
              ) : null}
            </View>
            <View>
              <Text className="font-sans-semibold text-base text-foreground">IronSharp Community</Text>
              {todayDevo ? (
                <>
                  <Text numberOfLines={1} style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted, marginTop: 2 }}>
                    {todayDevo.passageReference}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <View className="rounded-full bg-primary/10 px-[7px] py-0.5">
                      <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 12, color: primary }}>{communityCount}</Text>
                    </View>
                    <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted }}>
                      {communityCount === 1 ? "response" : "responses"}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted, marginTop: 2 }}>
                  Check back soon
                </Text>
              )}
            </View>
          </Pressable>

          <View className="flex-1 gap-3 rounded-2xl border border-border bg-card p-5">
            <View className="flex-row items-center justify-between">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Headphones size={18} color={primary} />
              </View>
              <Text className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-sans-semibold uppercase tracking-wide text-muted-foreground">
                Soon
              </Text>
            </View>
            <View>
              <Text className="font-sans-semibold text-base text-foreground">Podcast</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">Ep. — · — min</Text>
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
          className="mb-6 w-full rounded-2xl border border-border bg-card p-7"
        >
          <View className="mb-3 flex-row items-center gap-2">
            <Sun size={22} color={primary} />
            <Text className="text-base font-sans-semibold uppercase tracking-wider text-muted-foreground">
              My Time with God
            </Text>
          </View>
          <Text className="mb-1 text-sm text-muted-foreground">
            {active
              ? `${active.planTitle} · Day ${active.currentDay} of ${active.totalDays}`
              : "Start a plan to begin"}
          </Text>
          <Text className="mb-2 font-serif text-2xl font-bold text-foreground">
            {active?.chapter ?? "Choose a Plan"}
          </Text>
          <Text className="mb-3 font-serif-italic text-base leading-relaxed text-muted-foreground">
            {active?.theme ?? "Head to Plans to pick your first devotional and start your journey."}
          </Text>
          <View className="flex-row items-center gap-2 pt-1">
            {doneToday ? (
              <>
                <PopIn>
                  <CheckCircle2 size={18} color={primary} />
                </PopIn>
                <Text className="font-sans-medium text-base text-muted-foreground">Done for today</Text>
              </>
            ) : (
              <>
                <BookOpen size={18} color={primary} />
                <Text className="font-sans-medium text-base text-primary">Continue Reading →</Text>
              </>
            )}
          </View>
        </Pressable>

        {/* Daily quote */}
        <View style={{ borderRadius: 12 }} className="bg-card-deep p-5">
          <Text className="text-center font-serif-italic text-base text-muted-foreground">
            {`"As iron sharpens iron, so one person sharpens another."`}
          </Text>
          <Text className="mt-1.5 text-center text-sm font-sans-medium text-muted-foreground">
            Proverbs 27:17
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
