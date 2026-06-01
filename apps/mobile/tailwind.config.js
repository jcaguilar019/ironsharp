/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4 preset + content scanning.
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        // Loaded via expo-font in the root layout.
        sans: ["DMSans_400Regular"],
        "sans-medium": ["DMSans_500Medium"],
        // DM Sans (Google Fonts static) ships 400/500/700 — semibold maps to Bold.
        "sans-semibold": ["DMSans_700Bold"],
        "sans-bold": ["DMSans_700Bold"],
        serif: ["PlayfairDisplay_700Bold"],
        "serif-italic": ["PlayfairDisplay_400Regular_Italic"],
      },
      colors: {
        // Each token maps to a CSS variable set at runtime by ThemeProvider.
        // The `<alpha-value>` placeholder lets opacity modifiers (bg-primary/10) work.
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          deep: "hsl(var(--card-deep) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px",
        xl: "16px",
        "2xl": "20px",
      },
    },
  },
  plugins: [],
};
