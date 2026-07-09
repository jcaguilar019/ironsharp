import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, CalendarDays } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/Button";
import { useThemeColor } from "@/components/useThemeColor";
import { withAlpha } from "@/theme/themes";
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
        <ScreenHeader
          eyebrow="Shared Reading"
          title="Community"
          right={
            isAdmin ? (
              <Pressable
                onPress={() => router.push("/community/admin")}
                accessibilityRole="button"
                accessibilityLabel="Open the posting schedule"
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
                <CalendarDays size={14} color={primary} />
                <Text style={{ color: primary, fontFamily: "DMSans_700Bold", fontSize: 12 }}>Schedule</Text>
              </Pressable>
            ) : undefined
          }
        />

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
          <View style={{ alignItems: "center", paddingVertical: 44, paddingHorizontal: 8 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: withAlpha(primary, 0.1),
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <BookOpen size={26} color={primary} />
            </View>
            <Text className="mb-2 text-center font-serif text-xl font-bold text-foreground">No reading yet today</Text>
            <Text
              style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22, maxWidth: 300 }}
            >
              Today's shared reading hasn't been posted yet.
              {isAdmin ? " Write it now, or check the schedule." : " Check back soon, or revisit a past reading below."}
            </Text>
            {isAdmin ? (
              <View style={{ marginTop: 18, width: "100%", maxWidth: 260 }}>
                <Button title="Write today's reading" onPress={() => router.push("/community/admin")} />
              </View>
            ) : null}
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
