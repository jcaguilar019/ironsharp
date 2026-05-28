import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Flame, BookOpen, Settings, BarChart3, LogOut, Star, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTier, type MembershipTier } from "@/lib/membership";

const Profile = () => {
  const { user, signOut, displayName } = useAuth();
  const navigate = useNavigate();
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase();
  const [stats, setStats] = useState({ streak: 0, completed: 0, church: "" });
  const [tier, setTier] = useState<MembershipTier>("free");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("streak_count, church_name, membership_tier")
        .eq("user_id", user.id)
        .maybeSingle();
      const { count } = await supabase
        .from("devotional_submissions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setStats({
        streak: profile?.streak_count ?? 0,
        completed: count ?? 0,
        church: profile?.church_name ?? "",
      });
      if (profile?.membership_tier) setTier(profile.membership_tier as MembershipTier);
    })();
  }, [user]);

  const tierInfo = getTier(tier);
  const isFree = tier === "free";

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-8">
        {/* Avatar & Name */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-card text-2xl font-bold">
            {initials}
          </div>
          <h1 className="font-serif text-xl font-bold">{displayName}</h1>
          <p className="text-sm text-muted-foreground">{stats.church || "—"}</p>
          <div
            className="mt-2 rounded-full px-3 py-1 text-[11px] font-semibold"
            style={{ background: tierInfo.pale, color: tierInfo.color }}
          >
            {tierInfo.name} Plan
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center rounded-xl border border-border bg-card p-4">
            <Flame className="mb-1 h-5 w-5 text-primary" />
            <span className="text-lg font-bold">{stats.streak}</span>
            <span className="text-xs text-muted-foreground">Day Streak</span>
          </div>
          <div className="flex flex-col items-center rounded-xl border border-border bg-card p-4">
            <BookOpen className="mb-1 h-5 w-5 text-primary" />
            <span className="text-lg font-bold">{stats.completed}</span>
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
        </div>

        {/* Membership */}
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Membership
        </h3>
        <button
          onClick={() => navigate("/pricing")}
          className="mb-6 flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: tierInfo.pale }}
          >
            <Star className="h-5 w-5" style={{ color: tierInfo.color, fill: tierInfo.color }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "#5C4A3A" }}>
              {isFree ? "Upgrade Membership" : "Manage Membership"}
            </p>
            <p className="text-xs italic text-muted-foreground">
              {isFree ? "See what's available" : `${tierInfo.name} Plan — tap to manage`}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="outline" onClick={() => navigate("/analytics")} className="h-12 w-full rounded-xl justify-start">
            <BarChart3 className="mr-3 h-4 w-4" /> Analytics
          </Button>
          <Button variant="outline" onClick={() => navigate("/settings")} className="h-12 w-full rounded-xl justify-start">
            <Settings className="mr-3 h-4 w-4" /> Settings
          </Button>
          <Button variant="outline" onClick={async () => { await signOut(); navigate("/"); }} className="h-12 w-full rounded-xl justify-start text-destructive hover:text-destructive">
            <LogOut className="mr-3 h-4 w-4" /> Log Out
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;