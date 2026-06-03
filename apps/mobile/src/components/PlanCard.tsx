import { Image, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  BookOpen,
  Heart,
  Home,
  Flame,
  Users,
  Sparkles,
  Zap,
  Sunrise,
  Layers,
} from "lucide-react-native";
import { useThemeColor } from "./useThemeColor";
import { CATEGORIES } from "@/lib/categories";
import type { DevotionalPlan } from "@/lib/api";

// ─── Category → gradient stops + icon ────────────────────────────────────────

const CATEGORY_STYLE: Record<
  string,
  { colors: [string, string, string]; icon: React.ElementType }
> = {
  mens:        { colors: ["#3E2A1E", "#5C4033", "#7A5C4A"], icon: Flame },
  women:       { colors: ["#3D2E3A", "#7A5C6E", "#9E7A8C"], icon: Sparkles },
  fathers:     { colors: ["#1E2A3A", "#3A4A5C", "#5C6E7A"], icon: Home },
  mothers:     { colors: ["#3A1E2A", "#6E3A5C", "#8C5C7A"], icon: Heart },
  family:      { colors: ["#1E3A2A", "#4A6E5C", "#6E8C7A"], icon: Users },
  marriage:    { colors: ["#3A1E1E", "#7A4A4A", "#9E6E6E"], icon: Heart },
  youth:       { colors: ["#1E2E3A", "#3A5C7A", "#5C7A9E"], icon: Zap },
  "new-believer": { colors: ["#2A3A1E", "#5C7A3A", "#7A9E5C"], icon: Sunrise },
  general:     { colors: ["#1E1E3A", "#3A3A6E", "#5C5C8C"], icon: Layers },
};

const FALLBACK_STYLE = {
  colors: ["#1E2A3A", "#3A4A5C", "#5C6E7A"] as [string, string, string],
  icon: BookOpen,
};

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  plan: DevotionalPlan;
  status: string;
  onPress: () => void;
};

export function PlanCard({ plan, status, onPress }: Props) {
  const borderColor = useThemeColor("border");
  const cardBg = useThemeColor("card");
  const fgColor = useThemeColor("foreground");
  const mutedFg = useThemeColor("muted-foreground");

  const style = CATEGORY_STYLE[plan.category] ?? FALLBACK_STYLE;
  const Icon = style.icon;

  const isCompleted = status.startsWith("Completed");
  const isStarted = status.startsWith("Continue");

  return (
    <Pressable
      onPress={onPress}
      style={{ borderColor, borderWidth: 1, borderRadius: 16, overflow: "hidden", backgroundColor: cardBg }}
      className="active:opacity-80"
    >
      {/* ── Header: image or gradient ── */}
      {plan.imageUrl ? (
        <View style={{ height: 130 }}>
          <Image
            source={{ uri: plan.imageUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.55)"]}
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 70 }}
          />
          <View style={{ position: "absolute", bottom: 10, left: 14 }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, letterSpacing: 1.5, fontFamily: "DMSans_400Regular" }}>
              {(CATEGORIES.find(c => c.id === plan.category)?.title ?? plan.category).toUpperCase()}
            </Text>
          </View>
        </View>
      ) : (
        <LinearGradient
          colors={style.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 130, alignItems: "center", justifyContent: "center" }}
        >
          <View style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "rgba(255,255,255,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Icon size={26} color="rgba(255,255,255,0.85)" />
          </View>
          <Text style={{
            position: "absolute",
            bottom: 10,
            left: 14,
            color: "rgba(255,255,255,0.5)",
            fontSize: 10,
            letterSpacing: 1.5,
            fontFamily: "DMSans_400Regular",
          }}>
            {(CATEGORIES.find(c => c.id === plan.category)?.title ?? plan.category).toUpperCase()}
          </Text>
        </LinearGradient>
      )}

      {/* ── Body ── */}
      <View style={{ padding: 14, gap: 4 }}>
        <Text style={{ color: fgColor, fontFamily: "PlayfairDisplay_700Bold", fontSize: 17, lineHeight: 22 }}>
          {plan.title}
        </Text>
        {plan.description ? (
          <Text style={{ color: mutedFg, fontSize: 12, lineHeight: 18, fontFamily: "DMSans_400Regular" }} numberOfLines={2}>
            {plan.description}
          </Text>
        ) : null}
        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: isCompleted
              ? "rgba(100,180,100,0.15)"
              : isStarted
                ? "rgba(255,255,255,0.08)"
                : style.colors[1] + "33",
          }}>
            <Text style={{
              fontSize: 11,
              fontFamily: "DMSans_500Medium",
              color: isCompleted ? "#6AB46A" : isStarted ? mutedFg : "rgba(255,255,255,0.7)",
            }}>
              {status}
            </Text>
          </View>
          <Text style={{ color: mutedFg, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
            {plan.totalDays} days
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
