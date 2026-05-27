import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Flame, BookOpen, MessageSquare, Mic, Keyboard, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Stats {
  total: number;
  typed: number;
  commute: number;
  last7: number;
  streak: number;
  notesReceived: number;
  daysActive: { date: string; count: number }[];
}

const Analytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: subs }, { data: profile }, { count: notes }] = await Promise.all([
        supabase
          .from("devotional_submissions")
          .select("submission_source, submitted_at")
          .eq("user_id", user.id)
          .order("submitted_at", { ascending: false }),
        supabase.from("profiles").select("streak_count").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("discipler_notes")
          .select("*", { count: "exact", head: true })
          .eq("to_user_id", user.id),
      ]);

      const all = subs || [];
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const byDay = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        byDay.set(d.toISOString().slice(0, 10), 0);
      }
      all.forEach((row: any) => {
        const key = new Date(row.submitted_at).toISOString().slice(0, 10);
        if (byDay.has(key)) byDay.set(key, (byDay.get(key) || 0) + 1);
      });

      setS({
        total: all.length,
        typed: all.filter((r: any) => r.submission_source === "typed").length,
        commute: all.filter((r: any) => r.submission_source === "commute").length,
        last7: all.filter((r: any) => new Date(r.submitted_at).getTime() >= cutoff).length,
        streak: profile?.streak_count ?? 0,
        notesReceived: notes ?? 0,
        daysActive: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })),
      });
    })();
  }, [user]);

  const max = Math.max(1, ...(s?.daysActive.map((d) => d.count) || [1]));

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-6">
        <button onClick={() => navigate("/profile")} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="mb-1 font-serif text-2xl font-bold">Your Walk</h1>
        <p className="mb-6 text-sm text-muted-foreground">Insights from your daily time with God</p>

        {!s ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3">
              <StatCard icon={Flame} label="Day Streak" value={s.streak} />
              <StatCard icon={BookOpen} label="Total Devotionals" value={s.total} />
              <StatCard icon={TrendingUp} label="Last 7 Days" value={s.last7} />
              <StatCard icon={MessageSquare} label="Notes Received" value={s.notesReceived} />
            </div>

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">This Week</h3>
            <div className="mb-6 rounded-xl border border-border bg-card p-4">
              <div className="flex h-32 items-end justify-between gap-2">
                {s.daysActive.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-primary/70"
                      style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 2 }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(d.date).toLocaleDateString("en", { weekday: "narrow" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">How You Engage</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Keyboard} label="Typed Reflections" value={s.typed} />
              <StatCard icon={Mic} label="Commute Mode" value={s.commute} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: number }) => (
  <div className="flex flex-col items-start rounded-xl border border-border bg-card p-4">
    <Icon className="mb-2 h-4 w-4 text-primary" />
    <span className="text-2xl font-bold">{value}</span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

export default Analytics;