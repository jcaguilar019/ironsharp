import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, CornerUpLeft, Flag, Lock, Plus, Send, Star, Trash2, X } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Avatar } from "@/components/Avatar";
import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { withAlpha } from "@/theme/themes";
import { useToast } from "@/components/Toast";
import { useDiscipleships, useDiscipleResponses, useMailbox, useNotes, useProfile } from "@/lib/queries";
import { ApiClient, ApiError, type DiscipleResponse, type QuestionType } from "@/lib/api";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-CA");
}

type TabKey = "responses" | "messages" | "notes";

/**
 * One person-centered screen for a discipleship relationship. Discipler sees a
 * Responses ⇄ Messages segmented view; disciple sees Messages. Replaces the old
 * separate responses / flagged / mailbox screens.
 */
export default function DiscipleshipScreen() {
  const { relationshipId } = useLocalSearchParams<{ relationshipId: string }>();
  const id = String(relationshipId);
  const router = useRouter();
  const relationships = useDiscipleships();
  const profile = useProfile();
  const myId = profile.data?.userId;

  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const primary = useThemeColor("primary");

  const rel = (relationships.data ?? []).find((r) => r.id === id);
  const isDiscipler = rel?.role === "discipler";
  const counterpartName = rel?.counterpart.displayName ?? "Discipleship";

  const [tab, setTab] = useState<TabKey>("responses");
  // Discipler reviews responses; both parties share Messages + Notes.
  const tabKeys: TabKey[] = isDiscipler ? ["responses", "messages", "notes"] : ["messages", "notes"];
  const effectiveTab: TabKey = tabKeys.includes(tab) ? tab : tabKeys[0];

  // Mailbox draft is lifted here so "reply" from a response can prefill it.
  const [draft, setDraft] = useState("");

  const qc = useQueryClient();
  const [showEnd, setShowEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const endRelationship = async () => {
    setEnding(true);
    try {
      await ApiClient.declineDiscipleship(id);
      await qc.invalidateQueries({ queryKey: ["discipleship"] });
      setShowEnd(false);
      router.back();
    } catch (e) {
      setEnding(false);
      Alert.alert("Couldn't end", e instanceof ApiError ? e.message : "Please try again.");
    }
  };

  return (
    <Screen edges={["top"]}>
      {/* Identity header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: border,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back" style={{ padding: 4 }}>
          <ChevronLeft size={24} color={fg} />
        </Pressable>
        <Avatar name={counterpartName} url={rel?.counterpart.avatarUrl ?? null} accent={primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 19, color: fg }} numberOfLines={1}>
            {counterpartName}
          </Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted }}>
            {isDiscipler ? "You're discipling them" : "Your discipler"}
            {rel?.status === "pending" ? " · pending" : ""}
          </Text>
        </View>
        {rel?.status === "active" ? (
          <Pressable
            onPress={() => setShowEnd(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="End discipleship"
            style={{ paddingHorizontal: 4, paddingVertical: 6 }}
          >
            <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 13, color: muted }}>End</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Segmented control */}
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
        {tabKeys.map((t) => {
          const active = effectiveTab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: active ? withAlpha(primary, 0.12) : "transparent",
                borderWidth: 1,
                borderColor: active ? primary : border,
              }}
            >
              <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 13, color: active ? primary : muted }}>
                {t === "responses" ? "Responses" : t === "messages" ? "Messages" : "Notes"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {effectiveTab === "responses" ? (
          <ResponsesPanel
            id={id}
            accent={primary}
            onReply={(text) => {
              setDraft(text);
              setTab("messages");
            }}
          />
        ) : effectiveTab === "notes" ? (
          <NotesPanel id={id} accent={primary} />
        ) : (
          <MessagesPanel id={id} myId={myId} accent={primary} draft={draft} setDraft={setDraft} />
        )}
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showEnd}
        title="End discipleship"
        message={`This ends your discipleship with ${counterpartName} for both of you and removes its notes, questions, and messages. It can't be undone.`}
        confirmLabel="End discipleship"
        destructive
        busy={ending}
        onConfirm={endRelationship}
        onCancel={() => !ending && setShowEnd(false)}
      />
    </Screen>
  );
}

// ─── Responses (discipler reviews the disciple's answers) ─────────────────────

