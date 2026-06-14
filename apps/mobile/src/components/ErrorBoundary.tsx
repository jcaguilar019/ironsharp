import { Component, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useThemeColor } from "@/components/useThemeColor";

/**
 * App-wide error boundary. Without this, a render error in any screen shows a
 * blank white screen with no recovery. The fallback is themed (it lives inside
 * ThemeProvider) and lets the user retry without killing the app.
 */
function Fallback({ onReset }: { onReset: () => void }) {
  const bg = useThemeColor("background");
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const primary = useThemeColor("primary");
  const primaryFg = useThemeColor("primary-foreground");
  return (
    <View
      style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center", padding: 32 }}
    >
      <Text
        style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 24, color: fg, marginBottom: 8, textAlign: "center" }}
      >
        Something went wrong
      </Text>
      <Text
        style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: muted, textAlign: "center", marginBottom: 24, maxWidth: 320, lineHeight: 21 }}
      >
        The app hit an unexpected error. Tap to try again — if it keeps happening, fully close and reopen the app.
      </Text>
      <Pressable
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        style={{ backgroundColor: primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 }}
      >
        <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 16, color: primaryFg }}>Try again</Text>
      </Pressable>
    </View>
  );
}

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    try {
      console.error("[IronSharp] ErrorBoundary caught:", error);
    } catch {}
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) return <Fallback onReset={this.reset} />;
    return this.props.children;
  }
}
