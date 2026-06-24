import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  ActivityIndicator,
  findNodeHandle,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, BookMarked, BookOpen, Car, CheckCircle, ChevronDown, ChevronUp, Headphones, Lock, Map, Mic, Play, Trash2, Unlock } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { ApiClient, type StudyNoteEntry, type BibleChapter } from "@/lib/api";
import { cancelDailyNudge } from "@/lib/notifications";

const BOOK_ALIASES: Record<string, string> = {
  Psalm: "Psalms",
  "Song of Songs": "Song of Solomon",
  "Song of Sol": "Song of Solomon",
};

function parsePassageRef(ref: string): { book: string; chapter: number } | null {
  // Handles "Matthew 6", "Matthew 6:5–13", "1 John 1:8–10", "Psalm 46:10"
  const match = ref.match(/^(.+?)\s+(\d+)(?:[:.]|$)/);
  if (!match) return null;
  const raw = match[1]!;
  return { book: BOOK_ALIASES[raw] ?? raw, chapter: Number(match[2]) };
}

function parseFocusVerses(ref: string): string | null {
  // "Matthew 6:5–13" → "5–13"   "Psalm 46:10" → "10"   "Matthew 6" → null
  const match = ref.match(/:(.+)$/);
  return match ? match[1].trim() : null;
}
import { useProgress, useGroupDayResponses, useGroups, useDiscipleships, useCustomQuestion } from "@/lib/queries";
import type { GroupDayResponse } from "@/lib/api";

/** The viewer's local calendar date as "YYYY-MM-DD" (en-CA renders ISO). */
function localDateString(): string {
  return new Date().toLocaleDateString("en-CA");
}

// ─── Skeleton loading lines ───────────────────────────────────────────────────

