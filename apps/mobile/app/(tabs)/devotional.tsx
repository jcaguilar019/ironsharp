import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronUp, Circle } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { useThemeColor } from "@/components/useThemeColor";
import { useActiveDevotional, useGroups } from "@/lib/queries";

const GROUP_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  "one-on-one":  { label: "One-on-One",  color: "#89B4C9" },
  "family":      { label: "Family",      color: "#7FAF8A" },
  "small-group": { label: "Small Group", color: "#C49A78" },
  "large-group": { label: "Large Group", color: "#9B8EC4" },
  "community":   { label: "Community",   color: "#7A9EAF" },
};

function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="mb-3 text-sm uppercase tracking-wider text-muted-foreground">
      {label}
    </Text>
  );
}

function EmptyNote({ text }: { text: string }) {
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  return (
    <View
      style={{ borderLeftWidth: 2, borderLeftColor: border, paddingLeft: 12, marginBottom: 2 }}
    >
      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 15, color: muted, fontStyle: "italic" }}>
        {text}
      </Text>
    </View>
  );
}

function Divider() {
  const border = useThemeColor("border");
  return <View style={{ height: 1, backgroundColor: border, marginVertical: 24 }} />;
}

export default function DevotionalHub() {
  const router = useRouter();
  const qc = useQueryClient();
  const active = useActiveDevotional();
  const groups = useGroups();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const fg = useThemeColor("foreground");

  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["progress", "active"] }),
      qc.invalidateQueries({ queryKey: ["groups"] }),
    ]);
    setRefreshing(false);
  };

  const sharedPlans = (groups.data ?? []).filter((g) => g.plan);

  return (
    <Screen edges={["top"]}>
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-4 py-8"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary} />}
      >
        <Text className="text-sm uppercase tracking-wider text-muted-foreground">
          Your Daily Reading
        </Text>
        <Text className="mb-6 font-serif text-3xl font-bold text-foreground">Devotionals</Text>

        {/* ── Personal ───────────────────────────────────────────────────────── */}
        <SectionHeader label="Personal" />

        {active.isLoading ? (
          <ActivityIndicator color={primary} />
        ) : active.data ? (
          <View className="overflow-hidden rounded-xl border border-border bg-card">
            <View className="flex-row items-center gap-3 px-4 py-5">
              <View style={{ width: 3, height: 40, borderRadius: 2, backgroundColor: primary }} />
              <View className="flex-1">
                <Text className="font-serif text-lg font-bold text-foreground">
                  {active.data.planTitle}
                </Text>
                <Text className="mt-0.5 text-sm text-muted-foreground">
                  {active.data.chapter ? `${active.data.chapter} · ` : ""}
                  Day {active.data.currentDay}/{active.data.totalDays}
                </Text>
              </View>
              <Pressable onPress={() => router.push(`/devotional/${active.data!.planId}`)}>
                <Text className="text-sm font-semibold uppercase tracking-wider text-primary">
                  Continue
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <EmptyNote text="You don't have an active personal plan. Browse plans to start one." />
        )}

        <Divider />

        {/* ── Shared ─────────────────────────────────────────────────────────── */}
        <SectionHeader label="Shared" />

        {groups.isLoading ? (
          <ActivityIndicator color={primary} />
        ) : sharedPlans.length === 0 ? (
          <EmptyNote text="You're not in any shared devotionals yet. Start or join a group to read together." />
        ) : (
          <View className="gap-2">
            {sharedPlans.map((group) => {
              const config = GROUP_TYPE_CONFIG[group.groupType] ?? { label: group.groupType, color: primary };
              const doneCount = group.members.filter((m) => m.doneToday).length;
              const total = group.members.length;
              const isOpen = expanded === group.id;

              return (
                <View key={group.id} className="overflow-hidden rounded-xl border border-border bg-card">

                  {/* Collapsed row */}
                  <Pressable
                    onPress={() => setExpanded(isOpen ? null : group.id)}
                    className="flex-row items-center gap-3 px-4 py-5 active:opacity-70"
                  >
                    <View style={{ width: 3, height: 40, borderRadius: 2, backgroundColor: config.color }} />
                    <View className="flex-1">
                      <Text className="font-serif text-lg font-bold text-foreground">
                        {group.name}
                      </Text>
                      <Text className="mt-0.5 text-sm text-muted-foreground">
                        {group.plan?.chapter ? `${group.plan.chapter} · ` : ""}
                        Day {group.currentDay}/{group.plan?.totalDays ?? "?"}
                      </Text>
                    </View>

                    {/* Completion badge */}
                    <View
                      style={{
                        backgroundColor: config.color + "22",
                        borderRadius: 20,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        marginRight: 4,
                      }}
                    >
                      <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 14, color: config.color }}>
                        {doneCount}/{total}
                      </Text>
                    </View>

                    {isOpen
                      ? <ChevronUp size={16} color={muted} />
                      : <ChevronDown size={16} color={muted} />
                    }
                  </Pressable>

                  {/* Expanded member list */}
                  {isOpen && (
                    <View style={{ borderTopWidth: 1, borderTopColor: border }}>
                      {group.members.map((member, i) => (
                        <View
                          key={member.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderTopWidth: i === 0 ? 0 : 1,
                            borderTopColor: border,
                            gap: 10,
                          }}
                        >
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: config.color + "22",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 11, color: config.color }}>
                              {member.displayName[0]?.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={{ flex: 1, fontFamily: "DMSans_400Regular", fontSize: 15, color: fg }}>
                            {member.displayName}
                          </Text>
                          {member.doneToday
                            ? <CheckCircle2 size={16} color={config.color} />
                            : <Circle size={16} color={muted} />
                          }
                        </View>
                      ))}

                      <View style={{ borderTopWidth: 1, borderTopColor: border, padding: 12 }}>
                        <Pressable
                          onPress={() => router.push(`/devotional/${group.plan!.id}?groupId=${group.id}`)}
                          style={{ backgroundColor: config.color }}
                          className="h-10 items-center justify-center rounded-lg"
                        >
                          <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 15, color: "#fff" }}>
                            Continue Reading
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
