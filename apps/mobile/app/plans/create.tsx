import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, MessageSquare, ChevronLeft, Sparkles } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { useThemeColor } from "@/components/useThemeColor";
import { ApiClient, ApiError } from "@/lib/api";

// ─── Bible book validation ────────────────────────────────────────────────────

const VALID_BIBLE_BOOKS = new Set([
  "genesis","exodus","leviticus","numbers","deuteronomy","joshua","judges","ruth",
  "1 samuel","2 samuel","1 kings","2 kings","1 chronicles","2 chronicles",
  "ezra","nehemiah","esther","job","psalms","proverbs","ecclesiastes","song of solomon",
  "isaiah","jeremiah","lamentations","ezekiel","daniel","hosea","joel","amos",
  "obadiah","jonah","micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi",
  "matthew","mark","luke","john","acts","romans",
  "1 corinthians","2 corinthians","galatians","ephesians","philippians","colossians",
  "1 thessalonians","2 thessalonians","1 timothy","2 timothy","titus","philemon",
  "hebrews","james","1 peter","2 peter","1 john","2 john","3 john","jude","revelation",
]);

function normalizeBibleBookInput(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^(the book of |book of |the )/i, "")
    .replace(/\bfirst\b/i, "1")
    .replace(/\bsecond\b/i, "2")
    .replace(/\bthird\b/i, "3")
    .replace(/\bpsalm\b/, "psalms")
    .replace(/\bsong of songs\b/, "song of solomon")
    .replace(/\bsong of sol\b/, "song of solomon")
    .replace(/\bsongs\b/, "song of solomon")
    .replace(/\bcanticles?\b/, "song of solomon")
    .replace(/\brevelations\b/, "revelation")
    .trim();
}

function isValidBibleBook(input: string): boolean {
  return VALID_BIBLE_BOOKS.has(normalizeBibleBookInput(input));
}

// ─── Bible book list (canonical order, for scroll picker) ─────────────────────

