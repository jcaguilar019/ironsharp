import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
} from "@expo-google-fonts/playfair-display";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { isDarkTheme } from "@/theme/themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SessionProvider } from "@/lib/session";
import { useOtaUpdates } from "@/lib/useOtaUpdates";
import { ToastProvider } from "@/components/Toast";

// ── DIAGNOSTIC: capture every uncaught JS error to NSLog ────────────────────
// On TestFlight the only way to see anything is the device's unified log
// (Xcode → Window → Devices → View Device Logs). console.error from JS
// surfaces there with the bundle ID, so we wrap the global handler to make
// sure NOTHING gets silently swallowed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RNErrorUtils = (globalThis as any).ErrorUtils;
if (RNErrorUtils?.setGlobalHandler) {
  const prev = RNErrorUtils.getGlobalHandler?.();
  RNErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    try {
      console.error(
        `[IronSharp] uncaught ${isFatal ? "FATAL" : "non-fatal"}:`,
        error?.message ?? error,
        error?.stack ?? ""
      );
    } catch {}
    try {
      prev?.(error, isFatal);
    } catch {}
  });
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function RootNavigator() {
  const { ready, theme } = useTheme();
  useOtaUpdates();
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && ready) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, ready]);

  if ((!fontsLoaded && !fontError) || !ready) return null;

  return (
    <>
      {/* Follow the in-app theme, not the OS appearance — otherwise a dark
          theme under an OS in Light mode gets invisible dark status-bar icons. */}
      <StatusBar style={isDarkTheme(theme) ? "light" : "dark"} />
      {/* animation: "default" → native iOS UINavigationController push.
          "fade" is implemented via Reanimated under new arch, which we suspect
          is the trigger for the post-login TurboModule queue crash on iOS 26.5. */}
      <Stack screenOptions={{ headerShown: false, animation: "default" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ErrorBoundary>
              <SessionProvider>
                <ToastProvider>
                  <RootNavigator />
                </ToastProvider>
              </SessionProvider>
            </ErrorBoundary>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
