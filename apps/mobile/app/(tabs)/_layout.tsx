import { ActivityIndicator, Alert, Platform, View } from "react-native";
import { Redirect, Tabs, router } from "expo-router";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, BookOpen, Home, User, type LucideIcon } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { useThemeColor } from "@/components/useThemeColor";
import { ApiClient } from "@/lib/api";
import { useAuthed, useProfile, useArchiveNotices } from "@/lib/queries";
import { useUpgradePrompt } from "@/lib/useUpgradePrompt";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import {
  registerAndSaveToken,
  scheduleMorningReminder,
  cancelMorningReminder,
  scheduleDailyNudge,
  cancelDailyNudge,
  wireNotificationRouting,
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
  const qc = useQueryClient();
  const archiveNotices = useArchiveNotices();
  const noticeShownRef = useRef(false);
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

  // Route notification taps (cold-start + foreground) to their data.url screen.
  useEffect(() => {
    if (!authed) return;
    let cleanup: (() => void) | undefined;
    wireNotificationRouting((url) => {
      try {
        router.push(url as never);
      } catch (e) {
        console.error("[IronSharp] notification route failed:", e);
      }
    }).then((c) => {
      cleanup = c;
    });
    return () => cleanup?.();
  }, [authed]);

  // One-time in-app notice on app open: a group the user was in got deleted.
  useEffect(() => {
    if (!authed || noticeShownRef.current) return;
    const notices = archiveNotices.data ?? [];
    if (notices.length === 0) return;
    noticeShownRef.current = true;

    const message = notices
      .map((n) => `${n.archivedByName} deleted the group “${n.groupName}.”`)
      .join("\n\n");

    Alert.alert(notices.length > 1 ? "Groups deleted" : "Group deleted", message, [
      {
        text: "OK",
        onPress: async () => {
          try {
            await ApiClient.markArchiveNoticesSeen();
            await qc.invalidateQueries({ queryKey: ["groups", "archive-notices"] });
          } catch {
            // Non-fatal — the notice just shows again next launch.
            noticeShownRef.current = false;
          }
        },
      },
    ]);
  }, [authed, archiveNotices.data]);

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
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon Icon={Home} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Plans",
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
