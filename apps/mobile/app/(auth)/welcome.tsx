import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";

export default function Welcome() {
  const router = useRouter();

  return (
    <Screen center className="px-8">
      <View className="mb-6 items-center">
        <Text className="font-serif text-5xl font-bold tracking-tight text-foreground">
          Iron<Text className="text-primary">Sharp</Text>
        </Text>
        <Text className="mt-2 font-serif-italic text-lg text-muted-foreground">
          Sharpen each other. Every day.
        </Text>
      </View>

      <Text className="mb-10 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
        “As iron sharpens iron, so one person sharpens another.”
        {"\n"}
        <Text className="font-sans-medium">— Proverbs 27:17</Text>
      </Text>

      <View className="w-full max-w-xs gap-3">
        <Button title="Sign Up" onPress={() => router.push("/(auth)/signup")} />
        <Button
          title="Log In"
          variant="outline"
          onPress={() => router.push("/(auth)/login")}
        />
      </View>
    </Screen>
  );
}
