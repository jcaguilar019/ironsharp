import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Car, ChevronDown, Headphones, Map, Play } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { useThemeColor } from "@/components/useThemeColor";
import { ApiClient, type StudyNoteEntry, type BibleChapter } from "@/lib/api";

function parsePassageRef(ref: string): { book: string; chapter: number } | null {
  const match = ref.match(/^(.+?)\s+(\d+)$/);
  if (!match) return null;
  return { book: match[1], chapter: Number(match[2]) };
}
import { useProgress } from "@/lib/queries";

// ─── Skeleton loading lines ───────────────────────────────────────────────────

function SkeletonLine({ width = "100%" }: { width?: number | string }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.65,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        height: 11,
        backgroundColor: "#C8BFB5",
        borderRadius: 5,
        marginBottom: 8,
        opacity,
        width: width as any,
      }}
    />
  );
}

function SkeletonLines({ count = 3 }: { count?: number }) {
  const widths = ["100%", "85%", "70%"] as const;
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonLine key={i} width={widths[i] ?? "100%"} />
      ))}
    </View>
  );
}

// ─── Feature 1: Passage Context Drawer ───────────────────────────────────────

function PassageContextDrawer({ passageRef }: { passageRef: string }) {
  const cardBg = useThemeColor("card");
  const mutedBg = useThemeColor("muted");
  const borderColor = useThemeColor("border");
  const mutedFg = useThemeColor("muted-foreground");
  const fgColor = useThemeColor("foreground");

  const [open, setOpen] = useState(false);
  const animH = useRef(new Animated.Value(0)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;

  const parsed = parsePassageRef(passageRef);

  useEffect(() => {
    setOpen(false);
    animH.setValue(0);
    chevronAnim.setValue(0);
  }, [passageRef]);

  const { data, isLoading } = useQuery({
    queryKey: ["passageNotes", passageRef],
    queryFn: () =>
      parsed
        ? ApiClient.getPassageNotes(parsed.book, parsed.chapter)
        : Promise.resolve({ passageNotes: null }),
    enabled: !!parsed && open,
  });

  const context = data?.passageNotes?.context ?? null;

  const toggle = () => {
    const toOpen = !open;
    setOpen(toOpen);
    Animated.parallel([
      Animated.timing(animH, {
        toValue: toOpen ? 800 : 0,
        duration: 250,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(chevronAnim, {
        toValue: toOpen ? 1 : 0,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotation = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <>
      <Pressable
        onPress={toggle}
        style={{ backgroundColor: cardBg }}
        className="flex-row items-center justify-between px-4 py-3 active:opacity-70"
      >
        <View className="flex-row items-center gap-2">
          <Map size={14} color={mutedFg} />
          <Text className="font-sans-medium text-sm" style={{ color: mutedFg }}>
            Passage Context
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <ChevronDown size={14} color={mutedFg} />
        </Animated.View>
      </Pressable>

      <Animated.View style={{ maxHeight: animH, overflow: "hidden" }}>
        <View style={{ backgroundColor: cardBg }} className="px-4 pb-5 pt-3">
          {isLoading ? (
            <SkeletonLines count={3} />
          ) : context ? (
            <Text
              className="font-serif"
              style={{ color: fgColor, fontSize: 14, lineHeight: 25 }}
            >
              {context}
            </Text>
          ) : (
            <Text
              className="font-serif-italic text-center text-sm"
              style={{ color: mutedFg }}
            >
              Passage context coming soon.
            </Text>
          )}
        </View>
      </Animated.View>
    </>
  );
}

// ─── Feature 2: Study Notes Drawer ───────────────────────────────────────────

function StudyNotesDrawer({ passageRef }: { passageRef: string }) {
  const cardBg = useThemeColor("card");
  const mutedBg = useThemeColor("muted");
  const borderColor = useThemeColor("border");
  const mutedFg = useThemeColor("muted-foreground");
  const fgColor = useThemeColor("foreground");
  const accent = useThemeColor("primary");

  const [open, setOpen] = useState(false);
  const animH = useRef(new Animated.Value(0)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;

  const parsed = parsePassageRef(passageRef);

  useEffect(() => {
    setOpen(false);
    animH.setValue(0);
    chevronAnim.setValue(0);
  }, [passageRef]);

  const { data, isLoading } = useQuery({
    queryKey: ["passageNotes", passageRef],
    queryFn: () =>
      parsed
        ? ApiClient.getPassageNotes(parsed.book, parsed.chapter)
        : Promise.resolve({ passageNotes: null }),
    enabled: !!parsed,
  });

  const notes = (data?.passageNotes?.notes ?? []) as StudyNoteEntry[];

  const toggle = () => {
    const toOpen = !open;
    setOpen(toOpen);
    Animated.parallel([
      Animated.timing(animH, {
        toValue: toOpen ? 800 : 0,
        duration: 250,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(chevronAnim, {
        toValue: toOpen ? 1 : 0,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotation = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <>
      {/* Toggle row — flush against context card above (no top border, handled by parent) */}
      <Pressable
        onPress={toggle}
        style={{ backgroundColor: mutedBg }}
        className="flex-row items-center justify-between px-4 py-3 active:opacity-70"
      >
        <View className="flex-row items-center gap-2">
          <BookOpen size={14} color={mutedFg} />
          <Text
            className="font-sans-medium text-sm"
            style={{ color: mutedFg }}
          >
            Open Study Notes
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <ChevronDown size={14} color={mutedFg} />
        </Animated.View>
      </Pressable>

      {/* Expanding notes panel */}
      <Animated.View style={{ maxHeight: animH, overflow: "hidden" }}>
        <View style={{ backgroundColor: cardBg }} className="px-4 pb-5 pt-3">
          {/* Section label */}
          <Text
            className="mb-3 uppercase"
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: mutedFg,
              fontFamily: "DMSans_400Regular",
            }}
          >
            IronSharp Study Notes · {passageRef}
          </Text>

          {isLoading ? (
            <SkeletonLines count={3} />
          ) : notes.length > 0 ? (
            notes.map((entry, i) => (
              <View key={entry.verse_ref}>
                <Text
                  className="mb-1 font-sans-bold"
                  style={{ fontSize: 10, color: accent }}
                >
                  {entry.verse_ref}
                </Text>
                <Text
                  className="font-serif"
                  style={{ color: fgColor, fontSize: 12, lineHeight: 21 }}
                >
                  {entry.note}
                </Text>
                {i < notes.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: borderColor,
                      marginVertical: 10,
                    }}
                  />
                )}
              </View>
            ))
          ) : (
            <Text
              className="font-serif-italic text-center text-sm"
              style={{ color: mutedFg }}
            >
              Study notes for this chapter are coming soon.
            </Text>
          )}
        </View>
      </Animated.View>
    </>
  );
}

// ─── Feature 3: Bible Chapter Drawer ─────────────────────────────────────────

function BibleChapterDrawer({ passageRef }: { passageRef: string }) {
  const cardBg = useThemeColor("card");
  const mutedBg = useThemeColor("muted");
  const borderColor = useThemeColor("border");
  const mutedFg = useThemeColor("muted-foreground");
  const fgColor = useThemeColor("foreground");
  const accent = useThemeColor("primary");

  const [open, setOpen] = useState(false);
  const animH = useRef(new Animated.Value(0)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;

  const parsed = parsePassageRef(passageRef);

  useEffect(() => {
    setOpen(false);
    animH.setValue(0);
    chevronAnim.setValue(0);
  }, [passageRef]);

  const { data, isLoading } = useQuery({
    queryKey: ["bibleChapter", passageRef],
    queryFn: () =>
      parsed
        ? ApiClient.getBibleChapter(parsed.book, parsed.chapter)
        : Promise.resolve({ chapter: null }),
    enabled: !!parsed && open,
  });

  const verses = (data?.chapter?.verses ?? []) as string[];
  const translation = data?.chapter?.translation ?? "KJV";

  const toggle = () => {
    const toOpen = !open;
    setOpen(toOpen);
    Animated.parallel([
      Animated.timing(animH, {
        toValue: toOpen ? 2000 : 0,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(chevronAnim, {
        toValue: toOpen ? 1 : 0,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotation = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <>
      <Pressable
        onPress={toggle}
        style={{ backgroundColor: mutedBg }}
        className="flex-row items-center justify-between px-4 py-3 active:opacity-70"
      >
        <View className="flex-row items-center gap-2">
          <BookOpen size={14} color={mutedFg} />
          <Text className="font-sans-medium text-sm" style={{ color: mutedFg }}>
            Read {passageRef}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <ChevronDown size={14} color={mutedFg} />
        </Animated.View>
      </Pressable>

      <Animated.View style={{ maxHeight: animH, overflow: "hidden" }}>
        <View style={{ backgroundColor: cardBg }} className="px-4 pb-5 pt-3">
          <Text
            className="mb-3 uppercase"
            style={{ fontSize: 9, letterSpacing: 2, color: mutedFg, fontFamily: "DMSans_400Regular" }}
          >
            {passageRef} · {translation}
          </Text>

          {isLoading ? (
            <SkeletonLines count={4} />
          ) : verses.length > 0 ? (
            verses.map((text, i) => (
              <View key={i} className="mb-3 flex-row gap-2">
                <Text
                  style={{ fontSize: 9, color: accent, fontFamily: "DMSans_700Bold", minWidth: 16, paddingTop: 2 }}
                >
                  {i + 1}
                </Text>
                <Text
                  className="font-serif flex-1"
                  style={{ color: fgColor, fontSize: 13, lineHeight: 22 }}
                >
                  {text}
                </Text>
              </View>
            ))
          ) : (
            <Text
              className="font-serif-italic text-center text-sm"
              style={{ color: mutedFg }}
            >
              Bible text coming soon.
            </Text>
          )}
        </View>
      </Animated.View>
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DevotionalReader() {
  const { planId: planIdParam } = useLocalSearchParams<{ planId: string }>();
  const planId = String(planIdParam);
  const router = useRouter();
  const qc = useQueryClient();

  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const accent = useThemeColor("primary");
  const cardBg = useThemeColor("card");
  const borderColor = useThemeColor("border");
  const fgColor = useThemeColor("foreground");

  const [showPlayMenu, setShowPlayMenu] = useState(false);

  const progress = useProgress();
  const progressRow = (progress.data ?? []).find((p) => p.planId === planId);
  const currentDay = progressRow?.currentDay ?? 1;

  const planQ = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => ApiClient.getPlan(planId).then((r) => r.plan),
  });
  const dayQ = useQuery({
    queryKey: ["day", planId, currentDay],
    queryFn: () => ApiClient.getDay(planId, currentDay).then((r) => r.day),
    enabled: !!planId,
  });
  const submissionQ = useQuery({
    queryKey: ["submission", planId, currentDay],
    queryFn: () =>
      ApiClient.getSubmission(planId, currentDay).then((r) => r.submission),
    enabled: !!planId,
  });

  const [response1, setResponse1] = useState("");
  const [response2, setResponse2] = useState("");
  const [prayer, setPrayer] = useState("");
  const [q1Private, setQ1Private] = useState(false);
  const [q2Private, setQ2Private] = useState(false);
  const [prayerPrivate, setPrayerPrivate] = useState(true);
  const [done, setDone] = useState(false);

  // Prefill from any existing submission for this day.
  useEffect(() => {
    const s = submissionQ.data;
    if (s) {
      setResponse1(s.response1 ?? "");
      setResponse2(s.response2 ?? "");
      setPrayer(s.prayer ?? "");
      setQ1Private(s.q1Private);
      setQ2Private(s.q2Private);
      setPrayerPrivate(s.prayerPrivate);
    }
  }, [submissionQ.data]);

  const plan = planQ.data;
  const day = dayQ.data;
  const totalDays = plan?.totalDays ?? 0;
  const isLastDay = totalDays > 0 && currentDay >= totalDays;

  const submit = useMutation({
    mutationFn: async () => {
      await ApiClient.saveSubmission({
        planId,
        dayNumber: currentDay,
        response1,
        response2,
        prayer,
        q1Private,
        q2Private,
        prayerPrivate,
        submissionSource: "typed",
      });
      if (progressRow) {
        if (isLastDay)
          await ApiClient.updateProgress(planId, { completed: true });
        else
          await ApiClient.updateProgress(planId, {
            currentDay: currentDay + 1,
          });
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["progress"] });
      await qc.invalidateQueries({ queryKey: ["progress", "active"] });
      setDone(true);
    },
  });

  const loading = planQ.isLoading || dayQ.isLoading || progress.isLoading;

  if (loading) {
    return (
      <Screen center>
        <ActivityIndicator color={primary} />
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen edges={["top"]}>
        <Header subtitle={isLastDay ? "Plan complete" : "Today's reading"} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-2 text-center font-serif text-3xl font-bold text-foreground">
            {isLastDay ? "Plan complete." : "Done. Come back tomorrow."}
          </Text>
          <Text className="mb-8 text-center text-sm text-muted-foreground">
            {isLastDay
              ? `You finished all ${totalDays} days. Well done.`
              : `Day ${currentDay} of ${totalDays} complete`}
          </Text>
          <View className="w-full max-w-xs">
            <Button
              title="Back to Devotionals"
              onPress={() => router.replace("/(tabs)/devotional")}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const inputClass =
    "min-h-[100px] rounded-xl border border-input bg-card p-4 font-sans text-base text-foreground";

  return (
    <Screen edges={["top"]}>
      <Header
        subtitle={plan?.title ?? "Devotional"}
        rightAction={
          day ? (
            <Pressable
              onPress={() => setShowPlayMenu(true)}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 active:opacity-70"
            >
              <Play size={16} color={primary} fill={primary} />
            </Pressable>
          ) : null
        }
      />

      {/* Play mode picker */}
      {showPlayMenu && (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={() => setShowPlayMenu(false)}
        >
          <Pressable
            className="flex-1"
            onPress={() => setShowPlayMenu(false)}
          >
            <View
              className="absolute right-4 top-14 w-64 overflow-hidden rounded-2xl border border-border shadow-lg"
              style={{ backgroundColor: cardBg }}
            >
              <Pressable
                onPress={() => setShowPlayMenu(false)}
                className="flex-row items-start gap-3 px-4 py-3.5 active:opacity-70"
              >
                <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Headphones size={16} color={muted} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-semibold text-sm text-foreground">
                    Listen Only
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    Reads the devotional aloud
                  </Text>
                </View>
              </Pressable>

              <View style={{ height: 1, backgroundColor: borderColor }} />

              <Pressable
                onPress={() => {
                  setShowPlayMenu(false);
                  router.push(`/commute/${planId}?day=${currentDay}`);
                }}
                className="flex-row items-start gap-3 rounded-b-2xl bg-primary/8 px-4 py-3.5 active:opacity-80"
              >
                <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                  <Car size={16} color={primary} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-semibold text-sm text-foreground">
                    Commute Mode
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    Hands-free — reads and records
                  </Text>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="mx-auto w-full max-w-lg gap-5 px-6 pb-10 pt-2"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Day + chapter */}
          <View>
            <Text className="text-xs uppercase tracking-wider text-muted-foreground">
              Day {currentDay} of {totalDays}
            </Text>
            <Text className="mt-1 font-serif text-2xl font-bold text-foreground">
              {day?.chapter}
            </Text>
            {day?.theme ? (
              <Text className="mt-1 font-serif-italic text-base text-muted-foreground">
                {day.theme}
              </Text>
            ) : null}
          </View>

          {/* Passage tools — connected visual block */}
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor,
              overflow: "hidden",
            }}
          >
            <BibleChapterDrawer passageRef={day?.chapter ?? ""} />
            <View style={{ height: 1, backgroundColor: borderColor }} />
            <PassageContextDrawer passageRef={day?.chapter ?? ""} />
            <View style={{ height: 1, backgroundColor: borderColor }} />
            <StudyNotesDrawer passageRef={day?.chapter ?? ""} />
          </View>

          {/* Reflect */}
          <View className="gap-2">
            <Text className="font-sans-semibold text-base text-foreground">
              Reflect
            </Text>
            <Text className="text-sm leading-relaxed text-muted-foreground">
              {day?.reflectionQ1}
            </Text>
            <TextInput
              value={response1}
              onChangeText={setResponse1}
              placeholder="Share your honest reflection..."
              placeholderTextColor={muted}
              multiline
              textAlignVertical="top"
              className={inputClass}
            />
            <PrivacyToggle
              value={q1Private}
              onChange={setQ1Private}
              color={accent}
            />
          </View>

          {/* Apply */}
          <View className="gap-2">
            <Text className="font-sans-semibold text-base text-foreground">
              Apply
            </Text>
            <Text className="text-sm leading-relaxed text-muted-foreground">
              {day?.reflectionQ2}
            </Text>
            <TextInput
              value={response2}
              onChangeText={setResponse2}
              placeholder="What's the invitation here?"
              placeholderTextColor={muted}
              multiline
              textAlignVertical="top"
              className={inputClass}
            />
            <PrivacyToggle
              value={q2Private}
              onChange={setQ2Private}
              color={accent}
            />
          </View>

          {/* Prayer */}
          <View className="gap-2">
            <Text className="font-sans-semibold text-base text-foreground">
              Prayer / Praise (optional)
            </Text>
            <TextInput
              value={prayer}
              onChangeText={setPrayer}
              placeholder="A personal prayer or praise..."
              placeholderTextColor={muted}
              multiline
              textAlignVertical="top"
              className="min-h-[80px] rounded-xl border border-input bg-card p-4 font-sans text-base text-foreground"
            />
            <PrivacyToggle
              value={prayerPrivate}
              onChange={setPrayerPrivate}
              color={accent}
            />
          </View>

          <Button
            title={submit.isPending ? "Submitting..." : "Submit"}
            loading={submit.isPending}
            disabled={!response1.trim() || !response2.trim()}
            onPress={() => submit.mutate()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ─── Privacy toggle ───────────────────────────────────────────────────────────

function PrivacyToggle({
  value,
  onChange,
  color,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-serif-italic text-[11px] text-muted-foreground">
        {value
          ? "Only you will see this — your group sees you submitted, not this response."
          : "Visible to your group."}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: color }}
      />
    </View>
  );
}
