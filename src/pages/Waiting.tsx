import AppLayout from "@/components/AppLayout";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const members = [
  { name: "You", done: true },
  { name: "Marcus", done: true },
  { name: "David", done: false },
  { name: "Sarah", done: false },
];

const Waiting = () => {
  const navigate = useNavigate();
  const allDone = members.every(m => m.done);

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-12 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mb-2 font-serif text-2xl font-bold">You're Done! 🎉</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Waiting for the rest of your group to finish before you can compare notes.
        </p>

        <div className="mb-8 w-full max-w-xs rounded-xl border border-border bg-card p-4">
          <div className="space-y-3">
            {members.map(m => (
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

        {allDone && (
          <Button onClick={() => navigate("/compare")} className="h-12 w-full max-w-xs rounded-xl text-base font-semibold">
            Compare Notes
          </Button>
        )}

        <button onClick={() => navigate("/home")} className="mt-4 text-sm text-primary hover:underline">
          Back to Home
        </button>
      </div>
    </AppLayout>
  );
};

export default Waiting;