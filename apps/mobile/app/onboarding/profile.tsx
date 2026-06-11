import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Camera } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useThemeColor } from "@/components/useThemeColor";
import { useProfile } from "@/lib/queries";
import { useOnboarding } from "./_layout";

export default function CompleteProfile() {
  const router = useRouter();
  const profile = useProfile();
  const { displayName, survey, set, setSurvey } = useOnboarding();
  const [name, setName] = useState(displayName);
  const [church, setChurch] = useState(survey.churchName);
  const iconColor = useThemeColor("muted-foreground");

  // Prefill from the profile we already have on the server (created at signup
  // for first-time users, or persisted from a prior onboarding pass).
  useEffect(() => {
    if (!name && profile.data?.displayName) setName(profile.data.displayName);
    if (!church && profile.data?.churchName) setChurch(profile.data.churchName);
  }, [profile.data?.displayName, profile.data?.churchName]);

  const onContinue = () => {
    set({ displayName: name.trim() });
    setSurvey({ churchName: church.trim() });
    router.push("/onboarding/role");
  };

  return (
    <Screen center className="px-8">
      <Text className="font-serif text-3xl font-bold text-foreground">
        Complete Your Profile
      </Text>
      <Text className="mb-8 mt-2 text-sm text-muted-foreground">
        Let your group know who you are
      </Text>

      <Pressable className="mb-8 h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-border bg-card">
        <Camera size={28} color={iconColor} />
      </Pressable>

      <View className="w-full max-w-sm gap-4">
        <Input
          label="Display Name"
          placeholder="Your name"
          value={name}
          onChangeText={setName}
        />
        <Input
          label="Home Church (optional)"
          placeholder="e.g. Grace Community Church"
          value={church}
          onChangeText={setChurch}
        />
        <Button title="Continue" disabled={!name.trim()} onPress={onContinue} />
      </View>
    </Screen>
  );
}
