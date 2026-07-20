import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BookOpen, CheckCircle2, ChevronRight, Globe, Sun, Users } from "lucide-react-native";
import { PopIn } from "@/components/PopIn";
import { Screen } from "@/components/Screen";
import { StreakFlame } from "@/components/StreakFlame";
import { Avatar } from "@/components/Avatar";
import { useThemeColor } from "@/components/useThemeColor";
import { useProfile, useActiveDevotional, useCommunityToday, useDiscipleships, useGroups } from "@/lib/queries";
import { GROUP_TYPE_CONFIG, groupReadingHref } from "@/lib/groupTypes";
import { useLocalDoneToday } from "@/lib/useLocalDoneToday";

export default function HomeScreen() {
  const router = useRouter();
  const profile = useProfile();
  const { data: active } = useActiveDevotional();
  // Server `doneToday` covers fresh installs; the local lock covers the
  // evening gap when the UTC day has rolled over but the user's hasn't.
  const localDone = useLocalDoneToday(active?.planId, undefined, active?.currentDay);
  const doneToday = !!active?.doneToday || localDone;
  const community = useCommunityToday();
  const todayDevo = community.data?.devotional ?? null;
  const communityResponded = !!community.data?.myResponse;
  const communityCount = community.data?.feed?.length ?? 0;
  const discipleships = useDiscipleships();
  const activeDiscs = (discipleships.data ?? []).filter((r) => r.status === "active");
  const groups = useGroups();
  // When there's no personal plan, the Home card falls back to the first group
  // reading — a group-only user has "time with God" today too, not "Choose a Plan".
  const groupReadings = (groups.data ?? []).filter((g) => g.plan);
  const groupReading = active ? null : (groupReadings[0] ?? null);
  // Group readings not already in the hero card get compact rows below it —
  // the group is waiting on you, so it must stay visible on Home.
  const secondaryGroups = groupReadings.filter((g) => g.id !== groupReading?.id);
  const myId = profile.data?.userId;
  const groupDone = !!groupReading?.members.find((m) => m.userId === myId)?.doneToday;
  const cardDone = active ? doneToday : groupDone;
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

        {/* Community */}
        <View className="mb-6">
          <Pressable
            onPress={() => router.push("/(tabs)/community")}
            className="gap-3 rounded-2xl border border-border bg-card p-5"
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
        </View>

        {/* My Time with God — main highlight */}
        <Pressable
          onPress={() =>
            router.push(
              active
                ? `/devotional/${active.planId}`
                : groupReading
                  ? (groupReadingHref(groupReading) ?? "/plans")
                  : "/plans"
            )
          }
          className="mb-6 w-full rounded-2xl border border-border bg-card p-7"
        >
          <View className="mb-3 flex-row items-center gap-2">
            <Sun size={22} color={primary} />
            <Text className="text-sm font-sans-semibold uppercase tracking-wider text-muted-foreground">
              My Time with God
            </Text>
          </View>
          <Text className="mb-1 text-sm text-muted-foreground">
            {active
              ? `${active.planTitle} · Day ${active.currentDay} of ${active.totalDays}`
              : groupReading
                ? `${groupReading.plan!.title} · Day ${groupReading.currentDay} of ${groupReading.plan!.totalDays} · ${groupReading.members.filter((m) => m.doneToday).length}/${groupReading.members.length} today`
                : "Start a plan to begin"}
          </Text>
          <Text className="mb-2 font-serif text-2xl font-bold text-foreground">
            {active?.chapter ?? groupReading?.plan?.chapter ?? groupReading?.plan?.title ?? "Choose a Plan"}
          </Text>
          <Text className="mb-3 font-serif-italic text-base leading-relaxed text-muted-foreground">
            {active?.theme ??
              (groupReading
                ? `Reading together with ${groupReading.name}.`
                : "Head to Plans to pick your first devotional and start your journey.")}
          </Text>
          <View className="flex-row items-center gap-2 pt-1">
            {!active && !groupReading ? (
              <>
                <BookOpen size={18} color={primary} />
                <Text className="font-sans-medium text-base text-primary">Choose a Plan →</Text>
              </>
            ) : cardDone ? (
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

        {/* Discipleship — every active relationship gets its own card, stacked right below the hero */}
        {activeDiscs.map((disc) => (
          <Pressable
            key={disc.id}
            onPress={() => router.push(`/discipleship/${disc.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open discipleship with ${disc.counterpart.displayName}`}
            className="mb-6 w-full flex-row items-center gap-3 rounded-2xl border border-border bg-card p-5"
          >
            <Avatar name={disc.counterpart.displayName} url={disc.counterpart.avatarUrl} accent={primary} />
            <View className="flex-1">
              <Text className="text-xs font-sans-semibold uppercase tracking-wider text-muted-foreground">Discipleship</Text>
              <Text className="font-sans-semibold text-base text-foreground" numberOfLines={1}>
                {disc.counterpart.displayName}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {disc.role === "discipler" ? "You're discipling them" : "Your discipler"}
              </Text>
            </View>
            {disc.unreadCount > 0 ? (
              <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 11 }}>{disc.unreadCount}</Text>
              </View>
            ) : null}
            <ChevronRight size={18} color={muted} />
          </Pressable>
        ))}

        {/* Group readings not covered by the hero card */}
        {secondaryGroups.map((g) => {
          const done = !!g.members.find((m) => m.userId === myId)?.doneToday;
          // Group-type accent (matches the Groups tab) — icon + done check only;
          // the tint circle stays primary so the rows read as one family.
          const accent = GROUP_TYPE_CONFIG[g.groupType]?.color ?? primary;
          return (
            <Pressable
              key={g.id}
              onPress={() => router.push(groupReadingHref(g) ?? "/plans")}
              accessibilityRole="button"
              accessibilityLabel={`Open ${g.name}'s reading`}
              className="mb-3 w-full flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users size={20} color={accent} />
              </View>
              <View className="flex-1">
                <Text className="font-sans-semibold text-base text-foreground" numberOfLines={1}>
                  {g.name}
                </Text>
                {/* Two lines so a long title can't push the day count off-screen */}
                <Text className="text-sm text-muted-foreground" numberOfLines={2}>
                  {g.plan!.title} · Day {g.currentDay} of {g.plan!.totalDays} ·{" "}
                  {g.members.filter((m) => m.doneToday).length}/{g.members.length} today
                </Text>
              </View>
              {/* Ghosted check that "lights up" on completion — no chevron, the whole row is the door */}
              {done
                ? <CheckCircle2 size={18} color={accent} />
                : <CheckCircle2 size={18} color={muted} style={{ opacity: 0.5 }} />}
            </Pressable>
          );
        })}
        {secondaryGroups.length > 0 ? <View className="mb-3" /> : null}

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
