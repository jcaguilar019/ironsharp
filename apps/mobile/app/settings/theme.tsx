import { Pressable, ScrollView, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { useTheme } from "@/theme/ThemeProvider";
import { THEME_LIST } from "@/theme/themes";

export default function ThemePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <Screen edges={["top"]}>
      <Header title="Appearance" subtitle="Make it yours" />
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg gap-3 px-6 py-4"
        showsVerticalScrollIndicator={false}
      >
        {THEME_LIST.map((t) => {
          const active = theme === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTheme(t.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`flex-row items-center gap-4 rounded-2xl border-2 p-4 ${
                active ? "border-primary" : "border-border"
              }`}
              style={{ backgroundColor: t.swatch.bg }}
            >
              {/* Swatch */}
              <View className="flex-row">
                <View
                  className="h-10 w-10 rounded-l-lg"
                  style={{ backgroundColor: t.swatch.card }}
                />
                <View
                  className="h-10 w-10 rounded-r-lg"
                  style={{ backgroundColor: t.swatch.accent }}
                />
              </View>
              <View className="flex-1">
                <Text className="font-sans-semibold text-base" style={{ color: t.swatch.text }}>
                  {t.name}
                </Text>
                <Text className="text-sm" style={{ color: t.swatch.text, opacity: 0.7 }}>
                  {t.vibe}
                </Text>
              </View>
              {active ? (
                <View
                  className="h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: t.swatch.accent }}
                >
                  <Check size={14} color={t.swatch.bg} strokeWidth={3} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
