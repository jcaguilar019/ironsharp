import AppLayout from "@/components/AppLayout";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Flame, BookOpen, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const children = [
  {
    name: "Daniel Aguilar",
    grade: "7th Grade",
    initials: "DA",
    streak: 5,
    completed: 14,
    groups: ["Full Family", "Father + Son"],
    lastReflection: "I think Proverbs 27 is about being honest with friends even when it's hard.",
  },
  {
    name: "Sofia Aguilar",
    grade: "6th Grade",
    initials: "SA",
    streak: 8,
    completed: 19,
    groups: ["Full Family", "Mother + Daughter"],
    lastReflection: "God wants us to be kind even when people aren't kind to us first.",
  },
];

const ParentDashboard = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="mb-6 font-serif text-2xl font-bold">Parent Dashboard</h1>

        {children.map(child => (
          <div key={child.name} className="mb-6 rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-bold">
                {child.initials}
              </div>
              <div>
                <p className="font-semibold">{child.name}</p>
                <p className="text-xs text-muted-foreground">{child.grade}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                <Flame className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-bold">{child.streak}</p>
                  <p className="text-[10px] text-muted-foreground">Day Streak</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                <BookOpen className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-bold">{child.completed}</p>
                  <p className="text-[10px] text-muted-foreground">Completed</p>
                </div>
              </div>
            </div>

            {/* Groups */}
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Groups</p>
            <div className="mb-4 space-y-2">
              {child.groups.map(g => (
                <div key={g} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm">{g}</span>
                  </div>
                  <button className="text-destructive/60 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Latest Reflection */}
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latest Reflection</p>
            <p className="rounded-lg bg-muted p-3 text-sm italic text-muted-foreground">"{child.lastReflection}"</p>
          </div>
        ))}

        <Button variant="outline" onClick={() => navigate("/family/add-child")} className="h-12 w-full rounded-xl">
          Add Another Child
        </Button>
      </div>
    </AppLayout>
  );
};

export default ParentDashboard;