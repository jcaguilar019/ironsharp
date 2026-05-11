import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import DevotionalHub from "@/components/devotional/DevotionalHub";
import StudyNotesDrawer from "@/components/devotional/StudyNotesDrawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Headphones, ChevronLeft, Mic, Square, Play, Shield } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Free public-domain translations available via bible-api.com
const translations = [
  { id: "kjv", label: "KJV" },
  { id: "web", label: "WEB" },
  { id: "asv", label: "ASV" },
  { id: "bbe", label: "BBE" },
];

interface DayContent {
  chapter: string;
  theme: string | null;
  commentary: string;
  reflection_q1: string;
  reflection_q2: string;
  day_number: number;
  plan_id: string;
}

interface PlanInfo {
  id: string;
  title: string;
  total_days: number;
  how_to_use: string | null;
}

const Devotional = () => {
  const [translation, setTranslation] = useState("kjv");
  const [scriptureVerses, setScriptureVerses] = useState<{ verse: number; text: string }[] | null>(null);
  const [scriptureLoading, setScriptureLoading] = useState(false);
  const [scriptureError, setScriptureError] = useState<string | null>(null);
  const [response1, setResponse1] = useState("");
  const [response2, setResponse2] = useState("");
  const [prayer, setPrayer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [dayContent, setDayContent] = useState<DayContent | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();

  // If navigated from Plans page with a category, load the first plan in that category
  useEffect(() => {
    const category = searchParams.get("category");
    const planId = searchParams.get("plan");
    if (planId) {
      setActivePlanId(planId);
    } else if (category) {
      const loadCategoryPlan = async () => {
        const { data } = await supabase
          .from("devotional_plans")
          .select("id")
          .eq("category", category)
          .limit(1)
          .single();
        if (data) setActivePlanId(data.id);
      };
      loadCategoryPlan();
    }
  }, [searchParams]);

  // Load plan info and day content when activePlanId changes
  useEffect(() => {
    if (!activePlanId) {
      setDayContent(null);
      setPlanInfo(null);
      return;
    }

    const loadContent = async () => {
      // Get plan info
      const { data: plan } = await supabase
        .from("devotional_plans")
        .select("id, title, total_days, how_to_use")
        .eq("id", activePlanId)
        .single();
      if (plan) setPlanInfo(plan);

      // Check user progress
      let day = 1;
      if (user) {
        const { data: progress } = await supabase
          .from("user_plan_progress")
          .select("current_day")
          .eq("plan_id", activePlanId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (progress) {
          day = progress.current_day;
        } else {
          // Start the plan
          await supabase.from("user_plan_progress").insert({
            user_id: user.id,
            plan_id: activePlanId,
            current_day: 1,
          });
        }
      }
      setCurrentDay(day);

      // Get day content
      const { data: dayData } = await supabase
        .from("devotional_days")
        .select("*")
        .eq("plan_id", activePlanId)
        .eq("day_number", day)
        .single();
      if (dayData) setDayContent(dayData);
    };

    loadContent();
  }, [activePlanId, user]);

  // Fetch scripture text from free Bible API whenever chapter or translation changes
  useEffect(() => {
    if (!dayContent?.chapter) {
      setScriptureVerses(null);
      return;
    }
    let cancelled = false;
    const fetchScripture = async () => {
      setScriptureLoading(true);
      setScriptureError(null);
      try {
        const ref = encodeURIComponent(dayContent.chapter);
        const res = await fetch(`https://bible-api.com/${ref}?translation=${translation}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const verses = (data.verses || []).map((v: any) => ({
          verse: v.verse,
          text: (v.text || "").trim(),
        }));
        setScriptureVerses(verses);
      } catch (e) {
        if (!cancelled) setScriptureError("Could not load scripture. Try another translation.");
      } finally {
        if (!cancelled) setScriptureLoading(false);
      }
    };
    fetchScripture();
    return () => {
      cancelled = true;
    };
  }, [dayContent?.chapter, translation]);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasRecording(true);
      toast({ title: "Voice memo saved 🎙️" });
    } else {
      setIsRecording(true);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    toast({ title: "Devotional submitted! 🙏" });

    // Advance day if not at end
    if (user && activePlanId && planInfo && currentDay < planInfo.total_days) {
      const nextDay = currentDay + 1;
      supabase
        .from("user_plan_progress")
        .update({ current_day: nextDay })
        .eq("user_id", user.id)
        .eq("plan_id", activePlanId)
        .then(() => {
          setCurrentDay(nextDay);
          // Load next day's content
          supabase
            .from("devotional_days")
            .select("*")
            .eq("plan_id", activePlanId)
            .eq("day_number", nextDay)
            .single()
            .then(({ data }) => {
              if (data) setDayContent(data);
              setSubmitted(false);
              setResponse1("");
              setResponse2("");
              setPrayer("");
            });
        });
    } else if (user && activePlanId) {
      // Mark completed
      supabase
        .from("user_plan_progress")
        .update({ completed_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("plan_id", activePlanId)
        .then(() => {
          toast({ title: "Plan completed! 🎉" });
          navigate("/waiting");
        });
    } else {
      navigate("/waiting");
    }
  };

  // Hub view
  if (!activePlanId) {
    return (
      <AppLayout>
        <DevotionalHub onOpenPlan={(id) => setActivePlanId(id)} />
      </AppLayout>
    );
  }

  // Reading view (existing)
  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-6">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => { setActivePlanId(null); navigate("/devotional", { replace: true }); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <Select value={translation} onValueChange={setTranslation}>
            <SelectTrigger className="h-8 w-20 rounded-full border-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {translations.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Day {currentDay} of {planInfo?.total_days || 7}
            </p>
            <h1 className="font-serif text-2xl font-bold">{dayContent?.chapter || "Loading..."}</h1>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Headphones className="h-5 w-5" />
          </button>
        </div>

        {/* Theme */}
        {dayContent?.theme && (
        <div className="mb-6 rounded-xl bg-card p-5">
          <p className="font-serif text-base italic leading-relaxed text-muted-foreground">{dayContent.theme}</p>
        </div>
        )}

        {/* Scripture */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Scripture</h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Public Domain</span>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            {scriptureLoading && (
              <p className="text-sm italic text-muted-foreground">Loading scripture…</p>
            )}
            {scriptureError && !scriptureLoading && (
              <p className="text-sm italic text-muted-foreground">{scriptureError}</p>
            )}
            {!scriptureLoading && !scriptureError && scriptureVerses && (
              <p className="font-serif text-base leading-relaxed">
                {scriptureVerses.map((v) => (
                  <span key={v.verse}>
                    <sup className="mr-1 text-[10px] font-semibold text-accent">{v.verse}</sup>
                    {v.text}{" "}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        {/* Commentary */}
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Context</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{dayContent?.commentary || ""}</p>
        </div>

        {/* Study Notes Drawer */}
        {activePlanId && dayContent && (
          <StudyNotesDrawer
            planId={activePlanId}
            dayNumber={currentDay}
            passageReference={dayContent.chapter}
          />
        )}

        {/* Questions */}
        <div className="mb-6 space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Reflect</h3>
            <p className="mb-3 font-serif text-base italic">
              {dayContent?.reflection_q1 || ""}
            </p>
            <Textarea
              value={response1}
              onChange={e => setResponse1(e.target.value)}
              placeholder="Share your honest reflection..."
              className="min-h-[100px] rounded-xl"
            />
          </div>
          <div>
            <p className="mb-3 font-serif text-base italic">
              {dayContent?.reflection_q2 || ""}
            </p>
            <Textarea
              value={response2}
              onChange={e => setResponse2(e.target.value)}
              placeholder="What's the invitation here?"
              className="min-h-[100px] rounded-xl"
            />
          </div>
        </div>

        {/* Prayer */}
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Prayer / Praise <span className="normal-case font-normal">(optional)</span></h3>
          <Textarea
            value={prayer}
            onChange={e => setPrayer(e.target.value)}
            placeholder="A personal prayer or praise..."
            className="min-h-[80px] rounded-xl"
          />
        </div>

        {/* Voice Memo */}
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Voice Memo <span className="normal-case font-normal">(optional)</span>
          </h3>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <button
              onClick={toggleRecording}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                isRecording
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <div className="flex-1">
              {isRecording ? (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-destructive/30">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-destructive" />
                  </div>
                  <span className="text-xs text-destructive font-medium">Recording...</span>
                </div>
              ) : hasRecording ? (
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  <div className="h-1.5 flex-1 rounded-full bg-primary/20">
                    <div className="h-full w-2/3 rounded-full bg-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">0:42</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Record a voice reflection</p>
              )}
            </div>
          </div>
        </div>

        {/* Discipler Notes */}
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Discipler Notes</h3>
          </div>
          <p className="text-sm italic text-muted-foreground">
            "Great reflection on verse 6 — keep pressing into that tension between honesty and love. Praying for you this week."
          </p>
          <p className="mt-2 text-xs text-muted-foreground">— Marcus, 2 days ago</p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!response1.trim() || !response2.trim() || submitted}
          className="h-12 w-full rounded-xl text-base font-semibold"
        >
          {submitted ? "Submitted ✓" : "Submit"}
        </Button>
      </div>
    </AppLayout>
  );
};

export default Devotional;