export type ThemeName = "parchment" | "sage" | "dusk" | "slate" | "vesper" | "steel-grey" | "charcoal" | "moroccan-spice" | "eclipse" | "ink" | "onyx" | "blush";

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
  {
    id: "steel-grey",
    name: "Steel Grey",
    vibe: "Cool grey & steel blue",
    swatch: { bg: "#E9ECF1", card: "#D8DCE4", accent: "#7A8FA8", text: "#2C3649" },
  },
  {
    id: "charcoal",
    name: "Charcoal",
    vibe: "Deep charcoal & silver",
    swatch: { bg: "#27292D", card: "#343639", accent: "#9EB0BB", text: "#E2E7EB" },
  },
  {
    id: "moroccan-spice",
    name: "Moroccan Spice",
    vibe: "Warm terracotta & burnt cream",
    swatch: { bg: "#F3EBE0", card: "#E5D3BD", accent: "#C86432", text: "#3A1508" },
  },
  {
    id: "eclipse",
    name: "Eclipse",
    vibe: "Midnight black & burnished gold",
    swatch: { bg: "#16161E", card: "#1E1E29", accent: "#D4A456", text: "#ECE8F2" },
  },
  {
    id: "ink",
    name: "Ink",
    vibe: "Crisp black on white",
    swatch: { bg: "#FFFFFF", card: "#F7F7F7", accent: "#1F1F1F", text: "#1A1A1A" },
  },
  {
    id: "onyx",
    name: "Onyx",
    vibe: "Crisp white on black",
    swatch: { bg: "#0A0A0A", card: "#191919", accent: "#EBEBEB", text: "#F5F5F5" },
  },
  {
    id: "blush",
    name: "Blush",
    vibe: "Soft pink & warm beige",
    swatch: { bg: "#F7F0E6", card: "#EDE3D4", accent: "#CA6885", text: "#5C4A3A" },
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
    "--primary-foreground": "22 22% 12%",
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
    "--primary-foreground": "130 14% 11%",
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
    "--primary-foreground": "8 20% 11%",
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
    "--primary-foreground": "216 18% 11%",
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
  "steel-grey": {
    "--background": "214 14% 93%",
    "--foreground": "212 22% 22%",
    "--card": "214 14% 87%",
    "--card-foreground": "212 22% 22%",
    "--card-deep": "214 14% 81%",
    "--popover": "214 14% 87%",
    "--popover-foreground": "212 22% 22%",
    "--primary": "210 18% 57%",
    "--primary-foreground": "212 22% 11%",
    "--secondary": "210 14% 68%",
    "--secondary-foreground": "212 22% 22%",
    "--muted": "214 14% 81%",
    "--muted-foreground": "212 14% 42%",
    "--accent": "210 18% 57%",
    "--accent-foreground": "214 14% 93%",
    "--destructive": "0 60% 50%",
    "--destructive-foreground": "214 14% 93%",
    "--border": "214 12% 76%",
    "--input": "214 12% 76%",
    "--ring": "210 18% 57%",
  },
  charcoal: {
    "--background": "210 6% 17%",
    "--foreground": "204 10% 90%",
    "--card": "210 6% 22%",
    "--card-foreground": "204 10% 90%",
    "--card-deep": "210 6% 13%",
    "--popover": "210 6% 22%",
    "--popover-foreground": "204 10% 90%",
    "--primary": "204 14% 68%",
    "--primary-foreground": "210 6% 17%",
    "--secondary": "204 10% 58%",
    "--secondary-foreground": "204 10% 90%",
    "--muted": "210 6% 13%",
    "--muted-foreground": "210 10% 58%",
    "--accent": "204 14% 68%",
    "--accent-foreground": "210 6% 17%",
    "--destructive": "0 60% 50%",
    "--destructive-foreground": "204 10% 90%",
    "--border": "210 6% 26%",
    "--input": "210 6% 26%",
    "--ring": "204 14% 68%",
  },
  "moroccan-spice": {
    "--background": "32 38% 93%",
    "--foreground": "18 55% 15%",
    "--card": "30 36% 85%",
    "--card-foreground": "18 55% 15%",
    "--card-deep": "30 32% 78%",
    "--popover": "30 36% 85%",
    "--popover-foreground": "18 55% 15%",
    "--primary": "22 60% 50%",
    "--primary-foreground": "18 40% 10%",
    "--secondary": "22 44% 62%",
    "--secondary-foreground": "18 55% 15%",
    "--muted": "30 32% 78%",
    "--muted-foreground": "22 28% 36%",
    "--accent": "22 60% 50%",
    "--accent-foreground": "32 38% 93%",
    "--destructive": "0 60% 50%",
    "--destructive-foreground": "32 38% 93%",
    "--border": "30 26% 72%",
    "--input": "30 26% 72%",
    "--ring": "22 60% 50%",
  },
  eclipse: {
    "--background": "240 10% 10%",
    "--foreground": "260 18% 93%",
    "--card": "240 10% 14%",
    "--card-foreground": "260 18% 93%",
    "--card-deep": "240 10% 8%",
    "--popover": "240 10% 14%",
    "--popover-foreground": "260 18% 93%",
    "--primary": "36 55% 60%",
    "--primary-foreground": "240 10% 10%",
    "--secondary": "36 44% 50%",
    "--secondary-foreground": "260 18% 93%",
    "--muted": "240 10% 8%",
    "--muted-foreground": "240 12% 60%",
    "--accent": "36 55% 60%",
    "--accent-foreground": "240 10% 10%",
    "--destructive": "0 60% 50%",
    "--destructive-foreground": "260 18% 93%",
    "--border": "240 10% 20%",
    "--input": "240 10% 20%",
    "--ring": "36 55% 60%",
  },
  ink: {
    "--background": "0 0% 100%",
    "--foreground": "0 0% 10%",
    "--card": "0 0% 97%",
    "--card-foreground": "0 0% 10%",
    "--card-deep": "0 0% 93%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "0 0% 10%",
    "--primary": "0 0% 12%",
    "--primary-foreground": "0 0% 98%",
    "--secondary": "0 0% 90%",
    "--secondary-foreground": "0 0% 12%",
    "--muted": "0 0% 95%",
    "--muted-foreground": "0 0% 40%",
    "--accent": "0 0% 12%",
    "--accent-foreground": "0 0% 98%",
    "--destructive": "0 60% 50%",
    "--destructive-foreground": "0 0% 98%",
    "--border": "0 0% 88%",
    "--input": "0 0% 88%",
    "--ring": "0 0% 12%",
  },
  onyx: {
    "--background": "0 0% 4%",
    "--foreground": "0 0% 96%",
    "--card": "0 0% 10%",
    "--card-foreground": "0 0% 96%",
    "--card-deep": "0 0% 6%",
    "--popover": "0 0% 10%",
    "--popover-foreground": "0 0% 96%",
    "--primary": "0 0% 92%",
    "--primary-foreground": "0 0% 8%",
    "--secondary": "0 0% 20%",
    "--secondary-foreground": "0 0% 96%",
    "--muted": "0 0% 12%",
    "--muted-foreground": "0 0% 60%",
    "--accent": "0 0% 92%",
    "--accent-foreground": "0 0% 8%",
    "--destructive": "0 60% 50%",
    "--destructive-foreground": "0 0% 96%",
    "--border": "0 0% 16%",
    "--input": "0 0% 16%",
    "--ring": "0 0% 92%",
  },
  blush: {
    "--background": "34 42% 93%",
    "--foreground": "22 22% 29%",
    "--card": "30 30% 88%",
    "--card-foreground": "22 22% 29%",
    "--card-deep": "30 26% 82%",
    "--popover": "30 30% 88%",
    "--popover-foreground": "22 22% 29%",
    "--primary": "342 48% 60%",
    "--primary-foreground": "40 40% 96%",
    "--secondary": "342 40% 80%",
    "--secondary-foreground": "22 22% 29%",
    "--muted": "30 26% 82%",
    "--muted-foreground": "27 25% 47%",
    "--accent": "342 48% 60%",
    "--accent-foreground": "34 42% 93%",
    "--destructive": "0 60% 50%",
    "--destructive-foreground": "34 42% 93%",
    "--border": "30 20% 78%",
    "--input": "30 20% 78%",
    "--ring": "342 48% 60%",
  },
};

