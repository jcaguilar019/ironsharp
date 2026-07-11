import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useThemeColor } from "@/components/useThemeColor";
import { ApiClient } from "@/lib/api";
import { useOnboarding } from "./_layout";
import { TIER_DISPLAY, TIER_ORDER } from "@/lib/tiers";

const BANNER_KEY = "ironsharp_free_banner_shown";
const CARD_WIDTH = Dimensions.get("window").width * 0.72;
const CARD_GAP = 12;

export default function OnboardingWelcome() {
  const router = useRouter();
  const qc = useQueryClient();
  const { displayName, role, survey } = useOnboarding();
  const primaryFg = useThemeColor("primary-foreground");
  const muted = useThemeColor("muted-foreground");

  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerShownBefore, setBannerShownBefore] = useState<boolean | null>(null);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(BANNER_KEY).then((val) => {
      setBannerShownBefore(!!val);
    });
  }, []);

  const openBanner = () => {
    setBannerVisible(true);
    AsyncStorage.setItem(BANNER_KEY, "1");
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
  };

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
        surveyGender: survey.gender ?? undefined,
        surveyState: survey.state.trim() || undefined,
        surveyCity: survey.city.trim() || undefined,
        surveyEducation: survey.education ?? undefined,
        surveyHasChurch: survey.hasChurch ?? undefined,
        surveyChurchName: survey.churchName.trim() || undefined,
        surveyDevotionalRating: survey.devotionalRating ?? undefined,
        surveyFaithJourney: survey.faithJourney ?? undefined,
        surveyGoals: survey.goals.length ? survey.goals : undefined,
        surveyRelationshipStatus: survey.relationshipStatus ?? undefined,
        surveyHasKids: survey.hasKids ?? undefined,
        surveyCompleted: true,
      });
      if (survey.familyJoinCode) await ApiClient.joinFamily(survey.familyJoinCode);
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
    // First time: show the free plan banner so the user can read it before continuing
    if (!bannerShownBefore) {
      openBanner();
      return;
    }
    finish.mutate(undefined, { onSuccess: navigate });
  };

  const handleContinueFree = () => {
    dismissBanner();
    setBannerShownBefore(true);
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
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-background pt-6 pb-10 shadow-lg"
          >
            {/* Handle */}
            <View className="mb-4 self-center h-1 w-9 rounded-full bg-border" />

            <Text className="font-serif text-2xl font-bold text-foreground mb-1 px-6">
              Here's what's available
            </Text>
            <Text className="text-sm text-muted-foreground mb-5 px-6">
              Swipe to explore — you can always upgrade later.
            </Text>

            {/* Horizontal plan cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={CARD_WIDTH + CARD_GAP}
              snapToAlignment="start"
              contentContainerStyle={{ paddingHorizontal: 24, gap: CARD_GAP, paddingBottom: 4 }}
            >
              {TIER_ORDER.map((tier) => {
                const display = TIER_DISPLAY[tier];
                const isFree = tier === "free";
                return (
                  <View
                    key={tier}
                    style={{
                      width: CARD_WIDTH,
                      borderRadius: 16,
                      borderWidth: isFree ? 2 : 1,
                      borderColor: isFree ? display.accentColor : display.accentColor + "50",
                      backgroundColor: display.accentColor + "10",
                      padding: 16,
                      gap: 10,
                    }}
                  >
                    {/* Tier header */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text
                        style={{
                          fontFamily: "PlayfairDisplay_700Bold",
                          fontSize: 18,
                          color: display.accentColor,
                        }}
                      >
                        {display.name}
                      </Text>
                      {isFree && (
                        <View
                          style={{
                            backgroundColor: display.accentColor,
                            borderRadius: 99,
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ color: "#fff", fontSize: 10, fontFamily: "DMSans_500Medium" }}>
                            Your plan
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Price */}
                    <Text style={{ color: muted, fontSize: 13 }}>
                      {display.monthlyPrice
                        ? `${display.monthlyPrice}/mo · ${display.annualTotal}`
                        : "Always free"}
                    </Text>

                    {/* Features */}
                    <View style={{ gap: 6 }}>
                      {display.features.slice(0, 4).map((f, i) => (
                        <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 7 }}>
                          <View
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              backgroundColor: display.accentColor + (isFree ? "ff" : "55"),
                              alignItems: "center",
                              justifyContent: "center",
                              marginTop: 1,
                              flexShrink: 0,
                            }}
                          >
                            <Check size={9} color="#fff" strokeWidth={3} />
                          </View>
                          <Text style={{ color: muted, fontSize: 12, flex: 1, lineHeight: 17 }}>
                            {f}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Coming soon badge for paid */}
                    {!isFree && (
                      <View
                        style={{
                          marginTop: 4,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: display.accentColor + "40",
                          paddingVertical: 6,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: display.accentColor, fontSize: 12, fontFamily: "DMSans_500Medium" }}>
                          Coming soon
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* CTAs */}
            <View className="mt-5 gap-3 px-6">
              <Button
                title="Continue with Free"
                onPress={handleContinueFree}
                loading={finish.isPending}
              />
            </View>
          </Animated.View>
        </>
      )}
    </Screen>
  );
}
