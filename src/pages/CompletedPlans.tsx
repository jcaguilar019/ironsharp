import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

interface CompletedRow {
  plan_id: string;
  completed_at: string;
  title: string;
  total_days: number;
}

const CompletedPlans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<CompletedRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: progress } = await supabase
        .from("user_plan_progress")
        .select("plan_id, completed_at")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });

      if (!progress || progress.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const planIds = progress.map((p) => p.plan_id);
      const { data: plans } = await supabase
        .from("devotional_plans")
        .select("id, title, total_days")
        .in("id", planIds);

      const byId: Record<string, { title: string; total_days: number }> = {};
      (plans || []).forEach((p) => {
        byId[p.id] = { title: p.title, total_days: p.total_days };
      });

      setRows(
        progress
          .filter((p) => byId[p.plan_id])
          .map((p) => ({
            plan_id: p.plan_id,
            completed_at: p.completed_at!,
            title: byId[p.plan_id].title,
            total_days: byId[p.plan_id].total_days,
          }))
      );
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-4 py-8">
        <button
          onClick={() => navigate("/plans")}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Plans
        </button>

        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Your finished plans
        </p>
        <h1 className="mb-6 font-serif text-2xl font-bold">Completed</h1>

        {loading ? (
          <p className="text-sm italic text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="font-serif text-base text-muted-foreground">
              You haven't finished a plan yet. Complete one and it'll show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <button
                key={r.plan_id}
                onClick={() => navigate(`/plans/completed/${r.plan_id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/10"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                <div className="flex-1">
                  <p className="font-serif text-base font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.total_days}-day plan · Completed{" "}
                    {new Date(r.completed_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
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

export default CompletedPlans;