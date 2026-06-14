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
import { CheckCircle2, Hammer, Sparkles } from "lucide-react-native";

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
  completed:      require("../../assets/images/categories/completed.jpg"),
};
import { Screen } from "@/components/Screen";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { usePlans, useProgress, useGenerateTokens } from "@/lib/queries";
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

export default function PlansScreen() {
  const router = useRouter();
  const { data, isError, refetch } = usePlans();
  const progress = useProgress();
  const tokens = useGenerateTokens();
  const white = "#FFFFFF";
  const muted = useThemeColor("muted-foreground");

  const countByCategory = data?.countByCategory ?? {};
  const completedCount = (progress.data ?? []).filter((p) => p.completedAt).length;
  const tokensRemaining = tokens.data?.tokensRemaining ?? 0;
  const tierLimit = tokens.data?.tierLimit ?? 0;
  const resetsAt = tokens.data?.resetsAt;

  const openCategory = (id: string, count: number) => {
    if (count > 0) router.push(`/plans/${id}`);
    else Alert.alert("Coming soon", "New plans for this category are on the way.");
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
        <ErrorState
          message="We couldn't load plans. Check your connection and try again."
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-4 py-8"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-xs uppercase tracking-wider text-muted-foreground">
          Browse &amp; Start
        </Text>
        <Text className="mb-5 font-serif text-2xl font-bold text-foreground">Plans</Text>

        <View className="flex-row flex-wrap justify-between">
          {/* Completed tile (pinned first) */}
          <Pressable
            onPress={() =>
              completedCount > 0
                ? router.push("/plans/completed")
                : Alert.alert("Nothing yet", "Finish a plan and it'll show up here.")
            }
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Completed plans"
            className="mb-3 aspect-[4/5] w-[48%] justify-end overflow-hidden rounded-2xl bg-card-deep"
          >
            <Image
              source={CATEGORY_IMAGES.completed}
              style={[StyleSheet.absoluteFillObject, { width: "100%", height: "100%" }]}
              resizeMode="cover"
            />
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
              <CheckCircle2 size={22} color={white} />
              <Text className="mt-2 font-serif text-base font-bold uppercase text-white">
                Completed
              </Text>
              <Text className="text-xs text-white/70">Your finished plans</Text>
            </View>
          </Pressable>

          {/* Create Your Own tile (pinned second) */}
          <Pressable
            onPress={openCreate}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Create your own plan"
            className="mb-3 aspect-[4/5] w-[48%] justify-end overflow-hidden rounded-2xl"
            style={{ backgroundColor: "#1C2B3A" }}
          >
            {/* Subtle diagonal grain overlay */}
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
              <Text className="text-xs text-white/70">Build a custom plan</Text>
              <TokenCoins count={tokensRemaining} limit={tierLimit} />
            </View>
          </Pressable>

          {CATEGORIES.map((cat) => {
            const count = countByCategory[cat.id] ?? 0;
            const img = CATEGORY_IMAGES[cat.id];
            return (
              <Pressable
                key={cat.id}
                onPress={() => openCategory(cat.id, count)}
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
                  <Text className="text-xs text-white/70">
                    {count > 0 ? `${count} Plan${count > 1 ? "s" : ""}` : cat.subtitle}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
