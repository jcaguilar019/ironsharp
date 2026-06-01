import { createContext, useContext, useState, type ReactNode } from "react";
import { Stack } from "expo-router";

export type OnboardingRole = "discipler" | "disciple" | "partner";

type OnboardingState = {
  displayName: string;
  churchName: string;
  role: OnboardingRole | null;
  planId: string | null;
};

type Ctx = OnboardingState & {
  set: (patch: Partial<OnboardingState>) => void;
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
    churchName: "",
    role: null,
    planId: null,
  });

  const set = (patch: Partial<OnboardingState>) =>
    setState((s) => ({ ...s, ...patch }));

  return (
    <OnboardingContext.Provider value={{ ...state, set }}>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
    </OnboardingContext.Provider>
  );
}
