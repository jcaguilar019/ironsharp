import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { authClient } from "@/lib/auth-client";

/**
 * Password reset via Neon Auth's built-in email provider.
 *
 * Neon's default sender (auth@mail.myneon.app) sends one-time CODES (it does
 * not send reset links — those need custom SMTP). So this is a single in-app
 * flow: request a code, then enter the code + a new password. No deep link.
 *   forgetPassword.emailOtp({ email })            → POST /forget-password/email-otp
 *   emailOtp.resetPassword({ email, otp, password }) → POST /email-otp/reset-password
 */
export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await authClient.forgetPassword.emailOtp({ email: email.trim() });
      if (error) {
        Alert.alert("Couldn't send code", error.message ?? "Check the email address and try again.");
        return;
      }
      setStep("reset");
    } catch (err) {
      Alert.alert("Couldn't send code", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    if (otp.trim().length < 6) {
      Alert.alert("Enter the code", "Paste the 6-digit code from your email.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords don't match", "Please re-enter your new password.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await authClient.emailOtp.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        password,
      });
      if (error) {
        Alert.alert("Couldn't reset password", error.message ?? "That code may be wrong or expired.");
        return;
      }
      Alert.alert("Password updated", "You can now log in with your new password.");
      router.replace("/(auth)/login");
    } catch (err) {
      Alert.alert(
        "Couldn't reset password",
        err instanceof Error ? err.message : "That code may be wrong or expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
        <ScrollView
          contentContainerClassName="flex-grow items-center justify-center px-8 py-12"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
      <Text className="mb-2 font-serif text-3xl font-bold text-foreground">Reset Password</Text>

      {step === "email" ? (
        <>
          <Text className="mb-8 max-w-xs text-center text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a code to reset your password.
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
            <Button title="Send Code" loading={loading} onPress={sendCode} />
          </View>
        </>
      ) : (
        <>
          <Text className="mb-8 max-w-xs text-center text-sm text-muted-foreground">
            We sent a 6-digit code to {email}. Enter it below with your new password.
          </Text>
          <View className="w-full max-w-sm gap-4">
            <Input
              label="Code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
            />
            <Input
              label="New Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
              autoCapitalize="none"
            />
            <Input
              label="Confirm Password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="password-new"
              autoCapitalize="none"
            />
            <Button title="Reset Password" loading={loading} onPress={submitReset} />
          </View>
          <Pressable onPress={sendCode} disabled={loading} className="mt-4">
            <Text className="text-sm text-primary">Resend code</Text>
          </Pressable>
        </>
      )}

      <Link href="/(auth)/login" className="mt-6 text-sm text-primary">
        Back to log in
      </Link>
        </ScrollView>
    </Screen>
  );
}
