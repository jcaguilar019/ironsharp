import AppLayout from "@/components/AppLayout";
import { ChevronLeft, Lock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type ReactionType = "amen" | "hit_me" | "fire";
const reactionEmojis: Record<ReactionType, string> = { amen: "🙏", hit_me: "✨", fire: "🔥" };
const reactionLabels: Record<ReactionType, string> = { amen: "Amen", hit_me: "That hit me", fire: "Fire" };

interface Submission {
  id: string;
  user_id: string;
  response1: string | null;
  response2: string | null;
  q1_private: boolean;
  q2_private: boolean;
  day_number: number;
  plan_id: string;
}
interface ProfileLite { user_id: string; display_name: string; }
interface Reaction { id: string; submission_id: string; user_id: string; reaction_type: ReactionType; }

const CompareNotes = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const planParam = params.get("plan");
  const dayParam = parseInt(params.get("day") || "", 10);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [chapter, setChapter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Resolve plan + day: explicit query params take priority, otherwise use user's latest submission.
    let planId = planParam;
    let day = Number.isNaN(dayParam) ? null : dayParam;
    if (!planId || !day) {
      const { data: mine } = await supabase
        .from("devotional_submissions")
        .select("plan_id, day_number")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (mine) { planId = mine.plan_id; day = mine.day_number; }
    }
    if (!planId || !day) { setLoading(false); return; }

    const { data: dayInfo } = await supabase
      .from("devotional_days")
      .select("chapter")
      .eq("plan_id", planId).eq("day_number", day).maybeSingle();
    if (dayInfo) setChapter(dayInfo.chapter);

    const { data: subs } = await supabase
      .from("devotional_submissions")
      .select("id, user_id, response1, response2, q1_private, q2_private, day_number, plan_id")
      .eq("plan_id", planId).eq("day_number", day);
    setSubmissions(subs || []);

    const ids = Array.from(new Set((subs || []).map(s => s.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles").select("user_id, display_name").in("user_id", ids);
      const map: Record<string, ProfileLite> = {};
      (profs || []).forEach(p => { map[p.user_id] = p; });
      setProfiles(map);
    }

    const subIds = (subs || []).map(s => s.id);
    if (subIds.length) {
      const { data: rxns } = await supabase
        .from("submission_reactions")
        .select("id, submission_id, user_id, reaction_type")
        .in("submission_id", subIds);
      setReactions((rxns || []) as Reaction[]);
    } else {
      setReactions([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, planParam, dayParam]);

  const toggleReaction = async (submissionId: string, type: ReactionType) => {
    if (!user) return;
    const existing = reactions.find(
      r => r.submission_id === submissionId && r.user_id === user.id && r.reaction_type === type
    );
    if (existing) {
      await supabase.from("submission_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("submission_reactions").insert({
        submission_id: submissionId, user_id: user.id, reaction_type: type,
      });
    }
    load();
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-6">
        <button onClick={() => navigate("/home")} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="mb-2 font-serif text-2xl font-bold">Compare Notes</h1>
        <p className="mb-6 text-sm text-muted-foreground">{chapter || "Today's reading"}</p>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && submissions.length === 0 && (
          <p className="text-sm italic text-muted-foreground">
            No submissions yet for this day. Submit yours first, then check back to compare.
          </p>
        )}

        <div className="space-y-6">
          {submissions.map(s => {
            const isMine = s.user_id === user?.id;
            const name = isMine ? "You" : profiles[s.user_id]?.display_name || "Member";
            const q1Hidden = s.q1_private && !isMine;
            const q2Hidden = s.q2_private && !isMine;
            return (
              <div key={s.id} className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                    {name[0]}
                  </div>
                  <span className="font-semibold">{name}</span>
                </div>

                <div className="mb-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Reflection</p>
                  {q1Hidden ? (
                    <p className="flex items-center gap-1.5 text-sm italic text-muted-foreground">
                      <Lock className="h-3 w-3" strokeWidth={2} /> Kept private
                    </p>
                  ) : (
                    <p className="text-sm leading-relaxed">{s.response1 || <em className="text-muted-foreground">(empty)</em>}</p>
                  )}
                </div>
                <div className="mb-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Application</p>
                  {q2Hidden ? (
                    <p className="flex items-center gap-1.5 text-sm italic text-muted-foreground">
                      <Lock className="h-3 w-3" strokeWidth={2} /> Kept private
                    </p>
                  ) : (
                    <p className="text-sm leading-relaxed">{s.response2 || <em className="text-muted-foreground">(empty)</em>}</p>
                  )}
                </div>

                {!isMine && (
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(reactionEmojis) as ReactionType[]).map(type => {
                      const active = reactions.some(
                        r => r.submission_id === s.id && r.user_id === user?.id && r.reaction_type === type
                      );
                      const count = reactions.filter(r => r.submission_id === s.id && r.reaction_type === type).length;
                      return (
                        <button
                          key={type}
                          onClick={() => toggleReaction(s.id, type)}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-all ${
                            active
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          <span>{reactionEmojis[type]}</span>
                          <span className="text-xs">{reactionLabels[type]}{count > 0 ? ` · ${count}` : ""}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default CompareNotes;