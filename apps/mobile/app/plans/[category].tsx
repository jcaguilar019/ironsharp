import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { BookOpen, ChevronRight, User, Users } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { usePlansByCategory, useProgress, useGroups, useProfile } from "@/lib/queries";
import { ApiClient, ApiError, type Group } from "@/lib/api";
import { categoryLabel } from "@/lib/categories";
import { useUpgradePrompt } from "@/lib/useUpgradePrompt";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import type { MembershipTier } from "@/lib/tiers";

const GROUP_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  "one-on-one":  { label: "One-on-One",  color: "#89B4C9" },
  "family":      { label: "Family",      color: "#7FAF8A" },
  "small-group": { label: "Small Group", color: "#C49A78" },
  "large-group": { label: "Large Group", color: "#9B8EC4" },
  "community":   { label: "Church",      color: "#7A9EAF" },
};

export default function PlanList() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const cat = String(category);
  const { data: plans, isLoading, isError, refetch } = usePlansByCategory(cat);
  const progress = useProgress();
  const groups = useGroups();
  const profile = useProfile();
  const upgradePrompt = useUpgradePrompt(profile.data);
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const bg = useThemeColor("background");
  const card = useThemeColor("card");
  const fg = useThemeColor("foreground");
  const border = useThemeColor("border");

  const progressByPlan = new Map((progress.data ?? []).map((p) => [p.planId, p]));

  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const handlePlanTap = (planId: string) => {
    const prog = progressByPlan.get(planId);
    // If the user already has personal progress but is in groups, still show
    // the modal so they can open the plan in a group context instead.
    if (prog && myGroups.length === 0) {
      router.push(`/devotional/${planId}`);
    } else {
      setPendingPlanId(planId);
    }
  };

  const handleAssign = async (groupId: string | null) => {
    if (!pendingPlanId) return;

    // Client-side pre-checks using already-loaded data.
    const existingGroup = groupId ? (groups.data ?? []).find((g) => g.id === groupId) : null;
    const groupAlreadyHasPlan = existingGroup?.plan?.id === pendingPlanId;

    if (groupId) {
      if (!groupAlreadyHasPlan) {
        const activeGroupCount = (groups.data ?? []).filter((g) => g.plan !== null).length;
        if (activeGroupCount >= 3) {
          Alert.alert(
            "You're at your limit.",
            "You're already in three active group devotionals. Go deeper with the people you are already committed to before adding more."
          );
          return;
        }
      }
    } else {
      // Skip the personal limit check if the user already has progress for this
      // plan — they're just re-opening it, not starting a new one.
      const alreadyStarted = !!progressByPlan.get(pendingPlanId);
      if (!alreadyStarted) {
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
      }
    }

    setAssigning(true);
    try {
      if (groupId) {
        if (!groupAlreadyHasPlan) {
          await ApiClient.assignPlanToGroup(groupId, pendingPlanId);
        }
        await qc.invalidateQueries({ queryKey: ["groups"] });
      } else {
        await ApiClient.startPlan(pendingPlanId, false);
        await qc.invalidateQueries({ queryKey: ["progress"] });
      }
      setPendingPlanId(null);
      if (groupId) {
        router.push(`/devotional/${pendingPlanId}?groupId=${groupId}`);
      } else {
        router.push(`/devotional/${pendingPlanId}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        upgradePrompt.show();
      } else {
        Alert.alert("Something went wrong", "Please try again.");
      }
    } finally {
      setAssigning(false);
    }
  };

  const myGroups: Group[] = groups.data ?? [];

  return (
    <Screen edges={["top"]}>
      <UpgradePromptModal
        visible={upgradePrompt.visible}
        currentTier={(profile.data?.membershipTier ?? "free") as MembershipTier}
        onDismiss={upgradePrompt.dismiss}
      />
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
            const groupForPlan = (groups.data ?? []).find((g) => g.plan?.id === plan.id);
            const completed = !groupForPlan && !!prog?.completedAt;
            const actionLabel = groupForPlan
              ? "Continue"
              : !prog
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
                className="rounded-xl border border-border bg-card p-4"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <Text className="flex-1 font-serif text-lg font-bold text-foreground">
                    {plan.title}
                  </Text>
                  <View className="flex-row items-center gap-0.5 pt-1">
                    <Text
                      className="text-[13px] font-sans-medium"
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

      {/* Assignment sheet */}
      <Modal
        visible={!!pendingPlanId}
        transparent
        animationType="slide"
        onRequestClose={() => !assigning && setPendingPlanId(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
          onPress={() => !assigning && setPendingPlanId(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: bg,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 36,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  backgroundColor: border,
                  borderRadius: 2,
                  alignSelf: "center",
                  marginBottom: 20,
                }}
              />

              <Text
                style={{
                  fontFamily: "PlayfairDisplay_700Bold",
                  fontSize: 18,
                  color: fg,
                  marginBottom: 4,
                }}
              >
                Who's reading this?
              </Text>
              <Text
                style={{
                  fontFamily: "DMSans_400Regular",
                  fontSize: 13,
                  color: muted,
                  marginBottom: 20,
                }}
              >
                Start it personally or assign it to a group.
              </Text>

              {/* Personal option */}
              <Pressable
                onPress={() => handleAssign(null)}
                disabled={assigning}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: border,
                  padding: 14,
                  marginBottom: 10,
                  opacity: assigning ? 0.5 : 1,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: primary + "1A",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={18} color={primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 15, color: fg }}>
                    Just me
                  </Text>
                  <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted }}>
                    Personal devotional
                  </Text>
                </View>
                <ChevronRight size={16} color={muted} />
              </Pressable>

              {/* Group options */}
              {myGroups.length > 0 && (
                <>
                  <Text
                    style={{
                      fontFamily: "DMSans_700Bold",
                      fontSize: 11,
                      color: muted,
                      letterSpacing: 1.2,
                      textTransform: "uppercase",
                      marginBottom: 8,
                      marginTop: 4,
                    }}
                  >
                    Your Groups
                  </Text>
                  {myGroups.map((group) => {
                    const config = GROUP_TYPE_CONFIG[group.groupType] ?? {
                      label: group.groupType,
                      color: primary,
                    };
                    return (
                      <Pressable
                        key={group.id}
                        onPress={() => handleAssign(group.id)}
                        disabled={assigning}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          backgroundColor: card,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: border,
                          padding: 14,
                          marginBottom: 10,
                          opacity: assigning ? 0.5 : 1,
                        }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: config.color + "22",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Users size={18} color={config.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontFamily: "DMSans_700Bold",
                              fontSize: 15,
                              color: fg,
                            }}
                          >
                            {group.name}
                          </Text>
                          <Text
                            style={{
                              fontFamily: "DMSans_400Regular",
                              fontSize: 12,
                              color: muted,
                            }}
                          >
                            {config.label}
                          </Text>
                        </View>
                        <ChevronRight size={16} color={muted} />
                      </Pressable>
                    );
                  })}
                </>
              )}

              {assigning && (
                <ActivityIndicator color={primary} style={{ marginTop: 8 }} />
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
