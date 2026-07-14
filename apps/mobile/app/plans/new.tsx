import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, LayoutGrid, Sparkles } from "lucide-react-native";

const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  mens:           require("../../assets/images/categories/mens.jpg"),
  women:          require("../../assets/images/categories/women.jpg"),
  fathers:        require("../../assets/images/categories/fathers.jpg"),
  mothers:        require("../../assets/images/categories/mothers.jpg"),
  family:         require("../../assets/images/categories/family.jpg"),
  marriage:       require("../../assets/images/categories/marriage.jpg"),
  youth:          require("../../assets/images/categories/youth.jpg"),
  "new-believer": require("../../assets/images/categories/new-believer.jpg"),
  general:        require("../../assets/images/categories/general.jpg"),
};

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useThemeColor } from "@/components/useThemeColor";
import { withAlpha } from "@/theme/themes";
import { InviteCodeRow, MemberSearch } from "@/components/GroupInvite";
import { useGroups, usePlansByCategory, useProfile } from "@/lib/queries";
import { ApiClient, ApiError, type Group } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { GROUP_TYPE_KEYS, GROUP_TYPE_CONFIG } from "@/lib/groupTypes";

const TYPE_DESC: Record<string, string> = {
  "one-on-one": "Mentor one person, with discipleship tools",
  family: "Your household, reading together",
  "small-group": "A handful of people",
  "large-group": "A bigger circle",
  community: "Your whole church",
};

type Step = "group" | "plan" | "invite";

/**
 * The unified "New plan" flow: a group is the audience, a plan is the content,
 * so they're created together. Who's it for → choose a plan → invite.
 * Also entered with ?groupId= to add a plan to an existing (plan-less) group.
 */
