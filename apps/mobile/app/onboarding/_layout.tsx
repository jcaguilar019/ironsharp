import { createContext, useContext, useState, type ReactNode } from "react";
import { Stack } from "expo-router";

export type OnboardingSurvey = {
  ageRange: string | null;
  gender: string | null;
  state: string;
  city: string;
  education: string | null;
  familyJoinCode: string | null;
  hasChurch: boolean | null;
  churchName: string;
  devotionalRating: number | null;
  faithJourney: string | null;
  goals: string[];
  relationshipStatus: string | null;
  hasKids: boolean | null;
};

type OnboardingState = {
  displayName: string;
  survey: OnboardingSurvey;
};

const DEFAULT_SURVEY: OnboardingSurvey = {
  ageRange: null,
  gender: null,
  state: "",
  city: "",
  education: null,
  familyJoinCode: null,
  hasChurch: null,
  churchName: "",
  devotionalRating: null,
  faithJourney: null,
  goals: [],
  relationshipStatus: null,
  hasKids: null,
};

type Ctx = OnboardingState & {
  set: (patch: Partial<OnboardingState>) => void;
  setSurvey: (patch: Partial<OnboardingSurvey>) => void;
};

const OnboardingContext = createContext<Ctx | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used inside onboarding flow");
  return ctx;
}

export default function OnboardingLayout() {
  const [state, setState] = useState<OnboardingState>({
    displayName: "",
    survey: DEFAULT_SURVEY,
  });

  const set = (patch: Partial<OnboardingState>) =>
    setState((s) => ({ ...s, ...patch }));

  const setSurvey = (patch: Partial<OnboardingSurvey>) =>
    setState((s) => ({ ...s, survey: { ...s.survey, ...patch } }));

  return (
    <OnboardingContext.Provider value={{ ...state, set, setSurvey }}>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
    </OnboardingContext.Provider>
  );
}
