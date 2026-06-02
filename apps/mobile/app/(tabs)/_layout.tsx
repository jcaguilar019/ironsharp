import { ActivityIndicator, Platform, View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { BookOpen, Users, Home, Library, User, type LucideIcon } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { useThemeColor } from "@/components/useThemeColor";
import { useAuthed, useProfile } from "@/lib/queries";

function TabIcon({ Icon, focused }: { Icon: LucideIcon; focused: boolean }) {
  const active = useThemeColor("primary");
  const inactive = useThemeColor("muted-foreground");
  return (
    <View
      style={{ transform: [{ translateY: focused ? -2 : 0 }] }}
      className={`h-11 w-11 items-center justify-center rounded-full ${
        focused ? "bg-primary/15" : "bg-transparent"
      }`}
    >
      <Icon size={22} color={focused ? active : inactive} />
    </View>
  );
}

export default function TabsLayout() {
  const { authed, isPending } = useAuthed();
  const profile = useProfile();
  const active = useThemeColor("primary");
  const inactive = useThemeColor("muted-foreground");
  const card = useThemeColor("card");
  const border = useThemeColor("border");

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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: {
          backgroundColor: card,
          borderTopColor: border,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: "DMSans_500Medium", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="devotional"
        options={{
          title: "Devotionals",
          tabBarIcon: ({ focused }) => <TabIcon Icon={BookOpen} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          tabBarIcon: ({ focused }) => <TabIcon Icon={Users} focused={focused} />,
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
  );
}
