import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_THEME, THEME_VARS, type ThemeName } from "./themes";

const STORAGE_KEY = "ironsharp-theme";

type ThemeContextType = {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  ready: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && saved in THEME_VARS) setThemeState(saved as ThemeName);
      })
      .finally(() => setReady(true));
  }, []);

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    void AsyncStorage.setItem(STORAGE_KEY, t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, ready }}>
      {/* Injecting the active theme's CSS variables here makes every
          `bg-background`, `text-primary`, etc. below resolve correctly. */}
      <View style={vars(THEME_VARS[theme])} className="flex-1 bg-background">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
