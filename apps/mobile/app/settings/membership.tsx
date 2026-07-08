import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { Check, Copy, Tag } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { useToast } from "@/components/Toast";
import { useProfile } from "@/lib/queries";
import { useThemeColor } from "@/components/useThemeColor";
import { ApiClient, ApiError } from "@/lib/api";
import {
  TIER_DISPLAY,
  TIER_ORDER,
  TIER_LIMITS,
  planUnlocksRemaining,
  type MembershipTier,
} from "@/lib/tiers";

export default function MembershipScreen() {
  const profile = useProfile();
  const qc = useQueryClient();
  const toast = useToast();
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const bg = useThemeColor("background");
  const primary = useThemeColor("primary");
  const destructive = useThemeColor("destructive");

  const currentTier = (profile.data?.membershipTier ?? "free") as MembershipTier;
  const planUnlocksCount = profile.data?.planUnlocksCount ?? 0;
  const planUnlocksWindowStart = profile.data?.planUnlocksWindowStart ?? null;
  const familyCode = profile.data?.familyCode ?? null;

  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [promoError, setPromoError] = useState("");

  const handleRedeem = async () => {
    if (!promoCode.trim()) return;
    setRedeeming(true);
    setPromoError("");
    try {
      const res = await ApiClient.redeemPromo(promoCode.trim());
      await qc.invalidateQueries({ queryKey: ["profile"] });
      setShowPromo(false);
      setPromoCode("");
      // Confirm success — previously the modal just closed silently, which
      // read as "nothing happened" even when the code worked.
      const tierName = TIER_DISPLAY[res.tier as MembershipTier]?.name ?? res.tier;
      toast.show(res.label ?? `Code applied — you're now on ${tierName}.`);
    } catch (err) {
      setPromoError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title="Membership" subtitle="Your plan" />
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg gap-4 px-4 py-4 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Current plan usage card */}
        <CurrentUsageCard
          tier={currentTier}
          planUnlocksCount={planUnlocksCount}
          planUnlocksWindowStart={planUnlocksWindowStart}
          familyCode={familyCode}
          bg={bg}
          border={border}
          fg={fg}
          muted={muted}
        />

        <Text className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
          All Plans
        </Text>

        {/* Tier comparison cards */}
        {TIER_ORDER.map((tier) => {
          const display = TIER_DISPLAY[tier];
          const isActive = tier === currentTier;

          return (
            <View
              key={tier}
              style={{
                backgroundColor: isActive ? display.accentColor + "18" : card,
                borderColor: isActive ? display.accentColor : border,
                borderWidth: isActive ? 2 : 1,
                borderRadius: 16,
                padding: 18,
                gap: 12,
              }}
            >
              {/* Header row */}
              <View className="flex-row items-start justify-between">
                <View style={{ gap: 2 }}>
                  <View className="flex-row items-center gap-2">
                    <Text
                      className="font-serif text-xl font-bold"
                      style={{ color: isActive ? display.accentColor : fg }}
                    >
                      {display.name}
                    </Text>
                    {isActive && (
                      <View
                        style={{
                          backgroundColor: display.accentColor,
                          borderRadius: 99,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <Text className="text-[10px] font-sans-semibold uppercase tracking-wider text-white">
                          Current
                        </Text>
                      </View>
                    )}
                  </View>

                  {display.monthlyPrice ? (
                    <Text className="text-sm text-muted-foreground">
                      {display.monthlyPrice}/mo{" "}
                      <Text className="text-xs">or {display.annualTotal}</Text>
                    </Text>
                  ) : (
                    <Text className="text-sm text-muted-foreground">Always free</Text>
                  )}
                </View>

                {!isActive && display.monthlyPrice && (
                  <View
                    style={{
                      backgroundColor: border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: muted, fontSize: 13 }}>Coming soon</Text>
                  </View>
                )}
              </View>

              {/* Feature list */}
              <View style={{ gap: 7 }}>
                {display.features.map((feature, i) => (
                  <View key={i} className="flex-row items-start gap-2">
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: isActive
                          ? display.accentColor
                          : display.accentColor + "40",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 1,
                        flexShrink: 0,
                      }}
                    >
                      <Check size={11} color="#fff" strokeWidth={3} />
                    </View>
                    <Text
                      className="flex-1 text-sm leading-5"
                      style={{ color: isActive ? fg : muted }}
                    >
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <Text className="mt-2 text-center text-xs text-muted-foreground px-4">
          Upgrades and billing coming soon. Your plan is managed here.
        </Text>

        {/* Promo code */}
        <Pressable
          onPress={() => { setShowPromo(true); setPromoError(""); }}
          className="flex-row items-center justify-center gap-2 py-4"
        >
          <Tag size={14} color={muted} />
          <Text style={{ color: muted }} className="text-sm">
            Have a promo code?
          </Text>
        </Pressable>
      </ScrollView>

      {/* ── Promo code modal ──────────────────────────────────────────────── */}
      <BottomSheet
        visible={showPromo}
        onClose={() => !redeeming && setShowPromo(false)}
        contentStyle={{ padding: 24, paddingBottom: 44, gap: 16, maxHeight: "90%" }}
      >
            <Text className="font-serif text-xl font-bold text-foreground">Promo Code</Text>
            <TextInput
              value={promoCode}
              onChangeText={(t) => { setPromoCode(t.toUpperCase()); setPromoError(""); }}
              placeholder="Enter code"
              placeholderTextColor={muted}
              autoCapitalize="characters"
              autoCorrect={false}
              style={{
                borderWidth: 1,
                borderColor: promoError ? destructive : border,
                borderRadius: 12,
                padding: 14,
                fontSize: 20,
                fontFamily: "DMSans_700Bold",
                letterSpacing: 3,
                textAlign: "center",
                color: fg,
                backgroundColor: card,
              }}
            />
            {!!promoError && (
              <Text style={{ color: destructive, fontSize: 13, textAlign: "center", marginTop: -8 }}>
                {promoError}
              </Text>
            )}
            <Button
              title="Redeem"
              onPress={handleRedeem}
              disabled={!promoCode.trim()}
              loading={redeeming}
            />
      </BottomSheet>
    </Screen>
  );
}

function CurrentUsageCard({
  tier,
  planUnlocksCount,
  planUnlocksWindowStart,
  familyCode,
  bg,
  border,
  fg,
  muted,
}: {
  tier: MembershipTier;
  planUnlocksCount: number;
  planUnlocksWindowStart: string | null;
  familyCode: string | null;
  bg: string;
  border: string;
  fg: string;
  muted: string;
}) {
  const display = TIER_DISPLAY[tier];
  const limits = TIER_LIMITS[tier];
  const unlockLimit = limits.planUnlocksPerMonth;
  const unlocksLeft = planUnlocksRemaining(tier, planUnlocksCount, planUnlocksWindowStart);

  return (
    <View
      style={{
        backgroundColor: display.accentColor + "15",
        borderColor: display.accentColor + "60",
        borderWidth: 1,
        borderRadius: 16,
        padding: 18,
        gap: 14,
      }}
    >
      <View>
        <Text className="text-xs uppercase tracking-wider" style={{ color: display.accentColor }}>
          {display.name} Plan
        </Text>
        {display.monthlyPrice ? (
          <Text className="mt-0.5 text-sm text-muted-foreground">
            {display.monthlyPrice}/mo · {display.annualTotal}
          </Text>
        ) : (
          <Text className="mt-0.5 text-sm text-muted-foreground">Always free</Text>
        )}
      </View>

      {/* Plan unlocks meter */}
      {unlockLimit !== Infinity ? (
        <View style={{ gap: 6 }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: fg }}>
              Plan unlocks this month
            </Text>
            <Text className="text-sm font-sans-semibold" style={{ color: fg }}>
              {unlockLimit - unlocksLeft} / {unlockLimit}
            </Text>
          </View>
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: display.accentColor + "30",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${((unlockLimit - unlocksLeft) / unlockLimit) * 100}%`,
                backgroundColor: display.accentColor,
                borderRadius: 3,
              }}
            />
          </View>
          {unlocksLeft === 0 && (
            <Text className="text-xs" style={{ color: muted }}>
              Resets in 30 days from your first unlock this window.
            </Text>
          )}
        </View>
      ) : (
        <Text className="text-sm" style={{ color: muted }}>
          Unlimited plan unlocks
        </Text>
      )}

      {/* AI tokens meter */}
      {limits.aiTokensPerMonth > 0 ? (
        <Text className="text-sm" style={{ color: muted }}>
          {limits.aiTokensPerMonth} AI generation token{limits.aiTokensPerMonth > 1 ? "s" : ""}/month
        </Text>
      ) : (
        <Text className="text-sm" style={{ color: muted }}>
          No AI generation (upgrade to unlock)
        </Text>
      )}

      {/* Family invite code */}
      {tier === "family" && familyCode ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: display.accentColor + "30",
            paddingTop: 14,
            gap: 8,
          }}
        >
          <Text className="text-xs uppercase tracking-wider" style={{ color: display.accentColor }}>
            Family Invite Code
          </Text>
          <Text className="text-xs" style={{ color: muted }}>
            Share this with your kids or students so they can link their account to yours.
          </Text>
          <Pressable
            onPress={() =>
              Share.share({ message: `Join my family on IronSharp with code: ${familyCode}` })
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: display.accentColor + "18",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: display.accentColor + "40",
            }}
          >
            <Text
              style={{
                fontFamily: "DMSans_700Bold",
                fontSize: 24,
                letterSpacing: 5,
                color: display.accentColor,
              }}
            >
              {familyCode}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Copy size={14} color={display.accentColor} />
              <Text style={{ fontSize: 12, color: display.accentColor, fontFamily: "DMSans_500Medium" }}>
                Share
              </Text>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
