import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

const samplePlans = [
  { id: "1", title: "Wisdom of Proverbs", days: 7, desc: "Walk through key chapters of Proverbs and apply ancient wisdom to modern life." },
  { id: "2", title: "Sermon on the Mount", days: 5, desc: "Jesus' most famous teaching — explore what it means to live the Kingdom life." },
  { id: "3", title: "Psalms of Comfort", days: 7, desc: "Find peace and strength in the Psalms during seasons of difficulty." },
  { id: "4", title: "The Gospel of John", days: 14, desc: "A deep dive into the life of Jesus as told by the beloved disciple." },
];

const PlanSelect = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center px-8 py-12">
      <h1 className="mb-2 font-serif text-3xl font-bold">Choose a Plan</h1>
      <p className="mb-8 text-sm text-muted-foreground">Pick a devotional to start with your group</p>

      <div className="w-full max-w-sm space-y-3">
        {samplePlans.map(plan => (
          <button
            key={plan.id}
            onClick={() => setSelected(plan.id)}
            className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all ${
              selected === plan.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              selected === plan.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{plan.title}</p>
              <p className="text-xs text-muted-foreground">{plan.days} days</p>
              <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <Button
        onClick={() => navigate("/onboarding/group")}
        disabled={!selected}
        className="mt-8 h-12 w-full max-w-sm rounded-xl text-base font-semibold"
      >
        Continue
      </Button>
    </div>
  );
};

export default PlanSelect;