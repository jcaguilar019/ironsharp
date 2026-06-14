import { Pressable, Text, View } from "react-native";
import { useThemeColor } from "@/components/useThemeColor";

/**
 * Shared "couldn't load" state with retry. Screens previously handled only
 * isLoading + empty, so a failed query rendered as a blank/misleading screen
 * (e.g. "No groups yet", every category "Coming soon", or an infinite spinner).
 */
export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this. Check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
  secondaryLabel,
  onSecondary,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const primary = useThemeColor("primary");
  const primaryFg = useThemeColor("primary-foreground");
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
      <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: fg, textAlign: "center" }}>
        {title}
      </Text>
      <Text
        style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: muted, textAlign: "center", maxWidth: 300, lineHeight: 21 }}
      >
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          style={{ backgroundColor: primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 2 }}
        >
          <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 15, color: primaryFg }}>{retryLabel}</Text>
        </Pressable>
      ) : null}
      {secondaryLabel && onSecondary ? (
        <Pressable onPress={onSecondary} accessibilityRole="button" accessibilityLabel={secondaryLabel} hitSlop={8}>
          <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: muted }}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
