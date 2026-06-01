import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Link } from "expo-router";
import { Screen } from "@/components/Screen";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { authClient } from "@/lib/auth-client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: "ironsharp://reset-password",
      });
      setSent(true);
    } catch {
      // Email delivery isn't configured in the foundation build yet.
      Alert.alert(
        "Almost there",
        "Password reset emails turn on once an email provider is configured on the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen center className="px-8">
      <Text className="mb-2 font-serif text-3xl font-bold text-foreground">
        Reset Password
      </Text>
      <Text className="mb-8 max-w-xs text-center text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a link to get back in.
      </Text>

      {sent ? (
        <Text className="max-w-xs text-center text-sm text-foreground">
          If an account exists for {email}, a reset link is on its way.
        </Text>
      ) : (
        <View className="w-full max-w-sm gap-4">
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Button title="Send Reset Link" loading={loading} onPress={handleReset} />
        </View>
      )}

      <Link href="/(auth)/login" className="mt-6 text-sm text-primary">
        Back to log in
      </Link>
    </Screen>
  );
}
