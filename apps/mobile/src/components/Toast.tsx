import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/components/useThemeColor";

type ToastContextValue = { show: (message: string) => void };

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

/**
 * Lightweight, themed toast for transient *success* confirmations
 * ("Joined", "Invite sent", "Code applied"). See docs/ui-conventions.md for
 * when to use this vs. inline confirmation vs. ConfirmModal vs. native Alert.
 */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const card = useThemeColor("card");
  const fg = useThemeColor("foreground");
  const border = useThemeColor("border");

  const show = useCallback(
    (msg: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(msg);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }).start(
          ({ finished }) => {
            if (finished) setMessage(null);
          }
        );
      }, 2400);
    },
    [opacity]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message !== null ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 24,
            right: 24,
            bottom: insets.bottom + 28,
            alignItems: "center",
            opacity,
          }}
        >
          <View
            style={{
              maxWidth: "100%",
              backgroundColor: card,
              borderColor: border,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              shadowColor: "#000",
              shadowOpacity: 0.18,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Text style={{ color: fg, fontFamily: "DMSans_500Medium", fontSize: 14, textAlign: "center" }}>
              {message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}
