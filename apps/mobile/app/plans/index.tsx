import {
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, LayoutGrid, Sparkles } from "lucide-react-native";

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
import { useThemeColor } from "@/components/useThemeColor";
import { usePlans, useProfile } from "@/lib/queries";
import { CATEGORIES } from "@/lib/categories";

/**
 * The solo "Choose a plan" flow — browse the premade library by category or
 * generate a custom plan with AI. Reached from Home (when you have no active
 * plan); not a bottom-nav tab. Plans picked here are personal.
 */
export default function NewPlanScreen() {
  const router = useRouter();
  const { isError, refetch } = usePlans();
  // Plan creation (AI generation) is an admin/team capability now — non-admins
  // browse the library only.
  const isAdmin = useProfile().data?.isAdmin ?? false;
  const white = "#FFFFFF";
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  const openCategory = (id: string) => {
    router.push(`/plans/${id}`);
  };

  const openCreate = () => router.push("/plans/create");

  if (isError) {
    return (
      <Screen edges={["top", "bottom"]}>
        <Header title="Choose a plan" subtitle="Browse or create" />
        <ErrorState
          message="We couldn't load plans. Check your connection and try again."
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title="Choose a plan" subtitle="Browse or create" />
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-6 py-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Browse everything — surfaces plans whose category isn't a tile. */}
        <Pressable
          onPress={() => router.push("/plans/all")}
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
          {/* Create Your Own — AI generation, team-only (pinned first) */}
          {isAdmin ? (
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
              </View>
            </Pressable>
          ) : null}

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
