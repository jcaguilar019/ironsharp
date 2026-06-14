import { Text, View } from "react-native";
import { Link, Stack } from "expo-router";
import { Compass } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { useThemeColor } from "@/components/useThemeColor";

export default function NotFound() {
  const primary = useThemeColor("primary");

  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <Screen center className="px-8">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <Compass size={28} color={primary} />
        </View>
        <Text className="mb-2 font-serif text-2xl font-bold text-foreground">
          We can’t find that page
        </Text>
        <Text className="mb-6 text-center text-sm text-muted-foreground">
          The link may be broken or the screen may have moved.
        </Text>
        <Link
          href="/(tabs)/home"
          className="rounded-xl bg-primary px-5 py-3 text-center font-sans-semibold text-base text-primary-foreground"
        >
          Go home
        </Link>
      </Screen>
    </>
  );
}
