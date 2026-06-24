import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import {
  Palette,
  LogOut,
  ChevronRight,
  Award,
  UserCog,
  Bell,
  HelpCircle,
  Camera,
  Trash2,
} from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { useThemeColor } from "@/components/useThemeColor";
import { useProfile } from "@/lib/queries";
import { ApiClient } from "@/lib/api";
import { authClient, clearAuthToken } from "@/lib/auth-client";
import { useSession } from "@/lib/session";

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  connect: "Connect",
  sharpen: "Sharpen",
  family: "Family",
};

async function pickAndCompress(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 200, height: 200 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return `data:image/jpeg;base64,${result.base64}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { refresh } = useSession();
  const profile = useProfile();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const card = useThemeColor("card");
  const destructive = useThemeColor("destructive");

  const [uploading, setUploading] = useState(false);

  const p = profile.data;
  const initials = (p?.displayName ?? "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const saveAvatar = async (uri: string) => {
    setUploading(true);
    try {
      const avatarUrl = await pickAndCompress(uri);
      await ApiClient.updateProfile({ avatarUrl });
      await qc.invalidateQueries({ queryKey: ["profile"] });
    } catch {
      Alert.alert("Error", "Could not save your photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert("Profile Photo", "Choose how to set your photo.", [
      {
        text: "Take Photo",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission needed", "Camera access is required to take a photo.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await saveAvatar(result.assets[0].uri);
          }
        },
      },
      {
        text: "Choose from Library",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission needed", "Photo library access is required.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await saveAvatar(result.assets[0].uri);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await authClient.signOut();
          await clearAuthToken();
          await refresh();
          qc.clear();
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account, all your devotional history, submissions, and progress. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Your account will be gone forever. There is no way to recover it.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, delete my account",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await ApiClient.deleteAccount();
                      await authClient.signOut();
                      await clearAuthToken();
                      await refresh();
                      qc.clear();
                      router.replace("/(auth)/welcome");
                    } catch {
                      Alert.alert("Error", "Could not delete your account. Please try again.");
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <Screen edges={["top"]}>
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-6 py-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <View className="mb-6 items-center">
          <Pressable
            onPress={handleChangePhoto}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            className="mb-3 active:opacity-80"
          >
            <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/15 overflow-hidden">
              {p?.avatarUrl ? (
                <Image
                  source={{ uri: p.avatarUrl }}
                  style={{ width: 80, height: 80, borderRadius: 40 }}
                />
              ) : (
                <Text className="font-serif text-2xl font-bold text-primary">{initials}</Text>
              )}
            </View>

            {/* Camera badge */}
            <View
              style={{ backgroundColor: card }}
              className="absolute bottom-0 right-0 h-6 w-6 items-center justify-center rounded-full border border-border"
            >
              {uploading ? (
                <ActivityIndicator size={10} color={muted} />
              ) : (
                <Camera size={12} color={muted} />
              )}
            </View>
          </Pressable>

          <Text className="font-serif text-2xl font-bold text-foreground">
            {p?.displayName ?? "Your Profile"}
          </Text>
          {p?.churchName ? (
            <Text className="mt-0.5 text-sm text-muted-foreground">{p.churchName}</Text>
          ) : null}
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
            onPress={() => router.push("/settings/profile")}
            className="flex-row items-center gap-3 border-b border-border p-4 active:bg-muted/40"
          >
            <UserCog size={20} color={primary} />
            <Text className="flex-1 text-base text-foreground">Edit Profile</Text>
            <ChevronRight size={18} color={muted} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings/notifications")}
            className="flex-row items-center gap-3 border-b border-border p-4 active:bg-muted/40"
          >
            <Bell size={20} color={primary} />
            <Text className="flex-1 text-base text-foreground">Notifications</Text>
            <ChevronRight size={18} color={muted} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings/theme")}
            className="flex-row items-center gap-3 border-b border-border p-4 active:bg-muted/40"
          >
            <Palette size={20} color={primary} />
            <Text className="flex-1 text-base text-foreground">Appearance</Text>
            <ChevronRight size={18} color={muted} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings/help")}
            className="flex-row items-center gap-3 border-b border-border p-4 active:bg-muted/40"
          >
            <HelpCircle size={20} color={primary} />
            <Text className="flex-1 text-base text-foreground">Help Center</Text>
            <ChevronRight size={18} color={muted} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings/membership")}
            className="flex-row items-center gap-3 p-4 active:bg-muted/40"
          >
            <Award size={20} color={primary} />
            <Text className="flex-1 text-base text-foreground">Membership</Text>
            <Text className="text-sm font-sans-medium text-muted-foreground">
              {TIER_LABELS[p?.membershipTier ?? "free"]}
            </Text>
            <ChevronRight size={18} color={muted} />
          </Pressable>
        </View>

        {/* TEMP Phase-0 entry — remove before merging to production */}
        <Pressable
          onPress={() => router.push("/speech-test")}
          className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border p-3 active:bg-muted/40"
        >
          <Text className="text-sm text-muted-foreground">Speech test (dev)</Text>
        </Pressable>

        <Pressable
          onPress={handleSignOut}
          className="mt-6 flex-row items-center justify-center gap-2 rounded-xl border border-border p-4 active:bg-muted/40"
        >
          <LogOut size={18} color={destructive} />
          <Text className="font-sans-semibold text-base text-destructive">Sign Out</Text>
        </Pressable>

        <Pressable
          onPress={handleDeleteAccount}
          className="mt-3 flex-row items-center justify-center gap-2 p-4 active:opacity-60"
        >
          <Trash2 size={14} color={muted} />
          <Text className="text-sm text-muted-foreground">Delete Account</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
