import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/lib/session";

export default function Login() {
  const router = useRouter();
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        Alert.alert("Login failed", error.message ?? "Check your email and password.");
        return;
      }
      await refresh();
      router.replace("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Check your email and password.";
      Alert.alert("Login failed", message);
    } finally {
      setLoading(false);
    }
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
            Welcome Back
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
              autoComplete="password"
            />
            <Button
              title="Log In"
              loading={loading}
              disabled={!email.trim() || !password}
              onPress={handleLogin}
            />
          </View>

          <View className="mt-6 items-center gap-2">
            <Link href="/(auth)/forgot-password" className="text-sm text-primary">
              Forgot password?
            </Link>
            <Text className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/(auth)/signup" className="text-primary">
                Sign up
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
