import { createContext, useContext, useState, type ReactNode } from "react";
import { Stack } from "expo-router";

export type OnboardingRole = "discipler" | "disciple" | "partner";

export type OnboardingSurvey = {
  ageRange: string | null;
  state: string;
  city: string;
  education: string | null;
  hasChurch: boolean | null;
  churchName: string;
  devotionalRating: number | null;
  faithJourney: string | null;
  goals: string[];
};

type OnboardingState = {
  displayName: string;
  role: OnboardingRole | null;
  planId: string | null;
  survey: OnboardingSurvey;
};

const DEFAULT_SURVEY: OnboardingSurvey = {
  ageRange: null,
  state: "",
  city: "",
  education: null,
  hasChurch: null,
  churchName: "",
  devotionalRating: null,
  faithJourney: null,
  goals: [],
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
    role: null,
    planId: null,
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
