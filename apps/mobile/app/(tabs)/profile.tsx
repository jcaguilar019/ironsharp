import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Palette, LogOut, ChevronRight, Award } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { useThemeColor } from "@/components/useThemeColor";
import { useProfile } from "@/lib/queries";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/lib/session";

const ROLE_LABELS: Record<string, string> = {
  discipler: "Discipler",
  disciple: "Disciple",
  partner: "Accountability Partner",
};

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  connect: "Connect",
  sharpen: "Sharpen",
  family: "Family",
};

export default function ProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { refresh } = useSession();
  const profile = useProfile();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const destructive = useThemeColor("destructive");

  const p = profile.data;
  const initials = (p?.displayName ?? "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await authClient.signOut();
          await refresh();
          qc.clear();
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  };

  return (
    <Screen edges={["top"]}>
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-6 py-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <View className="mb-6 items-center">
          <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary/15">
            <Text className="font-serif text-2xl font-bold text-primary">{initials}</Text>
          </View>
          <Text className="font-serif text-2xl font-bold text-foreground">
            {p?.displayName ?? "Your Profile"}
          </Text>
          {p?.churchName ? (
            <Text className="mt-0.5 text-sm text-muted-foreground">{p.churchName}</Text>
          ) : null}
          <View className="mt-2 rounded-full bg-muted px-3 py-1">
            <Text className="text-xs font-sans-medium text-muted-foreground">
              {ROLE_LABELS[p?.primaryRole ?? "disciple"] ?? "Disciple"}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View className="mb-6 flex-row gap-3">
          <View className="flex-1 rounded-xl border border-border bg-card p-4">
            <Text className="font-serif text-2xl font-bold text-foreground">
              {p?.streakCount ?? 0}
            </Text>
            <Text className="text-xs text-muted-foreground">Day streak</Text>
          </View>
          <View className="flex-1 rounded-xl border border-border bg-card p-4">
            <Text className="font-serif text-2xl font-bold text-foreground">
              {p?.totalCompleted ?? 0}
            </Text>
            <Text className="text-xs text-muted-foreground">Plans completed</Text>
          </View>
        </View>

        {/* Settings rows */}
        <View className="overflow-hidden rounded-xl border border-border bg-card">
          <Pressable
            onPress={() => router.push("/settings/theme")}
            className="flex-row items-center gap-3 border-b border-border p-4 active:bg-muted/40"
          >
            <Palette size={20} color={primary} />
            <Text className="flex-1 text-base text-foreground">Appearance</Text>
            <ChevronRight size={18} color={muted} />
          </Pressable>
          <View className="flex-row items-center gap-3 p-4">
            <Award size={20} color={primary} />
            <Text className="flex-1 text-base text-foreground">Membership</Text>
            <Text className="text-sm font-sans-medium text-muted-foreground">
              {TIER_LABELS[p?.membershipTier ?? "free"]}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleSignOut}
          className="mt-6 flex-row items-center justify-center gap-2 rounded-xl border border-border p-4 active:bg-muted/40"
        >
          <LogOut size={18} color={destructive} />
          <Text className="font-sans-semibold text-base text-destructive">Sign Out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
