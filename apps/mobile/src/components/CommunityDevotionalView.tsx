import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { ChevronRight, Flag, Users, X } from "lucide-react-native";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { useToast } from "@/components/Toast";
import { useThemeColor } from "@/components/useThemeColor";
import { withAlpha } from "@/theme/themes";
import {
  ApiClient,
  ApiError,
  type CommunityDevotional,
  type CommunityToday,
  type CommunityFeedItem,
  type CommunityReactionType,
  type CommunityReportReason,
} from "@/lib/api";

const REACTIONS: { type: CommunityReactionType; label: string }[] = [
  { type: "amen", label: "Amen" },
  { type: "hit_me", label: "Convicted" },
  { type: "fire", label: "Inspired" },
];

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// The reading currently carries exactly two questions; render them (and each
// response's answers) as index-aligned lists so this whole surface is already
// shaped for the variable-length questions coming in the next pass.
function questionsOf(d: CommunityDevotional): string[] {
  return [d.reflectionQ1, d.reflectionQ2].filter((q): q is string => !!q && q.trim().length > 0);
}
function answerAt(item: CommunityFeedItem, i: number): string | null {
  return [item.response1, item.response2][i] ?? null;
}
function hasAnyAnswer(item: CommunityFeedItem): boolean {
  return !!(item.response1 || item.response2 || item.prayer);
}
function initial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const primary = useThemeColor("primary");
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: withAlpha(primary, 0.13),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: "DMSans_700Bold", fontSize: size * 0.42, color: primary }}>{initial(name)}</Text>
    </View>
  );
}

/** A small serif eyebrow used above the reading + section groupings. */
function Eyebrow({ children }: { children: string }) {
  return <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{children}</Text>;
}

