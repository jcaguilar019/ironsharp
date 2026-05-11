import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DayRow {
  day_number: number;
  chapter: string;
}

const CompletedPlanReview = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState<string>("");
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [days, setDays] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!planId || !user) return;

      const [{ data: plan }, { data: progress }, { data: dayRows }] = await Promise.all([
        supabase
          .from("devotional_plans")
          .select("title")
          .eq("id", planId)
          .maybeSingle(),
        supabase
          .from("user_plan_progress")
          .select("completed_at")
          .eq("plan_id", planId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("devotional_days")
          .select("day_number, chapter")
          .eq("plan_id", planId)
          .order("day_number", { ascending: true }),
      ]);

      if (plan) setTitle(plan.title);
      if (progress?.completed_at) setCompletedAt(progress.completed_at);
      setDays(dayRows || []);
      setLoading(false);
    };
    load();
  }, [planId, user]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-4 py-8">
        <button
          onClick={() => navigate("/plans/completed")}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Completed
        </button>

        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Review
        </p>
        <h1 className="mb-1 font-serif text-2xl font-bold">{title || "Plan"}</h1>
        {completedAt && (
          <p className="mb-6 text-xs text-muted-foreground">
            Completed{" "}
            {new Date(completedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}

        {loading ? (
          <p className="text-sm italic text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-2">
            {days.map((d) => (
              <button
                key={d.day_number}
                onClick={() =>
                  navigate(`/devotional?plan=${planId}&day=${d.day_number}&review=1`)
                }
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/10"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-serif text-sm font-semibold text-primary">
                  {d.day_number}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Day {d.day_number}
                  </p>
                  <p className="font-serif text-base font-semibold">{d.chapter}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CompletedPlanReview;