const BIBLE_BOOKS_ORDERED = [
  // Old Testament
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles",
  "Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon",
  "Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
  // New Testament
  "Matthew","Mark","Luke","John","Acts","Romans",
  "1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians",
  "1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon",
  "Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type InputType = "book" | "topic";
type WhoOption = "just-me" | "friend" | "small-group" | "discipleship";

type Form = {
  inputType: InputType | null;
  bookOrTopic: string;
  days: number | null;
  themeFocus: string;
  who: WhoOption | null;
  context: string;
};

const TOTAL_STEPS = 6; // 0–5, step 6 is summary

const WHO_OPTIONS: { id: WhoOption; label: string; sub: string }[] = [
  { id: "just-me",      label: "Just me",                  sub: "Personal devotional" },
  { id: "friend",       label: "Me and a friend",           sub: "Read it together" },
  { id: "small-group",  label: "Small group",               sub: "Going through it as a group" },
  { id: "discipleship", label: "Discipleship relationship", sub: "Discipler and disciple" },
];

const DAY_OPTIONS = [7, 14, 21];

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CreatePlan() {
  const router = useRouter();
  const qc = useQueryClient();

  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const fg = useThemeColor("foreground");
  const bg = useThemeColor("background");
  const card = useThemeColor("card");
  const border = useThemeColor("border");

  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState<Form>({
    inputType: null,
    bookOrTopic: "",
    days: null,
    themeFocus: "",
    who: null,
    context: "",
  });

  const scrollRef = useRef<ScrollView>(null);

  const canAdvance = () => {
    if (step === 0) return form.inputType !== null;
    if (step === 1) {
      if (form.inputType === "book") return form.bookOrTopic.length > 0;
      return form.bookOrTopic.trim().length >= 2;
    }
    if (step === 2) return form.days !== null;
    if (step === 3) return form.themeFocus.trim().length >= 3;
    if (step === 4) return form.who !== null;
    if (step === 5) return true; // context is optional
    return false;
  };

  const advance = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const back = () => {
    if (step > 0) {
      setStep((s) => s - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      router.back();
    }
  };

  const generate = async () => {
    if (!form.inputType || !form.days || !form.who) return;
    setGenerating(true);
    try {
      const { planId } = await ApiClient.generateDevotional({
        bookOrTopic: form.bookOrTopic.trim(),
        inputType: form.inputType,
        days: form.days,
        themeFocus: form.themeFocus.trim(),
        who: form.who,
        context: form.context.trim() || undefined,
      });

      // Start the plan for this user.
      await ApiClient.startPlan(planId);
      await qc.invalidateQueries({ queryKey: ["progress"] });
      await qc.invalidateQueries({ queryKey: ["progress", "active"] });
      await qc.invalidateQueries({ queryKey: ["generate", "tokens"] });

      router.replace(`/devotional/${planId}`);
    } catch (err) {
      setGenerating(false);
      if (err instanceof ApiError && err.status === 429) {
        Alert.alert("Out of tokens", err.message);
      } else if (err instanceof ApiError && err.status === 403) {
        Alert.alert(
          "One at a time",
          "Your plan was created. Finish your current devotional first, then you can start this one."
        );
        router.replace("/(tabs)/groups");
      } else {
        Alert.alert("Something went wrong", "Generation failed. Please try again.");
      }
    }
  };

  // ── Generating state ───────────────────────────────────────────────────────
  if (generating) {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <ActivityIndicator color={primary} size="large" />
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, color: fg, textAlign: "center", marginTop: 24 }}>
            Building your plan…
          </Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: muted, textAlign: "center", marginTop: 8, lineHeight: 22 }}>
            {form.inputType === "book"
              ? `Writing a ${form.days}-day journey through ${form.bookOrTopic}.`
              : `Writing a ${form.days}-day plan on ${form.bookOrTopic}.`}
            {"\n"}This takes about 20 seconds.
          </Text>
        </View>
      </Screen>
    );
  }

  // ── Summary step ──────────────────────────────────────────────────────────
  if (step === TOTAL_STEPS) {
    const whoLabel = WHO_OPTIONS.find((w) => w.id === form.who)?.label ?? form.who;
    return (
      <Screen edges={["top"]}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
          <Pressable onPress={back} hitSlop={8} style={{ padding: 8 }}>
            <ChevronLeft size={22} color={fg} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16, maxWidth: 512, width: "100%", alignSelf: "center" }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, color: fg, marginBottom: 6 }}>
            Here's what we're building.
          </Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: muted, marginBottom: 28, lineHeight: 22 }}>
            Review your plan before we generate it.
          </Text>

          {[
            { label: form.inputType === "book" ? "Book" : "Topic", value: form.bookOrTopic },
            { label: "Length",  value: `${form.days} days` },
            { label: "Focus",   value: form.themeFocus },
            { label: "For",     value: whoLabel ?? "" },
            ...(form.context.trim() ? [{ label: "Context", value: form.context }] : []),
          ].map((row) => (
            <View key={row.label} style={{ borderTopWidth: 1, borderTopColor: border, paddingVertical: 14 }}>
              <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 11, color: muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>
                {row.label}
              </Text>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 15, color: fg }}>
                {row.value}
              </Text>
            </View>
          ))}

          <View style={{ height: 1, backgroundColor: border, marginBottom: 28 }} />

          <Pressable
            onPress={generate}
            style={{
              backgroundColor: primary,
              borderRadius: 14,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
            }}
          >
            <Sparkles size={18} color="#fff" />
            <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 16, color: "#fff" }}>
              Generate My Plan
            </Text>
          </Pressable>
        </ScrollView>
      </Screen>
    );
  }

  // ── Intake steps ──────────────────────────────────────────────────────────
  return (
    <Screen edges={["top"]}>
      {/* Header row */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <Pressable onPress={back} hitSlop={8} style={{ padding: 8 }}>
          <ChevronLeft size={22} color={fg} />
        </Pressable>
        {/* Progress bar */}
        <View style={{ flex: 1, height: 3, backgroundColor: border, borderRadius: 2, marginHorizontal: 12 }}>
          <View
            style={{
              width: `${((step + 1) / (TOTAL_STEPS + 1)) * 100}%`,
              height: 3,
              backgroundColor: primary,
              borderRadius: 2,
            }}
          />
        </View>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted, minWidth: 32, textAlign: "right" }}>
          {step + 1}/{TOTAL_STEPS + 1}
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 24, maxWidth: 512, width: "100%", alignSelf: "center" }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StepContent
            step={step}
            form={form}
            setForm={setForm}
            primary={primary}
            muted={muted}
            fg={fg}
            card={card}
            border={border}
          />

          <Pressable
            onPress={advance}
            disabled={!canAdvance()}
            style={{
              marginTop: 32,
              backgroundColor: canAdvance() ? primary : border,
              borderRadius: 14,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 16, color: canAdvance() ? "#fff" : muted }}>
              {step === TOTAL_STEPS - 1 ? "Review" : "Next"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ─── Step content ─────────────────────────────────────────────────────────────

function StepContent({
  step,
  form,
  setForm,
  primary,
  muted,
  fg,
  card,
  border,
}: {
  step: number;
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
  primary: string;
  muted: string;
  fg: string;
  card: string;
  border: string;
}) {
  if (step === 0) {
    return (
      <View>
        <StepLabel text="What are we building?" />
        <StepSub text="Start with a book of the Bible or a specific topic." />
        <View style={{ gap: 12, marginTop: 8 }}>
          <OptionCard
            icon={<BookOpen size={22} color={form.inputType === "book" ? primary : muted} />}
            label="A book of the Bible"
            sub="Walk through Genesis, James, Romans…"
            selected={form.inputType === "book"}
            onPress={() => setForm((f) => ({ ...f, inputType: "book", bookOrTopic: f.inputType === "book" ? f.bookOrTopic : "Genesis" }))}
            primary={primary}
            muted={muted}
            fg={fg}
            card={card}
            border={border}
          />
          <OptionCard
            icon={<MessageSquare size={22} color={form.inputType === "topic" ? primary : muted} />}
            label="A specific topic"
            sub="Anxiety, leadership, marriage, prayer…"
            selected={form.inputType === "topic"}
            onPress={() => setForm((f) => ({ ...f, inputType: "topic", bookOrTopic: f.inputType === "topic" ? f.bookOrTopic : "" }))}
            primary={primary}
            muted={muted}
            fg={fg}
            card={card}
            border={border}
          />
        </View>
      </View>
    );
  }

  if (step === 1) {
    if (form.inputType === "book") {
      return (
        <View>
          <StepLabel text="Which book?" />
          <StepSub text="Scroll to pick a book of the Bible." />
          <DrumRollPicker
            items={BIBLE_BOOKS_ORDERED}
            selectedValue={form.bookOrTopic || "Genesis"}
            onValueChange={(v) => setForm((f) => ({ ...f, bookOrTopic: v }))}
          />
        </View>
      );
    }

    return (
      <View>
        <StepLabel text="What topic?" />
        <StepSub text="Name the topic — anxiety, identity, forgiveness, purpose…" />
        <TextInput
          value={form.bookOrTopic}
          onChangeText={(v) => setForm((f) => ({ ...f, bookOrTopic: v }))}
          placeholder="e.g. anxiety"
          placeholderTextColor={muted}
          autoFocus
          autoCapitalize="none"
          style={{
            marginTop: 16,
            backgroundColor: card,
            borderWidth: 1,
            borderColor: border,
            borderRadius: 12,
            padding: 16,
            fontFamily: "DMSans_400Regular",
            fontSize: 16,
            color: fg,
          }}
        />
      </View>
    );
  }

  if (step === 2) {
    return (
      <View>
        <StepLabel text="How many days?" />
        <StepSub text="How long do you want this plan to run?" />
        <View style={{ gap: 12, marginTop: 8 }}>
          {DAY_OPTIONS.map((d) => (
            <Pressable
              key={d}
              onPress={() => setForm((f) => ({ ...f, days: d }))}
              style={{
                backgroundColor: card,
                borderWidth: 1,
                borderColor: form.days === d ? primary : border,
                borderRadius: 12,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 16, color: form.days === d ? primary : fg }}>
                {d} days
              </Text>
              {form.days === d && (
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: primary }} />
              )}
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  if (step === 3) {
    return (
      <View>
        <StepLabel text="What's the focus?" />
        <StepSub text="What do you want to get out of this plan? Be specific." />
        <TextInput
          value={form.themeFocus}
          onChangeText={(v) => setForm((f) => ({ ...f, themeFocus: v }))}
          placeholder="e.g. understanding grace, dealing with fear, growing in prayer…"
          placeholderTextColor={muted}
          multiline
          textAlignVertical="top"
          autoFocus
          style={{
            marginTop: 16,
            backgroundColor: card,
            borderWidth: 1,
            borderColor: border,
            borderRadius: 12,
            padding: 16,
            fontFamily: "DMSans_400Regular",
            fontSize: 15,
            color: fg,
            minHeight: 100,
          }}
        />
      </View>
    );
  }

  if (step === 4) {
    return (
      <View>
        <StepLabel text="Who's doing this?" />
        <StepSub text="This shapes the tone and direction of the plan." />
        <View style={{ gap: 10, marginTop: 8 }}>
          {WHO_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.id}
              label={opt.label}
              sub={opt.sub}
              selected={form.who === opt.id}
              onPress={() => setForm((f) => ({ ...f, who: opt.id }))}
              primary={primary}
              muted={muted}
              fg={fg}
              card={card}
              border={border}
            />
          ))}
        </View>
      </View>
    );
  }

  if (step === 5) {
    return (
      <View>
        <StepLabel text="Anything else we should know?" />
        <StepSub text="Optional — any context that would shape the plan. A season someone is in, a challenge they're facing, a goal they have." />
        <TextInput
          value={form.context}
          onChangeText={(v) => setForm((f) => ({ ...f, context: v }))}
          placeholder="e.g. my friend just lost his job and is questioning his faith…"
          placeholderTextColor={muted}
          multiline
          textAlignVertical="top"
          style={{
            marginTop: 16,
            backgroundColor: card,
            borderWidth: 1,
            borderColor: border,
            borderRadius: 12,
            padding: 16,
            fontFamily: "DMSans_400Regular",
            fontSize: 15,
            color: fg,
            minHeight: 120,
          }}
        />
      </View>
    );
  }

  return null;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

// ─── Drum roll book picker ────────────────────────────────────────────────────

const DRUM_ITEM_HEIGHT = 52;
const DRUM_VISIBLE = 5;

function DrumRollPicker({
  items,
  selectedValue,
  onValueChange,
}: {
  items: string[];
  selectedValue: string;
  onValueChange: (v: string) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const fg = useThemeColor("foreground");
  const card = useThemeColor("card");
  const border = useThemeColor("border");

  const initialIndex = Math.max(0, items.indexOf(selectedValue));

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: initialIndex * DRUM_ITEM_HEIGHT, animated: false });
    }, 60);
    return () => clearTimeout(t);
  }, []);

  const commit = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(Math.round(y / DRUM_ITEM_HEIGHT), items.length - 1));
    onValueChange(items[index]!);
  };

  return (
    <View
      style={{
        height: DRUM_ITEM_HEIGHT * DRUM_VISIBLE,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: card,
        borderWidth: 1,
        borderColor: border,
        marginTop: 16,
      }}
    >
      {/* Selection highlight */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: DRUM_ITEM_HEIGHT * Math.floor(DRUM_VISIBLE / 2),
          left: 12,
          right: 12,
          height: DRUM_ITEM_HEIGHT,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: primary,
          borderRadius: 8,
          zIndex: 1,
        }}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={DRUM_ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={commit}
        onScrollEndDrag={commit}
        contentContainerStyle={{ paddingVertical: DRUM_ITEM_HEIGHT * Math.floor(DRUM_VISIBLE / 2) }}
      >
        {items.map((item) => {
          const selected = item === selectedValue;
          return (
            <Pressable
              key={item}
              style={{ height: DRUM_ITEM_HEIGHT, alignItems: "center", justifyContent: "center" }}
              onPress={() => {
                const index = items.indexOf(item);
                scrollRef.current?.scrollTo({ y: index * DRUM_ITEM_HEIGHT, animated: true });
                onValueChange(item);
              }}
            >
              <Text
                style={{
                  fontFamily: selected ? "DMSans_700Bold" : "DMSans_400Regular",
                  fontSize: selected ? 17 : 15,
                  color: selected ? fg : muted,
                }}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function StepLabel({ text }: { text: string }) {
  const fg = useThemeColor("foreground");
  return (
    <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, color: fg, marginBottom: 8 }}>
      {text}
    </Text>
  );
}

function StepSub({ text }: { text: string }) {
  const muted = useThemeColor("muted-foreground");
  return (
    <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: muted, lineHeight: 22, marginBottom: 8 }}>
      {text}
    </Text>
  );
}

function OptionCard({
  icon,
  label,
  sub,
  selected,
  onPress,
  primary,
  muted,
  fg,
  card,
  border,
}: {
  icon?: React.ReactNode;
  label: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
  primary: string;
  muted: string;
  fg: string;
  card: string;
  border: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: card,
        borderWidth: 1,
        borderColor: selected ? primary : border,
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      {icon ? <View style={{ width: 28, alignItems: "center" }}>{icon}</View> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 15, color: selected ? primary : fg }}>
          {label}
        </Text>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted, marginTop: 2 }}>
          {sub}
        </Text>
      </View>
      {selected && (
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: primary }} />
      )}
    </Pressable>
  );
}