function ReadingHero({ devotional }: { devotional: CommunityDevotional }) {
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const primary = useThemeColor("primary");
  const [expanded, setExpanded] = useState(false);

  const hasMore =
    !!devotional.passageContext || (devotional.studyNotes?.length ?? 0) > 0 || !!devotional.prayerPrompt;

  return (
    <View style={{ borderWidth: 1, borderColor: border, borderRadius: 14, backgroundColor: card, padding: 16 }}>
      <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12 }}>
        {devotional.passageReference}
      </Text>
      <Text className="mt-1 font-serif text-2xl font-bold text-foreground">{devotional.title}</Text>
      {devotional.subtitle ? (
        <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 14, marginTop: 3 }}>
          {devotional.subtitle}
        </Text>
      ) : null}

      {devotional.passageContext ? (
        <Text
          numberOfLines={expanded ? undefined : 3}
          style={{ color: fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 23, marginTop: 12 }}
        >
          {devotional.passageContext}
        </Text>
      ) : null}

      {expanded && (devotional.studyNotes?.length ?? 0) > 0 ? (
        <View className="mt-5">
          <Eyebrow>Study Notes</Eyebrow>
          {devotional.studyNotes.map((n, i) => (
            <View key={i} style={{ borderLeftWidth: 2, borderLeftColor: primary, paddingLeft: 12, marginBottom: 12 }}>
              <Text style={{ color: primary, fontFamily: "DMSans_700Bold", fontSize: 12, marginBottom: 2 }}>
                {n.verse_ref}
              </Text>
              <Text style={{ color: fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 21 }}>{n.note}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {expanded && devotional.prayerPrompt ? (
        <View className="mt-5">
          <Eyebrow>Prayer</Eyebrow>
          <Text style={{ color: fg, fontFamily: "DMSans_400Regular", fontSize: 15, lineHeight: 23, fontStyle: "italic" }}>
            {devotional.prayerPrompt}
          </Text>
        </View>
      ) : null}

      {hasMore ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          className="mt-3 flex-row items-center gap-1"
          hitSlop={6}
        >
          <Text style={{ color: primary, fontFamily: "DMSans_700Bold", fontSize: 13 }}>
            {expanded ? "Show less" : "Read the full passage"}
          </Text>
          {!expanded ? <ChevronRight size={15} color={primary} /> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

function Pulse({ feed }: { feed: CommunityFeedItem[] }) {
  const muted = useThemeColor("muted-foreground");
  const shared = feed.filter(hasAnyAnswer);
  if (shared.length === 0) return null;
  const faces = shared.slice(0, 4);
  return (
    <View className="mt-4 flex-row items-center gap-3">
      <View className="flex-row">
        {faces.map((f, i) => (
          <View key={f.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
            <Avatar name={f.displayName} size={24} />
          </View>
        ))}
      </View>
      <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 13 }}>
        {shared.length} {shared.length === 1 ? "reflection" : "reflections"} shared
      </Text>
    </View>
  );
}

function FeedCard({
  item,
  questions,
  onReact,
  onReport,
}: {
  item: CommunityFeedItem;
  questions: string[];
  onReact: (item: CommunityFeedItem, type: CommunityReactionType) => void;
  onReport: (item: CommunityFeedItem) => void;
}) {
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const primary = useThemeColor("primary");
  const card = useThemeColor("card");

  if (!hasAnyAnswer(item)) return null;

  return (
    <View style={{ borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card, padding: 14, marginBottom: 10 }}>
      <View className="mb-2 flex-row items-center gap-2">
        <Avatar name={item.displayName} size={26} />
        <Text style={{ flex: 1, fontFamily: "DMSans_700Bold", fontSize: 14, color: fg }}>
          {item.displayName}
          {item.isOwn ? " (you)" : ""}
        </Text>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: muted }}>{timeAgo(item.updatedAt)}</Text>
        {!item.isOwn ? (
          <Pressable
            onPress={() => onReport(item)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Report ${item.displayName}'s response`}
            style={{ padding: 2 }}
          >
            <Flag size={13} color={muted} />
          </Pressable>
        ) : null}
      </View>

      {questions.map((q, i) => {
        const a = answerAt(item, i);
        if (!a) return null;
        return (
          <View key={i} className="mb-2">
            <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12, marginBottom: 2 }}>{q}</Text>
            <Text style={{ color: fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 }}>{a}</Text>
          </View>
        );
      })}
      {item.prayer ? (
        <View className="mb-2">
          <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12, marginBottom: 2 }}>Prayer</Text>
          <Text style={{ color: fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 }}>{item.prayer}</Text>
        </View>
      ) : null}

      <View className="mt-1 flex-row flex-wrap gap-2">
        {REACTIONS.map(({ type, label }) => {
          const count = item.reactions[type] ?? 0;
          const mine = item.myReactions.includes(type);
          return (
            <Pressable
              key={type}
              onPress={() => onReact(item, type)}
              accessibilityRole="button"
              accessibilityLabel={`${label}${mine ? ", reacted" : ""}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: mine ? primary : border,
                backgroundColor: mine ? withAlpha(primary, 0.1) : "transparent",
                borderRadius: 16,
                paddingHorizontal: 11,
                paddingVertical: 5,
              }}
            >
              <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 12, color: mine ? primary : muted }}>
                {label}
                {count > 0 ? ` · ${count}` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ComposerModal({
  visible,
  devotional,
  mine,
  onClose,
  onSaved,
}: {
  visible: boolean;
  devotional: CommunityDevotional;
  mine: CommunityFeedItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const primary = useThemeColor("primary");
  const questions = useMemo(() => questionsOf(devotional), [devotional]);

  const [answers, setAnswers] = useState<string[]>(questions.map((_, i) => answerAt(mine ?? ({} as CommunityFeedItem), i) ?? ""));
  const [prayer, setPrayer] = useState(mine?.prayer ?? "");
  const [saving, setSaving] = useState(false);

  // Re-seed from the latest saved response each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setAnswers(questions.map((_, i) => answerAt(mine ?? ({} as CommunityFeedItem), i) ?? ""));
    setPrayer(mine?.prayer ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const setAnswer = (i: number, v: string) => setAnswers((prev) => prev.map((a, idx) => (idx === i ? v : a)));

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
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <Screen edges={["top", "bottom"]}>
        <View className="flex-row items-center justify-between px-6 pb-2 pt-2">
          <Text className="font-serif text-xl font-bold text-foreground">{mine ? "Edit your reflection" : "Your reflection"}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <X size={22} color={muted} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerClassName="mx-auto w-full max-w-lg px-6 pb-16 pt-2"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
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
              <Text style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 8 }}>{q}</Text>
              <Input value={answers[i] ?? ""} onChangeText={(t) => setAnswer(i, t)} multiline placeholder="Write your reflection…" />
            </View>
          ))}

          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 8 }}>
              Prayer <Text style={{ color: muted, fontFamily: "DMSans_400Regular" }}>· optional</Text>
            </Text>
            <Input value={prayer} onChangeText={setPrayer} multiline placeholder="Write a prayer…" />
          </View>

          <Button title={mine ? "Update reflection" : "Share with the community"} onPress={save} loading={saving} />
        </ScrollView>
      </Screen>
    </Modal>
  );
}

/**
 * The feed-first Community experience: today's reading as a compact hero, a live
 * participation pulse, your reflection (or a prompt to add one), then the room of
 * everyone else's reflections. Used by both today's tab and the archive detail.
 */
export function CommunityDevotionalView({
  data,
  onRefetch,
}: {
  data: CommunityToday;
  onRefetch: () => void;
}) {
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const primary = useThemeColor("primary");
  const card = useThemeColor("card");
  const toast = useToast();

  const devotional = data.devotional!;
  const mine = data.myResponse;
  const questions = useMemo(() => questionsOf(devotional), [devotional]);
  const [composing, setComposing] = useState(false);

  const react = async (item: CommunityFeedItem, type: CommunityReactionType) => {
    try {
      await ApiClient.toggleCommunityReaction(item.id, type);
      onRefetch();
    } catch (err) {
      Alert.alert("Couldn't react", err instanceof ApiError ? err.message : "Please try again.");
    }
  };

  const sendReport = async (item: CommunityFeedItem, reason: CommunityReportReason) => {
    try {
      await ApiClient.reportCommunityResponse(item.id, reason);
      toast.show("Reported — thank you");
    } catch (err) {
      Alert.alert("Couldn't report", err instanceof ApiError ? err.message : "Please try again.");
    }
  };

  const report = (item: CommunityFeedItem) => {
    Alert.alert("Report this response?", `Flag ${item.displayName}'s response for review. It stays visible until it's been looked at.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Spam", onPress: () => sendReport(item, "spam") },
      { text: "Inappropriate", style: "destructive", onPress: () => sendReport(item, "inappropriate") },
    ]);
  };

  const deleteMine = async () => {
    try {
      await ApiClient.deleteCommunityResponse(devotional.id);
      onRefetch();
      toast.show("Reflection deleted");
    } catch (err) {
      Alert.alert("Couldn't delete", err instanceof ApiError ? err.message : "Please try again.");
    }
  };
  const confirmDeleteMine = () => {
    Alert.alert("Delete your reflection?", "This removes it from the community feed.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: deleteMine },
    ]);
  };

  const others = data.feed.filter((f) => !f.isOwn && hasAnyAnswer(f));

  return (
    <View>
      <ReadingHero devotional={devotional} />
      <Pulse feed={data.feed} />

      {/* Your reflection — a prompt if you haven't shared, your card if you have. */}
      {mine && hasAnyAnswer(mine) ? (
        <View style={{ marginTop: 16, borderWidth: 1, borderColor: withAlpha(primary, 0.4), borderRadius: 12, backgroundColor: card, padding: 14 }}>
          <View className="mb-2 flex-row items-center">
            <Text style={{ flex: 1, fontFamily: "DMSans_700Bold", fontSize: 13, color: primary }}>Your reflection</Text>
            <Pressable onPress={() => setComposing(true)} hitSlop={8} accessibilityLabel="Edit your reflection">
              <Text style={{ color: primary, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Edit</Text>
            </Pressable>
          </View>
          {questions.map((q, i) => {
            const a = answerAt(mine, i);
            if (!a) return null;
            return (
              <View key={i} className="mb-2">
                <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12, marginBottom: 2 }}>{q}</Text>
                <Text style={{ color: fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 }}>{a}</Text>
              </View>
            );
          })}
          {mine.prayer ? (
            <View className="mb-1">
              <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12, marginBottom: 2 }}>Prayer</Text>
              <Text style={{ color: fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 }}>{mine.prayer}</Text>
            </View>
          ) : null}
          <Pressable onPress={confirmDeleteMine} accessibilityRole="button" className="mt-1 self-start" hitSlop={6}>
            <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12 }}>Delete</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setComposing(true)}
          accessibilityRole="button"
          style={{
            marginTop: 16,
            borderWidth: 1,
            borderColor: withAlpha(primary, 0.5),
            borderStyle: "dashed",
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: primary, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Share your reflection</Text>
          <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>
            See how the community answered
          </Text>
        </Pressable>
      )}

      <View style={{ height: 1, backgroundColor: border, marginVertical: 24 }} />

      {/* The room */}
      <Text className="mb-4 font-serif text-lg font-bold text-foreground">The room</Text>
      {others.length === 0 ? (
        <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 14, fontStyle: "italic" }}>
          No one else has shared yet. Be the first.
        </Text>
      ) : (
        others.map((item) => (
          <FeedCard key={item.id} item={item} questions={questions} onReact={react} onReport={report} />
        ))
      )}

      <ComposerModal
        visible={composing}
        devotional={devotional}
        mine={mine}
        onClose={() => setComposing(false)}
        onSaved={() => {
          onRefetch();
          toast.show("Shared with the community");
        }}
      />
    </View>
  );
}
