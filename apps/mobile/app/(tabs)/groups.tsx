import { Text, View } from "react-native";
import { Users } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { useThemeColor } from "@/components/useThemeColor";

export default function GroupsScreen() {
  const primary = useThemeColor("primary");

  return (
    <Screen edges={["top"]} className="px-6">
      <View className="border-b border-border pb-4 pt-2">
        <Text className="text-xs uppercase tracking-wider text-muted-foreground">
          Walk Together
        </Text>
        <Text className="font-serif text-2xl font-bold text-foreground">Groups</Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Users size={26} color={primary} />
        </View>
        <Text className="mb-1 font-serif text-lg font-bold text-foreground">
          Groups are coming next
        </Text>
        <Text className="max-w-xs text-center text-sm text-muted-foreground">
          Invite a brother, share reflections, and keep each other sharp. This is
          the next milestone in the rebuild.
        </Text>
      </View>
    </Screen>
  );
}
