import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Flame, CheckCircle2, Circle, BookOpen, Globe, Sun } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const sampleMembers = [
  { name: "Juan", done: true },
  { name: "Marcus", done: true },
  { name: "David", done: false },
  { name: "Sarah", done: false },
];

const Home = () => {
  const navigate = useNavigate();
  const { displayName } = useAuth();
  const firstName = displayName.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-bold">{greeting}, {firstName}</h1>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
            <Flame className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">5 day streak</span>
          </div>
        </div>

        {/* Today's Devotional Card */}
        <button
          onClick={() => navigate("/devotional")}
          className="mb-6 w-full rounded-2xl border border-border bg-card p-6 text-left shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Day 5 of 7</p>
          <h2 className="mb-2 font-serif text-xl font-bold">Proverbs 27</h2>
          <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
            "Faithful are the wounds of a friend; profuse are the kisses of an enemy."
          </p>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Start today's reading</span>
          </div>
        </button>

        {/* Personal Devotional */}
        <button
          onClick={() => navigate("/devotional")}
          className="mb-6 w-full rounded-2xl border border-border bg-card p-5 text-left shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="mb-2 flex items-center gap-2">
            <Sun className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">My Time with God</h3>
          </div>
          <p className="mb-3 font-serif text-sm italic text-muted-foreground">
            "Be still, and know that I am God." — Psalm 46:10
          </p>
          <span className="text-sm font-medium text-primary">Begin Reading →</span>
        </button>

        {/* Group Progress */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Group Progress</h3>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="space-y-3">
              {sampleMembers.map(m => (
                <div key={m.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                      {m.name[0]}
                    </div>
                    <span className="text-sm font-medium">{m.name}</span>
                  </div>
                  {m.done ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Quote */}
        <div className="mb-6 rounded-xl bg-card-deep p-4 text-center">
          <p className="font-serif text-sm italic text-muted-foreground">
            "As iron sharpens iron, so one person sharpens another."
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">Proverbs 27:17</p>
        </div>

        {/* Community */}
        <button
          onClick={() => navigate("/community")}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
        >
          <Globe className="h-5 w-5 text-primary" />
          <div className="text-left">
            <span className="text-sm font-medium">Community</span>
            <p className="text-[10px] text-muted-foreground">Shared devotionals</p>
          </div>
        </button>
      </div>
    </AppLayout>
  );
};

export default Home;