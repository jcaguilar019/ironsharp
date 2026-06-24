import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { useCommunityArchive } from "@/lib/queries";

function formatDate(d: string): string {
  // d is "YYYY-MM-DD" — render in the user's locale without timezone drift.
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, day ?? 1).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CommunityArchive() {
  const router = useRouter();
  const archive = useCommunityArchive();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");

  return (
    <Screen edges={["top"]}>
      <Header title="Past Readings" subtitle="Community" />
      {archive.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primary} />
        </View>
      ) : archive.isError ? (
        <ErrorState message="We couldn't load past readings." onRetry={() => archive.refetch()} />
      ) : (archive.data ?? []).length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 15, textAlign: "center" }}>
            No past readings yet.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="mx-auto w-full max-w-lg px-6 py-4"
          showsVerticalScrollIndicator={false}
        >
          {(archive.data ?? []).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/community/${item.id}`)}
              className="flex-row items-center gap-3 active:opacity-70"
              style={{ borderBottomWidth: 1, borderBottomColor: border, paddingVertical: 14 }}
            >
              <View className="flex-1">
                <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12 }}>
                  {formatDate(item.publishDate)} · {item.passageReference}
                </Text>
                <Text className="mt-0.5 font-serif text-lg font-bold text-foreground">{item.title}</Text>
                {item.subtitle ? (
                  <Text className="text-sm text-muted-foreground">{item.subtitle}</Text>
                ) : null}
              </View>
              <ChevronRight size={18} color={muted} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
