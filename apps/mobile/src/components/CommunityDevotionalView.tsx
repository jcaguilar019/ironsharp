import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Check, Globe } from "lucide-react-native";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useThemeColor } from "@/components/useThemeColor";
import {
  ApiClient,
  ApiError,
  type CommunityToday,
  type CommunityFeedItem,
  type CommunityReactionType,
} from "@/lib/api";

const REACTIONS: { type: CommunityReactionType; label: string }[] = [
  { type: "amen", label: "🙏 Amen" },
  { type: "hit_me", label: "💥 Convicted" },
  { type: "fire", label: "🔥 Inspired" },
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

function Label({ children }: { children: string }) {
  return (
    <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{children}</Text>
  );
}

function FeedCard({
  item,
  q1: q1Label,
  q2: q2Label,
  onReact,
}: {
  item: CommunityFeedItem;
  q1: string;
  q2: string;
  onReact: (item: CommunityFeedItem, type: CommunityReactionType) => void;
}) {
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const primary = useThemeColor("primary");
  const card = useThemeColor("card");

  const hasAnswers = item.response1 || item.response2 || item.prayer;
  if (!hasAnswers) return null;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: border,
        borderRadius: 12,
        backgroundColor: card,
        padding: 14,
        marginBottom: 8,
      }}
    >
      <View className="mb-2 flex-row items-center gap-2">
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: primary + "22",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 11, color: primary }}>
            {item.displayName[0]?.toUpperCase()}
          </Text>
        </View>
        <Text style={{ flex: 1, fontFamily: "DMSans_700Bold", fontSize: 14, color: fg }}>
          {item.displayName}
          {item.isOwn ? " (you)" : ""}
        </Text>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: muted }}>
          {timeAgo(item.updatedAt)}
        </Text>
      </View>

      {item.response1 ? (
        <View className="mb-2">
          <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12, marginBottom: 2 }}>
            {q1Label}
          </Text>
          <Text style={{ color: fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 }}>
            {item.response1}
          </Text>
        </View>
      ) : null}
      {item.response2 ? (
        <View className="mb-2">
          <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12, marginBottom: 2 }}>
            {q2Label}
          </Text>
          <Text style={{ color: fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 }}>
            {item.response2}
          </Text>
        </View>
      ) : null}
      {item.prayer ? (
        <View className="mb-2">
          <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 12, marginBottom: 2 }}>
            Prayer
          </Text>
          <Text style={{ color: fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 }}>
            {item.prayer}
          </Text>
        </View>
      ) : null}

      {/* Reactions */}
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
                gap: 4,
                borderWidth: 1,
                borderColor: mine ? primary : border,
                backgroundColor: mine ? primary + "18" : "transparent",
                borderRadius: 16,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 12, color: mine ? primary : muted }}>
                {label}
                {count > 0 ? ` ${count}` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Renders one Community Devotional — the reading itself, the user's own response
 * form, and the community feed of other members' responses with reactions.
 * Used by both today's tab and the archive detail screen.
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

  const devotional = data.devotional!;
  const mine = data.myResponse;

  const [response1, setResponse1] = useState(mine?.response1 ?? "");
  const [response2, setResponse2] = useState(mine?.response2 ?? "");
  const [prayer, setPrayer] = useState(mine?.prayer ?? "");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2800);
    return () => clearTimeout(t);
  }, [justSaved]);

  const save = async () => {
    setSaving(true);
    try {
      await ApiClient.saveCommunityResponse({
        communityDevotionalId: devotional.id,
        response1: response1.trim() || null,
        response2: response2.trim() || null,
        prayer: prayer.trim() || null,
        // Community is a public forum — every post is visible to everyone.
        q1Private: false,
        q2Private: false,
        prayerPrivate: false,
      });
      onRefetch();
      setJustSaved(true);
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const react = async (item: CommunityFeedItem, type: CommunityReactionType) => {
    try {
      await ApiClient.toggleCommunityReaction(item.id, type);
      onRefetch();
    } catch (err) {
      Alert.alert("Couldn't react", err instanceof ApiError ? err.message : "Please try again.");
    }
  };

  const others = data.feed.filter((f) => !f.isOwn);

  return (
    <View>
      {/* ── The reading ─────────────────────────────────────────────────── */}
      <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 13 }}>
        {devotional.passageReference}
      </Text>
      <Text className="mt-1 font-serif text-2xl font-bold text-foreground">{devotional.title}</Text>
      {devotional.subtitle ? (
        <Text className="mt-1 text-base text-muted-foreground">{devotional.subtitle}</Text>
      ) : null}

      {devotional.passageContext ? (
        <Text
          style={{
            color: fg,
            fontFamily: "DMSans_400Regular",
            fontSize: 14,
            lineHeight: 23,
            marginTop: 16,
          }}
        >
          {devotional.passageContext}
        </Text>
      ) : null}

      {(devotional.studyNotes?.length ?? 0) > 0 ? (
        <View className="mt-5">
          <Label>Study Notes</Label>
          {devotional.studyNotes.map((n, i) => (
            <View
              key={i}
              style={{ borderLeftWidth: 2, borderLeftColor: primary, paddingLeft: 12, marginBottom: 12 }}
            >
              <Text style={{ color: primary, fontFamily: "DMSans_700Bold", fontSize: 12, marginBottom: 2 }}>
                {n.verse_ref}
              </Text>
              <Text style={{ color: fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 21 }}>
                {n.note}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {devotional.prayerPrompt ? (
        <View className="mt-5">
          <Label>Prayer</Label>
          <Text style={{ color: fg, fontFamily: "DMSans_400Regular", fontSize: 15, lineHeight: 23, fontStyle: "italic" }}>
            {devotional.prayerPrompt}
          </Text>
        </View>
      ) : null}

      <View style={{ height: 1, backgroundColor: border, marginVertical: 24 }} />

      {/* ── Your response ───────────────────────────────────────────────── */}
      <Text className="mb-2 font-serif text-lg font-bold text-foreground">Your Response</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          marginBottom: 16,
          backgroundColor: primary + "12",
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 9,
        }}
      >
        <Globe size={14} color={primary} />
        <Text style={{ flex: 1, color: muted, fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 17 }}>
          This is a public forum — anything you post is visible to everyone in IronSharp.
        </Text>
      </View>

      <Label>{devotional.reflectionQ1}</Label>
      <Input value={response1} onChangeText={setResponse1} multiline placeholder="Write your reflection…" />

      <View style={{ height: 14 }} />
      <Label>{devotional.reflectionQ2}</Label>
      <Input value={response2} onChangeText={setResponse2} multiline placeholder="Write your reflection…" />

      <View style={{ height: 14 }} />
      <Label>Prayer (optional)</Label>
      <Input value={prayer} onChangeText={setPrayer} multiline placeholder="Write a prayer…" />

      <Button
        title={mine ? "Update Response" : "Share Response"}
        onPress={save}
        loading={saving}
        style={{ marginTop: 18 }}
      />

      {justSaved ? (
        <View className="mt-3 flex-row items-center justify-center gap-2">
          <Check size={15} color={primary} />
          <Text style={{ color: primary, fontFamily: "DMSans_500Medium", fontSize: 13 }}>
            Shared with the community
          </Text>
        </View>
      ) : null}

      <View style={{ height: 1, backgroundColor: border, marginVertical: 24 }} />

      {/* ── Community feed ──────────────────────────────────────────────── */}
      <Text className="mb-4 font-serif text-lg font-bold text-foreground">From the Community</Text>
      {others.length === 0 ? (
        <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 14, fontStyle: "italic" }}>
          No one else has shared yet. Be the first voice today.
        </Text>
      ) : (
        others.map((item) => (
          <FeedCard
            key={item.id}
            item={item}
            q1={devotional.reflectionQ1}
            q2={devotional.reflectionQ2}
            onReact={react}
          />
        ))
      )}
    </View>
  );
}
