import { useRef, useState } from "react";
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
import { AlertCircle, ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
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

type Editing = { mode: "new" } | { mode: "edit"; devotional: CommunityDevotional } | null;
type FieldKey = "title" | "passageReference" | "reflectionQ1" | "reflectionQ2";

// ── Dates ────────────────────────────────────────────────────────────────────
// Stored/sent as YYYY-MM-DD (server contract); shown as a friendly weekday label.
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

function emptyForm(): CommunityDevotionalInput {
  return {
    publishDate: todayISO(),
    title: "",
    subtitle: "",
    passageReference: "",
    passageContext: "",
    studyNotes: [],
    reflectionQ1: "",
    reflectionQ2: "",
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

function DateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const primary = useThemeColor("primary");
  const today = todayISO();
  const chips = [
    { label: "Today", iso: today },
    { label: "Tomorrow", iso: addDaysISO(today, 1) },
  ];
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 8 }}>Publish date</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: border,
          borderRadius: 12,
          backgroundColor: card,
          paddingVertical: 8,
        }}
      >
        <Pressable
          onPress={() => onChange(addDaysISO(value, -1))}
          hitSlop={8}
          accessibilityLabel="Previous day"
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <ChevronLeft size={22} color={muted} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 16 }}>{formatNice(value)}</Text>
          <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 1 }}>
            {relativeLabel(value)}
          </Text>
        </View>
        <Pressable
          onPress={() => onChange(addDaysISO(value, 1))}
          hitSlop={8}
          accessibilityLabel="Next day"
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <ChevronRight size={22} color={muted} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        {chips.map((c) => {
          const active = value === c.iso;
          return (
            <Pressable
              key={c.label}
              onPress={() => onChange(c.iso)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? primary : border,
                backgroundColor: active ? withAlpha(primary, 0.12) : "transparent",
              }}
            >
              <Text style={{ color: active ? primary : muted, fontFamily: "DMSans_500Medium", fontSize: 13 }}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  const [form, setForm] = useState<CommunityDevotionalInput>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

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

  const startNew = () => {
    setForm(emptyForm());
    setErrors({});
    setEditing({ mode: "new" });
  };
  const startEdit = (d: CommunityDevotional) => {
    setForm({
      publishDate: d.publishDate,
      title: d.title,
      subtitle: d.subtitle ?? "",
      passageReference: d.passageReference,
      passageContext: d.passageContext ?? "",
      studyNotes: d.studyNotes ?? [],
      reflectionQ1: d.reflectionQ1,
      reflectionQ2: d.reflectionQ2,
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

  const validate = (): Partial<Record<FieldKey, string>> => {
    const e: Partial<Record<FieldKey, string>> = {};
    if (!form.title.trim()) e.title = "Add a title.";
    if (!form.passageReference.trim()) e.passageReference = "Add a passage reference.";
    if (!form.reflectionQ1.trim()) e.reflectionQ1 = "Add the first reflection question.";
    if (!form.reflectionQ2.trim()) e.reflectionQ2 = "Add the second reflection question.";
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
        <Header title="Author" subtitle="Community" />
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
          contentContainerClassName="mx-auto w-full max-w-lg px-6 pt-4 pb-16"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
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
                marginBottom: 8,
              }}
            >
              <AlertCircle size={16} color={destructive} />
              <Text style={{ color: destructive, fontFamily: "DMSans_500Medium", fontSize: 13, flex: 1 }}>
                Fill in the highlighted fields below.
              </Text>
            </View>
          ) : null}

          <SectionTitle first title="Schedule" hint="The day this reading goes live for everyone." />
          <DateField value={form.publishDate} onChange={(iso) => set({ publishDate: iso })} />

          <SectionTitle title="The Passage" hint="What everyone reads and sits with today." />
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

          <SectionTitle title="Reflect & Pray" hint="Two questions to sit with, and a prayer to close." />
          <LabeledInput
            label="Reflection question 1"
            placeholder="What stands out to you in this passage?"
            multiline
            value={form.reflectionQ1}
            onChangeText={onField("reflectionQ1")}
            error={errors.reflectionQ1}
          />
          <LabeledInput
            label="Reflection question 2"
            placeholder="Where is God inviting you to respond?"
            multiline
            value={form.reflectionQ2}
            onChangeText={onField("reflectionQ2")}
            error={errors.reflectionQ2}
          />
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

  // ── List ───────────────────────────────────────────────────────────────────
  return (
    <Screen edges={["top", "bottom"]}>
      <Header
        title="Author"
        subtitle="Community"
        rightAction={
          <Pressable onPress={startNew} hitSlop={10} accessibilityLabel="New reading" className="flex-row items-center gap-1">
            <Plus size={16} color={primary} />
            <Text style={{ color: primary, fontFamily: "DMSans_700Bold", fontSize: 13 }}>New</Text>
          </Pressable>
        }
      />
      {list.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primary} />
        </View>
      ) : (list.data ?? []).length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center" }}>
            No readings yet. Tap “New” to write the first one.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="mx-auto w-full max-w-lg px-6 py-4"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Reported responses (open reports) ─────────────────────────── */}
          {(reports.data ?? []).length > 0 ? (
            <View style={{ marginBottom: 18 }}>
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

          {(list.data ?? []).map((d) => (
            <View
              key={d.id}
              style={{ borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card, padding: 14, marginBottom: 10 }}
            >
              <View className="flex-row items-center justify-between">
                <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12 }}>
                  {formatNice(d.publishDate)} · {d.passageReference}
                </Text>
                <View
                  style={{
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    backgroundColor: withAlpha(d.status === "published" ? primary : muted, 0.13),
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "DMSans_700Bold",
                      fontSize: 10,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      color: d.status === "published" ? primary : muted,
                    }}
                  >
                    {d.status}
                  </Text>
                </View>
              </View>
              <Text className="mt-1 font-serif text-lg font-bold text-foreground">{d.title}</Text>
              <View className="mt-3 flex-row gap-3">
                <Pressable
                  onPress={() => startEdit(d)}
                  style={{ borderWidth: 1, borderColor: border, borderRadius: 8 }}
                  className="px-3 py-2"
                >
                  <Text style={{ color: fg, fontFamily: "DMSans_500Medium", fontSize: 12 }}>Edit</Text>
                </Pressable>
                {d.status !== "published" ? (
                  <Pressable
                    onPress={() => publishExisting(d)}
                    style={{ backgroundColor: primary, borderRadius: 8 }}
                    className="px-3 py-2"
                  >
                    <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 12 }}>Publish</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
