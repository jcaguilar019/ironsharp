import { useNavigate } from "react-router-dom";
import { Flame, CheckCircle2, Circle, BookOpen } from "lucide-react";

const youthMembers = [
  { name: "Daniel", done: true },
  { name: "Dad", done: true },
  { name: "Sofia", done: false },
];

const YouthHome = () => {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="flex min-h-screen flex-col pb-16">
      <div className="flex-1">
        <div className="mx-auto max-w-lg px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="font-serif text-2xl font-bold">{greeting}, Daniel</h1>
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
              <Flame className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">5 day streak</span>
            </div>
          </div>

          {/* Youth Devotional Card */}
          <button
            onClick={() => navigate("/youth/devotional")}
            className="mb-6 w-full rounded-2xl border border-border bg-card p-6 text-left shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">Youth Plan</span>
              <span className="text-xs text-muted-foreground">Day 3 of 7</span>
            </div>
            <h2 className="mb-2 font-serif text-xl font-bold">Psalm 139 — Known by God</h2>
            <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
              "I praise you because I am fearfully and wonderfully made."
            </p>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Start today's reading</span>
            </div>
          </button>

          {/* Family Group Progress */}
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Father + Son Group</h3>
          <div className="mb-6 rounded-xl border border-border bg-card p-4 space-y-3">
            {youthMembers.map(m => (
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

          {/* Daily Quote */}
          <div className="rounded-xl bg-card p-4 text-center border border-border">
            <p className="font-serif text-sm italic text-muted-foreground">
              "For we are God's handiwork, created in Christ Jesus to do good works."
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">Ephesians 2:10</p>
          </div>
        </div>
      </div>

      {/* Simplified Youth Nav — no community tab */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
        <div className="mx-auto flex max-w-lg items-center justify-around py-2">
          {[
            { label: "Home", path: "/youth/home", active: true },
            { label: "Devotional", path: "/youth/devotional", active: false },
            { label: "Profile", path: "/profile", active: false },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                item.active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default YouthHome;