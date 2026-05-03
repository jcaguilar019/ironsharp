import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Flame, CheckCircle2, Circle, BookOpen } from "lucide-react";

const sampleMembers = [
  { name: "You", done: true },
  { name: "Marcus", done: true },
  { name: "David", done: false },
  { name: "Sarah", done: false },
];

const Home = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-bold">Good Morning</h1>
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
        <div className="rounded-xl bg-card-deep p-4 text-center">
          <p className="font-serif text-sm italic text-muted-foreground">
            "As iron sharpens iron, so one person sharpens another."
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">Proverbs 27:17</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Home;