export default function NewPlanFlow() {
  const params = useLocalSearchParams<{
    type?: string;
    groupId?: string;
    groupName?: string;
    step?: string;
  }>();
  const router = useRouter();
  const qc = useQueryClient();

  const groups = useGroups();
  const existingGroup = params.groupId
    ? (groups.data ?? []).find((g) => g.id === params.groupId) ?? null
    : null;

  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const fg = useThemeColor("foreground");
  const bg = useThemeColor("background");
  const card = useThemeColor("card");
  const border = useThemeColor("border");

  const profileData = useProfile().data;
  const myId = profileData?.userId;
  // AI generation is team-only now; non-admins pick from the library.
  const isAdmin = profileData?.isAdmin ?? false;

  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);
  const activeGroupId = createdGroup?.id ?? params.groupId ?? null;
  // Derive from the live groups list so the roster reflects people as they're
  // added; fall back to the freshly-created group before the refetch lands.
  const activeGroup =
    (activeGroupId ? (groups.data ?? []).find((g) => g.id === activeGroupId) : null) ??
    createdGroup ??
    existingGroup;
  const accent = activeGroup
    ? GROUP_TYPE_CONFIG[activeGroup.groupType]?.color ?? primary
    : primary;

  const initialStep: Step = params.step === "invite" ? "invite" : params.groupId ? "plan" : "group";
  const [step, setStep] = useState<Step>(initialStep);

  // Group step
  const [name, setName] = useState("");
  const [type, setType] = useState<string>(params.type ?? "small-group");
  const [creating, setCreating] = useState(false);

  // Plan step
  const [browseCat, setBrowseCat] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const openCreate = () => router.push(`/plans/create${activeGroupId ? `?groupId=${activeGroupId}` : ""}`);

  // Focus the name field only after the open transition settles. Focusing during
  // the push makes the keyboard animate in mid-transition and stutters the screen.
  const nameRef = useRef<TextInput>(null);
  useEffect(() => {
    if (initialStep !== "group") return;
    const task = InteractionManager.runAfterInteractions(() => nameRef.current?.focus());
    return () => task.cancel();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goBack = () => {
    if (step === "plan" && browseCat) return setBrowseCat(null);
    if (step === "plan" && !params.groupId) return setStep("group");
    router.back();
  };

  const createGroupAndContinue = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { group } = await ApiClient.createGroup({ name: name.trim(), groupType: type });
      await qc.invalidateQueries({ queryKey: ["groups"] });
      const fresh = (await ApiClient.getGroups()).groups.find((g) => g.id === group.id) ?? null;
      setCreatedGroup(fresh ?? { ...group, members: group.members ?? [] });
      setStep("plan");
    } catch (err) {
      Alert.alert("Couldn't create group", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const assignPlan = async (planId: string) => {
    if (!activeGroupId) return;
    setAssigning(true);
    try {
      await ApiClient.assignPlanToGroup(activeGroupId, planId);
      await qc.invalidateQueries({ queryKey: ["groups"] });
      setStep("invite");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        Alert.alert(
          "You're at your limit",
          "You're already in three active group devotionals. Go deeper with the ones you have before adding more."
        );
      } else {
        Alert.alert("Couldn't add the plan", err instanceof ApiError ? err.message : "Please try again.");
      }
    } finally {
      setAssigning(false);
    }
  };

  const stepNum = step === "group" ? 1 : step === "plan" ? 2 : 3;
  const stepTitle = step === "group" ? "Who's it for?" : step === "plan" ? "Choose a plan" : "Invite people";
  const stepSub =
    step === "group"
      ? "A group is the audience for a plan. Name it and pick the type."
      : step === "plan"
        ? "Browse the library or create your own — this is the content the group reads together."
        : "Share the code or add people. They'll read this plan with you.";

  return (
    <Screen edges={["top", "bottom"]}>
      {/* Stepped header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 12 }}>
        <Pressable onPress={goBack} hitSlop={8} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Back">
          <ChevronLeft size={22} color={fg} />
        </Pressable>
        <View style={{ flex: 1, height: 3, backgroundColor: border, borderRadius: 2 }}>
          <View style={{ width: `${(stepNum / 3) * 100}%`, height: 3, backgroundColor: primary, borderRadius: 2 }} />
        </View>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted, minWidth: 28, textAlign: "right" }}>
          {stepNum}/3
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-6 pt-4 pb-16"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, color: fg, marginBottom: 6 }}>
          {stepTitle}
        </Text>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: muted, lineHeight: 21, marginBottom: 22 }}>
          {stepSub}
        </Text>

        {/* ── Step 1: group ─────────────────────────────────────────────── */}
        {step === "group" && (
          <View>
            <TextInput
              ref={nameRef}
              value={name}
              onChangeText={setName}
              placeholder="Name your group — e.g. The Forge"
              placeholderTextColor={muted}
              style={{
                borderWidth: 1,
                borderColor: border,
                borderRadius: 12,
                padding: 14,
                fontFamily: "DMSans_400Regular",
                fontSize: 16,
                color: fg,
                backgroundColor: card,
                marginBottom: 20,
              }}
            />
            <View style={{ gap: 10 }}>
              {GROUP_TYPE_KEYS.map((key) => {
                const val = GROUP_TYPE_CONFIG[key]!;
                const selected = type === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setType(key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={{
                      borderWidth: 1.5,
                      borderColor: selected ? val.color : border,
                      borderRadius: 12,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: selected ? withAlpha(val.color, 0.1) : "transparent",
                    }}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: val.color }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: selected ? val.color : fg, fontFamily: "DMSans_700Bold", fontSize: 15 }}>
                        {val.label}
                      </Text>
                      <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 1 }}>
                        {TYPE_DESC[key] ?? ""}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Button
              title="Continue"
              onPress={createGroupAndContinue}
              disabled={!name.trim()}
              loading={creating}
              style={{ marginTop: 24 }}
            />
          </View>
        )}

        {/* ── Step 2: plan ──────────────────────────────────────────────── */}
        {step === "plan" && (
          <View>
            {browseCat === null ? (
              <View>
                {/* Browse everything — surfaces plans whose category isn't a tile. */}
                <Pressable
                  onPress={() => setBrowseCat("all")}
                  accessibilityRole="button"
                  accessibilityLabel="Browse all plans"
                  className="mb-4 flex-row items-center justify-between rounded-2xl border border-border bg-card px-5 py-4"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <LayoutGrid size={18} color={primary} />
                    </View>
                    <View>
                      <Text className="font-sans-semibold text-base text-foreground">All plans</Text>
                      <Text className="text-xs text-muted-foreground">Browse the full library</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={muted} />
                </Pressable>

              <View className="flex-row flex-wrap justify-between">
                {/* Create your own (AI) — team-only now */}
                {isAdmin ? (
                  <Pressable
                    onPress={openCreate}
                    accessibilityRole="button"
                    accessibilityLabel="Create your own plan with AI"
                    className="mb-3 aspect-[4/5] w-[48%] justify-end overflow-hidden rounded-2xl"
                    style={{ backgroundColor: "#1C2B3A" }}
                  >
                    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "65%", backgroundColor: "rgba(0,0,0,0.35)" }} />
                    <View className="p-3">
                      <Sparkles size={22} color="#fff" />
                      <Text className="mt-2 font-serif text-base font-bold uppercase text-white">Create Your Own</Text>
                      <Text className="text-xs text-white/70">Generate with AI</Text>
                    </View>
                  </Pressable>
                ) : null}

                {CATEGORIES.map((cat) => {
                  const img = CATEGORY_IMAGES[cat.id];
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setBrowseCat(cat.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${cat.title} plans`}
                      style={{ backgroundColor: cat.tint }}
                      className="mb-3 aspect-[4/5] w-[48%] justify-end overflow-hidden rounded-2xl"
                    >
                      {img && (
                        <Image
                          source={img}
                          style={[StyleSheet.absoluteFillObject, { width: "100%", height: "100%" }]}
                          resizeMode="cover"
                        />
                      )}
                      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", backgroundColor: "rgba(0,0,0,0.45)" }} />
                      <View className="p-3">
                        <Text className="font-serif text-base font-bold uppercase text-white">{cat.title}</Text>
                        <Text className="text-xs text-white/70">{cat.subtitle}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              </View>
            ) : (
              <PlanPicker
                category={browseCat}
                accent={accent}
                assigning={assigning}
                currentPlanId={activeGroup?.plan?.id ?? null}
                onBack={() => setBrowseCat(null)}
                onPick={assignPlan}
              />
            )}
          </View>
        )}

        {/* ── Step 3: invite ────────────────────────────────────────────── */}
        {step === "invite" && activeGroup && (
          <View style={{ gap: 24 }}>
            <InviteCodeRow
              inviteCode={activeGroup.inviteCode}
              accent={accent}
              muted={muted}
              border={border}
              card={card}
            />
            {activeGroup.members.length > 0 && (
              <View>
                <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 12, color: muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>
                  In this group · {activeGroup.members.length}
                </Text>
                {activeGroup.members.map((m) => (
                  <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: withAlpha(accent, 0.13), alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 13, color: accent }}>
                        {m.displayName[0]?.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ flex: 1, fontFamily: "DMSans_500Medium", fontSize: 14, color: fg }}>
                      {m.displayName}
                      {m.userId === myId ? " (you)" : ""}
                    </Text>
                    <Check size={16} color={accent} />
                  </View>
                ))}
              </View>
            )}
            <MemberSearch
              groupId={activeGroup.id}
              existingUserIds={new Set(activeGroup.members.map((m) => m.userId))}
              accent={accent}
              muted={muted}
              border={border}
              card={card}
              bg={bg}
              fg={fg}
              onAdded={() => qc.invalidateQueries({ queryKey: ["groups"] })}
            />
            <Button title="Done" onPress={() => router.replace("/(tabs)/groups")} />
          </View>
        )}

        {step === "invite" && !activeGroup && (
          <ActivityIndicator color={primary} style={{ marginTop: 24 }} />
        )}
      </ScrollView>
    </Screen>
  );
}

/** The plans inside one category, as a selectable list. */
function PlanPicker({
  category,
  accent,
  assigning,
  currentPlanId,
  onBack,
  onPick,
}: {
  category: string;
  accent: string;
  assigning: boolean;
  currentPlanId: string | null;
  onBack: () => void;
  onPick: (planId: string) => void;
}) {
  const { data: plans, isLoading, isError, refetch } = usePlansByCategory(category);
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const fg = useThemeColor("foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");

  return (
    <View style={{ gap: 12 }}>
      <Pressable onPress={onBack} hitSlop={8} className="flex-row items-center gap-1.5 self-start py-1" accessibilityRole="button">
        <ChevronLeft size={16} color={muted} />
        <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 14 }}>All categories</Text>
      </Pressable>

      {isLoading ? (
        <ActivityIndicator color={primary} style={{ marginTop: 16 }} />
      ) : isError ? (
        <Pressable onPress={() => refetch()} style={{ padding: 16, borderWidth: 1, borderColor: border, borderRadius: 12 }}>
          <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center" }}>
            Couldn't load plans. Tap to retry.
          </Text>
        </Pressable>
      ) : (plans ?? []).length === 0 ? (
        <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 14, fontStyle: "italic", marginTop: 8 }}>
          New plans for this category are on the way.
        </Text>
      ) : (
        (plans ?? []).map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          return (
          <Pressable
            key={plan.id}
            onPress={() => !assigning && onPick(plan.id)}
            disabled={assigning}
            style={{
              borderWidth: 1,
              borderColor: border,
              borderRadius: 12,
              backgroundColor: card,
              padding: 14,
              opacity: assigning ? 0.6 : 1,
            }}
          >
            <View className="flex-row items-start justify-between gap-3">
              <Text style={{ flex: 1, fontFamily: "PlayfairDisplay_700Bold", fontSize: 17, color: fg }}>
                {plan.title}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingTop: 2 }}>
                <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 12, color: isCurrent ? muted : accent }}>
                  {isCurrent ? "Current plan" : "Start Plan"}
                </Text>
                {!isCurrent ? <ChevronRight size={16} color={accent} /> : null}
              </View>
            </View>
            {plan.description ? (
              <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 19, marginTop: 2 }}>
                {plan.description}
              </Text>
            ) : null}
            <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12, marginTop: 6 }}>
              {plan.totalDays} days
              {plan.bookSummary ? ` · ${plan.bookSummary}` : ""}
            </Text>
          </Pressable>
          );
        })
      )}
    </View>
  );
}
