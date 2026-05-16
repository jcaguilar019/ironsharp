import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const responses: { name: string; q1: string; q2: string; q2Private?: boolean }[] = [
  {
    name: "You",
    q1: "This passage really convicted me about being honest with the people closest to me instead of telling them what they want to hear.",
    q2: "I think God is asking me to have that hard conversation I've been avoiding with my brother.",
  },
  {
    name: "Marcus",
    q1: "The line about faithful wounds hit me hard. I've been too comfortable and need people who will challenge me.",
    q2: "I need to step into vulnerability with my small group and stop performing.",
    q2Private: true,
  },
];

type ReactionType = "amen" | "hit_me" | "fire";
const reactionEmojis: Record<ReactionType, string> = { amen: "🙏", hit_me: "✨", fire: "🔥" };

const CompareNotes = () => {
  const navigate = useNavigate();
  const [reactions, setReactions] = useState<Record<string, ReactionType[]>>({});

  const toggleReaction = (name: string, type: ReactionType) => {
    setReactions(prev => {
      const current = prev[name] || [];
      return {
        ...prev,
        [name]: current.includes(type) ? current.filter(r => r !== type) : [...current, type],
      };
    });
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-6">
        <button onClick={() => navigate("/home")} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="mb-2 font-serif text-2xl font-bold">Compare Notes</h1>
        <p className="mb-6 text-sm text-muted-foreground">Proverbs 27 — Day 5</p>

        <div className="space-y-6">
          {responses.map(r => (
            <div key={r.name} className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                  {r.name[0]}
                </div>
                <span className="font-semibold">{r.name}</span>
              </div>

              <div className="mb-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Reflection</p>
                <p className="text-sm leading-relaxed">{r.q1}</p>
              </div>
              <div className="mb-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Application</p>
                {r.q2Private && r.name !== "You" ? (
                  <p className="flex items-center gap-1.5 text-sm italic text-muted-foreground">
                    <Lock className="h-3 w-3" strokeWidth={2} /> Kept private
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed">{r.q2}</p>
                )}
              </div>

              <div className="flex gap-2">
                {(Object.entries(reactionEmojis) as [ReactionType, string][]).map(([type, emoji]) => (
                  <button
                    key={type}
                    onClick={() => toggleReaction(r.name, type)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-all ${
                      (reactions[r.name] || []).includes(type)
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="text-xs capitalize">{type === "hit_me" ? "That hit me" : type === "amen" ? "Amen" : "Fire"}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default CompareNotes;