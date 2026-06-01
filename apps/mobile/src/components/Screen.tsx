import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useThemeColor } from "@/components/useThemeColor";

type Props = {
  children: ReactNode;
  className?: string;
  edges?: readonly Edge[];
  center?: boolean;
};

/** Full-bleed themed screen background with safe-area insets. */
export function Screen({
  children,
  className = "",
  edges = ["top", "bottom"],
  center = false,
}: Props) {
  // Background is applied via resolved style (not className) so it works
  // regardless of whether NativeWind maps className onto SafeAreaView.
  const background = useThemeColor("background");
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: background }}>
      <View
        className={`flex-1 ${center ? "items-center justify-center" : ""} ${className}`}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
