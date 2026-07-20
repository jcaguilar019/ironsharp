import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Lock } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { useThemeColor } from "@/components/useThemeColor";
import { withAlpha } from "@/theme/themes";
import { ApiClient, type Submission, type DevotionalDay, type ArchivedGroupMember, type PastResponse } from "@/lib/api";
import { useAuthed, usePlan, useDays, useGroupPlanResponses } from "@/lib/queries";

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── "Mine" tab — this reader's own day-by-day answers ───────────────────────

function ResponseBlock({
  label,
  question,
  answer,
  isPrivate,
}: {
  label: string;
  question?: string;
  answer: string | null;
  isPrivate: boolean;
}) {
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: border, paddingTop: 12, marginTop: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 12, color: fg }}>
          {label}
        </Text>
        {isPrivate && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Lock size={10} color={muted} />
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: muted, fontStyle: "italic" }}>
              Private
            </Text>
          </View>
        )}
      </View>
      {question ? (
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted, lineHeight: 18, marginBottom: 6 }}>
          {question}
        </Text>
      ) : null}
      {answer ? (
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: fg, lineHeight: 22 }}>
          {answer}
        </Text>
      ) : (
        <Text style={{ fontFamily: "PlayfairDisplay_400Regular_Italic", fontSize: 13, color: muted }}>
          No response recorded.
        </Text>
      )}
    </View>
  );
}

function DayCard({
  day,
  submission,
}: {
  day: DevotionalDay;
  submission: Submission;
}) {
  const cardBg = useThemeColor("card");
  const border = useThemeColor("border");
  const muted = useThemeColor("muted-foreground");
  const fg = useThemeColor("foreground");
  const accent = useThemeColor("primary");

  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* Day header */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: withAlpha(accent, 0.13),
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 10, color: accent }}>
              {day.dayNumber}
            </Text>
          </View>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, color: fg, flex: 1 }}>
            {day.chapter}
          </Text>
        </View>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: muted, flexShrink: 0 }}>
          {formatDate(submission.submittedAt)}
        </Text>
      </View>

      {day.theme ? (
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: muted, fontStyle: "italic", marginBottom: 2, marginLeft: 32 }}>
          {day.theme}
        </Text>
      ) : null}

      <ResponseBlock
        label="Reflect"
        question={day.reflectionQ1}
        answer={submission.response1}
        isPrivate={submission.q1Private}
      />

      <ResponseBlock
        label="Act"
        question={day.reflectionQ2}
        answer={submission.response2}
        isPrivate={submission.q2Private}
      />

      {submission.prayer ? (
        <ResponseBlock
          label="Prayer / Praise"
          answer={submission.prayer}
          isPrivate={submission.prayerPrivate}
        />
      ) : null}
    </View>
  );
}

// ─── "Group" tab — every member's answers, grouped by day, with an optional
//      person filter. (Formerly the standalone /plans/past-responses screen.) ─

const ALL = "__all__";

function GrpResponseBlock({
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

// One person's answers for a single day — used standalone (single-person mode)
// and nested inside a GrpDayGroupCard (everyone mode), so it takes its own
// optional member header instead of assuming one.
function GrpPersonAnswers({ day, response }: { day: DevotionalDay | undefined; response: PastResponse }) {
  return (
    <>
      <GrpResponseBlock label="Reflect" question={day?.reflectionQ1 ?? ""} answer={response.response1} isPrivate={response.q1Private} isOwn={response.isOwn} />
      <GrpResponseBlock label="Act" question={day?.reflectionQ2 ?? ""} answer={response.response2} isPrivate={response.q2Private} isOwn={response.isOwn} />
      {response.prayer || response.prayerPrivate ? (
        <GrpResponseBlock label="Prayer / Praise" answer={response.prayer} isPrivate={response.prayerPrivate} isOwn={response.isOwn} />
      ) : null}
    </>
  );
}

function GrpDayHeader({ dayNumber, day }: { dayNumber: number; day: DevotionalDay | undefined }) {
  const fg = useThemeColor("foreground");
  const accent = useThemeColor("primary");

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: withAlpha(accent, 0.13), alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 10, color: accent }}>{dayNumber}</Text>
      </View>
      <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, color: fg, flex: 1 }}>
        {day?.chapter ?? `Day ${dayNumber}`}
      </Text>
    </View>
  );
}

// Single-person mode: one card per day, this person's answers plus the
// submission date (unambiguous — there's only one person on screen).
function GrpDayCard({ dayNumber, day, response }: { dayNumber: number; day: DevotionalDay | undefined; response: PastResponse }) {
  const cardBg = useThemeColor("card");
  const border = useThemeColor("border");
  const muted = useThemeColor("muted-foreground");

  return (
    <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <GrpDayHeader dayNumber={dayNumber} day={day} />
        </View>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: muted, flexShrink: 0, marginTop: 2 }}>
          {formatDate(response.submittedAt)}
        </Text>
      </View>
      {day?.theme ? (
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: muted, fontStyle: "italic", marginBottom: 2, marginLeft: 32 }}>
          {day.theme}
        </Text>
      ) : null}
      <GrpPersonAnswers day={day} response={response} />
    </View>
  );
}

