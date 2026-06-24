import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { useMailbox, useProfile } from "@/lib/queries";
import { ApiClient, ApiError } from "@/lib/api";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function MailboxScreen() {
  const { relationshipId } = useLocalSearchParams<{ relationshipId: string }>();
  const id = String(relationshipId);
  const qc = useQueryClient();
  const messages = useMailbox(id);
  const profile = useProfile();
  const myId = profile.data?.userId;

  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const fg = useThemeColor("foreground");

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await ApiClient.sendMailboxMessage(id, text.trim());
      setText("");
      await qc.invalidateQueries({ queryKey: ["discipleship", id, "mailbox"] });
      await qc.invalidateQueries({ queryKey: ["discipleship"] });
    } catch (err) {
      Alert.alert("Couldn't send", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen edges={["top"]}>
      <Header title="Mailbox" subtitle="Discipleship" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {messages.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={primary} />
          </View>
        ) : messages.isError ? (
          <ErrorState message="We couldn't load the mailbox." onRetry={() => messages.refetch()} />
        ) : (
          <ScrollView
            contentContainerClassName="mx-auto w-full max-w-lg px-4 py-4"
            showsVerticalScrollIndicator={false}
          >
            {(messages.data ?? []).length === 0 ? (
              <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 15, textAlign: "center", marginTop: 40 }}>
                No messages yet. Say hello.
              </Text>
            ) : (
              (messages.data ?? []).map((m) => {
                const mine = m.senderId === myId;
                return (
                  <View key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", marginBottom: 10 }}>
                    <View
                      style={{
                        backgroundColor: mine ? primary : card,
                        borderWidth: mine ? 0 : 1,
                        borderColor: border,
                        borderRadius: 16,
                        borderBottomRightRadius: mine ? 4 : 16,
                        borderBottomLeftRadius: mine ? 16 : 4,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ color: mine ? "#fff" : fg, fontFamily: "DMSans_400Regular", fontSize: 15, lineHeight: 21 }}>
                        {m.messageText}
                      </Text>
                    </View>
                    <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 3, textAlign: mine ? "right" : "left" }}>
                      {formatTime(m.createdAt)}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Composer */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: border }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            placeholderTextColor={muted}
            multiline
            style={{ flex: 1, maxHeight: 120, minHeight: 40, borderWidth: 1, borderColor: border, borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, color: fg, fontFamily: "DMSans_400Regular", fontSize: 15, backgroundColor: card }}
          />
          <Pressable
            onPress={send}
            disabled={!text.trim() || sending}
            style={{ opacity: !text.trim() || sending ? 0.5 : 1, backgroundColor: primary, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Send size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
