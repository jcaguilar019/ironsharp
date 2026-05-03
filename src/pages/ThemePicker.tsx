import AppLayout from "@/components/AppLayout";
import { useTheme, themes, type ThemeName } from "@/contexts/ThemeContext";
import { Check } from "lucide-react";

const ThemePicker = () => {
  const { theme, setTheme } = useTheme();

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-8">
        <h1 className="mb-2 font-serif text-2xl font-bold">Themes</h1>
        <p className="mb-6 text-sm text-muted-foreground">Choose the palette that fits your vibe</p>

        <div className="space-y-4">
          {themes.map(t => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`relative w-full rounded-2xl border-2 p-4 text-left transition-all ${
                  active ? "border-primary shadow-md" : "border-border hover:border-primary/40"
                }`}
                style={{ backgroundColor: t.colors.bg }}
              >
                {active && (
                  <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: t.colors.accent }}>
                    <Check className="h-4 w-4" style={{ color: t.colors.bg }} />
                  </div>
                )}

                {/* Mini phone mockup */}
                <div className="mx-auto mb-3 w-32 overflow-hidden rounded-lg border" style={{ borderColor: t.colors.card, backgroundColor: t.colors.bg }}>
                  <div className="px-2 py-1.5" style={{ backgroundColor: t.colors.card }}>
                    <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: t.colors.accent }} />
                  </div>
                  <div className="space-y-1.5 p-2">
                    <div className="h-2 w-full rounded-full" style={{ backgroundColor: t.colors.card }} />
                    <div className="h-2 w-3/4 rounded-full" style={{ backgroundColor: t.colors.card }} />
                    <div className="mt-2 h-6 w-full rounded" style={{ backgroundColor: t.colors.card }}>
                      <div className="flex h-full items-center justify-center">
                        <div className="h-2 w-10 rounded-full" style={{ backgroundColor: t.colors.accent }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold" style={{ color: t.colors.text }}>
                      {t.name} {t.id === "parchment" && "★"}
                    </p>
                    <p className="text-xs" style={{ color: t.colors.text, opacity: 0.6 }}>{t.vibe}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {Object.values(t.colors).map((c, i) => (
                      <div key={i} className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default ThemePicker;