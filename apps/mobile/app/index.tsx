import { ActivityIndicator } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { ErrorState } from "@/components/ErrorState";
import { useAuthed, useProfile } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { authClient, clearAuthToken } from "@/lib/auth-client";
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
  const { refresh } = useSession();
  const router = useRouter();
  const spinner = useThemeColor("primary");

  if (isPending || (authed && profile.isLoading)) {
    return (
      <Screen center>
        <ActivityIndicator color={spinner} />
      </Screen>
    );
  }

  if (!authed) return <Redirect href="/(auth)/welcome" />;

  // Authed but the profile fetch failed — previously this spun forever with no
  // escape. Offer a retry and a sign-out so the user is never trapped.
  if (profile.isError) {
    return (
      <Screen center>
        <ErrorState
          message="We couldn't load your profile. Check your connection and try again."
          onRetry={() => profile.refetch()}
          secondaryLabel="Sign out"
          onSecondary={async () => {
            await authClient.signOut().catch(() => {});
            await clearAuthToken();
            await refresh();
            router.replace("/(auth)/welcome");
          }}
        />
      </Screen>
    );
  }

  const onboarded = !!profile.data?.surveyCompletedAt;
  return <Redirect href={onboarded ? "/(tabs)/home" : "/onboarding/survey"} />;
}
