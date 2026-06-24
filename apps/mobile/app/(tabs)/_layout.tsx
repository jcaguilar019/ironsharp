import { ActivityIndicator, Platform, View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { useEffect } from "react";
import { Globe, BookOpen, Home, Library, User, type LucideIcon } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { useThemeColor } from "@/components/useThemeColor";
import { useAuthed, useProfile } from "@/lib/queries";
import { useUpgradePrompt } from "@/lib/useUpgradePrompt";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import {
  registerAndSaveToken,
  scheduleMorningReminder,
  cancelMorningReminder,
  scheduleDailyNudge,
  cancelDailyNudge,
} from "@/lib/notifications";
import type { MembershipTier } from "@/lib/tiers";

function TabIcon({ Icon, focused }: { Icon: LucideIcon; focused: boolean }) {
  const active = useThemeColor("primary");
  const inactive = useThemeColor("muted-foreground");
  return (
    <View
      style={{ transform: [{ translateY: focused ? -2 : 0 }] }}
      className={`h-12 w-12 items-center justify-center rounded-full ${
        focused ? "bg-primary/15" : "bg-transparent"
      }`}
    >
      <Icon size={26} color={focused ? active : inactive} />
    </View>
  );
}

export default function TabsLayout() {
  const { authed, isPending } = useAuthed();
  const profile = useProfile();
  const upgradePrompt = useUpgradePrompt(profile.data);
  const active = useThemeColor("primary");
  const inactive = useThemeColor("muted-foreground");
  const card = useThemeColor("card");
  const border = useThemeColor("border");

  useEffect(() => {
    if (!authed || !profile.data) return;
    // Wrap in try/catch — under new arch + bridgeless, an uncaught JS error
    // from a useEffect can propagate into a TurboModule queue exception
    // handler and terminate the process.
    (async () => {
      try {
        await registerAndSaveToken();
      } catch (e) {
        console.error("[IronSharp] registerAndSaveToken failed:", e);
      }
    })();
  }, [authed, profile.data?.userId]);

  useEffect(() => {
    if (!authed || !profile.data) return;
    try {
      if (profile.data.notifMorningReminder) scheduleMorningReminder();
      else cancelMorningReminder();
      if (profile.data.notifDailyNudge) scheduleDailyNudge();
      else cancelDailyNudge();
    } catch (e) {
      console.error("[IronSharp] notification scheduling failed:", e);
    }
  }, [authed, profile.data?.notifMorningReminder, profile.data?.notifDailyNudge]);

  if (isPending || (authed && profile.isLoading)) {
    return (
      <Screen center>
        <ActivityIndicator color={active} />
      </Screen>
    );
  }
  if (!authed) return <Redirect href="/(auth)/welcome" />;
  if (!profile.data?.surveyCompletedAt) return <Redirect href="/onboarding/role" />;

  return (
    <>
    <UpgradePromptModal
      visible={upgradePrompt.visible}
      currentTier={(profile.data?.membershipTier ?? "free") as MembershipTier}
      onDismiss={upgradePrompt.dismiss}
    />
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: {
          backgroundColor: card,
          borderTopColor: border,
          height: Platform.OS === "ios" ? 96 : 72,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: "DMSans_500Medium", fontSize: 13 },
      }}
    >
      <Tabs.Screen
        name="groups"
        options={{
          title: "Devotionals",
          tabBarIcon: ({ focused }) => <TabIcon Icon={BookOpen} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ focused }) => <TabIcon Icon={Globe} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon Icon={Home} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Plans",
          tabBarIcon: ({ focused }) => <TabIcon Icon={Library} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon Icon={User} focused={focused} />,
        }}
      />
    </Tabs>
    </>
  );
}