// Convenience: a plain hsl() string for a token (for places that need a raw
// color value, e.g. tab bar icons, status bar, native props).
export function hsl(themeName: ThemeName, token: string): string {
  const vars = THEME_VARS[themeName];
  const triple = vars[`--${token}`];
  return triple ? `hsl(${triple})` : "#000";
}

/**
 * Apply an alpha (0–1) to a resolved color string. Handles this project's
 * `hsl(H S% L%)` theme strings (→ `hsla(... / a)`) and `#RRGGBB` hex
 * (→ `#RRGGBBAA`).
 *
 * Use this instead of concatenating a hex-alpha onto a color: `someColor + "15"`
 * is only valid when `someColor` is 6-digit hex. For an `hsl(...)` string (which
 * is what `useThemeColor` returns), React Native matches the `hsl(...)` and
 * ignores the trailing digits, rendering the color FULLY OPAQUE.
 */
export function withAlpha(color: string, alpha: number): string {
  const m = color.match(/^hsl\((.+)\)$/);
  if (m) return `hsla(${m[1]} / ${alpha})`;
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
      .toString(16)
      .padStart(2, "0");
    return color + a;
  }
  return color;
}

// Whether a theme has a dark background — drives status-bar icon contrast so
// the status bar follows the in-app theme rather than the OS appearance.
export function isDarkTheme(themeName: ThemeName): boolean {
  const bg = THEME_VARS[themeName]?.["--background"] ?? "";
  const lightness = parseFloat(bg.split(/\s+/)[2] ?? "100"); // "H S% L%" → L
  return Number.isFinite(lightness) && lightness < 50;
}

export const DEFAULT_THEME: ThemeName = "slate";