function ResponsesPanel({
  id,
  accent,
  onReply,
}: {
  id: string;
  accent: string;
  onReply: (prefill: string) => void;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const responses = useDiscipleResponses(id);
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const primary = useThemeColor("primary");

  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  const toggleFlag = async (responseId: string, type: QuestionType, flagged: boolean) => {
    try {
      if (flagged) await ApiClient.unflagResponse(id, responseId, type);
      else await ApiClient.flagResponse(id, responseId, type);
      await qc.invalidateQueries({ queryKey: ["discipleship", id, "responses"] });
      await qc.invalidateQueries({ queryKey: ["discipleship", id, "flags"] });
    } catch (err) {
      Alert.alert("Couldn't update flag", err instanceof ApiError ? err.message : "Please try again.");
    }
  };

  const fieldsFor = (r: DiscipleResponse) =>
    [
      { type: "q1" as const, label: "Reflect", text: r.response1, isPrivate: r.q1Private },
      { type: "q2" as const, label: "Act", text: r.response2, isPrivate: r.q2Private },
      ...(r.q3Question ? [{ type: "q3" as const, label: r.q3Question, text: r.response3, isPrivate: r.q3Private }] : []),
      { type: "praise" as const, label: "Prayer & Praise", text: r.prayer, isPrivate: r.prayerPrivate },
    ];

  const all = responses.data ?? [];
  const list = useMemo(
    () => (flaggedOnly ? all.filter((r) => r.flagged.length > 0) : all),
    [all, flaggedOnly]
  );

  if (responses.isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={primary} />
      </View>
    );
  }
  if (responses.isError) {
    if (responses.error instanceof ApiError && responses.error.status === 403) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <Lock size={26} color={muted} />
          <Text className="mt-3 text-center font-serif text-xl font-bold text-foreground">
            Sharpen access ended
          </Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground">
            Your discipler tools were available through this plan. Upgrade to Sharpen to keep discipling.
          </Text>
          <Pressable
            onPress={() => router.push("/settings/membership")}
            className="mt-5 h-11 items-center justify-center rounded-xl bg-primary px-6"
          >
            <Text className="text-sm font-semibold text-primary-foreground">See plans</Text>
          </Pressable>
        </View>
      );
    }
    return <ErrorState message="We couldn't load responses." onRetry={() => responses.refetch()} />;
  }

  return (
    <>
      {/* Toolbar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 4,
        }}
      >
        <Pressable
          onPress={() => setFlaggedOnly((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ selected: flaggedOnly }}
          className="flex-row items-center gap-1.5"
          style={{
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: flaggedOnly ? primary : border,
            backgroundColor: flaggedOnly ? withAlpha(primary, 0.12) : "transparent",
          }}
        >
          <Star size={13} color={flaggedOnly ? primary : muted} fill={flaggedOnly ? primary : "transparent"} />
          <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 13, color: flaggedOnly ? primary : muted }}>
            Flagged
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setAskOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Set a daily question"
          className="flex-row items-center gap-1.5"
          style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: withAlpha(primary, 0.12) }}
        >
          <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 13, color: primary }}>+ Daily question</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="mx-auto w-full max-w-lg px-4 py-3" showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", marginTop: 32 }}>
            {flaggedOnly
              ? "Nothing flagged yet. Tap the flag on a response to keep it here."
              : "No responses yet. They'll appear here the moment your disciple submits."}
          </Text>
        ) : (
          list.map((r) => (
            <View key={r.id} style={{ borderWidth: 1, borderColor: border, borderRadius: 14, backgroundColor: card, padding: 16, marginBottom: 12 }}>
              <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
                <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 13, color: fg }}>
                  Day {r.dayNumber}
                  {r.chapter ? <Text style={{ color: muted, fontFamily: "DMSans_400Regular" }}>{`  ·  ${r.chapter}`}</Text> : null}
                </Text>
                <Pressable
                  onPress={() => onReply(`Re: Day ${r.dayNumber} — `)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Reply in messages"
                  className="flex-row items-center gap-1"
                >
                  <CornerUpLeft size={13} color={primary} />
                  <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 12, color: primary }}>Reply</Text>
                </Pressable>
              </View>

              {fieldsFor(r).map((f) => {
                const flagged = r.flagged.includes(f.type);
                return (
                  <View key={f.type} style={{ marginBottom: 12 }}>
                    <View className="flex-row items-center justify-between" style={{ marginBottom: 3, gap: 8 }}>
                      <Text style={{ flex: 1, fontFamily: "DMSans_500Medium", fontSize: 12, color: muted }}>{f.label}</Text>
                      {!f.isPrivate && f.text ? (
                        <Pressable hitSlop={8} onPress={() => toggleFlag(r.id, f.type, flagged)} accessibilityRole="button" accessibilityLabel={flagged ? "Unflag" : "Flag"}>
                          <Flag size={15} color={flagged ? primary : muted} fill={flagged ? primary : "transparent"} />
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

      <DailyQuestionSheet id={id} visible={askOpen} onClose={() => setAskOpen(false)} />
    </>
  );
}

function DailyQuestionSheet({ id, visible, onClose }: { id: string; visible: boolean; onClose: () => void }) {
  const bg = useThemeColor("background");
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const primary = useThemeColor("primary");
  const toast = useToast();

  const [question, setQuestion] = useState("");
  const [when, setWhen] = useState<"today" | "tomorrow">("today");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!question.trim()) return;
    setSending(true);
    try {
      await ApiClient.setCustomQuestion(id, {
        questionText: question.trim(),
        forDate: when === "today" ? localDate(0) : localDate(1),
      });
      setQuestion("");
      onClose();
      toast.show(`Question sent — they'll see it ${when}.`);
    } catch (err) {
      Alert.alert("Couldn't send", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} contentStyle={{ padding: 22, paddingBottom: 36, maxHeight: "90%" }}>
            <View className="mb-4 flex-row items-center justify-between">
              <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: fg }}>Ask a question</Text>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <X size={20} color={muted} />
              </Pressable>
            </View>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: muted, marginBottom: 12 }}>
              They'll see this with their next reading.
            </Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Ask something for their next reading…"
              placeholderTextColor={muted}
              multiline
              textAlignVertical="top"
              style={{ minHeight: 80, borderWidth: 1, borderColor: border, borderRadius: 12, padding: 12, color: fg, backgroundColor: card, fontFamily: "DMSans_400Regular", fontSize: 15, marginBottom: 12 }}
            />
            <View className="flex-row items-center gap-2" style={{ marginBottom: 16 }}>
              {(["today", "tomorrow"] as const).map((w) => {
                const sel = when === w;
                return (
                  <Pressable
                    key={w}
                    onPress={() => setWhen(w)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: sel }}
                    style={{ borderWidth: 1.5, borderColor: sel ? primary : border, backgroundColor: sel ? withAlpha(primary, 0.1) : "transparent", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 }}
                  >
                    <Text style={{ color: sel ? primary : fg, fontFamily: "DMSans_500Medium", fontSize: 13, textTransform: "capitalize" }}>{w}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={send}
              disabled={!question.trim() || sending}
              style={{ opacity: !question.trim() || sending ? 0.5 : 1, backgroundColor: primary, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 15 }}>{sending ? "Sending…" : "Send question"}</Text>
            </Pressable>
    </BottomSheet>
  );
}

// ─── Messages (the two-way mailbox) ───────────────────────────────────────────

function MessagesPanel({
  id,
  myId,
  accent,
  draft,
  setDraft,
}: {
  id: string;
  myId?: string;
  accent: string;
  draft: string;
  setDraft: (v: string) => void;
}) {
  const qc = useQueryClient();
  const messages = useMailbox(id);
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const primary = useThemeColor("primary");

  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = async () => {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await ApiClient.sendMailboxMessage(id, draft.trim());
      setDraft("");
      await qc.invalidateQueries({ queryKey: ["discipleship", id, "mailbox"] });
      await qc.invalidateQueries({ queryKey: ["discipleship"] });
    } catch (err) {
      Alert.alert("Couldn't send", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {messages.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primary} />
        </View>
      ) : messages.isError ? (
        <ErrorState message="We couldn't load messages." onRetry={() => messages.refetch()} />
      ) : (
        <ScrollView
          ref={scrollRef}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          contentContainerClassName="mx-auto w-full max-w-lg px-4 py-4"
          showsVerticalScrollIndicator={false}
        >
          {(messages.data ?? []).length === 0 ? (
            <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", marginTop: 40 }}>
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
          value={draft}
          onChangeText={setDraft}
          placeholder="Message…"
          placeholderTextColor={muted}
          multiline
          style={{ flex: 1, maxHeight: 120, minHeight: 40, borderWidth: 1, borderColor: border, borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, color: fg, fontFamily: "DMSans_400Regular", fontSize: 15, backgroundColor: card }}
        />
        <Pressable
          onPress={send}
          disabled={!draft.trim() || sending}
          style={{ opacity: !draft.trim() || sending ? 0.5 : 1, backgroundColor: primary, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Send size={18} color="#fff" />
        </Pressable>
      </View>
    </>
  );
}

// ─── Notes (private to the author, or shared with both) ───────────────────────

function NotesTogglePill({
  label,
  active,
  onPress,
  accent,
  border,
  muted,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  accent: string;
  border: string;
  muted: string;
  icon?: typeof Lock;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? accent : border,
        backgroundColor: active ? withAlpha(accent, 0.12) : "transparent",
      }}
    >
      {Icon ? <Icon size={12} color={active ? accent : muted} /> : null}
      <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 12, color: active ? accent : muted }}>{label}</Text>
    </Pressable>
  );
}

function NotesTag({ label, color, subtle }: { label: string; color: string; subtle?: boolean }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: withAlpha(color, subtle ? 0.1 : 0.16) }}>
      <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 10, color, letterSpacing: 0.3 }}>{label.toUpperCase()}</Text>
    </View>
  );
}

function NotesPanel({ id, accent }: { id: string; accent: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const notesQ = useNotes(id);

  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");

  const [body, setBody] = useState("");
  const [shared, setShared] = useState(false);
  const [kind, setKind] = useState<"note" | "prayer">("note");
  const [busy, setBusy] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["discipleship", id, "notes"] });

  const add = async () => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await ApiClient.createNote(id, { body: text, shared, kind });
      setBody("");
      setKind("note");
      await invalidate();
      toast.show(shared ? "Shared note added" : "Private note added");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Couldn't add note");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (noteId: string) => {
    try {
      await ApiClient.deleteNote(id, noteId);
      await invalidate();
      toast.show("Note deleted");
    } catch {
      toast.show("Couldn't delete note");
    }
  };

  const notes = notesQ.data ?? [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
      {/* Composer */}
      <View style={{ borderWidth: 1, borderColor: border, borderRadius: 14, backgroundColor: card, padding: 12, marginBottom: 18 }}>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={kind === "prayer" ? "Add a prayer request…" : "Add a note for next time…"}
          placeholderTextColor={muted}
          multiline
          style={{ minHeight: 44, color: fg, fontFamily: "DMSans_400Regular", fontSize: 15, textAlignVertical: "top" }}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <NotesTogglePill label="Note" active={kind === "note"} onPress={() => setKind("note")} accent={accent} border={border} muted={muted} />
          <NotesTogglePill label="Prayer" active={kind === "prayer"} onPress={() => setKind("prayer")} accent={accent} border={border} muted={muted} />
          <View style={{ width: 1, height: 20, backgroundColor: border, marginHorizontal: 2 }} />
          <NotesTogglePill
            label={shared ? "Shared" : "Private"}
            active={shared}
            icon={shared ? undefined : Lock}
            onPress={() => setShared((s) => !s)}
            accent={accent}
            border={border}
            muted={muted}
          />
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={add}
            disabled={!body.trim() || busy}
            accessibilityRole="button"
            accessibilityLabel="Add note"
            style={{
              opacity: !body.trim() || busy ? 0.5 : 1,
              backgroundColor: accent,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={15} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 13 }}>Add</Text>
          </Pressable>
        </View>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: muted, marginTop: 8 }}>
          {shared ? "Shared notes are visible to both of you." : "Private notes are only visible to you."}
        </Text>
      </View>

      {/* List */}
      {notesQ.isLoading ? (
        <ActivityIndicator color={accent} style={{ marginTop: 24 }} />
      ) : notes.length === 0 ? (
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: muted, textAlign: "center", marginTop: 24, lineHeight: 21 }}>
          No notes yet. Keep prayer requests and follow-ups for next time here.
        </Text>
      ) : (
        notes.map((n) => (
          <View key={n.id} style={{ borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card, padding: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              {n.kind === "prayer" ? <NotesTag label="Prayer" color={accent} /> : null}
              <NotesTag label={n.shared ? "Shared" : "Private"} color={muted} subtle />
              <View style={{ flex: 1 }} />
              {n.isMine ? (
                <Pressable onPress={() => remove(n.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete note">
                  <Trash2 size={15} color={muted} />
                </Pressable>
              ) : null}
            </View>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 15, color: fg, lineHeight: 21 }}>{n.body}</Text>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: muted, marginTop: 6 }}>
              {(n.isMine ? "You" : n.authorName) + " · " + formatTime(n.createdAt)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