function SkeletonLine({ width = "100%" }: { width?: number | string }) {
  const opacity = useRef(new Animated.Value(0.35)).current;
  const skeletonColor = useThemeColor("muted");

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
        backgroundColor: skeletonColor,
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

function PassageContextDrawer({ passageRef, inlineContext }: { passageRef: string; inlineContext?: string | null }) {
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

  // Prefer the per-day context stored on the day itself. Only fall back to the
  // legacy book/chapter passageNotes table when a day has none (older content).
  const { data, isLoading: fetching } = useQuery({
    queryKey: ["passageNotes", passageRef],
    queryFn: () =>
      parsed
        ? ApiClient.getPassageNotes(parsed.book, parsed.chapter)
        : Promise.resolve({ passageNotes: null }),
    enabled: !inlineContext && !!parsed && open,
  });

  const context = inlineContext ?? data?.passageNotes?.context ?? null;
  const isLoading = !inlineContext && fetching;

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
        accessibilityRole="button"
        accessibilityLabel={open ? "Collapse passage context" : "Expand passage context"}
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

function StudyNotesDrawer({ passageRef, notes }: { passageRef: string; notes: StudyNoteEntry[] }) {
  const cardBg = useThemeColor("card");
  const mutedBg = useThemeColor("muted");
  const borderColor = useThemeColor("border");
  const mutedFg = useThemeColor("muted-foreground");
  const fgColor = useThemeColor("foreground");
  const accent = useThemeColor("primary");

  const [open, setOpen] = useState(false);
  const animH = useRef(new Animated.Value(0)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setOpen(false);
    animH.setValue(0);
    chevronAnim.setValue(0);
  }, [passageRef]);

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
        accessibilityRole="button"
        accessibilityLabel={open ? "Collapse study notes" : "Expand study notes"}
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

          {notes.length > 0 ? (
            <>
            {notes.map((entry, i) => (
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
            ))}
            </>
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

// ─── Available translations ───────────────────────────────────────────────────

const TRANSLATIONS = [
  { id: "KJV", label: "King James Version" },
  { id: "BBE", label: "Basic English" },
];

const TRANSLATION_STORAGE_KEY = "@ironsharp/bible_translation";

// ─── Feature 3: Bible Passage Card ───────────────────────────────────────────

const VERSES_PER_PAGE = 15;

function BiblePassageCard({ passageRef, onPageChange, passageRead, onMarkRead }: { passageRef: string; onPageChange?: () => void; passageRead?: boolean; onMarkRead?: () => void; }) {
  const cardBg = useThemeColor("card");
  const mutedBg = useThemeColor("muted");
  const borderColor = useThemeColor("border");
  const mutedFg = useThemeColor("muted-foreground");
  const fgColor = useThemeColor("foreground");
  const accent = useThemeColor("primary");
  const bg = useThemeColor("background");

  const [page, setPage] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [translation, setTranslation] = useState("KJV");
  const [showPicker, setShowPicker] = useState(false);

  const parsed = parsePassageRef(passageRef);

  useEffect(() => {
    import("@react-native-async-storage/async-storage").then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem(TRANSLATION_STORAGE_KEY).then((val) => {
        if (val) setTranslation(val);
      });
    });
  }, []);

  useEffect(() => { setPage(0); setCollapsed(false); }, [passageRef]);

  const { data, isLoading } = useQuery({
    queryKey: ["bibleChapter", passageRef, translation],
    queryFn: () =>
      parsed
        ? ApiClient.getBibleChapter(parsed.book, parsed.chapter, translation)
        : Promise.resolve({ chapter: null }),
    enabled: !!parsed,
  });

  const selectTranslation = (id: string) => {
    setTranslation(id);
    setShowPicker(false);
    import("@react-native-async-storage/async-storage").then(({ default: AsyncStorage }) => {
      AsyncStorage.setItem(TRANSLATION_STORAGE_KEY, id);
    });
  };

  const allVerses = (data?.chapter?.verses ?? []) as string[];

  const verseRange = (() => {
    const match = passageRef.match(/:(.+)$/);
    if (!match) return null;
    const range = match[1]!.trim().replace(/[–—]/g, "-");
    const [fromStr, toStr] = range.split("-");
    const from = parseInt(fromStr ?? "");
    const to = parseInt(toStr ?? fromStr ?? "");
    if (isNaN(from)) return null;
    return { from, to: isNaN(to) ? from : to };
  })();

  const displayVerses = verseRange
    ? allVerses.slice(verseRange.from - 1, verseRange.to)
    : allVerses;
  const startVerseNum = verseRange ? verseRange.from : 1;

  const totalPages = Math.max(1, Math.ceil(displayVerses.length / VERSES_PER_PAGE));
  const startIndex = page * VERSES_PER_PAGE;
  const pageVerses = displayVerses.slice(startIndex, startIndex + VERSES_PER_PAGE);

  return (
    <>
      <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor, overflow: "hidden" }}>

        {/* Header row — tap to collapse/expand */}
        <Pressable
          onPress={() => setCollapsed((c) => !c)}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? "Expand passage" : "Collapse passage"}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, paddingBottom: collapsed ? 12 : 8 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <BookOpen size={13} color={mutedFg} />
            <Text style={{ fontSize: 9, letterSpacing: 2, color: mutedFg, textTransform: "uppercase", fontFamily: "DMSans_400Regular" }}>
              {verseRange ? passageRef : parsed ? `${parsed.book} Chapter ${parsed.chapter}` : passageRef}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {!collapsed && (
              <Pressable
                onPress={() => setShowPicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Change Bible translation"
                style={{ borderWidth: 1, borderColor, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}
              >
                <Text style={{ fontSize: 10, color: accent, fontFamily: "DMSans_700Bold", letterSpacing: 0.5 }}>
                  {translation} ▾
                </Text>
              </Pressable>
            )}
            {collapsed
              ? <ChevronDown size={14} color={mutedFg} />
              : <ChevronUp size={14} color={mutedFg} />}
          </View>
        </Pressable>

        {/* Verses */}
        {!collapsed && (
          <View className="px-4 pb-3">
            {isLoading ? (
              <SkeletonLines count={6} />
            ) : displayVerses.length > 0 ? (
              pageVerses.map((verseText, i) => (
                <View key={startIndex + i} className="mb-3 flex-row gap-2">
                  <Text style={{ fontSize: 9, color: accent, fontFamily: "DMSans_700Bold", minWidth: 16, paddingTop: 2 }}>
                    {startVerseNum + startIndex + i}
                  </Text>
                  <Text className="font-serif flex-1" style={{ color: fgColor, fontSize: 13, lineHeight: 22 }}>
                    {verseText}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="font-serif-italic text-center text-sm" style={{ color: mutedFg }}>
                Bible text coming soon.
              </Text>
            )}
          </View>
        )}

        {/* Pagination */}
        {!collapsed && totalPages > 1 && (
          <View
            style={{ borderTopWidth: 1, borderTopColor: borderColor, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 }}
          >
            <Pressable
              onPress={() => { setPage((p) => p - 1); onPageChange?.(); }}
              disabled={page === 0}
              accessibilityRole="button"
              accessibilityLabel="Previous page"
              hitSlop={8}
              style={{ opacity: page === 0 ? 0.3 : 1 }}
            >
              <Text style={{ color: accent, fontSize: 13, fontFamily: "DMSans_700Bold" }}>← Prev</Text>
            </Pressable>
            <Text style={{ color: mutedFg, fontSize: 11, fontFamily: "DMSans_400Regular" }}>
              {page + 1} / {totalPages}
            </Text>
            <Pressable
              onPress={() => { setPage((p) => p + 1); onPageChange?.(); }}
              disabled={page === totalPages - 1}
              accessibilityRole="button"
              accessibilityLabel="Next page"
              hitSlop={8}
              style={{ opacity: page === totalPages - 1 ? 0.3 : 1 }}
            >
              <Text style={{ color: accent, fontSize: 13, fontFamily: "DMSans_700Bold" }}>Next →</Text>
            </Pressable>
          </View>
        )}

        {/* Finished reading button */}
        {!collapsed && onMarkRead && (
          <Pressable
            onPress={() => { if (!passageRead) { setCollapsed(true); onMarkRead(); } }}
            style={{
              borderTopWidth: 1,
              borderTopColor: passageRead ? `${accent}40` : borderColor,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              backgroundColor: passageRead ? `${accent}10` : "transparent",
            }}
          >
            <CheckCircle size={15} color={passageRead ? accent : mutedFg} fill={passageRead ? accent : "transparent"} />
            <Text style={{
              fontFamily: "DMSans_700Bold",
              fontSize: 13,
              color: passageRead ? accent : mutedFg,
            }}>
              {passageRead ? "Passage read — reflection below" : "Finished reading — read reflection"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Translation picker modal */}
      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", paddingHorizontal: 32 }} onPress={() => setShowPicker(false)}>
          <View style={{ backgroundColor: bg, borderRadius: 16, overflow: "hidden" }}>
            <Text style={{ color: mutedFg, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", fontFamily: "DMSans_400Regular", padding: 16, paddingBottom: 8 }}>
              Bible Translation
            </Text>
            {TRANSLATIONS.map((t, i) => (
              <Pressable
                key={t.id}
                onPress={() => selectTranslation(t.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: borderColor,
                }}
              >
                <View>
                  <Text style={{ color: fgColor, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{t.id}</Text>
                  <Text style={{ color: mutedFg, fontSize: 11, marginTop: 1 }}>{t.label}</Text>
                </View>
                {translation === t.id && (
                  <Text style={{ color: accent, fontSize: 16 }}>✓</Text>
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Daily encouragement verses (shown on the done state) ────────────────────

const DONE_VERSES = [
  { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", ref: "Galatians 6:9" },
  { text: "He who began a good work in you will carry it on to completion until the day of Christ Jesus.", ref: "Philippians 1:6" },
  { text: "The steadfast love of the LORD never ceases; his mercies never come to an end; they are new every morning; great is your faithfulness.", ref: "Lamentations 3:22–23" },
  { text: "Let us run with perseverance the race marked out for us, fixing our eyes on Jesus, the pioneer and perfecter of faith.", ref: "Hebrews 12:1–2" },
  { text: "But they who wait for the LORD shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.", ref: "Isaiah 40:31" },
  { text: "I have fought the good fight, I have finished the race, I have kept the faith.", ref: "2 Timothy 4:7" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.", ref: "Joshua 1:9" },
  { text: "The LORD your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.", ref: "Zephaniah 3:17" },
  { text: "Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", ref: "Proverbs 3:5–6" },
  { text: "Create in me a clean heart, O God, and renew a right spirit within me.", ref: "Psalm 51:10" },
  { text: "Your word is a lamp for my feet, a light on my path.", ref: "Psalm 119:105" },
  { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
];

function getDailyVerse() {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return DONE_VERSES[dayIndex % DONE_VERSES.length]!;
}

// ─── Group response card ──────────────────────────────────────────────────────

function GroupResponseCard({
  response,
  cardBg,
  borderColor,
  fgColor,
  muted,
}: {
  response: GroupDayResponse;
  cardBg: string;
  borderColor: string;
  fgColor: string;
  muted: string;
}) {
  const allPrivate = response.q1Private && response.q2Private;
  const hasAnyContent = response.response1 || response.response2 || response.prayer;

  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: borderColor,
        borderRadius: 14,
        padding: 14,
        gap: 10,
      }}
    >
      {/* Member header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            overflow: "hidden",
            backgroundColor: borderColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {response.avatarUrl ? (
            <Image
              source={{ uri: response.avatarUrl }}
              style={{ width: 34, height: 34 }}
            />
          ) : (
            <Text style={{ color: muted, fontSize: 13, fontFamily: "DMSans_500Medium" }}>
              {response.displayName.slice(0, 2).toUpperCase()}
            </Text>
          )}
        </View>
        <Text style={{ color: fgColor, fontFamily: "DMSans_500Medium", fontSize: 14, flex: 1 }}>
          {response.isOwn ? "You" : response.displayName}
        </Text>
        {response.isOwn && (
          <Text style={{ color: muted, fontSize: 11 }}>your answers</Text>
        )}
      </View>

      {/* Answers */}
      {!hasAnyContent || allPrivate ? (
        <Text style={{ color: muted, fontSize: 13, fontStyle: "italic" }}>
          Shared privately
        </Text>
      ) : (
        <View style={{ gap: 8 }}>
          {response.response1 && !response.q1Private && (
            <View style={{ gap: 3 }}>
              <Text style={{ color: muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Reflection 1
              </Text>
              <Text style={{ color: fgColor, fontSize: 14, lineHeight: 20 }}>
                {response.response1}
              </Text>
            </View>
          )}
          {response.response2 && !response.q2Private && (
            <View style={{ gap: 3 }}>
              <Text style={{ color: muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Reflection 2
              </Text>
              <Text style={{ color: fgColor, fontSize: 14, lineHeight: 20 }}>
                {response.response2}
              </Text>
            </View>
          )}
          {response.prayer && !response.prayerPrivate && (
            <View style={{ gap: 3 }}>
              <Text style={{ color: muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Prayer
              </Text>
              <Text style={{ color: fgColor, fontSize: 14, lineHeight: 20, fontStyle: "italic" }}>
                {response.prayer}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DevotionalReader() {
  const { planId: planIdParam, groupId: groupIdParam } = useLocalSearchParams<{ planId: string; groupId?: string }>();
  const planId = String(planIdParam);
  const groupId = groupIdParam ?? null;
  const router = useRouter();
  const qc = useQueryClient();

  const primary = useThemeColor("primary");
  const primaryFg = useThemeColor("primary-foreground");
  const muted = useThemeColor("muted-foreground");
  const accent = useThemeColor("primary");
  const cardBg = useThemeColor("card");
  const borderColor = useThemeColor("border");
  const fgColor = useThemeColor("foreground");

  const handleStopPlan = () => {
    Alert.alert(
      "Stop this plan?",
      "Your progress will be removed. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop plan",
          style: "destructive",
          onPress: async () => {
            await ApiClient.stopPlan(planId);
            await qc.invalidateQueries({ queryKey: ["progress"] });
            await qc.invalidateQueries({ queryKey: ["progress", "active"] });
            router.replace("/(tabs)/groups");
          },
        },
      ]
    );
  };

  const [showPlayMenu, setShowPlayMenu] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const cardYRef = useRef<number>(0);
  const input1Ref = useRef<TextInput>(null);
  const input2Ref = useRef<TextInput>(null);
  const input3Ref = useRef<TextInput>(null);
  const inputQ3Ref = useRef<TextInput>(null);

  const scrollToInput = (ref: React.RefObject<TextInput | null>) => {
    if (!ref.current || !scrollRef.current) return;
    const node = findNodeHandle(scrollRef.current);
    if (!node) return;
    ref.current.measureLayout(node, (_x, y) => {
      scrollRef.current?.scrollTo({ y: y - 120, animated: true });
    }, () => {});
  };

  const progress = useProgress();
  const progressRow = (progress.data ?? []).find((p) => p.planId === planId);

  // In group context use the group's shared day, not the user's personal day.
  const groups = useGroups();
  const activeGroup = groupId ? (groups.data ?? []).find((g) => g.id === groupId) : null;
  const currentDay = groupId ? (activeGroup?.currentDay ?? 1) : (progressRow?.currentDay ?? 1);

  // Scope the day lock so personal and group runs don't interfere.
  const [lockedUntilTomorrow, setLockedUntilTomorrow] = useState(false);
  const lockKey = groupId
    ? `@ironsharp/devotional_locked_until_${planId}_${groupId}`
    : `@ironsharp/devotional_locked_until_${planId}`;

  useEffect(() => {
    import("@react-native-async-storage/async-storage").then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem(lockKey).then((val) => {
        setLockedUntilTomorrow(!!(val && Date.now() < Number(val)));
      });
    });
  }, [lockKey]);

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

  // Discipleship Q3: only when the viewer is the disciple in an active
  // relationship scoped to *this* group, and the discipler set a question today.
  const discipleships = useDiscipleships();
  const todayDate = localDateString();
  const discipleRel = groupId
    ? (discipleships.data ?? []).find(
        (r) => r.groupId === groupId && r.role === "disciple" && r.status === "active"
      )
    : undefined;
  const customQuestionQ = useCustomQuestion(discipleRel?.id, todayDate);
  const q3 = customQuestionQ.data ?? null;

  const [response1, setResponse1] = useState("");
  const [response2, setResponse2] = useState("");
  const [response3, setResponse3] = useState("");
  const [prayer, setPrayer] = useState("");
  const [q1Private, setQ1Private] = useState(false);
  const [q2Private, setQ2Private] = useState(false);
  const [q3Private, setQ3Private] = useState(false);
  const [prayerPrivate, setPrayerPrivate] = useState(true);
  const [passageRead, setPassageRead] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [reflectionOpen, setReflectionOpen] = useState(true);
  const [done, setDone] = useState(false);
  const [reread, setReread] = useState(false);
  const isDoneState = done || lockedUntilTomorrow;
  const completedDayForFeed = done ? currentDay : currentDay - 1;
  const groupResponsesQ = useGroupDayResponses(planId, completedDayForFeed, isDoneState);

  const draftKey = groupId
    ? `@ironsharp/draft_${planId}_${groupId}_day_${currentDay}`
    : `@ironsharp/draft_${planId}_day_${currentDay}`;
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset UI state and restore any saved draft when day changes.
  useEffect(() => {
    setPassageRead(false);
    setReflectionOpen(true);
    import("@react-native-async-storage/async-storage").then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem(draftKey).then((raw) => {
        if (!raw) return;
        try {
          const d = JSON.parse(raw);
          if (d.response1 !== undefined) setResponse1(d.response1);
          if (d.response2 !== undefined) setResponse2(d.response2);
          if (d.response3 !== undefined) setResponse3(d.response3);
          if (d.prayer !== undefined) setPrayer(d.prayer);
          if (d.q1Private !== undefined) setQ1Private(d.q1Private);
          if (d.q2Private !== undefined) setQ2Private(d.q2Private);
          if (d.q3Private !== undefined) setQ3Private(d.q3Private);
          if (d.prayerPrivate !== undefined) setPrayerPrivate(d.prayerPrivate);
          if (d.passageRead) { setPassageRead(true); }
        } catch {}
      });
    });
  }, [currentDay, draftKey]);

  // Debounced auto-save draft whenever any answer field changes.
  useEffect(() => {
    if (isDoneState) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    setSaveState("saving");
    draftTimerRef.current = setTimeout(() => {
      import("@react-native-async-storage/async-storage").then(({ default: AsyncStorage }) => {
        AsyncStorage.setItem(draftKey, JSON.stringify({
          response1, response2, response3, prayer, q1Private, q2Private, q3Private, prayerPrivate, passageRead,
        }))
          .then(() => setSaveState("saved"))
          .catch(() => {});
      });
    }, 400);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [response1, response2, response3, prayer, q1Private, q2Private, q3Private, prayerPrivate, passageRead, draftKey, isDoneState]);

  // Prefill from any existing submission for this day.
  useEffect(() => {
    const s = submissionQ.data;
    if (s) {
      setResponse1(s.response1 ?? "");
      setResponse2(s.response2 ?? "");
      setResponse3(s.response3 ?? "");
      setPrayer(s.prayer ?? "");
      setQ1Private(s.q1Private);
      setQ2Private(s.q2Private);
      setQ3Private(s.q3Private);
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
        // Only send Q3 when the disciple was actually shown one today.
        response3: q3 ? response3 : undefined,
        prayer,
        q1Private,
        q2Private,
        q3Private: q3 ? q3Private : undefined,
        prayerPrivate,
        submissionSource: "typed",
      });
      if (groupId) {
        await ApiClient.updateGroupProgress(groupId, {
          nextDay: isLastDay ? undefined : currentDay + 1,
          completed: isLastDay,
        });
      } else if (progressRow) {
        if (isLastDay)
          await ApiClient.updateProgress(planId, { completed: true });
        else
          await ApiClient.updateProgress(planId, { currentDay: currentDay + 1 });
      }
    },
    onSuccess: async () => {
      cancelDailyNudge().catch(() => {});
      const midnight = new Date();
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);
      const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
      await AsyncStorage.setItem(lockKey, String(midnight.getTime()));
      await AsyncStorage.removeItem(draftKey);
      await qc.invalidateQueries({ queryKey: ["progress"] });
      await qc.invalidateQueries({ queryKey: ["progress", "active"] });
      if (groupId) await qc.invalidateQueries({ queryKey: ["groups"] });
      // Streak is updated server-side after submission — refresh profile so counts are current.
      await qc.invalidateQueries({ queryKey: ["profile"] });
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

  if (planQ.isError || dayQ.isError) {
    return (
      <Screen>
        <Header title="Devotional" />
        <ErrorState
          message="We couldn't load this devotional. Check your connection and try again."
          onRetry={() => { planQ.refetch(); dayQ.refetch(); }}
        />
      </Screen>
    );
  }

  if (isDoneState && !reread) {
    const completedDay = done ? currentDay : currentDay - 1;
    const verse = getDailyVerse();
    const groupResponses = groupResponsesQ.data ?? [];
    const hasGroupResponses = groupResponses.length > 0;

    return (
      <Screen edges={["top"]}>
        <Header subtitle={isLastDay ? "Plan complete" : "Today's reading"} />
        <ScrollView
          contentContainerClassName="px-6 py-8 pb-16"
          showsVerticalScrollIndicator={false}
        >
          {/* Heading */}
          <Text className="mb-1 text-center font-serif text-3xl font-bold text-foreground">
            {isLastDay ? "Plan complete." : "Done. Come back tomorrow."}
          </Text>
          <Text className="mb-6 text-center text-sm text-muted-foreground">
            {isLastDay
              ? `You finished all ${totalDays} days. Well done.`
              : `Day ${completedDay} of ${totalDays} complete`}
          </Text>

          {/* Verse card */}
          <View className="mb-6 w-full rounded-xl bg-card-deep px-5 py-4">
            <Text className="mb-2 text-center font-serif-italic text-sm leading-relaxed text-foreground">
              "{verse.text}"
            </Text>
            <Text className="text-center text-xs font-sans-medium text-muted-foreground">
              {verse.ref}
            </Text>
          </View>

          {/* Group responses feed */}
          {hasGroupResponses && (
            <View className="mb-6">
              <Text className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                What your group shared
              </Text>
              <View className="gap-3">
                {groupResponses.map((r) => (
                  <GroupResponseCard key={r.userId} response={r} cardBg={cardBg} borderColor={borderColor} fgColor={fgColor} muted={muted} />
                ))}
              </View>
            </View>
          )}

          {/* Buttons */}
          <View className="gap-3">
            <Button
              title="Back to Groups"
              onPress={() => router.replace("/(tabs)/groups")}
            />
            <Button
              title="Re-read today's passage"
              variant="outline"
              onPress={() => { setReread(true); setPassageRead(true); }}
            />
            <Button
              title="View my responses"
              variant="outline"
              onPress={() => router.push(`/devotional/history/${planId}`)}
            />
          </View>
        </ScrollView>
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
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {!groupId && (
              <Pressable
                onPress={handleStopPlan}
                accessibilityRole="button"
                accessibilityLabel="Stop this plan"
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full bg-muted active:opacity-70"
              >
                <Trash2 size={15} color={muted} />
              </Pressable>
            )}
            <Pressable
              onPress={() => router.push(`/devotional/history/${planId}`)}
              accessibilityRole="button"
              accessibilityLabel="View past entries"
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-muted active:opacity-70"
            >
              <BookMarked size={15} color={muted} />
            </Pressable>
            {day ? (
              <Pressable
                onPress={() => setShowPlayMenu(true)}
                accessibilityRole="button"
                accessibilityLabel="Play options"
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 active:opacity-70"
              >
                <Play size={16} color={primary} fill={primary} />
              </Pressable>
            ) : null}
          </View>
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

              <Pressable
                onPress={() => { setShowPlayMenu(false); router.push(`/guided/${planId}`); }}
                className="flex-row items-start gap-3 border-t border-border px-4 py-3.5 active:opacity-70"
              >
                <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Mic size={16} color={primary} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-semibold text-sm text-foreground">
                    Guided (hands-free)
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    Reads aloud, pauses, and transcribes your spoken answers
                  </Text>
                </View>
              </Pressable>

              {/* Commute Mode — hidden until dev build is ready */}
            </View>
          </Pressable>
        </Modal>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          ref={scrollRef}
          contentContainerClassName="mx-auto w-full max-w-lg gap-5 px-6 pb-10 pt-2"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={(e) => setShowScrollTop(e.nativeEvent.contentOffset.y > 220)}
          scrollEventThrottle={16}
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

          {/* Bible passage bubble */}
          <View onLayout={(e) => { cardYRef.current = e.nativeEvent.layout.y; }}>
            <BiblePassageCard
              passageRef={day?.chapter ?? ""}
              onPageChange={() => scrollRef.current?.scrollTo({ y: cardYRef.current, animated: true })}
              passageRead={passageRead}
              onMarkRead={day?.reflection ? () => { setPassageRead(true); scrollRef.current?.scrollTo({ y: 0, animated: true }); } : undefined}
            />
          </View>

          {/* Reflection bubble — shown after passage is marked read */}
          {passageRead && day?.reflection ? (
            <View style={{
              backgroundColor: cardBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor,
              overflow: "hidden",
            }}>
              <Pressable
                onPress={() => setReflectionOpen((o) => !o)}
                accessibilityRole="button"
                accessibilityLabel={reflectionOpen ? "Collapse reflection" : "Expand reflection"}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 18,
                  paddingBottom: reflectionOpen ? 10 : 18,
                }}
              >
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 2, color: muted, textTransform: "uppercase" }}>
                  Reflection
                </Text>
                {reflectionOpen
                  ? <ChevronUp size={14} color={muted} />
                  : <ChevronDown size={14} color={muted} />}
              </Pressable>
              {reflectionOpen && (
                <Text style={{
                  fontFamily: "PlayfairDisplay_400Regular",
                  fontSize: 15,
                  color: fgColor,
                  lineHeight: 27,
                  paddingHorizontal: 18,
                  paddingBottom: 18,
                }}>
                  {day.reflection}
                </Text>
              )}
            </View>
          ) : null}

          {/* Passage tools — connected visual block */}
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor,
              overflow: "hidden",
            }}
          >
            <PassageContextDrawer passageRef={day?.chapter ?? ""} inlineContext={day?.passageContext ?? null} />
            <View style={{ height: 1, backgroundColor: borderColor }} />
            <StudyNotesDrawer passageRef={day?.chapter ?? ""} notes={day?.studyNotes ?? []} />
          </View>

          {/* Reflect, Act, Prayer, Submit */}
          <View className="gap-2">
              <Text className="font-sans-semibold text-base text-foreground">
                Reflect
              </Text>
              <Text className="text-sm leading-relaxed text-muted-foreground">
                {day?.reflectionQ1}
              </Text>
              <TextInput
                ref={input1Ref}
                value={response1}
                onChangeText={setResponse1}
                editable={!reread}
                onFocus={() => scrollToInput(input1Ref)}
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

            <View className="gap-2">
              <Text className="font-sans-semibold text-base text-foreground">
                Act
              </Text>
              <Text className="text-sm leading-relaxed text-muted-foreground">
                {day?.reflectionQ2}
              </Text>
              <TextInput
                ref={input2Ref}
                value={response2}
                onChangeText={setResponse2}
                editable={!reread}
                onFocus={() => scrollToInput(input2Ref)}
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

            {q3 && (
              <View className="gap-2">
                <Text style={{ color: accent }} className="font-sans-semibold text-xs uppercase tracking-wider">
                  From your discipler
                </Text>
                <Text className="text-sm leading-relaxed text-muted-foreground">
                  {q3.questionText}
                </Text>
                <TextInput
                  ref={inputQ3Ref}
                  value={response3}
                  onChangeText={setResponse3}
                  editable={!reread}
                  onFocus={() => scrollToInput(inputQ3Ref)}
                  placeholder="Your answer..."
                  placeholderTextColor={muted}
                  multiline
                  textAlignVertical="top"
                  className={inputClass}
                />
                <PrivacyToggle
                  value={q3Private}
                  onChange={setQ3Private}
                  color={accent}
                />
              </View>
            )}

            <View className="gap-2">
              <Text className="font-sans-semibold text-base text-foreground">
                Prayer & Praise
              </Text>
              <TextInput
                ref={input3Ref}
                value={prayer}
                onChangeText={setPrayer}
                editable={!reread}
                onFocus={() => scrollToInput(input3Ref)}
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

            {reread ? (
              <View className="w-2/3 self-center">
                <Button
                  title="Done re-reading"
                  variant="outline"
                  onPress={() => setReread(false)}
                />
              </View>
            ) : (
              <>
                {(response1 || response2 || prayer) && saveState !== "idle" ? (
                  <Text style={{ textAlign: "center", fontSize: 12, color: muted }}>
                    {saveState === "saving" ? "Saving…" : "Saved ✓"}
                  </Text>
                ) : null}

                <View className="w-2/3 self-center">
                  <Button
                    title={submit.isPending ? "Submitting..." : "Submit"}
                    loading={submit.isPending}
                    disabled={!response1.trim() || !response2.trim()}
                    onPress={() =>
                      Alert.alert(
                        "Submit today's reflection?",
                        "You won't be able to edit it after submitting.",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Submit", onPress: () => submit.mutate() },
                        ]
                      )
                    }
                  />
                </View>
              </>
            )}
        </ScrollView>
        {showScrollTop && (
          <Pressable
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
            accessibilityRole="button"
            accessibilityLabel="Scroll to top"
            style={{
              position: "absolute",
              bottom: 24,
              right: 20,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: accent,
              alignItems: "center",
              justifyContent: "center",
              elevation: 6,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            <ArrowUp size={18} color={primaryFg} />
          </Pressable>
        )}
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
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 11, color: muted, fontFamily: "DMSans_400Regular", fontStyle: "italic", flex: 1, marginRight: 8 }}>
        {value ? "Only you will see this." : "Visible to your group."}
      </Text>
      <Pressable
        onPress={() => onChange(!value)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          borderWidth: 1,
          borderColor: value ? border : color,
          borderRadius: 20,
          paddingHorizontal: 10,
          paddingVertical: 5,
        }}
      >
        {value
          ? <Lock size={11} color={muted} />
          : <Unlock size={11} color={color} />
        }
        <Text style={{ fontSize: 11, color: value ? muted : color, fontFamily: "DMSans_500Medium" }}>
          {value ? "Private" : "Visible"}
        </Text>
      </Pressable>
    </View>
  );
}
