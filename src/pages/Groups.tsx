import AppLayout from "@/components/AppLayout";
import { Users, Flame, Share2, Shield, Heart, HandshakeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const members = [
  { name: "You", role: "partner", streak: 5 },
  { name: "Marcus", role: "partner", streak: 5 },
  { name: "David", role: "disciple", streak: 3 },
  { name: "Sarah", role: "discipler", streak: 7 },
];

const roleIcons: Record<string, typeof Shield> = {
  discipler: Shield,
  disciple: Heart,
  partner: HandshakeIcon,
};

const Groups = () => {
  const { toast } = useToast();

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-8">
        <h1 className="mb-1 font-serif text-2xl font-bold">Men's Morning Crew</h1>
        <p className="mb-6 text-sm text-muted-foreground">Wisdom of Proverbs · Day 5 of 7</p>

        {/* Group streak */}
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3">
          <Flame className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-primary">3-day group streak</span>
        </div>

        {/* Members */}
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Members</h3>
        <div className="mb-6 space-y-2">
          {members.map(m => {
            const Icon = roleIcons[m.role] || Users;
            return (
              <div key={m.name} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-medium text-sm">
                    {m.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      <span className="capitalize">{m.role}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Flame className="h-3 w-3" />
                  <span>{m.streak}</span>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText("IRON2024");
            toast({ title: "Invite code copied!", description: "Share code: IRON2024" });
          }}
          className="h-12 w-full rounded-xl text-base"
        >
          <Share2 className="mr-2 h-4 w-4" /> Copy Invite Link
        </Button>
      </div>
    </AppLayout>
  );
};

export default Groups;