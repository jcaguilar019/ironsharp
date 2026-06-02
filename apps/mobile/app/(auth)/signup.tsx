import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { SocialButtons } from "@/components/SocialButtons";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/lib/session";

export default function Signup() {
  const router = useRouter();
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (password.length < 6) {
      Alert.alert("Password too short", "Use at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords don’t match", "Please re-enter your password.");
      return;
    }
    setLoading(true);
    // Better Auth requires a name; default it from the email until the user
    // sets a display name during onboarding.
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: email.split("@")[0] ?? "Friend",
    });
    if (error) {
      setLoading(false);
      Alert.alert("Sign up failed", error.message ?? "Please try again.");
      return;
    }
    // A session is created on sign up — head into onboarding via the gate.
    await refresh();
    setLoading(false);
    router.replace("/");
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow items-center justify-center px-8 py-12"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-8 font-serif text-3xl font-bold text-foreground">
            Create Account
          </Text>

          <View className="w-full max-w-sm gap-4">
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
            />
            <Input
              label="Confirm Password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />
            <Button title="Sign Up" loading={loading} onPress={handleSignup} />
          </View>

          <SocialButtons />

          <Text className="mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/(auth)/login" className="text-primary">
              Log in
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
