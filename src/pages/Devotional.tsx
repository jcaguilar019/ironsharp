import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import DevotionalHub from "@/components/devotional/DevotionalHub";
import StudyNotesDrawer from "@/components/devotional/StudyNotesDrawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Headphones, ChevronLeft, Mic, Square, Play, Shield, BookOpen, ChevronDown } from "lucide-react";
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

// Curated short, public-domain encouragement verses (KJV) shown after a daily devotional is completed.
const encouragementVerses: { ref: string; text: string }[] = [
  { ref: "Joshua 1:9", text: "Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee whithersoever thou goest." },
  { ref: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me." },
  { ref: "Isaiah 40:31", text: "They that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles." },
  { ref: "Lamentations 3:22-23", text: "His compassions fail not. They are new every morning: great is thy faithfulness." },
  { ref: "Psalm 1:2-3", text: "His delight is in the law of the Lord… and he shall be like a tree planted by the rivers of water." },
  { ref: "Proverbs 3:5-6", text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding." },
  { ref: "Romans 8:28", text: "All things work together for good to them that love God, to them who are the called according to his purpose." },
  { ref: "2 Timothy 1:7", text: "God hath not given us the spirit of fear; but of power, and of love, and of a sound mind." },
  { ref: "Psalm 46:10", text: "Be still, and know that I am God." },
  { ref: "Matthew 11:28", text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest." },
  { ref: "Hebrews 12:1", text: "Let us run with patience the race that is set before us." },
  { ref: "1 Corinthians 16:13", text: "Watch ye, stand fast in the faith, quit you like men, be strong." },
  { ref: "Psalm 23:1", text: "The Lord is my shepherd; I shall not want." },
  { ref: "Galatians 6:9", text: "Let us not be weary in well doing: for in due season we shall reap, if we faint not." },
  { ref: "Zephaniah 3:17", text: "The Lord thy God in the midst of thee is mighty; he will save, he will rejoice over thee with joy." },
];

const todayKey = () => new Date().toISOString().slice(0, 10);
const lockKey = (planId: string) => `ironsharp.last_completed:${planId}`;

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
  const [completedToday, setCompletedToday] = useState(false);
  const [completedDay, setCompletedDay] = useState<number | null>(null);
  const [encouragement, setEncouragement] = useState(() => encouragementVerses[Math.floor(Math.random() * encouragementVerses.length)]);
  const [contextOpen, setContextOpen] = useState(false);

  // Reset context drawer when day changes
  useEffect(() => {
    setContextOpen(false);
  }, [activePlanId, currentDay]);
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
      setCompletedToday(false);
      return;
    }

    // Check today-lock: if user already submitted today for this plan, show completion view
    try {
      const last = localStorage.getItem(lockKey(activePlanId));
      if (last === todayKey()) {
        setCompletedToday(true);
        setEncouragement(encouragementVerses[Math.floor(Math.random() * encouragementVerses.length)]);
      } else {
        setCompletedToday(false);
      }
    } catch {}

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
      // The day shown for "Day X complete" if locked is the previous (just-finished) day
      if (localStorage.getItem(lockKey(activePlanId)) === todayKey()) {
        setCompletedDay(Math.max(1, day - 1));
      }
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
    toast({ title: "Devotional submitted 🙏" });

    // Lock today for this plan
    if (activePlanId) {
      try { localStorage.setItem(lockKey(activePlanId), todayKey()); } catch {}
    }

    // Pick a fresh encouragement verse for the completion screen
    setEncouragement(encouragementVerses[Math.floor(Math.random() * encouragementVerses.length)]);
    setCompletedDay(currentDay);

    const isFinalDay = !!(planInfo && currentDay >= planInfo.total_days);

    if (user && activePlanId && !isFinalDay) {
      // Advance the stored current_day so tomorrow opens the next day — but DO NOT load it now.
      supabase
        .from("user_plan_progress")
        .update({ current_day: currentDay + 1 })
        .eq("user_id", user.id)
        .eq("plan_id", activePlanId)
        .then(() => {
          setCompletedToday(true);
          setSubmitted(false);
        });
    } else if (user && activePlanId && isFinalDay) {
      supabase
        .from("user_plan_progress")
        .update({ completed_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("plan_id", activePlanId)
        .then(() => {
          setCompletedToday(true);
          setSubmitted(false);
        });
    } else {
      setCompletedToday(true);
      setSubmitted(false);
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

  // Completion / locked view — shown after submit OR if today was already completed
  if (completedToday) {
    const isFinalDay = !!(planInfo && (completedDay ?? currentDay) >= planInfo.total_days);
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg px-6 py-10">
          <button
            onClick={() => { setActivePlanId(null); navigate("/devotional", { replace: true }); }}
            className="mb-8 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {isFinalDay ? "Plan Complete" : "Today's Reading"}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight">
              {isFinalDay ? "Plan complete." : "Done. Come back tomorrow."}
            </h1>
            {planInfo && (
              <p className="mt-2 text-sm text-muted-foreground">
                Day {completedDay ?? currentDay} of {planInfo.total_days} complete.
              </p>
            )}

            <div className="mt-8 rounded-xl bg-background/60 p-5 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                A word for today
              </p>
              <p className="mt-2 font-serif text-base italic leading-relaxed">
                "{encouragement.text}"
              </p>
              <p className="mt-2 text-xs font-semibold text-primary">— {encouragement.ref}</p>
            </div>

            <Button
              variant="outline"
              className="mt-8 h-11 w-full rounded-xl"
              onClick={() => {
                if (isFinalDay) {
                  navigate("/plans");
                } else {
                  setActivePlanId(null);
                  navigate("/devotional", { replace: true });
                }
              }}
            >
              {isFinalDay ? "Browse Plans" : "Back to Devotionals"}
            </Button>
          </div>
        </div>
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

        {/* Context Drawer */}
        {dayContent?.commentary && (
          <div className="mb-6">
            <button
              onClick={() => setContextOpen((o) => !o)}
              aria-expanded={contextOpen}
              className={`flex w-full items-center justify-between border border-border bg-[hsl(var(--card-deep))] px-4 py-3 transition-colors hover:bg-[hsl(var(--card-deep))]/80 ${
                contextOpen ? "rounded-t-xl" : "rounded-xl"
              }`}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <span
                  className="font-serif text-[11px] uppercase text-muted-foreground"
                  style={{ letterSpacing: "0.5px" }}
                >
                  Open Context
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground/70 transition-transform duration-200 ${
                  contextOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
                contextOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="rounded-b-xl border border-t-0 border-border bg-[hsl(var(--card))]/60 px-4 py-4">
                <p
                  className="mb-3 text-[9px] font-semibold uppercase text-muted-foreground/70"
                  style={{ letterSpacing: "2px" }}
                >
                  Context · {dayContent.chapter}
                </p>
                <p
                  className="font-serif text-[12px] text-muted-foreground"
                  style={{ lineHeight: 1.7 }}
                >
                  {dayContent.commentary}
                </p>
              </div>
            </div>
          </div>
        )}

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