import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { CommunityDevotionalView } from "@/components/CommunityDevotionalView";
import { useCommunityEntry } from "@/lib/queries";

export default function CommunityEntry() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const entry = useCommunityEntry(id);
  const primary = useThemeColor("primary");

  const refetch = () => qc.invalidateQueries({ queryKey: ["community", "entry", id] });

  return (
    <Screen edges={["top"]}>
      <Header title="Reading" subtitle="Community" />
      {entry.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primary} />
        </View>
      ) : entry.isError ? (
        <ErrorState message="We couldn't load this reading." onRetry={() => entry.refetch()} />
      ) : entry.data?.devotional ? (
        <ScrollView
          contentContainerClassName="mx-auto w-full max-w-lg px-6 py-4"
          showsVerticalScrollIndicator={false}
        >
          <CommunityDevotionalView data={entry.data} onRefetch={refetch} />
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-muted-foreground">This reading isn't available.</Text>
        </View>
      )}
    </Screen>
  );
}
