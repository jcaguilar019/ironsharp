import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronRight, Plus, Trash2, X } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { useThemeColor } from "@/components/useThemeColor";
import { withAlpha } from "@/theme/themes";
import { useCommunityAdminList, useCommunityReports, useProfile } from "@/lib/queries";
import {
  ApiClient,
  ApiError,
  type CommunityDevotional,
  type CommunityDevotionalInput,
  type CommunityReport,
  type StudyNoteEntry,
} from "@/lib/api";
import { questionsOf } from "@/lib/communityContent";

type Editing = { mode: "new"; date: string } | { mode: "edit"; devotional: CommunityDevotional } | null;
type FieldKey = "title" | "passageReference";

const MAX_QUESTIONS = 5;

// ── Dates ────────────────────────────────────────────────────────────────────
// Stored/sent as YYYY-MM-DD (server contract); shown as friendly labels.
function todayISO(): string {
  return new Date().toLocaleDateString("en-CA");
}
/** Parse YYYY-MM-DD into a LOCAL Date (avoids the UTC off-by-one of new Date(iso)). */
function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 2000, (m || 1) - 1, d || 1);
}
function addDaysISO(iso: string, n: number): string {
  const dt = isoToLocalDate(iso);
  dt.setDate(dt.getDate() + n);
  return dt.toLocaleDateString("en-CA");
}
/** "Wed, Jul 9" */
function formatShort(iso: string): string {
  return isoToLocalDate(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
/** "Wed, Jul 9, 2026" */
function formatNice(iso: string): string {
  return isoToLocalDate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
/** "Today" / "Tomorrow" / "In 3 days" / "2 days ago" */
function relativeLabel(iso: string): string {
  const diff = Math.round((isoToLocalDate(iso).getTime() - isoToLocalDate(todayISO()).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return diff > 0 ? `In ${diff} days` : `${Math.abs(diff)} days ago`;
}

function emptyForm(date: string): CommunityDevotionalInput {
  return {
    publishDate: date,
    title: "",
    subtitle: "",
    passageReference: "",
    passageContext: "",
    studyNotes: [],
    questions: [],
    prayerPrompt: "",
    status: "draft",
  };
}

// ── Presentational pieces (module-level so inputs never remount on keystroke) ──
function SectionTitle({ title, hint, first }: { title: string; hint?: string; first?: boolean }) {
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  return (
    <View style={{ marginTop: first ? 4 : 26, marginBottom: 12 }}>
      <Text style={{ color: fg, fontFamily: "PlayfairDisplay_700Bold", fontSize: 19 }}>{title}</Text>
      {hint ? (
        <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 18, marginTop: 3 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function LabeledInput({
  label,
  helper,
  value,
  onChangeText,
  error,
  multiline,
  placeholder,
}: {
  label: string;
  helper?: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const destructive = useThemeColor("destructive");
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: helper ? 3 : 7 }}>{label}</Text>
      {helper ? (
        <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 17, marginBottom: 8 }}>
          {helper}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={muted}
        multiline={multiline}
        style={{
          borderWidth: 1,
          borderColor: error ? destructive : border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: fg,
          backgroundColor: card,
          fontSize: 15,
          lineHeight: multiline ? 22 : undefined,
          fontFamily: "DMSans_400Regular",
          minHeight: multiline ? 100 : 48,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
      {error ? (
        <Text style={{ color: destructive, fontFamily: "DMSans_500Medium", fontSize: 12, marginTop: 6 }}>{error}</Text>
      ) : null}
    </View>
  );
}

function StatusChip({ status }: { status: "draft" | "published" }) {
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const color = status === "published" ? primary : muted;
  return (
    <View style={{ borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: withAlpha(color, 0.13) }}>
      <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color }}>
        {status === "published" ? "Live" : "Draft"}
      </Text>
    </View>
  );
}

export default function CommunityAdmin() {
  const profile = useProfile();
  const qc = useQueryClient();
  const isAdmin = profile.data?.isAdmin ?? false;
  const list = useCommunityAdminList(isAdmin);
  const reports = useCommunityReports(isAdmin);

  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const primary = useThemeColor("primary");
  const destructive = useThemeColor("destructive");

  const [editing, setEditing] = useState<Editing>(null);
  const [form, setForm] = useState<CommunityDevotionalInput>(emptyForm(todayISO()));
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Schedule material: readings mapped by date, next-7-day slots, and the past.
  const today = todayISO();
  const byDate = useMemo(() => {
    const m = new Map<string, CommunityDevotional>();
    for (const d of list.data ?? []) m.set(d.publishDate, d);
    return m;
  }, [list.data]);
  const upcomingDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(today, i + 1)), [today]);
  const past = useMemo(
    () => (list.data ?? []).filter((d) => d.publishDate < today).slice(0, 10),
    [list.data, today]
  );
  const todaysReading = byDate.get(today);

  // ── Report moderation ────────────────────────────────────────────────────────
  const removeReported = (r: CommunityReport) => {
    Alert.alert("Remove this response?", "It disappears from the feed for everyone. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await ApiClient.adminRemoveCommunityResponse(r.responseId);
            await qc.invalidateQueries({ queryKey: ["community"] });
          } catch (err) {
            Alert.alert("Couldn't remove", err instanceof ApiError ? err.message : "Please try again.");
          }
        },
      },
    ]);
  };

  const dismissReport = async (r: CommunityReport) => {
    try {
      await ApiClient.dismissCommunityReport(r.id);
      await qc.invalidateQueries({ queryKey: ["community", "admin", "reports"] });
    } catch (err) {
      Alert.alert("Couldn't dismiss", err instanceof ApiError ? err.message : "Please try again.");
    }
  };

  const set = (patch: Partial<CommunityDevotionalInput>) => setForm((f) => ({ ...f, ...patch }));
  const clearError = (k: FieldKey) =>
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  const onField = (key: FieldKey) => (t: string) => {
    set({ [key]: t } as Partial<CommunityDevotionalInput>);
    clearError(key);
  };

  const startNew = (date: string) => {
    setForm(emptyForm(date));
    setErrors({});
    setEditing({ mode: "new", date });
  };
  const startEdit = (d: CommunityDevotional) => {
    setForm({
      publishDate: d.publishDate,
      title: d.title,
      subtitle: d.subtitle ?? "",
      passageReference: d.passageReference,
      passageContext: d.passageContext ?? "",
      studyNotes: d.studyNotes ?? [],
      questions: questionsOf(d),
      prayerPrompt: d.prayerPrompt ?? "",
      status: d.status,
    });
    setErrors({});
    setEditing({ mode: "edit", devotional: d });
  };

  const addNote = () => set({ studyNotes: [...form.studyNotes, { verse_ref: "", note: "" }] });
  const updateNote = (i: number, patch: Partial<StudyNoteEntry>) =>
    set({ studyNotes: form.studyNotes.map((n, idx) => (idx === i ? { ...n, ...patch } : n)) });
  const removeNote = (i: number) => set({ studyNotes: form.studyNotes.filter((_, idx) => idx !== i) });

  const addQuestion = () => {
    if (form.questions.length >= MAX_QUESTIONS) return;
    set({ questions: [...form.questions, ""] });
  };
  const updateQuestion = (i: number, t: string) =>
    set({ questions: form.questions.map((q, idx) => (idx === i ? t : q)) });
  const removeQuestion = (i: number) => set({ questions: form.questions.filter((_, idx) => idx !== i) });

  const validate = (): Partial<Record<FieldKey, string>> => {
    const e: Partial<Record<FieldKey, string>> = {};
    if (!form.title.trim()) e.title = "Add a title.";
    if (!form.passageReference.trim()) e.passageReference = "Add a passage reference.";
    return e;
  };

  const save = async (publish: boolean) => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setErrors({});
    setSaving(true);
    const payload: CommunityDevotionalInput = {
      ...form,
      subtitle: form.subtitle?.trim() || null,
      passageContext: form.passageContext?.trim() || null,
      prayerPrompt: form.prayerPrompt?.trim() || null,
      studyNotes: form.studyNotes.filter((n) => n.verse_ref.trim() || n.note.trim()),
      questions: form.questions.map((q) => q.trim()).filter(Boolean),
      status: publish ? "published" : form.status,
    };
    try {
      if (editing?.mode === "edit") {
        await ApiClient.updateCommunityDevotional(editing.devotional.id, payload);
      } else {
        await ApiClient.createCommunityDevotional(payload);
      }
      await qc.invalidateQueries({ queryKey: ["community", "admin", "list"] });
      await qc.invalidateQueries({ queryKey: ["community", "today"] });
      setEditing(null);
    } catch (e2) {
      Alert.alert("Couldn't save", e2 instanceof ApiError ? e2.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const publishExisting = async (d: CommunityDevotional) => {
    try {
      await ApiClient.publishCommunityDevotional(d.id);
      await qc.invalidateQueries({ queryKey: ["community", "admin", "list"] });
      await qc.invalidateQueries({ queryKey: ["community", "today"] });
    } catch (e) {
      Alert.alert("Couldn't publish", e instanceof ApiError ? e.message : "Please try again.");
    }
  };

  if (!profile.isLoading && !isAdmin) {
    return (
      <Screen edges={["top", "bottom"]}>
        <Header title="Schedule" subtitle="Community" />
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center" }}>
            You don't have access to author Community Devotionals.
          </Text>
        </View>
      </Screen>
    );
  }

  // ── Editor ─────────────────────────────────────────────────────────────────
  if (editing) {
    const hasErrors = Object.keys(errors).length > 0;
    const editorDate = editing.mode === "edit" ? editing.devotional.publishDate : editing.date;
    return (
      <Screen edges={["top", "bottom"]}>
        <Header
          title={editing.mode === "edit" ? "Edit Reading" : "New Reading"}
          subtitle="Community"
          rightAction={
            <Pressable onPress={() => setEditing(null)} hitSlop={10} accessibilityLabel="Close editor">
              <X size={22} color={muted} />
            </Pressable>
          }
        />
        <ScrollView
          ref={scrollRef}
          contentContainerClassName="mx-auto w-full max-w-lg px-6 pt-2 pb-16"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          {/* The date comes from the schedule slot that was tapped — context, not a widget. */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderWidth: 1,
              borderColor: border,
              borderRadius: 12,
              backgroundColor: card,
              paddingHorizontal: 14,
              paddingVertical: 11,
              marginBottom: 8,
            }}
          >
            <Text style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{formatNice(editorDate)}</Text>
            <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12 }}>{relativeLabel(editorDate)}</Text>
          </View>

          {hasErrors ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: withAlpha(destructive, 0.4),
                backgroundColor: withAlpha(destructive, 0.1),
                borderRadius: 10,
                padding: 12,
                marginTop: 8,
              }}
            >
              <AlertCircle size={16} color={destructive} />
              <Text style={{ color: destructive, fontFamily: "DMSans_500Medium", fontSize: 13, flex: 1 }}>
                Fill in the highlighted fields below.
              </Text>
            </View>
          ) : null}

          <SectionTitle title="The Passage" hint="What everyone reads and sits with that day." />
          <LabeledInput
            label="Title"
            placeholder="e.g. Bearing With One Another"
            value={form.title}
            onChangeText={onField("title")}
            error={errors.title}
          />
          <LabeledInput
            label="Subtitle"
            helper="Optional — a short line under the title."
            value={form.subtitle ?? ""}
            onChangeText={(t) => set({ subtitle: t })}
          />
          <LabeledInput
            label="Passage reference"
            placeholder="Romans 14:1–12"
            value={form.passageReference}
            onChangeText={onField("passageReference")}
            error={errors.passageReference}
          />
          <LabeledInput
            label="Passage context"
            helper="Optional — a few sentences orienting the reader: who wrote it, to whom, and why it matters."
            multiline
            value={form.passageContext ?? ""}
            onChangeText={(t) => set({ passageContext: t })}
          />

          <SectionTitle title="Study Notes" hint="Optional verse-by-verse notes shown alongside the reading." />
          {form.studyNotes.map((n, i) => (
            <View
              key={i}
              style={{ borderWidth: 1, borderColor: border, borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: card }}
            >
              <View className="flex-row items-center gap-2">
                <TextInput
                  value={n.verse_ref}
                  onChangeText={(t) => updateNote(i, { verse_ref: t })}
                  placeholder="Verse (e.g. v.4)"
                  placeholderTextColor={muted}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: fg,
                    fontSize: 14,
                    fontFamily: "DMSans_400Regular",
                  }}
                />
                <Pressable onPress={() => removeNote(i)} hitSlop={8} accessibilityLabel="Remove note">
                  <Trash2 size={18} color={destructive} />
                </Pressable>
              </View>
              <TextInput
                value={n.note}
                onChangeText={(t) => updateNote(i, { note: t })}
                placeholder="What this verse means…"
                placeholderTextColor={muted}
                multiline
                style={{
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: fg,
                  fontSize: 14,
                  lineHeight: 20,
                  fontFamily: "DMSans_400Regular",
                  minHeight: 64,
                  textAlignVertical: "top",
                }}
              />
            </View>
          ))}
          <Pressable
            onPress={addNote}
            className="flex-row items-center justify-center gap-2"
            style={{ borderWidth: 1, borderColor: border, borderStyle: "dashed", borderRadius: 12, paddingVertical: 12 }}
          >
            <Plus size={16} color={primary} />
            <Text style={{ color: primary, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Add a study note</Text>
          </Pressable>

          <SectionTitle
            title="Reflect & Pray"
            hint="Optional — up to five reflection questions and a closing prayer. Add as many or as few as the reading needs."
          />
          {form.questions.map((q, i) => (
            <View key={i} style={{ marginBottom: 12 }}>
              <View className="mb-2 flex-row items-center justify-between">
                <Text style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Question {i + 1}</Text>
                <Pressable onPress={() => removeQuestion(i)} hitSlop={8} accessibilityLabel={`Remove question ${i + 1}`}>
                  <Trash2 size={16} color={destructive} />
                </Pressable>
              </View>
              <TextInput
                value={q}
                onChangeText={(t) => updateQuestion(i, t)}
                placeholder="What stands out to you in this passage?"
                placeholderTextColor={muted}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: fg,
                  backgroundColor: card,
                  fontSize: 15,
                  lineHeight: 22,
                  fontFamily: "DMSans_400Regular",
                  minHeight: 64,
                  textAlignVertical: "top",
                }}
              />
            </View>
          ))}
          {form.questions.length < MAX_QUESTIONS ? (
            <Pressable
              onPress={addQuestion}
              className="flex-row items-center justify-center gap-2"
              style={{ borderWidth: 1, borderColor: border, borderStyle: "dashed", borderRadius: 12, paddingVertical: 12, marginBottom: 4 }}
            >
              <Plus size={16} color={primary} />
              <Text style={{ color: primary, fontFamily: "DMSans_700Bold", fontSize: 13 }}>
                {form.questions.length === 0 ? "Add a reflection question" : "Add another question"}
              </Text>
            </Pressable>
          ) : null}

          <View style={{ height: 12 }} />
          <LabeledInput
            label="Prayer prompt"
            helper="Optional — a line to guide the closing prayer."
            multiline
            value={form.prayerPrompt ?? ""}
            onChangeText={(t) => set({ prayerPrompt: t })}
          />

          <View className="mt-4 gap-3">
            <Pressable
              onPress={() => save(true)}
              disabled={saving}
              style={{ opacity: saving ? 0.6 : 1 }}
              className="h-12 items-center justify-center rounded-xl bg-primary"
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-primary-foreground">
                  {editing.mode === "edit" ? "Save & publish" : "Publish"}
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => save(false)}
              disabled={saving}
              style={{ opacity: saving ? 0.6 : 1, borderWidth: 1, borderColor: border }}
              className="h-12 items-center justify-center rounded-xl"
            >
              <Text style={{ color: fg, fontFamily: "DMSans_700Bold" }}>Save as draft</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // ── Schedule ───────────────────────────────────────────────────────────────
  return (
    <Screen edges={["top", "bottom"]}>
      <Header title="Schedule" subtitle="Community" />
      {list.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="mx-auto w-full max-w-lg px-6 py-4"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Reported responses (open reports) ─────────────────────────── */}
          {(reports.data ?? []).length > 0 ? (
            <View style={{ marginBottom: 22 }}>
              <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Reported responses
              </Text>
              {(reports.data ?? []).map((r) => (
                <View
                  key={r.id}
                  style={{
                    borderWidth: 1,
                    borderColor: withAlpha(destructive, 0.45),
                    borderRadius: 12,
                    backgroundColor: card,
                    padding: 14,
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12 }}>
                    {r.authorName}'s response · reported by {r.reporterName} · {r.reason}
                  </Text>
                  {[r.response1, r.response2, r.prayer].filter(Boolean).map((t, i) => (
                    <Text
                      key={i}
                      numberOfLines={4}
                      style={{ color: fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20, marginTop: 6 }}
                    >
                      {t}
                    </Text>
                  ))}
                  <View className="mt-3 flex-row gap-3">
                    <Pressable
                      onPress={() => removeReported(r)}
                      style={{ backgroundColor: destructive, borderRadius: 8 }}
                      className="px-3 py-2"
                    >
                      <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 12 }}>Remove response</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => dismissReport(r)}
                      style={{ borderWidth: 1, borderColor: border, borderRadius: 8 }}
                      className="px-3 py-2"
                    >
                      <Text style={{ color: fg, fontFamily: "DMSans_500Medium", fontSize: 12 }}>Dismiss</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* ── Today ──────────────────────────────────────────────────────── */}
          <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Today</Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: todaysReading ? border : withAlpha(primary, 0.5),
              borderStyle: todaysReading ? "solid" : "dashed",
              borderRadius: 14,
              backgroundColor: todaysReading ? card : "transparent",
              padding: 16,
              marginBottom: 22,
            }}
          >
            <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12 }}>{formatNice(today)}</Text>
            {todaysReading ? (
              <>
                <View className="mt-1 flex-row items-center justify-between gap-3">
                  <Text className="flex-1 font-serif text-xl font-bold text-foreground">{todaysReading.title}</Text>
                  <StatusChip status={todaysReading.status} />
                </View>
                <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 2 }}>
                  {todaysReading.passageReference}
                </Text>
                <View className="mt-3 flex-row gap-3">
                  <Pressable
                    onPress={() => startEdit(todaysReading)}
                    style={{ borderWidth: 1, borderColor: border, borderRadius: 8 }}
                    className="px-3 py-2"
                  >
                    <Text style={{ color: fg, fontFamily: "DMSans_500Medium", fontSize: 12 }}>Edit</Text>
                  </Pressable>
                  {todaysReading.status !== "published" ? (
                    <Pressable
                      onPress={() => publishExisting(todaysReading)}
                      style={{ backgroundColor: primary, borderRadius: 8 }}
                      className="px-3 py-2"
                    >
                      <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 12 }}>Publish now</Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            ) : (
              <>
                <Text className="mt-1 font-serif text-lg font-bold text-foreground">No reading scheduled</Text>
                <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 2, lineHeight: 19 }}>
                  Today is empty — the community sees nothing until this is written.
                </Text>
                <View style={{ marginTop: 12 }}>
                  <Button title="Write today's reading" onPress={() => startNew(today)} />
                </View>
              </>
            )}
          </View>

          {/* ── Upcoming week ─────────────────────────────────────────────── */}
          <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Next 7 days</Text>
          <View style={{ borderWidth: 1, borderColor: border, borderRadius: 14, backgroundColor: card, marginBottom: 22 }}>
            {upcomingDays.map((day, i) => {
              const reading = byDate.get(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => (reading ? startEdit(reading) : startNew(day))}
                  accessibilityRole="button"
                  accessibilityLabel={reading ? `Edit ${formatShort(day)}` : `Write for ${formatShort(day)}`}
                  className="active:opacity-70"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: border,
                  }}
                >
                  <View style={{ width: 86 }}>
                    <Text style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{formatShort(day)}</Text>
                  </View>
                  {reading ? (
                    <>
                      <Text
                        numberOfLines={1}
                        style={{ flex: 1, color: fg, fontFamily: "DMSans_400Regular", fontSize: 14 }}
                      >
                        {reading.title}
                      </Text>
                      <StatusChip status={reading.status} />
                    </>
                  ) : (
                    <Text style={{ flex: 1, color: muted, fontFamily: "DMSans_400Regular", fontSize: 13, fontStyle: "italic" }}>
                      Empty — tap to write
                    </Text>
                  )}
                  <ChevronRight size={16} color={muted} />
                </Pressable>
              );
            })}
          </View>

          {/* ── Past readings ─────────────────────────────────────────────── */}
          {past.length > 0 ? (
            <>
              <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Past readings</Text>
              {past.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => startEdit(d)}
                  className="flex-row items-center gap-3 active:opacity-70"
                  style={{ borderBottomWidth: 1, borderBottomColor: border, paddingVertical: 12 }}
                >
                  <View className="flex-1">
                    <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12 }}>
                      {formatShort(d.publishDate)} · {d.passageReference}
                    </Text>
                    <Text className="mt-0.5 font-serif text-base font-bold text-foreground">{d.title}</Text>
                  </View>
                  <StatusChip status={d.status} />
                  <ChevronRight size={16} color={muted} />
                </Pressable>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
