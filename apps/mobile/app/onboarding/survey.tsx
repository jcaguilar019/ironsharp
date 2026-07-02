import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, ChevronDown } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { BottomSheet } from "@/components/BottomSheet";
import { Input } from "@/components/Input";
import { useThemeColor } from "@/components/useThemeColor";
import { ApiClient } from "@/lib/api";
import { US_STATES } from "@/lib/usStates";
import { useOnboarding } from "./_layout";

const MIDDLE_SCHOOL = "Junior High or Middle School";

const RELATIONSHIP_OPTIONS = ["Single", "Dating", "Engaged", "Married"];

const GENDER_OPTIONS = ["Male", "Female"];

const EDU_OPTIONS = [
  MIDDLE_SCHOOL,
  "Still in high school",
  "In college or trade school",
  "College graduate",
  "Graduate degree",
  "I took a different path",
];

const FAITH_OPTIONS = [
  "Just getting started — I'm new to Christianity",
  "Growing — I believe and I'm trying to go deeper",
  "Established — I've walked with God for years",
  "Returning — I'm coming back after some time away",
  "Exploring — I'm not sure what I believe yet but I'm open",
];

const GOAL_OPTIONS = [
  "I need help being consistent in my time with God",
  "I'm looking for real accountability, not just a reading plan",
  "I want to become who God is calling me to be",
  "I want faith to be part of our home, not just Sundays",
  "I want to pour into someone else's life",
  "I want to get back on track with my relationship with God",
];

type ChurchOption = "yes" | "no" | "looking" | null;

function ProgressBar({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <View className="px-6 pt-4 pb-2">
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-xs font-sans-medium text-muted-foreground">
          {step} of {totalSteps}
        </Text>
      </View>
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </View>
    </View>
  );
}

function ListOption({
  label,
  active,
  onPress,
  multi,
  disabled,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  multi?: boolean;
  disabled?: boolean;
}) {
  const checkColor = useThemeColor("primary-foreground");
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={multi ? "checkbox" : "radio"}
      accessibilityState={{ checked: active, disabled: !!disabled }}
      className={`flex-row items-center gap-3 rounded-xl border-2 p-3.5 ${
        active
          ? "border-primary bg-primary/5"
          : disabled
          ? "border-border bg-card opacity-40"
          : "border-border bg-card active:opacity-70"
      }`}
    >
      <View
        className={`h-6 w-6 items-center justify-center ${multi ? "rounded-md" : "rounded-full"} ${
          active ? "bg-primary" : "border-2 border-border bg-card"
        }`}
      >
        {active ? <Check size={14} color={checkColor} strokeWidth={3} /> : null}
      </View>
      <Text className="flex-1 text-sm text-foreground">{label}</Text>
    </Pressable>
  );
}

