import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeName = "parchment" | "sage" | "dusk" | "slate" | "vesper";

export const themes: { id: ThemeName; name: string; vibe: string; colors: { bg: string; card: string; accent: string; text: string } }[] = [
  { id: "parchment", name: "Parchment", vibe: "Warm beige & baby blue", colors: { bg: "#F7F0E6", card: "#EDE3D4", accent: "#89B4C9", text: "#5C4A3A" } },
  { id: "sage", name: "Sage", vibe: "Soft green & warm cream", colors: { bg: "#F0F4EE", card: "#DDE8DC", accent: "#7FAF8A", text: "#3A4A3C" } },
  { id: "dusk", name: "Dusk", vibe: "Muted rose & warm ivory", colors: { bg: "#F5EEE8", card: "#EAD9CC", accent: "#C4937A", text: "#4A3530" } },
  { id: "slate", name: "Slate", vibe: "Cool grey & soft gold", colors: { bg: "#ECEEF2", card: "#DDE0E8", accent: "#B8A86A", text: "#343C48" } },
  { id: "vesper", name: "Vesper", vibe: "Deep navy & warm linen", colors: { bg: "#1E2A3A", card: "#263448", accent: "#C8A96A", text: "#F0E8D8" } },
];

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "parchment", setTheme: () => {} });

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem("ironsharp-theme");
    return (saved as ThemeName) || "vesper";
  });

  useEffect(() => {
    localStorage.setItem("ironsharp-theme", theme);
    if (theme === "vesper") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);