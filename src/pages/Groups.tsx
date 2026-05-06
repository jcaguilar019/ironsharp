import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Flame, ChevronDown, ChevronUp, UserPlus, Settings, Plus, Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

/* ── colour tokens per group type ── */
const typeColors: Record<string, string> = {
  "one-on-one": "#A89070",
  family: "#7FAF8A",
  "small-group": "#B8A86A",
};

const typeLabels: Record<string, string> = {
  "one-on-one": "One-on-One",
  family: "Family",
  "small-group": "Small Group",
};

interface Member {
  name: string;
  role: string;
  doneToday: boolean;
}

interface GroupData {
  id: string;
  name: string;
  type: "one-on-one" | "family" | "small-group";
  reference: string;
  day: number;
  totalDays: number;
  streak: number;
  members: Member[];
}

const mockGroups: GroupData[] = [
  {
    id: "1",
    name: "Marcus & Me",
    type: "one-on-one",
    reference: "James 1",
    day: 5,
    totalDays: 7,
    streak: 5,
    members: [
      { name: "You", role: "Partner", doneToday: true },
      { name: "Marcus", role: "Partner", doneToday: true },
    ],
  },
  {
    id: "2",
    name: "The Johnsons",
    type: "family",
    reference: "Psalm 23",
    day: 3,
    totalDays: 14,
    streak: 3,
    members: [
      { name: "You", role: "Parent", doneToday: true },
      { name: "Sarah", role: "Parent", doneToday: true },
      { name: "Eli", role: "Youth", doneToday: false },
      { name: "Grace", role: "Youth", doneToday: false },
    ],
  },
  {
    id: "3",
    name: "The Forge",
    type: "small-group",
    reference: "Romans 8",
    day: 10,
    totalDays: 30,
    streak: 7,
    members: [
      { name: "You", role: "Leader", doneToday: true },
      { name: "Marcus", role: "Member", doneToday: true },
      { name: "David", role: "Member", doneToday: true },
      { name: "James", role: "Member", doneToday: false },
      { name: "Peter", role: "Member", doneToday: false },
    ],
  },
];

const Groups = () => {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Your Relationships
        </p>
        <h1 className="mb-6 font-serif text-2xl font-bold">Groups</h1>

        {/* Group cards */}
        <div className="space-y-4">
          {mockGroups.map((group) => {
            const accent = typeColors[group.type];
            const pct = Math.round((group.day / group.totalDays) * 100);
            const doneCount = group.members.filter((m) => m.doneToday).length;
            const expanded = expandedId === group.id;

            return (
              <div
                key={group.id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                {/* Accent bar */}
                <div className="h-[3px] w-full" style={{ backgroundColor: accent }} />

                <div className="px-4 py-4">
                  {/* Name + streak */}
                  <div className="flex items-start justify-between">
                    <h2 className="font-serif text-lg font-bold leading-tight">
                      {group.name}
                    </h2>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Flame className="h-3.5 w-3.5" />
                      <span className="font-semibold">{group.streak}</span>
                    </div>
                  </div>

                  {/* Subtitle */}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {typeLabels[group.type]} · {group.reference} · Day {group.day}/{group.totalDays}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <Progress value={pct} className="h-[2px]" />
                  </div>

                  {/* Avatars + done count */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {group.members.map((m) => (
                        <div
                          key={m.name}
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-semibold text-white"
                          style={{
                            backgroundColor: m.doneToday ? accent : "hsl(var(--muted))",
                            color: m.doneToday ? "#fff" : "hsl(var(--muted-foreground))",
                          }}
                        >
                          {m.name[0]}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs italic text-muted-foreground">
                      {doneCount}/{group.members.length} done today
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-4 flex gap-2">
                    <Button
                      className="flex-[3] rounded-xl text-sm font-semibold text-white"
                      style={{ backgroundColor: accent }}
                      onClick={() =>
                        toast({ title: "Opening devotional…" })
                      }
                    >
                      Open Devotional →
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-[1] rounded-xl"
                      onClick={() =>
                        setExpandedId(expanded ? null : group.id)
                      }
                    >
                      {expanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Expanded state */}
                  {expanded && (
                    <div className="mt-4 border-t border-border pt-4">
                      <div className="space-y-2">
                        {group.members.map((m) => (
                          <div
                            key={m.name}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold"
                                style={{
                                  backgroundColor: m.doneToday ? accent : "hsl(var(--muted))",
                                  color: m.doneToday ? "#fff" : "hsl(var(--muted-foreground))",
                                }}
                              >
                                {m.name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{m.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {m.role}
                                </p>
                              </div>
                            </div>
                            {m.doneToday ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Minus className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 rounded-xl text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText("IRON2024");
                            toast({ title: "Invite code copied!" });
                          }}
                        >
                          <UserPlus className="mr-1 h-3.5 w-3.5" />
                          Invite
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 rounded-xl text-xs"
                          onClick={() =>
                            toast({ title: "Settings coming soon" })
                          }
                        >
                          <Settings className="mr-1 h-3.5 w-3.5" />
                          Settings
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Start a New Group */}
        <button
          onClick={() => toast({ title: "New group flow coming soon" })}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Start a New Group
        </button>
      </div>
    </AppLayout>
  );
};

export default Groups;