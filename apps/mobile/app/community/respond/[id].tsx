import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { useToast } from "@/components/Toast";
import { useThemeColor } from "@/components/useThemeColor";
import { withAlpha } from "@/theme/themes";
import { ApiClient, ApiError, type CommunityToday } from "@/lib/api";
import { useCommunityEntry } from "@/lib/queries";

/**
 * Full-screen composer for a community reflection — a real route (not a Modal)
 * so keyboard insets and safe areas behave. Prefills from the user's existing
 * response when editing.
 */
export default function CommunityRespond() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useCommunityEntry(id);
  const primary = useThemeColor("primary");

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title="Your Reflection" subtitle="Community" />
      {entry.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primary} />
        </View>
      ) : entry.isError || !entry.data?.devotional ? (
        <ErrorState message="We couldn't load this reading." onRetry={() => entry.refetch()} />
      ) : (
        <RespondForm data={entry.data} />
      )}
    </Screen>
  );
}

function RespondForm({ data }: { data: CommunityToday }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const primary = useThemeColor("primary");

  const devotional = data.devotional!;
  const mine = data.myResponse;
  const questions = [devotional.reflectionQ1, devotional.reflectionQ2].filter(
    (q): q is string => !!q && q.trim().length > 0
  );

  const [answers, setAnswers] = useState<string[]>([mine?.response1 ?? "", mine?.response2 ?? ""]);
  const [prayer, setPrayer] = useState(mine?.prayer ?? "");
  const [saving, setSaving] = useState(false);

  const setAnswer = (i: number, v: string) =>
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? v : a)));

  const save = async () => {
    setSaving(true);
    try {
      await ApiClient.saveCommunityResponse({
        communityDevotionalId: devotional.id,
        response1: answers[0]?.trim() || null,
        response2: answers[1]?.trim() || null,
        prayer: prayer.trim() || null,
        q1Private: false,
        q2Private: false,
        prayerPrivate: false,
      });
      await qc.invalidateQueries({ queryKey: ["community"] });
      toast.show(mine ? "Reflection updated" : "Shared with the community");
      router.back();
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      contentContainerClassName="mx-auto w-full max-w-lg px-6 pt-2 pb-16"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      {/* What you're responding to */}
      <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12 }}>
        {devotional.passageReference}
      </Text>
      <Text className="mb-4 mt-0.5 font-serif text-xl font-bold text-foreground">{devotional.title}</Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          marginBottom: 18,
          backgroundColor: withAlpha(primary, 0.08),
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 9,
        }}
      >
        <Users size={14} color={primary} />
        <Text style={{ flex: 1, color: muted, fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 17 }}>
          Everyone in the community can see this.
        </Text>
      </View>

      {questions.map((q, i) => (
        <View key={i} style={{ marginBottom: 16 }}>
          <Text style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 8, lineHeight: 20 }}>
            {q}
          </Text>
          <Input value={answers[i] ?? ""} onChangeText={(t) => setAnswer(i, t)} multiline placeholder="Write your reflection…" />
        </View>
      ))}

      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 8 }}>
          Prayer <Text style={{ color: muted, fontFamily: "DMSans_400Regular" }}>· optional</Text>
        </Text>
        <Input value={prayer} onChangeText={setPrayer} multiline placeholder="Write a prayer…" />
      </View>

      <Button title={mine ? "Update reflection" : "Share with the community"} onPress={save} loading={saving} />
    </ScrollView>
  );
}
