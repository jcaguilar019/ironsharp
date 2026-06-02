import { ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { Screen } from "@/components/Screen";
import { useAuthed, useProfile } from "@/lib/queries";
import { useThemeColor } from "@/components/useThemeColor";

/**
 * Entry gate (mirrors the old web ProtectedRoute + AppLayout):
 *  - no session            → auth flow
 *  - session, no survey    → onboarding
 *  - session + survey done → main app
 */
export default function Index() {
  const { authed, isPending } = useAuthed();
  const profile = useProfile();
  const spinner = useThemeColor("primary");

  if (isPending || (authed && profile.isLoading)) {
    return (
      <Screen center>
        <ActivityIndicator color={spinner} />
      </Screen>
    );
  }

  if (!authed) return <Redirect href="/(auth)/welcome" />;

  const onboarded = !!profile.data?.surveyCompletedAt;
  return <Redirect href={onboarded ? "/(tabs)/home" : "/onboarding/role"} />;
}
