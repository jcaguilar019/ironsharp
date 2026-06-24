import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Flag, Lock } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { useDiscipleResponses } from "@/lib/queries";
import { ApiClient, ApiError, type DiscipleResponse, type QuestionType } from "@/lib/api";

function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-CA");
}

type Field = { type: QuestionType; label: string; text: string | null; isPrivate: boolean };

export default function DiscipleResponsesScreen() {
  const { relationshipId } = useLocalSearchParams<{ relationshipId: string }>();
  const id = String(relationshipId);
  const qc = useQueryClient();
  const responses = useDiscipleResponses(id);
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const fg = useThemeColor("foreground");

  const [question, setQuestion] = useState("");
  const [when, setWhen] = useState<"today" | "tomorrow">("today");
  const [sending, setSending] = useState(false);

  const sendQuestion = async () => {
    if (!question.trim()) return;
    setSending(true);
    try {
      await ApiClient.setCustomQuestion(id, {
        questionText: question.trim(),
        forDate: when === "today" ? localDate(0) : localDate(1),
      });
      setQuestion("");
      Alert.alert("Question sent", `Your disciple will see it ${when}.`);
    } catch (err) {
      Alert.alert("Couldn't send", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setSending(false);
    }
  };

  const toggleFlag = async (responseId: string, type: QuestionType, flagged: boolean) => {
    try {
      if (flagged) await ApiClient.unflagResponse(id, responseId, type);
      else await ApiClient.flagResponse(id, responseId, type);
      await qc.invalidateQueries({ queryKey: ["discipleship", id, "responses"] });
    } catch (err) {
      Alert.alert("Couldn't update flag", err instanceof ApiError ? err.message : "Please try again.");
    }
  };

  const fieldsFor = (r: DiscipleResponse): Field[] => [
    { type: "q1", label: "Reflect", text: r.response1, isPrivate: r.q1Private },
    { type: "q2", label: "Act", text: r.response2, isPrivate: r.q2Private },
    ...(r.q3Question ? [{ type: "q3" as const, label: r.q3Question, text: r.response3, isPrivate: r.q3Private }] : []),
    { type: "praise", label: "Prayer & Praise", text: r.prayer, isPrivate: r.prayerPrivate },
  ];

  return (
    <Screen edges={["top"]}>
      <Header title="Responses" subtitle="Discipleship" />
      {responses.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primary} />
        </View>
      ) : responses.isError ? (
        <ErrorState message="We couldn't load responses." onRetry={() => responses.refetch()} />
      ) : (
        <ScrollView contentContainerClassName="mx-auto w-full max-w-lg px-6 py-4" showsVerticalScrollIndicator={false}>
          {/* Set a question (Q3) */}
          <View style={{ borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card, padding: 14, marginBottom: 20 }}>
            <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 11, color: muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              Write a question
            </Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Ask something for their next reading…"
              placeholderTextColor={muted}
              multiline
              textAlignVertical="top"
              style={{ minHeight: 64, borderWidth: 1, borderColor: border, borderRadius: 10, padding: 12, color: fg, fontFamily: "DMSans_400Regular", fontSize: 15, marginBottom: 10 }}
            />
            <View className="flex-row items-center gap-2" style={{ marginBottom: 10 }}>
              {(["today", "tomorrow"] as const).map((w) => {
                const sel = when === w;
                return (
                  <Pressable
                    key={w}
                    onPress={() => setWhen(w)}
                    style={{ borderWidth: 1.5, borderColor: sel ? primary : border, backgroundColor: sel ? primary + "18" : "transparent", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}
                  >
                    <Text style={{ color: sel ? primary : fg, fontFamily: "DMSans_500Medium", fontSize: 13, textTransform: "capitalize" }}>{w}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={sendQuestion}
              disabled={!question.trim() || sending}
              style={{ opacity: !question.trim() || sending ? 0.5 : 1, backgroundColor: primary, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 14 }}>{sending ? "Sending…" : "Send question"}</Text>
            </Pressable>
          </View>

          {(responses.data ?? []).length === 0 ? (
            <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 15, textAlign: "center", marginTop: 24 }}>
              No responses yet. They'll appear here the moment your disciple submits.
            </Text>
          ) : (
            (responses.data ?? []).map((r) => (
              <View key={r.id} style={{ borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card, padding: 14, marginBottom: 12 }}>
                <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 12, color: muted, letterSpacing: 0.5, marginBottom: 10 }}>
                  Day {r.dayNumber}{r.chapter ? ` · ${r.chapter}` : ""}
                </Text>
                {fieldsFor(r).map((f) => {
                  const flagged = r.flagged.includes(f.type);
                  return (
                    <View key={f.type} style={{ marginBottom: 12 }}>
                      <View className="flex-row items-center justify-between" style={{ marginBottom: 4 }}>
                        <Text style={{ flex: 1, fontFamily: "DMSans_700Bold", fontSize: 13, color: fg }}>{f.label}</Text>
                        {!f.isPrivate && f.text ? (
                          <Pressable hitSlop={8} onPress={() => toggleFlag(r.id, f.type, flagged)} accessibilityRole="button" accessibilityLabel={flagged ? "Unflag" : "Flag"}>
                            <Flag size={16} color={flagged ? "#e0a83b" : muted} fill={flagged ? "#e0a83b" : "transparent"} />
                          </Pressable>
                        ) : null}
                      </View>
                      {f.isPrivate ? (
                        <View className="flex-row items-center gap-1.5">
                          <Lock size={12} color={muted} />
                          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: muted, fontStyle: "italic" }}>Kept private</Text>
                        </View>
                      ) : f.text ? (
                        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 15, color: fg, lineHeight: 22 }}>{f.text}</Text>
                      ) : (
                        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: muted, fontStyle: "italic" }}>No answer</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
