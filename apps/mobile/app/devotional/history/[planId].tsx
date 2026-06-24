import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { useThemeColor } from "@/components/useThemeColor";
import { ApiClient, type Submission, type DevotionalDay } from "@/lib/api";
import { useAuthed, usePlan, useDays } from "@/lib/queries";

function formatDate(iso: string) {
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
}: {
  label: string;
  question: string;
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
              backgroundColor: accent + "22",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 10, color: accent }}>
              {day.dayNumber}
            </Text>
          </View>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 15, color: fg, flex: 1 }}>
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
          question={day.prayerPrompt ?? ""}
          answer={submission.prayer}
          isPrivate={submission.prayerPrivate}
        />
      ) : null}
    </View>
  );
}

export default function DevotionalHistory() {
  const { planId: planIdParam } = useLocalSearchParams<{ planId: string }>();
  const planId = String(planIdParam);
  const { authed } = useAuthed();

  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  const plan = usePlan(planId);
  const days = useDays(planId);

  const submissionsQ = useQuery({
    queryKey: ["submissions", "plan", planId],
    queryFn: () => ApiClient.getPlanSubmissions(planId).then((r) => r.submissions),
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
    <Screen edges={["top"]}>
      <Header subtitle={plan.data?.title ?? "Devotional"} title="My Responses" />
      {loading ? (
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
