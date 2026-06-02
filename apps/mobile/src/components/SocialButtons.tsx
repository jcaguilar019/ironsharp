import { Alert, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { authClient } from "@/lib/auth-client";

/**
 * Google / Apple sign-in. These work once the matching provider keys are set in
 * the server's .env; until then the server simply won't advertise the provider
 * and the user gets a clear message.
 */
export function SocialButtons() {
  const handle = async (provider: "google" | "apple") => {
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: "/",
      });
    } catch (err) {
      Alert.alert(
        "Not available yet",
        `${provider === "google" ? "Google" : "Apple"} sign-in isn't configured on the server yet.`
      );
    }
  };

  return (
    <View className="w-full max-w-sm">
      <View className="my-6 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="text-xs text-muted-foreground">or continue with</Text>
        <View className="h-px flex-1 bg-border" />
      </View>
      <View className="gap-3">
        <Button title="Continue with Google" variant="outline" onPress={() => handle("google")} />
        <Button title="Continue with Apple" variant="dark" onPress={() => handle("apple")} />
      </View>
    </View>
  );
}
