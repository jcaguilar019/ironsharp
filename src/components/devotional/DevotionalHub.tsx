import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const typeColors: Record<string, string> = {
  community: "#89B4C9",
  partner: "#A89070",
  family: "#7FAF8A",
  group: "#B8A86A",
};

interface PlaceholderPlan {
  id: string;
  type: keyof typeof typeColors;
  name: string;
  subtitle: string;
}

const defaultPlaceholders: PlaceholderPlan[] = [
  { id: "community", type: "community", name: "Community Plan", subtitle: "Proverbs 27 · Day 14/30" },
  { id: "partner", type: "partner", name: "Me & My Discipler", subtitle: "James 1 · Day 5/7" },
  { id: "family", type: "family", name: "Me & My Family", subtitle: "Psalm 23 · Day 3/14" },
  { id: "group", type: "group", name: "The Forge", subtitle: "Romans 8 · Day 10/30" },
];

const ORDER_KEY = "ironsharp.devotional_order";

interface PersonalPlan {
  planId: string;
  title: string;
  chapter: string;
  theme: string | null;
  currentDay: number;
  totalDays: number;
}

interface Props {
  onOpenPlan: (planId: string) => void;
}

const DevotionalHub = ({ onOpenPlan }: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [personal, setPersonal] = useState<PersonalPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(ORDER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultPlaceholders.map((p) => p.id);
  });
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  }, [order]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data: progress } = await supabase
        .from("user_plan_progress")
        .select("plan_id, current_day")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!progress) {
        setLoading(false);
        return;
      }
      const { data: plan } = await supabase
        .from("devotional_plans")
        .select("id, title, total_days")
        .eq("id", progress.plan_id)
        .single();
      const { data: day } = await supabase
        .from("devotional_days")
        .select("chapter, theme")
        .eq("plan_id", progress.plan_id)
        .eq("day_number", progress.current_day)
        .single();
      if (plan && day) {
        setPersonal({
          planId: plan.id,
          title: plan.title,
          chapter: day.chapter,
          theme: day.theme,
          currentDay: progress.current_day,
          totalDays: plan.total_days,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const orderedPlaceholders = order
    .map((id) => defaultPlaceholders.find((p) => p.id === id))
    .filter(Boolean) as PlaceholderPlan[];

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = [...order];
    const from = next.indexOf(dragId);
    const to = next.indexOf(targetId);
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    setOrder(next);
    setDragId(null);
  };

  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Your Daily Reading
      </p>
      <h1 className="mb-6 font-serif text-2xl font-bold">Devotionals</h1>

      {/* Personal Plan — Hero */}
      {loading ? (
        <div className="mb-6 h-48 animate-pulse rounded-2xl bg-card" />
      ) : personal ? (
        <button
          onClick={() => onOpenPlan(personal.planId)}
          className="mb-6 block w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="h-1 w-full bg-primary" />
          <div className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Your Personal Plan
            </p>
            <h2 className="mt-1 font-serif text-xl font-bold leading-tight">
              {personal.title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {personal.chapter} · Day {personal.currentDay} of {personal.totalDays}
            </p>
            {personal.theme && (
              <p className="mt-3 font-serif text-sm italic text-muted-foreground">
                {personal.theme}
              </p>
            )}
            <div className="mt-4">
              <Progress
                value={Math.round((personal.currentDay / personal.totalDays) * 100)}
                className="h-[3px]"
              />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
              <BookOpen className="h-4 w-4" />
              Continue Reading →
            </div>
          </div>
        </button>
      ) : (
        <div className="mb-6 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <p className="font-serif text-base font-semibold">No active plan yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a devotional to make it yours.
          </p>
          <Button className="mt-4 rounded-xl" onClick={() => navigate("/plans")}>
            Browse Plans
          </Button>
        </div>
      )}

      {/* Other plans — compact, reorderable */}
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Shared Plans · Drag to reorder
      </p>
      <div className="space-y-2">
        {orderedPlaceholders.map((p) => {
          const accent = typeColors[p.type];
          return (
            <div
              key={p.id}
              draggable
              onDragStart={() => setDragId(p.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(p.id)}
              onDragEnd={() => setDragId(null)}
              onClick={() =>
                toast({
                  title: "Coming soon",
                  description: `${p.name} is a preview — shared plans launch soon.`,
                })
              }
              className={`flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-opacity ${
                dragId === p.id ? "opacity-50" : ""
              }`}
            >
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div
                className="h-8 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-sm font-semibold">{p.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{p.subtitle}</p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Preview
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DevotionalHub;
