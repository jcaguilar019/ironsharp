import {
  Alert,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Hammer, Sparkles } from "lucide-react-native";

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
import { Header } from "@/components/Header";
import { ErrorState } from "@/components/ErrorState";
import { usePlans, useGenerateTokens } from "@/lib/queries";
import { CATEGORIES } from "@/lib/categories";

function TokenCoins({ count, limit }: { count: number; limit: number }) {
  if (limit === 0) return null;
  return (
    <View style={{ flexDirection: "row", gap: 5, marginTop: 6 }}>
      {Array.from({ length: limit }, (_, i) => {
        const active = i < count;
        return (
          <View
            key={i}
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.18)",
              borderWidth: active ? 0 : 1,
              borderColor: "rgba(255,255,255,0.4)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {active && <Hammer size={11} color="#3B2A1A" />}
          </View>
        );
      })}
    </View>
  );
}

/**
 * The "Start a Plan" flow — browse the premade library or generate a custom plan
 * with AI. Reached from the Groups tab ("Your Plans" → Start a new plan); not a
 * bottom-nav tab.
 */
export default function NewPlanScreen() {
  const router = useRouter();
  const { isError, refetch } = usePlans();
  const tokens = useGenerateTokens();
  const white = "#FFFFFF";

  const tokensRemaining = tokens.data?.tokensRemaining ?? 0;
  const tierLimit = tokens.data?.tierLimit ?? 0;
  const resetsAt = tokens.data?.resetsAt;

  const openCategory = (id: string) => {
    router.push(`/plans/${id}`);
  };

  const openCreate = () => {
    if (tierLimit === 0) {
      Alert.alert("Upgrade required", "AI-generated plans are available on Connect and above.");
      return;
    }
    if (tokensRemaining === 0) {
      const date = resetsAt
        ? new Date(resetsAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })
        : null;
      Alert.alert("You're all out", date ? `Your next token is available on ${date}.` : "You have no tokens remaining.");
      return;
    }
    router.push("/plans/create");
  };

  if (isError) {
    return (
      <Screen edges={["top"]}>
        <Header title="New Plan" subtitle="Browse or create" />
        <ErrorState
          message="We couldn't load plans. Check your connection and try again."
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <Header title="Start a Plan" subtitle="Browse or create" />
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-6 py-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row flex-wrap justify-between">
          {/* Create Your Own — AI generation (pinned first) */}
          <Pressable
            onPress={openCreate}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Create your own plan"
            className="mb-3 aspect-[4/5] w-[48%] justify-end overflow-hidden rounded-2xl"
            style={{ backgroundColor: "#1C2B3A" }}
          >
            <View
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: "rgba(255,255,255,0.03)",
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 0, left: 0, right: 0,
                height: "65%",
                backgroundColor: "rgba(0,0,0,0.35)",
              }}
            />
            <View className="p-3">
              <Sparkles size={22} color={white} />
              <Text className="mt-2 font-serif text-base font-bold uppercase text-white">
                Create Your Own
              </Text>
              <Text className="text-xs text-white/70">Generate with AI</Text>
              <TokenCoins count={tokensRemaining} limit={tierLimit} />
            </View>
          </Pressable>

          {CATEGORIES.map((cat) => {
            const img = CATEGORY_IMAGES[cat.id];
            return (
              <Pressable
                key={cat.id}
                onPress={() => openCategory(cat.id)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${cat.title} devotionals`}
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
                {/* Dark overlay for text legibility */}
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "55%",
                    backgroundColor: "rgba(0,0,0,0.45)",
                  }}
                />
                <View className="p-3">
                  <Text className="font-serif text-base font-bold uppercase text-white">
                    {cat.title}
                  </Text>
                  <Text className="text-xs text-white/70">{cat.subtitle}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
