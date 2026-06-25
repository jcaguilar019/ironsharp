import { useRef, useEffect } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { useThemeColor } from "@/components/useThemeColor";
import { TIER_DISPLAY, UPGRADE_PATH, type MembershipTier } from "@/lib/tiers";

interface Props {
  visible: boolean;
  currentTier: MembershipTier;
  onDismiss: () => void;
}

export function UpgradePromptModal({ visible, currentTier, onDismiss }: Props) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const bg = useThemeColor("background");
  const border = useThemeColor("border");
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");

  const upgradeTier = UPGRADE_PATH[currentTier];

  // Rules of Hooks: every hook must run before any early return. This effect
  // only depends on `visible`, so it's safe to run even when there's no upgrade
  // tier. Previously the `if (!upgradeTier) return null` below sat ABOVE this
  // useEffect — so when a user reached the top tier (family → UPGRADE_PATH is
  // null) the hook count dropped between renders and React crashed the app.
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 160,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!upgradeTier) return null;

  const display = TIER_DISPLAY[upgradeTier];

  const handleViewPlans = () => {
    onDismiss();
    router.push("/settings/membership");
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      {/* Overlay */}
      <Animated.View
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", opacity: overlayAnim }}
      >
        <Pressable style={{ flex: 1 }} onPress={onDismiss} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: bg,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderColor: border,
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: 40,
          transform: [{ translateY: slideAnim }],
          gap: 16,
        }}
      >
        {/* Handle */}
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: border,
            alignSelf: "center",
            marginBottom: 4,
          }}
        />

        {/* Icon + heading */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: display.accentColor + "20",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={18} color={display.accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
              {TIER_DISPLAY[currentTier].name} plan
            </Text>
            <Text style={{ color: fg, fontSize: 17, fontFamily: "PlayfairDisplay_700Bold" }}>
              There's more waiting for you
            </Text>
          </View>
        </View>

        {/* Teaser copy */}
        <Text style={{ color: muted, fontSize: 14, lineHeight: 21 }}>
          {upgradeTeaser(currentTier, upgradeTier)}
        </Text>

        {/* Key benefits (top 3) */}
        <View style={{ gap: 6 }}>
          {display.features.slice(0, 3).map((f, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: display.accentColor,
                  flexShrink: 0,
                }}
              />
              <Text style={{ color: fg, fontSize: 13, flex: 1 }}>{f}</Text>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <View style={{ gap: 10, marginTop: 4 }}>
          <Pressable
            onPress={handleViewPlans}
            style={{
              backgroundColor: display.accentColor + "18",
              borderWidth: 1,
              borderColor: display.accentColor + "60",
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: display.accentColor, fontSize: 15, fontFamily: "DMSans_500Medium" }}>
              See {display.name} plan
            </Text>
          </Pressable>

          <Pressable onPress={onDismiss} style={{ alignItems: "center", paddingVertical: 8 }}>
            <Text style={{ color: muted, fontSize: 13 }}>Maybe later</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

function upgradeTeaser(from: MembershipTier, to: MembershipTier): string {
  if (from === "free" && to === "connect") {
    return "Unlock more plans and get your first AI-generated devotional.";
  }
  if (from === "connect" && to === "sharpen") {
    return "No limits. Unlimited plans, unlimited groups, and the discipler tools to pour into the people around you.";
  }
  if (from === "sharpen" && to === "family") {
    return "Bring the whole family. One plan covers everyone — parents and kids — each with their own devotional journey.";
  }
  return `Upgrade to ${TIER_DISPLAY[to].name} and unlock more.`;
}
