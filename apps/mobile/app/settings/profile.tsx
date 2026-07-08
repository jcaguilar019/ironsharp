import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { BottomSheet } from "@/components/BottomSheet";
import { useThemeColor } from "@/components/useThemeColor";
import { useProfile } from "@/lib/queries";
import { ApiClient } from "@/lib/api";
import { US_STATES } from "@/lib/usStates";

export default function EditProfile() {
  const router = useRouter();
  const qc = useQueryClient();
  const profile = useProfile();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [usState, setUsState] = useState("");
  const [city, setCity] = useState("");
  const [church, setChurch] = useState("");
  const [statePickerOpen, setStatePickerOpen] = useState(false);

  // Prefill once the profile loads.
  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.displayName ?? "");
    setAge(profile.data.surveyAgeRange ?? "");
    setUsState(profile.data.surveyState ?? "");
    setCity(profile.data.surveyCity ?? "");
    setChurch(profile.data.churchName ?? "");
  }, [profile.data]);

  const original = {
    name: profile.data?.displayName ?? "",
    age: profile.data?.surveyAgeRange ?? "",
    state: profile.data?.surveyState ?? "",
    city: profile.data?.surveyCity ?? "",
    church: profile.data?.churchName ?? "",
  };
  const trimmedName = name.trim();
  const trimmedCity = city.trim();
  const trimmedChurch = church.trim();
  const changed =
    trimmedName !== original.name ||
    age !== original.age ||
    usState !== original.state ||
    trimmedCity !== original.city ||
    trimmedChurch !== original.church;

  const save = useMutation({
    mutationFn: () =>
      ApiClient.updateProfile({
        displayName: trimmedName,
        // Send explicit null when blank so a field can be cleared.
        surveyAgeRange: age.trim() || null,
        surveyState: usState || null,
        surveyCity: trimmedCity || null,
        churchName: trimmedChurch || null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"] });
      router.back();
    },
    onError: (err: Error) => {
      Alert.alert("Couldn’t save profile", err.message || "Please try again.");
    },
  });

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title="Edit Profile" subtitle="Your info" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="mx-auto w-full max-w-lg gap-4 px-6 py-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input
            label="Display Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Input
            label="Age"
            placeholder="Your age"
            value={age}
            onChangeText={(t) => setAge(t.replace(/[^0-9]/g, "").slice(0, 3))}
            keyboardType="number-pad"
            returnKeyType="next"
          />

          {/* Location: state picker + city */}
          <View>
            <Text className="mb-1.5 text-sm font-sans-medium text-foreground">Location</Text>
            <Pressable
              onPress={() => setStatePickerOpen(true)}
              className="h-12 flex-row items-center justify-between rounded-xl border border-input bg-card px-4"
            >
              <Text
                className={`text-base font-sans ${usState ? "text-foreground" : "text-muted-foreground"}`}
              >
                {usState || "Select your state"}
              </Text>
              <ChevronDown size={18} color={muted} />
            </Pressable>
          </View>

          <Input
            placeholder="Your city (optional)"
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Input
            label="Church (optional)"
            placeholder="e.g. Grace Community Church"
            value={church}
            onChangeText={setChurch}
            autoCapitalize="words"
            returnKeyType="done"
          />

          <View className="mt-2">
            <Button
              title="Save"
              disabled={!trimmedName || !changed}
              loading={save.isPending}
              onPress={() => save.mutate()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={statePickerOpen}
        onClose={() => setStatePickerOpen(false)}
        contentStyle={{ padding: 0, maxHeight: "60%" }}
      >
        <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
          <Text className="font-sans-semibold text-base text-foreground">Select your state</Text>
          <Pressable onPress={() => setStatePickerOpen(false)} hitSlop={8}>
            <Text className="font-sans-semibold text-sm text-primary">Done</Text>
          </Pressable>
        </View>
        <FlatList
          data={US_STATES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setUsState(item);
                setStatePickerOpen(false);
              }}
              className="flex-row items-center justify-between border-b border-border/50 px-5 py-3.5"
            >
              <Text className="font-sans text-base text-foreground">{item}</Text>
              {usState === item && <Check size={16} color={primary} />}
            </Pressable>
          )}
        />
      </BottomSheet>
    </Screen>
  );
}
