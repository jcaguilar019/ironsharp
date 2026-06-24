import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, PenLine } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { CommunityDevotionalView } from "@/components/CommunityDevotionalView";
import { useCommunityToday, useProfile } from "@/lib/queries";

export default function CommunityScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const today = useCommunityToday();
  const profile = useProfile();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["community", "today"] });
    setRefreshing(false);
  };

  const refetch = () => qc.invalidateQueries({ queryKey: ["community", "today"] });
  const isAdmin = profile.data?.isAdmin ?? false;

  return (
    <Screen edges={["top"]}>
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-6 py-8"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary} />}
      >
        <View className="flex-row items-start justify-between">
          <ScreenHeader eyebrow="Shared Reading" title="Community" />
          {isAdmin ? (
            <Pressable
              onPress={() => router.push("/community/admin")}
              accessibilityRole="button"
              accessibilityLabel="Author community devotionals"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderWidth: 1,
                borderColor: primary,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <PenLine size={14} color={primary} />
              <Text style={{ color: primary, fontFamily: "DMSans_700Bold", fontSize: 12 }}>Author</Text>
            </Pressable>
          ) : null}
        </View>

        {today.isLoading ? (
          <ActivityIndicator color={primary} style={{ marginTop: 24 }} />
        ) : today.isError ? (
          <ErrorState
            message="We couldn't load today's reading. Check your connection and try again."
            onRetry={() => today.refetch()}
          />
        ) : today.data?.devotional ? (
          <CommunityDevotionalView data={today.data} onRefetch={refetch} />
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 16 }}>
            <Text className="mb-2 text-center font-serif text-2xl font-bold text-foreground">
              No reading yet today
            </Text>
            <Text
              style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 15, textAlign: "center", lineHeight: 23 }}
            >
              Today's Community Devotional hasn't been posted. Check back soon — one reading, everyone in
              it together.
            </Text>
          </View>
        )}

        {/* Past readings */}
        <Pressable
          onPress={() => router.push("/community/archive")}
          accessibilityRole="button"
          className="mt-6 flex-row items-center justify-center gap-2 py-3"
          style={{ borderTopWidth: 1, borderTopColor: border }}
        >
          <CalendarDays size={15} color={muted} />
          <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 14 }}>Past readings</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