// Everyone mode: one card per day, every member who answered that day
// stacked inside it — the day header shows once, each person gets a small
// avatar row and a divider instead of their own boxed card.
function GrpDayGroupCard({
  dayNumber,
  day,
  dayResponses,
  membersById,
}: {
  dayNumber: number;
  day: DevotionalDay | undefined;
  dayResponses: PastResponse[];
  membersById: Map<string, ArchivedGroupMember>;
}) {
  const cardBg = useThemeColor("card");
  const border = useThemeColor("border");
  const muted = useThemeColor("muted-foreground");
  const fg = useThemeColor("foreground");
  const primary = useThemeColor("primary");

  return (
    <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, marginBottom: 12 }}>
      <GrpDayHeader dayNumber={dayNumber} day={day} />
      {day?.theme ? (
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: muted, fontStyle: "italic", marginLeft: 32 }}>
          {day.theme}
        </Text>
      ) : null}
      {dayResponses.map((response) => {
        const member = membersById.get(response.userId);
        return (
          <View key={response.userId} style={{ borderTopWidth: 1, borderTopColor: border, paddingTop: 14, marginTop: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <Avatar name={member?.displayName ?? "?"} url={member?.avatarUrl} accent={primary} size={22} />
              <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 13, color: fg }}>
                {response.isOwn ? "You" : (member?.displayName ?? "Someone")}
              </Text>
            </View>
            <GrpPersonAnswers day={day} response={response} />
          </View>
        );
      })}
    </View>
  );
}