export default function OnboardingSurvey() {
  const router = useRouter();
  const { displayName, survey, set, setSurvey } = useOnboarding();
  const primaryColor = useThemeColor("primary");
  const mutedColor = useThemeColor("muted-foreground");
  const foregroundColor = useThemeColor("foreground");

  const [step, setStep] = useState(1);
  const scrollRef = useRef<ScrollView>(null);
  const [statePickerOpen, setStatePickerOpen] = useState(false);

  // Local answers
  const [name, setName] = useState(displayName);
  const [age, setAge] = useState(survey.ageRange ?? "");
  const [gender, setGender] = useState(survey.gender ?? "");
  const [usState, setUsState] = useState(survey.state ?? "");
  const [city, setCity] = useState(survey.city ?? "");
  const [education, setEducation] = useState(survey.education ?? "");
  const [familyJoinCode, setFamilyJoinCode] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [familyCodeError, setFamilyCodeError] = useState("");
  const [validatedFamilyCode, setValidatedFamilyCode] = useState("");
  const [churchOption, setChurchOption] = useState<ChurchOption>(
    survey.hasChurch === true ? "yes" : survey.hasChurch === false ? "no" : null
  );
  const [churchName, setChurchName] = useState(survey.churchName ?? "");
  const [devotionalRating, setDevotionalRating] = useState<number | null>(survey.devotionalRating);
  const [faithJourney, setFaithJourney] = useState(survey.faithJourney ?? "");
  const [goals, setGoals] = useState<string[]>(survey.goals ?? []);
  const [relationshipStatus, setRelationshipStatus] = useState(survey.relationshipStatus ?? "");
  const [hasKids, setHasKids] = useState<boolean | null>(survey.hasKids ?? null);

  const isMiddleSchool = education === MIDDLE_SCHOOL;
  const TOTAL = isMiddleSchool ? 11 : 10;
  // For steps > 5, shift everything up by 1 when middle school (step 6 = family code)
  const offset = isMiddleSchool ? 1 : 0;

  const isFamilyCodeStep = step === 6 && isMiddleSchool;

  const canContinue =
    step === 1 ? name.trim().length > 0 :
    step === 2 ? Number(age) > 0 :
    step === 3 ? !!gender :
    step === 4 ? !!usState :
    step === 5 ? !!education :
    isFamilyCodeStep ? familyJoinCode.trim().length === 6 :
    (step - offset === 6) ? churchOption !== null :
    (step - offset === 7) ? devotionalRating !== null :
    (step - offset === 8) ? !!faithJourney :
    (step - offset === 9) ? goals.length > 0 :
    (step - offset === 10) ? (!!relationshipStatus && (relationshipStatus !== "Married" || hasKids !== null)) :
    false;

  const advance = () => {
    if (step < TOTAL) {
      setStep((s) => s + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      set({ displayName: name.trim() });
      setSurvey({
        ageRange: age.trim() || null,
        gender: gender || null,
        state: usState,
        city,
        education: education || null,
        familyJoinCode: validatedFamilyCode || null,
        hasChurch: churchOption === "yes" ? true : churchOption === "no" ? false : false,
        churchName: churchOption === "yes" ? churchName : "",
        devotionalRating,
        faithJourney: faithJourney || null,
        goals,
        relationshipStatus: relationshipStatus || null,
        hasKids: relationshipStatus === "Married" ? hasKids : null,
      });
      router.push("/onboarding/welcome");
    }
  };

  const handleContinue = async () => {
    if (isFamilyCodeStep) {
      setValidatingCode(true);
      setFamilyCodeError("");
      try {
        const result = await ApiClient.validateFamilyCode(familyJoinCode.trim().toUpperCase());
        if (result.valid) {
          setValidatedFamilyCode(familyJoinCode.trim().toUpperCase());
          advance();
        } else {
          setFamilyCodeError("That code doesn't match any Family account. Check with your parent or guardian.");
        }
      } catch {
        setFamilyCodeError("Couldn't verify the code. Check your connection and try again.");
      } finally {
        setValidatingCode(false);
      }
      return;
    }
    advance();
  };

  const goBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      setFamilyCodeError("");
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const toggleGoal = (g: string) => {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : prev.length < 2 ? [...prev, g] : prev
    );
  };

  return (
    <Screen edges={["top"]}>
      {/* Top bar: progress + back arrow */}
      <View>
        {step > 1 && (
          <Pressable
            onPress={goBack}
            className="absolute left-3 top-3 z-10 p-2"
            hitSlop={8}
          >
            <ArrowLeft size={28} color={foregroundColor} strokeWidth={2.5} />
          </Pressable>
        )}
        {step > 1 ? <ProgressBar step={step} totalSteps={TOTAL} /> : <View className="pt-6" />}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          ref={scrollRef}
          contentContainerClassName="px-6 pb-36 pt-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Q1: Name ── */}
          {step === 1 && (
            <View>
              <Text className="font-serif text-3xl font-bold leading-snug text-foreground mb-8">
                Hey, thanks for signing up! It's a pleasure to walk alongside you. What's your name?
              </Text>
              <Input
                placeholder="Your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => { if (canContinue) handleContinue(); }}
              />
            </View>
          )}

          {/* ── Q2: Age ── */}
          {step === 2 && (
            <View>
              <Text className="font-serif text-2xl font-bold text-foreground mb-6">
                How old are you?
              </Text>
              <Input
                placeholder="Your age"
                value={age}
                onChangeText={(t) => setAge(t.replace(/[^0-9]/g, "").slice(0, 3))}
                keyboardType="number-pad"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => { if (canContinue) handleContinue(); }}
              />
            </View>
          )}

          {/* ── Q3: Gender ── */}
          {step === 3 && (
            <View>
              <Text className="font-serif text-2xl font-bold text-foreground mb-6">
                What's your gender?
              </Text>
              <View className="gap-2.5">
                {GENDER_OPTIONS.map((opt) => (
                  <ListOption
                    key={opt}
                    label={opt}
                    active={gender === opt}
                    onPress={() => setGender(opt)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Q4: State + City ── */}
          {step === 4 && (
            <View>
              <Text className="font-serif text-2xl font-bold text-foreground mb-6">
                Where are you based?
              </Text>
              <Pressable
                onPress={() => setStatePickerOpen(true)}
                className="h-12 flex-row items-center justify-between rounded-xl border border-input bg-card px-4"
              >
                <Text
                  className={`text-base font-sans ${usState ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {usState || "Select your state"}
                </Text>
                <ChevronDown size={18} color={mutedColor} />
              </Pressable>

              {usState ? (
                <View className="mt-4">
                  <Input
                    label="And your city?"
                    placeholder="Your city (optional)"
                    value={city}
                    onChangeText={setCity}
                    autoCapitalize="words"
                    returnKeyType="done"
                  />
                </View>
              ) : null}

              <BottomSheet
                visible={statePickerOpen}
                onClose={() => setStatePickerOpen(false)}
                contentStyle={{ padding: 0, maxHeight: "60%" }}
              >
                  <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
                    <Text className="font-sans-semibold text-base text-foreground">
                      Select your state
                    </Text>
                    <Pressable onPress={() => setStatePickerOpen(false)} hitSlop={8}>
                      <Text className="font-sans-semibold text-sm text-primary">Done</Text>
                    </Pressable>
                  </View>
                  <FlatList
                    data={US_STATES}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <Pressable
                        onPress={() => {
                          setUsState(item);
                          setStatePickerOpen(false);
                        }}
                        className="flex-row items-center justify-between border-b border-border/50 px-5 py-3.5"
                      >
                        <Text className="font-sans text-base text-foreground">{item}</Text>
                        {usState === item && <Check size={16} color={primaryColor} />}
                      </Pressable>
                    )}
                  />
              </BottomSheet>
            </View>
          )}

          {/* ── Q5: Education ── */}
          {step === 5 && (
            <View>
              <Text className="font-serif text-2xl font-bold text-foreground mb-6">
                Where are you in your education?
              </Text>
              <View className="gap-2.5">
                {EDU_OPTIONS.map((opt) => (
                  <ListOption
                    key={opt}
                    label={opt}
                    active={education === opt}
                    onPress={() => setEducation(opt)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Q4b: Family Code (middle school only) ── */}
          {isFamilyCodeStep && (
            <View>
              <Text className="font-serif text-2xl font-bold leading-snug text-foreground mb-3">
                Enter your family code
              </Text>
              <Text className="mb-8 text-sm text-muted-foreground leading-relaxed">
                A parent or guardian with a Family membership will have a 6-character code to share with you. Enter it below to link your account.
              </Text>
              <Input
                placeholder="e.g. IRON34"
                value={familyJoinCode}
                onChangeText={(t) => {
                  setFamilyJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
                  setFamilyCodeError("");
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => { if (canContinue) handleContinue(); }}
                style={{ letterSpacing: 4, fontSize: 22, textAlign: "center", fontFamily: "DMSans_700Bold" }}
              />
              {!!familyCodeError && (
                <Text className="mt-3 text-center text-sm text-destructive">
                  {familyCodeError}
                </Text>
              )}
            </View>
          )}

          {/* ── Q6/7: Church ── */}
          {step - offset === 6 && !isFamilyCodeStep && (
            <View>
              <Text className="font-serif text-2xl font-bold text-foreground mb-6">
                Do you belong to a church?
              </Text>
              <View className="gap-2.5">
                <ListOption
                  label="Yes"
                  active={churchOption === "yes"}
                  onPress={() => setChurchOption("yes")}
                />
                <ListOption
                  label="No"
                  active={churchOption === "no"}
                  onPress={() => { setChurchOption("no"); setChurchName(""); }}
                />
                <ListOption
                  label="Not currently but looking"
                  active={churchOption === "looking"}
                  onPress={() => { setChurchOption("looking"); setChurchName(""); }}
                />
              </View>
              {churchOption === "yes" && (
                <View className="mt-4">
                  <Input
                    placeholder="What's the name of your church? (optional)"
                    value={churchName}
                    onChangeText={setChurchName}
                    autoCapitalize="words"
                  />
                </View>
              )}
            </View>
          )}

          {/* ── Q7/8: Devotional rating ── */}
          {step - offset === 7 && (
            <View>
              <Text className="font-serif text-2xl font-bold leading-snug text-foreground mb-2">
                How would you rate your current devotional life and time with God?
              </Text>
              <Text className="mb-8 text-sm text-muted-foreground">
                Be honest — that's what this is for.
              </Text>
              <View className="flex-row gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setDevotionalRating(n)}
                    className={`flex-1 items-center justify-center rounded-xl border-2 py-5 ${
                      devotionalRating === n
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card active:opacity-70"
                    }`}
                  >
                    <Text
                      className={`font-serif text-2xl font-bold ${
                        devotionalRating === n ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className="mt-3 flex-row justify-between">
                <Text className="text-xs text-muted-foreground">Rarely or never</Text>
                <Text className="text-xs text-muted-foreground">Every day</Text>
              </View>
            </View>
          )}

          {/* ── Q8/9: Faith journey ── */}
          {step - offset === 8 && (
            <View>
              <Text className="font-serif text-2xl font-bold leading-snug text-foreground mb-2">
                How would you describe where you are in your faith right now?
              </Text>
              <Text className="mb-6 text-sm text-muted-foreground">
                No right or wrong answer.
              </Text>
              <View className="gap-2.5">
                {FAITH_OPTIONS.map((opt) => (
                  <ListOption
                    key={opt}
                    label={opt}
                    active={faithJourney === opt}
                    onPress={() => setFaithJourney(opt)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Q9/10: Goals ── */}
          {step - offset === 9 && (
            <View>
              <Text className="font-serif text-2xl font-bold leading-snug text-foreground mb-2">
                What are you most hoping IronSharp helps you with?
              </Text>
              <Text className="mb-6 text-sm text-muted-foreground">Pick up to two.</Text>
              <View className="gap-2.5">
                {GOAL_OPTIONS.map((opt) => {
                  const active = goals.includes(opt);
                  return (
                    <ListOption
                      key={opt}
                      label={opt}
                      active={active}
                      onPress={() => toggleGoal(opt)}
                      multi
                      disabled={goals.length >= 2 && !active}
                    />
                  );
                })}
              </View>
              {goals.length >= 2 && (
                <Text className="mt-4 text-center text-xs text-muted-foreground">
                  Maximum 2 selected — deselect one to change your choice.
                </Text>
              )}
            </View>
          )}

          {/* ── Q10/11: Relationship status ── */}
          {step - offset === 10 && (
            <View>
              <Text className="font-serif text-2xl font-bold leading-snug text-foreground mb-6">
                What's your relationship status?
              </Text>
              <View className="gap-2.5">
                {RELATIONSHIP_OPTIONS.map((opt) => (
                  <ListOption
                    key={opt}
                    label={opt}
                    active={relationshipStatus === opt}
                    onPress={() => {
                      setRelationshipStatus(opt);
                      if (opt !== "Married") setHasKids(null);
                    }}
                  />
                ))}
              </View>
              {relationshipStatus === "Married" && (
                <View className="mt-5">
                  <Text className="font-serif text-lg font-bold text-foreground mb-3">
                    Do you have kids?
                  </Text>
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => setHasKids(true)}
                      className={`flex-1 items-center justify-center rounded-xl border-2 py-4 ${
                        hasKids === true ? "border-primary bg-primary/10" : "border-border bg-card active:opacity-70"
                      }`}
                    >
                      <Text className={`font-sans-semibold text-base ${hasKids === true ? "text-primary" : "text-foreground"}`}>
                        Yes
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setHasKids(false)}
                      className={`flex-1 items-center justify-center rounded-xl border-2 py-4 ${
                        hasKids === false ? "border-primary bg-primary/10" : "border-border bg-card active:opacity-70"
                      }`}
                    >
                      <Text className={`font-sans-semibold text-base ${hasKids === false ? "text-primary" : "text-foreground"}`}>
                        No
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed bottom CTA */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-6 py-4">
        <Button
          title={step === TOTAL ? "Finish" : "Continue"}
          disabled={!canContinue || validatingCode}
          loading={validatingCode}
          onPress={handleContinue}
        />
      </View>
    </Screen>
  );
}
