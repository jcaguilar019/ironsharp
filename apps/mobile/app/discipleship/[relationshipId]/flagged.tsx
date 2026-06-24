import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { useFlaggedResponses } from "@/lib/queries";
import type { QuestionType } from "@/lib/api";

const TYPE_LABEL: Record<QuestionType, string> = {
  q1: "Reflect",
  q2: "Act",
  q3: "Question",
  praise: "Prayer & Praise",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function FlaggedNotesScreen() {
  const { relationshipId } = useLocalSearchParams<{ relationshipId: string }>();
  const id = String(relationshipId);
  const flags = useFlaggedResponses(id);
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const fg = useThemeColor("foreground");

  return (
    <Screen edges={["top"]}>
      <Header title="Flagged Notes" subtitle="Discipleship" />
      {flags.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primary} />
        </View>
      ) : flags.isError ? (
        <ErrorState message="We couldn't load flagged notes." onRetry={() => flags.refetch()} />
      ) : (flags.data ?? []).length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 15, textAlign: "center" }}>
            Nothing flagged yet. Flag a response to keep it here for later.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="mx-auto w-full max-w-lg px-6 py-4" showsVerticalScrollIndicator={false}>
          {(flags.data ?? []).map((f) => (
            <View key={`${f.responseId}-${f.questionType}`} style={{ borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card, padding: 14, marginBottom: 12 }}>
              <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 12, color: muted, marginBottom: 6 }}>
                {formatDate(f.submittedAt)} · {TYPE_LABEL[f.questionType]}
                {f.chapter ? ` · ${f.chapter}` : ""}
              </Text>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 15, color: fg, lineHeight: 22 }}>
                {f.text ?? "—"}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
