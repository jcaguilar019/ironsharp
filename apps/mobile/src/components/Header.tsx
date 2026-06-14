import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useThemeColor } from "@/components/useThemeColor";

export function Header({
  title,
  subtitle,
  rightAction,
}: {
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}) {
  const router = useRouter();
  const fg = useThemeColor("foreground");

  return (
    <View className="flex-row items-center gap-2 px-4 pb-2 pt-1">
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className="h-9 w-9 items-center justify-center rounded-full active:bg-muted/40"
      >
        <ChevronLeft size={24} color={fg} />
      </Pressable>
      <View className="flex-1 mr-2">
        {subtitle ? (
          <Text className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </Text>
        ) : null}
        {title ? (
          <Text className="font-serif text-xl font-bold text-foreground">{title}</Text>
        ) : null}
      </View>
      {rightAction ? <View>{rightAction}</View> : null}
    </View>
  );
}
