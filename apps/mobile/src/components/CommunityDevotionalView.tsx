import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
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
  { type: "hit_me", label: "💥 Hit me" },
  { type: "fire", label: "🔥 Fire" },
];

function Label({ children }: { children: string }) {
  return (
    <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{children}</Text>
  );
}

function PrivacyToggle({
  value,
  onChange,
  accent,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  accent: string;
}) {
  const muted = useThemeColor("muted-foreground");
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      className="mt-1 flex-row items-center gap-2 self-start py-1"
    >
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: value ? accent : muted,
          backgroundColor: value ? accent : "transparent",
        }}
      />
      <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 12 }}>
        Keep this private
      </Text>
    </Pressable>
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
  const card = useThemeColor("card");

  const devotional = data.devotional!;
  const mine = data.myResponse;

  const [response1, setResponse1] = useState(mine?.response1 ?? "");
  const [response2, setResponse2] = useState(mine?.response2 ?? "");
  const [prayer, setPrayer] = useState(mine?.prayer ?? "");
  const [q1Private, setQ1Private] = useState(mine?.q1Private ?? false);
  const [q2Private, setQ2Private] = useState(mine?.q2Private ?? false);
  const [prayerPrivate, setPrayerPrivate] = useState(mine?.prayerPrivate ?? true);
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
    minHeight: 72,
    textAlignVertical: "top" as const,
  };

  const save = async () => {
    setSaving(true);
    try {
      await ApiClient.saveCommunityResponse({
        communityDevotionalId: devotional.id,
        response1: response1.trim() || null,
        response2: response2.trim() || null,
        prayer: prayer.trim() || null,
        q1Private,
        q2Private,
        prayerPrivate,
      });
      onRefetch();
      Alert.alert("Shared", "Your response has been saved.");
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
            fontSize: 15,
            lineHeight: 23,
            marginTop: 16,
          }}
        >
          {devotional.passageContext}
        </Text>
      ) : null}

      {devotional.studyNotes.length > 0 ? (
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
      <Text className="mb-4 font-serif text-lg font-bold text-foreground">Your Response</Text>

      <Label>{devotional.reflectionQ1}</Label>
      <TextInput
        value={response1}
        onChangeText={setResponse1}
        multiline
        placeholder="Write your reflection…"
        placeholderTextColor={muted}
        style={inputStyle}
      />
      <PrivacyToggle value={q1Private} onChange={setQ1Private} accent={primary} />

      <View style={{ height: 14 }} />
      <Label>{devotional.reflectionQ2}</Label>
      <TextInput
        value={response2}
        onChangeText={setResponse2}
        multiline
        placeholder="Write your reflection…"
        placeholderTextColor={muted}
        style={inputStyle}
      />
      <PrivacyToggle value={q2Private} onChange={setQ2Private} accent={primary} />

      <View style={{ height: 14 }} />
      <Label>Prayer (optional)</Label>
      <TextInput
        value={prayer}
        onChangeText={setPrayer}
        multiline
        placeholder="Write a prayer…"
        placeholderTextColor={muted}
        style={inputStyle}
      />
      <PrivacyToggle value={prayerPrivate} onChange={setPrayerPrivate} accent={primary} />

      <Pressable
        onPress={save}
        disabled={saving}
        style={{ opacity: saving ? 0.6 : 1, marginTop: 18 }}
        className="h-12 items-center justify-center rounded-xl bg-primary"
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-semibold text-primary-foreground">
            {mine ? "Update Response" : "Share Response"}
          </Text>
        )}
      </Pressable>

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
