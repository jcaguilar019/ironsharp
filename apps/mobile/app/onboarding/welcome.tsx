import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useThemeColor } from "@/components/useThemeColor";
import { ApiClient } from "@/lib/api";
import { useOnboarding } from "./_layout";

const BANNER_KEY = "ironsharp_free_banner_shown";

const PERKS = [
  "You + 2 others included",
  "All 5 color themes",
  "Core devotional plans",
  "Read-aloud and voice memos",
];

export default function OnboardingWelcome() {
  const router = useRouter();
  const qc = useQueryClient();
  const { displayName, role, planId, survey } = useOnboarding();
  const checkColor = useThemeColor("primary");
  const primaryFg = useThemeColor("primary-foreground");

  const [bannerVisible, setBannerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Show banner once, 1.8s after screen loads
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    AsyncStorage.getItem(BANNER_KEY).then((val) => {
      if (!val) {
        timer = setTimeout(() => {
          setBannerVisible(true);
          Animated.parallel([
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
              damping: 20,
              stiffness: 150,
            }),
            Animated.timing(overlayAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();
          AsyncStorage.setItem(BANNER_KEY, "1");
        }, 1800);
      }
    });
    return () => clearTimeout(timer);
  }, []);

  const dismissBanner = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 500, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setBannerVisible(false));
  };

  const finish = useMutation({
    mutationFn: async () => {
      const result = await ApiClient.updateProfile({
        displayName: displayName || undefined,
        primaryRole: role ?? "disciple",
        surveyName: displayName || undefined,
        surveyAgeRange: survey.ageRange ?? undefined,
        surveyState: survey.state.trim() || undefined,
        surveyCity: survey.city.trim() || undefined,
        surveyEducation: survey.education ?? undefined,
        surveyHasChurch: survey.hasChurch ?? undefined,
        surveyChurchName: survey.churchName.trim() || undefined,
        surveyDevotionalRating: survey.devotionalRating ?? undefined,
        surveyFaithJourney: survey.faithJourney ?? undefined,
        surveyGoals: survey.goals.length ? survey.goals : undefined,
        surveyCompleted: true,
      });
      if (planId) await ApiClient.startPlan(planId);
      return result;
    },
    onSuccess: (data) => {
      // Write the updated profile directly into the cache so the tabs guard
      // sees surveyCompletedAt immediately — no refetch race condition.
      qc.setQueryData(["profile"], data.profile);
      qc.invalidateQueries({ queryKey: ["progress"] });
    },
    onError: (err: Error) => {
      Alert.alert(
        "Couldn't finish setup",
        err.message || "Please check your connection and try again."
      );
    },
  });

  const navigate = () => router.replace("/(tabs)/home");

  const handleLetsGo = () => {
    finish.mutate(undefined, { onSuccess: navigate });
  };

  const handleSeeAllPlans = () => {
    finish.mutate(undefined, { onSuccess: navigate });
  };

  const handleContinueFree = () => {
    dismissBanner();
    finish.mutate(undefined, { onSuccess: navigate });
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScrollView
        contentContainerClassName="flex-grow items-center justify-center px-8 py-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Text className="font-serif text-5xl font-bold text-foreground">
          Iron<Text className="text-primary">Sharp</Text>
        </Text>

        {/* Verse card */}
        <View className="mt-10 w-full rounded-2xl bg-card border border-border px-6 py-6">
          <Text className="font-serif text-base italic leading-relaxed text-foreground text-center">
            "As iron sharpens iron, so one person sharpens another."
          </Text>
          <Text className="mt-3 text-center text-sm font-sans-medium text-muted-foreground">
            — Proverbs 27:17
          </Text>
        </View>

        {/* Welcome message */}
        <Text className="mt-8 text-center text-base text-muted-foreground leading-relaxed">
          Welcome to the IronSharp community.{"\n"}Let's get started.
        </Text>

        {/* Let's Go */}
        <View className="mt-10 w-full">
          <Button
            title="Let's Go"
            loading={finish.isPending}
            onPress={handleLetsGo}
          />
        </View>
      </ScrollView>

      {/* Bottom sheet banner (shown once) */}
      {bannerVisible && (
        <>
          {/* Backdrop */}
          <Animated.View
            style={{ opacity: overlayAnim }}
            className="absolute inset-0 bg-black/50"
            pointerEvents="box-none"
          >
            <Pressable className="flex-1" onPress={handleContinueFree} />
          </Animated.View>

          {/* Sheet */}
          <Animated.View
            style={{ transform: [{ translateY: slideAnim }] }}
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-background px-6 pb-10 pt-6 shadow-lg"
          >
            <Text className="font-serif text-2xl font-bold text-foreground mb-1">
              Enjoy your free account!
            </Text>
            <Text className="text-sm text-muted-foreground mb-5">
              You + 2 others, core plans, all themes — no cost, ever.
            </Text>

            {/* Perks card */}
            <View className="rounded-2xl border border-border bg-card px-5 py-4 mb-6">
              <View className="gap-3">
                {PERKS.map((perk) => (
                  <View key={perk} className="flex-row items-center gap-3">
                    <View className="h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                      <Check size={12} color={checkColor} strokeWidth={3} />
                    </View>
                    <Text className="text-sm text-foreground">{perk}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="gap-3">
              <Button
                title="See All Plans"
                onPress={handleSeeAllPlans}
                loading={finish.isPending}
              />
              <Button
                title="Continue with Free"
                variant="outline"
                onPress={handleContinueFree}
              />
            </View>
          </Animated.View>
        </>
      )}
    </Screen>
  );
}
