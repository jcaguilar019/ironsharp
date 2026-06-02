import { useTheme } from "@/theme/ThemeProvider";
import { hsl } from "@/theme/themes";

/**
 * Returns a raw `hsl(...)` color string for a theme token, for native props
 * that can't take className (icon `color`, `placeholderTextColor`, StatusBar).
 * Pass an optional alpha 0–1.
 */
export function useThemeColor(token: string, alpha?: number): string {
  const { theme } = useTheme();
  const base = hsl(theme, token);
  if (alpha === undefined) return base;
  // hsl(H S% L%) -> hsla(H S% L% / a)
  return base.replace(/^hsl\((.+)\)$/, `hsla($1 / ${alpha})`);
}