function GrpPersonPicker({
  label,
  participants,
  ownId,
  selected,
  onSelect,
}: {
  label: string;
  participants: ArchivedGroupMember[];
  ownId: string | null;
  selected: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const primary = useThemeColor("primary");
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const bg = useThemeColor("background");

  const choose = (value: string) => {
    onSelect(value);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Filter by person"
        style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderWidth: 1, borderColor: border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}
      >
        <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 13, color: fg }}>{label}</Text>
        <ChevronDown size={14} color={muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", paddingHorizontal: 32 }} onPress={() => setOpen(false)}>
          <View style={{ backgroundColor: bg, borderRadius: 16, overflow: "hidden" }}>
            <Text style={{ color: muted, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", fontFamily: "DMSans_400Regular", padding: 16, paddingBottom: 8 }}>
              Show
            </Text>
            <Pressable
              onPress={() => choose(ALL)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 }}
            >
              <Text style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Everyone</Text>
              {selected === ALL && <Text style={{ color: primary, fontSize: 16 }}>✓</Text>}
            </Pressable>
            {participants.map((m) => (
              <Pressable
                key={m.userId}
                onPress={() => choose(m.userId)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: border }}
              >
                <Text style={{ color: fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>
                  {m.displayName}{m.userId === ownId ? " (you)" : ""}
                </Text>
                {selected === m.userId && <Text style={{ color: primary, fontSize: 16 }}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function GroupResponsesTab({
  groupId,
  planId,
  days,
  daysLoading,
}: {
  groupId: string;
  planId: string;
  days: DevotionalDay[];
  daysLoading: boolean;
}) {
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  const q = useGroupPlanResponses(groupId, planId);
  const [selected, setSelected] = useState<string>(ALL);

  const responses = q.data?.responses ?? [];
  const members = q.data?.members ?? [];
  const membersById = new Map(members.map((m) => [m.userId, m]));

  // Only members who actually have entries for this plan appear in the picker.
  const participantIds = new Set(responses.map((r) => r.userId));
  const participants = members.filter((m) => participantIds.has(m.userId));
  const ownId = responses.find((r) => r.isOwn)?.userId ?? null;

  const daysByNumber = new Map(days.map((d) => [d.dayNumber, d]));

  // Everyone mode: group by day, members ordered consistently (participants
  // order) so the same person lands in the same spot on every day.
  const responsesByDayAndUser = new Map<number, Map<string, PastResponse>>();
  for (const r of responses) {
    if (!responsesByDayAndUser.has(r.dayNumber)) responsesByDayAndUser.set(r.dayNumber, new Map());
    responsesByDayAndUser.get(r.dayNumber)!.set(r.userId, r);
  }
  const dayNumbers = [...responsesByDayAndUser.keys()].sort((a, b) => a - b);

  // Single-person mode: that person's answers across days, oldest first.
  const personResponses = responses
    .filter((r) => r.userId === selected)
    .sort((a, b) => a.dayNumber - b.dayNumber);

  const pickerLabel =
    selected === ALL ? "Everyone" : (selected === ownId ? "You" : (membersById.get(selected)?.displayName ?? "Everyone"));

  // Wait for the days too: they carry the chapter titles and question text, so
  // rendering early flashes bare "Day 3" cards with no prompts above the answers.
  if (q.isLoading || daysLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={primary} />
      </View>
    );
  }

  if (participants.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <Text style={{ fontFamily: "PlayfairDisplay_400Regular_Italic", fontSize: 16, color: muted, textAlign: "center", lineHeight: 26 }}>
          No responses were recorded for this plan.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4, maxWidth: 512, width: "100%", alignSelf: "center" }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ marginBottom: 14 }}>
        <GrpPersonPicker label={pickerLabel} participants={participants} ownId={ownId} selected={selected} onSelect={setSelected} />
      </View>

      {selected === ALL ? (
        dayNumbers.map((dayNumber) => {
          // Same order every day: walk participants, keep whoever answered.
          const dayMap = responsesByDayAndUser.get(dayNumber)!;
          const dayResponses = participants
            .map((m) => dayMap.get(m.userId))
            .filter((r): r is PastResponse => !!r);
          return (
            <GrpDayGroupCard
              key={dayNumber}
              dayNumber={dayNumber}
              day={daysByNumber.get(dayNumber)}
              dayResponses={dayResponses}
              membersById={membersById}
            />
          );
        })
      ) : personResponses.length === 0 ? (
        <Text style={{ fontFamily: "PlayfairDisplay_400Regular_Italic", fontSize: 15, color: muted, textAlign: "center", marginTop: 40 }}>
          No entries from this person.
        </Text>
      ) : (
        personResponses.map((r) => (
          <GrpDayCard key={`${r.userId}-${r.dayNumber}`} dayNumber={r.dayNumber} day={daysByNumber.get(r.dayNumber)} response={r} />
        ))
      )}
    </ScrollView>
  );
}

// ─── Mine / Group toggle ───────────────────────────────────────────────────────

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Show ${label.toLowerCase()} responses`}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? primary : border,
        backgroundColor: active ? withAlpha(primary, 0.12) : "transparent",
      }}
    >
      <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 13, color: active ? primary : muted }}>{label}</Text>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DevotionalHistory() {
  // One run per view: personal (no groupId) or a specific group's copy. A
  // shared plan can have several runs — mixing them scrambles the history.
  const { planId: planIdParam, groupId: groupIdParam, view: viewParam } = useLocalSearchParams<{
    planId: string;
    groupId?: string;
    /** "group" lands on the Group tab instead of the default Mine tab. */
    view?: string;
  }>();
  const planId = String(planIdParam);
  const groupId = groupIdParam ?? null;
  const { authed } = useAuthed();

  const [tab, setTab] = useState<"mine" | "group">(groupId && viewParam === "group" ? "group" : "mine");

  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  const plan = usePlan(planId);
  const days = useDays(planId);

  const submissionsQ = useQuery({
    queryKey: ["submissions", "plan", planId, groupId],
    queryFn: () => ApiClient.getPlanSubmissions(planId, groupId).then((r) => r.submissions),
    enabled: authed && !!planId,
  });

  const loading = plan.isLoading || days.isLoading || submissionsQ.isLoading;

  const submissionsByDay = new Map<number, Submission>(
    (submissionsQ.data ?? []).map((s) => [s.dayNumber, s])
  );

  const submittedDays = (days.data ?? [])
    .filter((d) => submissionsByDay.has(d.dayNumber))
    .sort((a, b) => a.dayNumber - b.dayNumber);

  return (
    <Screen edges={["top", "bottom"]}>
      <Header subtitle={plan.data?.title ?? "Devotional"} title={tab === "group" ? "Group Responses" : "My Responses"} />

      {groupId ? (
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 8 }}>
          <TabButton label="Mine" active={tab === "mine"} onPress={() => setTab("mine")} />
          <TabButton label="Group" active={tab === "group"} onPress={() => setTab("group")} />
        </View>
      ) : null}

      {tab === "group" && groupId ? (
        <GroupResponsesTab groupId={groupId} planId={planId} days={days.data ?? []} daysLoading={days.isLoading} />
      ) : loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8, maxWidth: 512, width: "100%", alignSelf: "center" }}
          showsVerticalScrollIndicator={false}
        >
          {submittedDays.length === 0 ? (
            <View style={{ marginTop: 60, alignItems: "center", paddingHorizontal: 24 }}>
              <Text style={{ fontFamily: "PlayfairDisplay_400Regular_Italic", fontSize: 16, color: muted, textAlign: "center", lineHeight: 26 }}>
                Nothing here yet. Come back after you complete your first day.
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted, marginBottom: 16 }}>
                {submittedDays.length} of {plan.data?.totalDays ?? "?"} days completed
              </Text>
              {submittedDays.map((day) => (
                <DayCard
                  key={day.id}
                  day={day}
                  submission={submissionsByDay.get(day.dayNumber)!}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
