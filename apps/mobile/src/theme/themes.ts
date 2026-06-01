export type ThemeName = "parchment" | "sage" | "dusk" | "slate" | "vesper";

export type ThemeMeta = {
  id: ThemeName;
  name: string;
  vibe: string;
  // Swatch colors used by the theme picker preview.
  swatch: { bg: string; card: string; accent: string; text: string };
};

// Display metadata (mirrors the original ThemeContext list).
export const THEME_LIST: ThemeMeta[] = [
  {
    id: "parchment",
    name: "Parchment",
    vibe: "Warm beige & baby blue",
    swatch: { bg: "#F7F0E6", card: "#EDE3D4", accent: "#89B4C9", text: "#5C4A3A" },
  },
  {
    id: "sage",
    name: "Sage",
    vibe: "Soft green & warm cream",
    swatch: { bg: "#F0F4EE", card: "#DDE8DC", accent: "#7FAF8A", text: "#3A4A3C" },
  },
  {
    id: "dusk",
    name: "Dusk",
    vibe: "Muted rose & warm ivory",
    swatch: { bg: "#F5EEE8", card: "#EAD9CC", accent: "#C4937A", text: "#4A3530" },
  },
  {
    id: "slate",
    name: "Slate",
    vibe: "Cool grey & soft gold",
    swatch: { bg: "#ECEEF2", card: "#DDE0E8", accent: "#B8A86A", text: "#343C48" },
  },
  {
    id: "vesper",
    name: "Vesper",
    vibe: "Deep navy & warm linen",
    swatch: { bg: "#1E2A3A", card: "#263448", accent: "#C8A96A", text: "#F0E8D8" },
  },
];

// HSL triples ("H S% L%") for every CSS variable, per theme. These match the
// original web app's index.css exactly so the look is identical.
export const THEME_VARS: Record<ThemeName, Record<string, string>> = {
  parchment: {
    "--background": "34 42% 93%",
    "--foreground": "22 22% 29%",
    "--card": "30 30% 88%",
    "--card-foreground": "22 22% 29%",
    "--card-deep": "30 26% 82%",
    "--popover": "30 30% 88%",
    "--popover-foreground": "22 22% 29%",
    "--primary": "200 32% 66%",
    "--primary-foreground": "34 42% 93%",
    "--secondary": "200 40% 86%",
    "--secondary-foreground": "22 22% 29%",
    "--muted": "30 26% 82%",
    "--muted-foreground": "27 25% 47%",
    "--accent": "200 32% 66%",
    "--accent-foreground": "34 42% 93%",
    "--destructive": "0 60% 50%",
    "--destructive-foreground": "34 42% 93%",
    "--border": "30 20% 78%",
    "--input": "30 20% 78%",
    "--ring": "200 32% 66%",
  },
  sage: {
    "--background": "110 14% 95%",
    "--foreground": "130 12% 26%",
    "--card": "120 14% 87%",
    "--card-foreground": "130 12% 26%",
    "--card-deep": "120 12% 81%",
    "--popover": "120 14% 87%",
    "--popover-foreground": "130 12% 26%",
    "--primary": "130 20% 59%",
    "--primary-foreground": "110 14% 95%",
    "--secondary": "130 18% 72%",
    "--secondary-foreground": "130 12% 26%",
    "--muted": "120 12% 81%",
    "--muted-foreground": "140 10% 42%",
    "--accent": "130 20% 59%",
    "--accent-foreground": "110 14% 95%",
    "--destructive": "0 60% 50%",
    "--destructive-foreground": "110 14% 95%",
    "--border": "120 10% 76%",
    "--input": "120 10% 76%",
    "--ring": "130 20% 59%",
  },
  dusk: {
    "--background": "22 24% 93%",
    "--foreground": "8 17% 24%",
    "--card": "20 22% 85%",
    "--card-foreground": "8 17% 24%",
    "--card-deep": "20 20% 79%",
    "--popover": "20 22% 85%",
    "--popover-foreground": "8 17% 24%",
    "--primary": "16 30% 62%",
    "--primary-foreground": "22 24% 93%",
    "--secondary": "16 28% 72%",
    "--secondary-foreground": "8 17% 24%",
    "--muted": "20 20% 79%",
    "--muted-foreground": "10 14% 36%",
    "--accent": "16 30% 62%",
    "--accent-foreground": "22 24% 93%",
    "--destructive": "0 60% 50%",
    "--destructive-foreground": "22 24% 93%",
    "--border": "20 16% 74%",
    "--input": "20 16% 74%",
    "--ring": "16 30% 62%",
  },
  slate: {
    "--background": "226 12% 93%",
    "--foreground": "216 16% 24%",
    "--card": "224 12% 87%",
    "--card-foreground": "216 16% 24%",
    "--card-deep": "224 12% 81%",
    "--popover": "224 12% 87%",
    "--popover-foreground": "216 16% 24%",
    "--primary": "46 30% 57%",
    "--primary-foreground": "226 12% 93%",
    "--secondary": "46 26% 69%",
    "--secondary-foreground": "216 16% 24%",
    "--muted": "224 12% 81%",
    "--muted-foreground": "220 12% 37%",
    "--accent": "46 30% 57%",
    "--accent-foreground": "226 12% 93%",
    "--destructive": "0 60% 50%",
    "--destructive-foreground": "226 12% 93%",
    "--border": "224 10% 76%",
    "--input": "224 10% 76%",
    "--ring": "46 30% 57%",
  },
  vesper: {
    "--background": "212 32% 17%",
    "--foreground": "35 30% 95%",
    "--card": "212 30% 22%",
    "--card-foreground": "35 30% 95%",
    "--card-deep": "212 30% 15%",
    "--popover": "212 30% 22%",
    "--popover-foreground": "35 30% 95%",
    "--primary": "40 40% 65%",
    "--primary-foreground": "212 32% 17%",
    "--secondary": "40 30% 70%",
    "--secondary-foreground": "35 30% 95%",
    "--muted": "212 30% 15%",
    "--muted-foreground": "210 14% 68%",
    "--accent": "40 40% 65%",
    "--accent-foreground": "212 32% 17%",
    "--destructive": "0 60% 50%",
    "--destructive-foreground": "35 30% 95%",
    "--border": "212 20% 28%",
    "--input": "212 20% 28%",
    "--ring": "40 40% 65%",
  },
};

// Convenience: a plain hsl() string for a token (for places that need a raw
// color value, e.g. tab bar icons, status bar, native props).
export function hsl(themeName: ThemeName, token: string): string {
  const vars = THEME_VARS[themeName];
  const triple = vars[`--${token}`];
  return triple ? `hsl(${triple})` : "#000";
}

export const DEFAULT_THEME: ThemeName = "slate";
