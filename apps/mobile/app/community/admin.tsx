import { useState } from "react";
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
import { Plus, Trash2, X } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { useThemeColor } from "@/components/useThemeColor";
import { useCommunityAdminList, useProfile } from "@/lib/queries";
import {
  ApiClient,
  ApiError,
  type CommunityDevotional,
  type CommunityDevotionalInput,
  type StudyNoteEntry,
} from "@/lib/api";

type Editing = { mode: "new" } | { mode: "edit"; devotional: CommunityDevotional } | null;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function emptyForm(): CommunityDevotionalInput {
  return {
    publishDate: "",
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

export default function CommunityAdmin() {
  const profile = useProfile();
  const qc = useQueryClient();
  const isAdmin = profile.data?.isAdmin ?? false;
  const list = useCommunityAdminList(isAdmin);

  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const primary = useThemeColor("primary");

  const [editing, setEditing] = useState<Editing>(null);
  const [form, setForm] = useState<CommunityDevotionalInput>(emptyForm());
  const [saving, setSaving] = useState(false);

  const inputStyle = {
    borderWidth: 1,
    borderColor: border,
    borderRadius: 10,
    padding: 12,
    color: fg,
    backgroundColor: card,
    fontSize: 14,
    fontFamily: "DMSans_400Regular" as const,
    marginBottom: 12,
  };
  const set = (patch: Partial<CommunityDevotionalInput>) => setForm((f) => ({ ...f, ...patch }));

  const startNew = () => {
    setForm(emptyForm());
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
    setEditing({ mode: "edit", devotional: d });
  };

  const addNote = () => set({ studyNotes: [...form.studyNotes, { verse_ref: "", note: "" }] });
  const updateNote = (i: number, patch: Partial<StudyNoteEntry>) =>
    set({ studyNotes: form.studyNotes.map((n, idx) => (idx === i ? { ...n, ...patch } : n)) });
  const removeNote = (i: number) =>
    set({ studyNotes: form.studyNotes.filter((_, idx) => idx !== i) });

  const validate = (): string | null => {
    if (!DATE_RE.test(form.publishDate)) return "Publish date must be YYYY-MM-DD.";
    if (!form.title.trim()) return "Title is required.";
    if (!form.passageReference.trim()) return "Passage reference is required.";
    if (!form.reflectionQ1.trim()) return "Reflection question 1 is required.";
    if (!form.reflectionQ2.trim()) return "Reflection question 2 is required.";
    return null;
  };

  const save = async (publish: boolean) => {
    const err = validate();
    if (err) {
      Alert.alert("Check the form", err);
      return;
    }
    setSaving(true);
    const payload: CommunityDevotionalInput = {
      ...form,
      subtitle: form.subtitle?.trim() || null,
      passageContext: form.passageContext?.trim() || null,
      prayerPrompt: form.prayerPrompt?.trim() || null,
      // Drop blank study-note rows.
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
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof ApiError ? e.message : "Please try again.");
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
      <Screen edges={["top"]}>
        <Header title="Author" subtitle="Community" />
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 15, textAlign: "center" }}>
            You don't have access to author Community Devotionals.
          </Text>
        </View>
      </Screen>
    );
  }

  // ── Editor ─────────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <Screen edges={["top"]}>
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
          contentContainerClassName="mx-auto w-full max-w-lg px-6 py-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Publish date (YYYY-MM-DD)
          </Text>
          <TextInput
            value={form.publishDate}
            onChangeText={(t) => set({ publishDate: t })}
            placeholder="2026-06-24"
            placeholderTextColor={muted}
            autoCapitalize="none"
            style={inputStyle}
          />

          <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Title</Text>
          <TextInput value={form.title} onChangeText={(t) => set({ title: t })} placeholderTextColor={muted} style={inputStyle} />

          <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Subtitle</Text>
          <TextInput value={form.subtitle ?? ""} onChangeText={(t) => set({ subtitle: t })} placeholderTextColor={muted} style={inputStyle} />

          <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Passage reference
          </Text>
          <TextInput
            value={form.passageReference}
            onChangeText={(t) => set({ passageReference: t })}
            placeholder="Romans 14:1–12"
            placeholderTextColor={muted}
            style={inputStyle}
          />

          <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Passage context
          </Text>
          <TextInput
            value={form.passageContext ?? ""}
            onChangeText={(t) => set({ passageContext: t })}
            multiline
            placeholderTextColor={muted}
            style={[inputStyle, { minHeight: 90, textAlignVertical: "top" }]}
          />

          {/* Study notes */}
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-xs uppercase tracking-wider text-muted-foreground">Study notes</Text>
            <Pressable onPress={addNote} className="flex-row items-center gap-1" hitSlop={8}>
              <Plus size={14} color={primary} />
              <Text style={{ color: primary, fontFamily: "DMSans_500Medium", fontSize: 12 }}>Add</Text>
            </Pressable>
          </View>
          {form.studyNotes.map((n, i) => (
            <View key={i} style={{ borderWidth: 1, borderColor: border, borderRadius: 10, padding: 10, marginBottom: 10 }}>
              <View className="flex-row items-center gap-2">
                <TextInput
                  value={n.verse_ref}
                  onChangeText={(t) => updateNote(i, { verse_ref: t })}
                  placeholder="Verse ref (e.g. v.4)"
                  placeholderTextColor={muted}
                  style={[inputStyle, { flex: 1, marginBottom: 0 }]}
                />
                <Pressable onPress={() => removeNote(i)} hitSlop={8} accessibilityLabel="Remove note">
                  <Trash2 size={16} color="#ef4444" />
                </Pressable>
              </View>
              <TextInput
                value={n.note}
                onChangeText={(t) => updateNote(i, { note: t })}
                placeholder="Note…"
                placeholderTextColor={muted}
                multiline
                style={[inputStyle, { marginTop: 8, marginBottom: 0, minHeight: 60, textAlignVertical: "top" }]}
              />
            </View>
          ))}

          <View style={{ height: 4 }} />
          <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Reflection question 1
          </Text>
          <TextInput value={form.reflectionQ1} onChangeText={(t) => set({ reflectionQ1: t })} multiline placeholderTextColor={muted} style={[inputStyle, { minHeight: 60, textAlignVertical: "top" }]} />

          <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Reflection question 2
          </Text>
          <TextInput value={form.reflectionQ2} onChangeText={(t) => set({ reflectionQ2: t })} multiline placeholderTextColor={muted} style={[inputStyle, { minHeight: 60, textAlignVertical: "top" }]} />

          <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Prayer prompt</Text>
          <TextInput value={form.prayerPrompt ?? ""} onChangeText={(t) => set({ prayerPrompt: t })} multiline placeholderTextColor={muted} style={[inputStyle, { minHeight: 60, textAlignVertical: "top" }]} />

          <View className="mt-2 gap-3">
            <Pressable
              onPress={() => save(false)}
              disabled={saving}
              style={{ opacity: saving ? 0.6 : 1, borderWidth: 1, borderColor: border }}
              className="h-12 items-center justify-center rounded-xl"
            >
              <Text style={{ color: fg, fontFamily: "DMSans_700Bold" }}>Save draft</Text>
            </Pressable>
            <Pressable
              onPress={() => save(true)}
              disabled={saving}
              style={{ opacity: saving ? 0.6 : 1 }}
              className="h-12 items-center justify-center rounded-xl bg-primary"
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-primary-foreground">Publish</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // ── List ───────────────────────────────────────────────────────────────────
  return (
    <Screen edges={["top"]}>
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
          <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 15, textAlign: "center" }}>
            No readings yet. Tap “New” to write the first one.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="mx-auto w-full max-w-lg px-6 py-4"
          showsVerticalScrollIndicator={false}
        >
          {(list.data ?? []).map((d) => (
            <View
              key={d.id}
              style={{ borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card, padding: 14, marginBottom: 10 }}
            >
              <View className="flex-row items-center justify-between">
                <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12 }}>
                  {d.publishDate} · {d.passageReference}
                </Text>
                <View
                  style={{
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    backgroundColor: (d.status === "published" ? primary : muted) + "22",
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
