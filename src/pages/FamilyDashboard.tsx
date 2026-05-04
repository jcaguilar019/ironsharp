import AppLayout from "@/components/AppLayout";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, Flame, Plus, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const familyMembers = [
  { name: "Juan Aguilar", role: "Parent", done: true, initials: "JA" },
  { name: "Maria Aguilar", role: "Parent", done: true, initials: "MA" },
  { name: "Daniel Aguilar", role: "Child · 7th Grade", done: false, initials: "DA" },
  { name: "Sofia Aguilar", role: "Child · 6th Grade", done: true, initials: "SA" },
];

const familyGroups = [
  { label: "Full Family", members: "Juan, Maria, Daniel, Sofia", streak: 12 },
  { label: "Father + Son", members: "Juan & Daniel", streak: 5 },
  { label: "Mother + Daughter", members: "Maria & Sofia", streak: 8 },
  { label: "Husband + Wife", members: "Juan & Maria", streak: 21 },
];

const FamilyDashboard = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-bold">Family</h1>
          <Button variant="outline" size="sm" onClick={() => navigate("/family/parent-dashboard")} className="rounded-xl">
            <Settings className="mr-1.5 h-4 w-4" /> Manage
          </Button>
        </div>

        {/* Family Streak */}
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold">12 Day Family Streak</p>
            <p className="text-xs text-muted-foreground">The Aguilar household is on fire!</p>
          </div>
        </div>

        {/* Today's Progress */}
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today's Progress</h3>
        <div className="mb-6 rounded-xl border border-border bg-card p-4 space-y-3">
          {familyMembers.map(m => (
            <div key={m.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {m.initials}
                </div>
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-[10px] text-muted-foreground">{m.role}</p>
                </div>
              </div>
              {m.done ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/40" />
              )}
            </div>
          ))}
        </div>

        {/* Family Devotional Groups */}
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Family Groups</h3>
        <div className="mb-6 space-y-3">
          {familyGroups.map(g => (
            <div key={g.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{g.label}</p>
                    <p className="text-[10px] text-muted-foreground">{g.members}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Flame className="h-3 w-3" /> {g.streak}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Child */}
        <Button variant="outline" onClick={() => navigate("/family/add-child")} className="h-12 w-full rounded-xl">
          <Plus className="mr-2 h-4 w-4" /> Add Child Profile
        </Button>
      </div>
    </AppLayout>
  );
};

export default FamilyDashboard;