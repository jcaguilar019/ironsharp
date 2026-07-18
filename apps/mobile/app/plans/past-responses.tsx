import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Lock } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { useThemeColor } from "@/components/useThemeColor";
import { withAlpha } from "@/theme/themes";
import { useDays, useGroupPlanResponses } from "@/lib/queries";
import type { DevotionalDay, PastResponse } from "@/lib/api";

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ResponseBlock({
  label,
  question,
  answer,
  isPrivate,
  isOwn,
}: {
  label: string;
  question?: string;
  answer: string | null;
  isPrivate: boolean;
  isOwn: boolean;
}) {
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: border, paddingTop: 12, marginTop: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 12, color: fg }}>{label}</Text>
        {isPrivate ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Lock size={10} color={muted} />
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: muted, fontStyle: "italic" }}>
              Private
            </Text>
          </View>
        ) : null}
      </View>
      {question ? (
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted, lineHeight: 18, marginBottom: 6 }}>
          {question}
        </Text>
      ) : null}
      {answer ? (
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: fg, lineHeight: 22 }}>{answer}</Text>
      ) : isPrivate && !isOwn ? (
        <Text style={{ fontFamily: "PlayfairDisplay_400Regular_Italic", fontSize: 13, color: muted }}>
          Kept private.
        </Text>
      ) : (
        <Text style={{ fontFamily: "PlayfairDisplay_400Regular_Italic", fontSize: 13, color: muted }}>
          No response recorded.
        </Text>
      )}
    </View>
  );
}

function DayCard({ day, response }: { day: DevotionalDay | undefined; response: PastResponse }) {
  const cardBg = useThemeColor("card");
  const border = useThemeColor("border");
  const muted = useThemeColor("muted-foreground");
  const fg = useThemeColor("foreground");
  const accent = useThemeColor("primary");

  return (
    <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: withAlpha(accent, 0.13), alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 10, color: accent }}>{response.dayNumber}</Text>
          </View>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, color: fg, flex: 1 }}>
            {day?.chapter ?? `Day ${response.dayNumber}`}
          </Text>
        </View>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: muted, flexShrink: 0 }}>
          {formatDate(response.submittedAt)}
        </Text>
      </View>

      {day?.theme ? (
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: muted, fontStyle: "italic", marginBottom: 2, marginLeft: 32 }}>
          {day.theme}
        </Text>
      ) : null}

      <ResponseBlock label="Reflect" question={day?.reflectionQ1 ?? ""} answer={response.response1} isPrivate={response.q1Private} isOwn={response.isOwn} />
      <ResponseBlock label="Act" question={day?.reflectionQ2 ?? ""} answer={response.response2} isPrivate={response.q2Private} isOwn={response.isOwn} />
      {response.prayer || response.prayerPrivate ? (
        <ResponseBlock label="Prayer / Praise" answer={response.prayer} isPrivate={response.prayerPrivate} isOwn={response.isOwn} />
      ) : null}
    </View>
  );
}

export default function PastResponses() {
  const { groupId, planId, title } = useLocalSearchParams<{ groupId: string; planId: string; title: string }>();
  const gid = String(groupId ?? "");
  const pid = String(planId ?? "");

  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const fg = useThemeColor("foreground");

  const q = useGroupPlanResponses(gid, pid);
  const days = useDays(pid);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const responses = q.data?.responses ?? [];
  const members = q.data?.members ?? [];

  // Only members who actually have entries for this plan appear in the filter.
  const participantIds = new Set(responses.map((r) => r.userId));
  const participants = members.filter((m) => participantIds.has(m.userId));

  const ownId = responses.find((r) => r.isOwn)?.userId ?? null;
  // Land on someone else's answers: arriving from "Group responses" you just
  // wrote your own, and your chip is right there when you want them.
  const firstOther = participants.find((m) => m.userId !== ownId)?.userId ?? null;
  const activeUser = selectedUser ?? firstOther ?? ownId ?? participants[0]?.userId ?? null;

  const daysByNumber = new Map((days.data ?? []).map((d) => [d.dayNumber, d]));
  const userResponses = responses
    .filter((r) => r.userId === activeUser)
    .sort((a, b) => a.dayNumber - b.dayNumber);

  const loading = q.isLoading || days.isLoading;

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title="Group Responses" subtitle={String(title ?? "Devotional")} />
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={primary} />
        </View>
      ) : participants.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontFamily: "PlayfairDisplay_400Regular_Italic", fontSize: 16, color: muted, textAlign: "center", lineHeight: 26 }}>
            No responses were recorded for this plan.
          </Text>
        </View>
      ) : (
        <>
          {/* Filter by person */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: border }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
            >
              {participants.map((m) => {
                const selected = m.userId === activeUser;
                return (
                  <Pressable
                    key={m.userId}
                    onPress={() => setSelectedUser(m.userId)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: selected ? primary : border,
                      backgroundColor: selected ? withAlpha(primary, 0.1) : "transparent",
                    }}
                  >
                    <Avatar name={m.displayName} url={m.avatarUrl} accent={primary} size={24} />
                    <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 13, color: selected ? primary : fg }}>
                      {m.displayName}
                      {m.userId === ownId ? " (you)" : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12, maxWidth: 512, width: "100%", alignSelf: "center" }}
            showsVerticalScrollIndicator={false}
          >
            {userResponses.length === 0 ? (
              <Text style={{ fontFamily: "PlayfairDisplay_400Regular_Italic", fontSize: 15, color: muted, textAlign: "center", marginTop: 40 }}>
                No entries from this person.
              </Text>
            ) : (
              userResponses.map((r) => (
                <DayCard key={`${r.userId}-${r.dayNumber}`} day={daysByNumber.get(r.dayNumber)} response={r} />
              ))
            )}
          </ScrollView>
        </>
      )}
    </Screen>
  );
}
