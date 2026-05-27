import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

const AGE_OPTIONS = ["Under 18","18–24","25–34","35–44","45–54","55 and older"];
const EDU_OPTIONS = ["Still in high school","In college or trade school","College graduate","Postgraduate degree","I took a different path"];
const CHURCH_OPTIONS = ["Yes","No","Not currently but looking"];
const FAITH_OPTIONS = [
  "Just getting started — I'm new to Christianity",
  "Growing — I believe and I'm trying to go deeper",
  "Established — I've walked with God for years",
  "Returning — I'm coming back after some time away",
  "Exploring — I'm not sure what I believe yet but I'm open",
];
const GOAL_OPTIONS = [
  "I need help being consistent in my time with God",
  "I'm looking for real accountability, not just a reading plan",
  "I want to become who God is calling me to be",
  "I want faith to be part of our home, not just Sundays",
  "I want to pour into someone else's life",
  "I want to get back on track with my relationship with God",
];

type Answers = {
  name: string;
  age: string;
  state: string;
  education: string;
  hasChurch: string;
  churchName: string;
  rating: number | null;
  faith: string;
  goals: string[];
};

const OptionCard = ({
  label, selected, onClick, multi,
}: { label: string; selected: boolean; onClick: () => void; multi?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-xl border-[1.5px] px-4 py-3 text-left transition-all duration-150 mb-2 ${
      selected
        ? "border-primary bg-primary/10 text-primary font-semibold"
        : "border-border bg-card text-foreground hover:border-primary/40"
    }`}
  >
    <span
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center ${
        multi ? "rounded-[4px]" : "rounded-full"
      } border-[1.5px] ${selected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
    >
      {selected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
    </span>
    <span className="flex-1 text-sm leading-snug">{label}</span>
  </button>
);

const OnboardingSurvey = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(1); // 1..8 questions, 9 closing
  const [saving, setSaving] = useState(false);
  const [a, setA] = useState<Answers>({
    name: "",
    age: "",
    state: "",
    education: "",
    hasChurch: "",
    churchName: "",
    rating: null,
    faith: "",
    goals: [],
  });

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [user, loading, navigate]);

  const canContinue = (() => {
    switch (step) {
      case 1: return a.name.trim().length > 0;
      case 2: return !!a.age;
      case 3: return !!a.state;
      case 4: return !!a.education;
      case 5: return !!a.hasChurch;
      case 6: return a.rating !== null;
      case 7: return !!a.faith;
      case 8: return a.goals.length >= 1;
      default: return true;
    }
  })();

  const toggleGoal = (g: string) => {
    setA((prev) => {
      if (prev.goals.includes(g)) return { ...prev, goals: prev.goals.filter((x) => x !== g) };
      if (prev.goals.length >= 2) return prev;
      return { ...prev, goals: [...prev.goals, g] };
    });
  };

  const advance = () => setStep((s) => Math.min(s + 1, 9));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        user_id: user.id,
        display_name: a.name,
        survey_name: a.name,
        survey_age_range: a.age,
        survey_state: a.state,
        survey_education: a.education,
        survey_has_church: a.hasChurch === "Yes",
        survey_church_name: a.hasChurch === "Yes" ? a.churchName || null : null,
        survey_devotional_rating: a.rating,
        survey_faith_journey: a.faith,
        survey_goals: a.goals,
        survey_completed_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save survey", description: error.message, variant: "destructive" });
      return;
    }
    advance(); // go to closing screen
  };

  const handleContinue = () => {
    if (step === 8) return handleFinish();
    advance();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Progress bar — hidden on Q1 and closing */}
      {step > 1 && step < 9 && (
        <div className="px-6 pt-6">
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / 8) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{step} of 8</p>
        </div>
      )}

      {/* Back arrow */}
      {step > 1 && step < 9 && (
        <button
          onClick={back}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      <div className="flex-1 px-6 pt-8 pb-32">
        {step === 1 && (
          <div className="mx-auto max-w-md">
            <h1 className="font-serif text-2xl font-bold leading-snug text-foreground">
              Hey, thanks for signing up! It's a pleasure to walk alongside you. What's your name?
            </h1>
            <Input
              autoFocus
              value={a.name}
              onChange={(e) => setA({ ...a, name: e.target.value })}
              placeholder="Your name"
              className="mt-6 h-12 rounded-xl text-base"
            />
          </div>
        )}

        {step === 2 && (
          <div className="mx-auto max-w-md">
            <h1 className="mb-1 font-serif text-2xl font-bold">How old are you?</h1>
            <p className="mb-6 text-xs text-muted-foreground">This helps us personalize your experience.</p>
            {AGE_OPTIONS.map((o) => (
              <OptionCard key={o} label={o} selected={a.age === o} onClick={() => setA({ ...a, age: o })} />
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="mx-auto max-w-md">
            <h1 className="mb-6 font-serif text-2xl font-bold">Where are you based?</h1>
            <Select value={a.state} onValueChange={(v) => setA({ ...a, state: v })}>
              <SelectTrigger className="h-12 rounded-xl text-base">
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === 4 && (
          <div className="mx-auto max-w-md">
            <h1 className="mb-1 font-serif text-2xl font-bold">Where are you in your education?</h1>
            <p className="mb-6 text-xs text-muted-foreground">No right or wrong answer here.</p>
            {EDU_OPTIONS.map((o) => (
              <OptionCard key={o} label={o} selected={a.education === o} onClick={() => setA({ ...a, education: o })} />
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="mx-auto max-w-md">
            <h1 className="mb-6 font-serif text-2xl font-bold">Do you belong to a church?</h1>
            {CHURCH_OPTIONS.map((o) => (
              <OptionCard key={o} label={o} selected={a.hasChurch === o} onClick={() => setA({ ...a, hasChurch: o })} />
            ))}
            {a.hasChurch === "Yes" && (
              <Input
                value={a.churchName}
                onChange={(e) => setA({ ...a, churchName: e.target.value })}
                placeholder="What's the name of your church? (optional)"
                className="mt-4 h-12 rounded-xl text-base"
              />
            )}
          </div>
        )}

        {step === 6 && (
          <div className="mx-auto max-w-md">
            <h1 className="mb-1 font-serif text-2xl font-bold">
              How would you rate your current devotional life and time with God?
            </h1>
            <p className="mb-6 text-xs text-muted-foreground">Be honest — that's what this is for.</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setA({ ...a, rating: n })}
                  className={`h-14 flex-1 rounded-xl border-[1.5px] text-lg font-bold transition-all duration-150 ${
                    a.rating === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/40"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Rarely or never</span>
              <span>Every day</span>
            </div>
            {a.rating !== null && (
              <p className="mt-4 text-sm text-muted-foreground">
                {[
                  "",
                  "Rarely or never",
                  "Occasionally — a few times a month",
                  "Some weeks are better than others",
                  "Most days — building the habit",
                  "Every day — it's a real priority",
                ][a.rating]}
              </p>
            )}
          </div>
        )}

        {step === 7 && (
          <div className="mx-auto max-w-md">
            <h1 className="mb-1 font-serif text-2xl font-bold">
              How would you describe where you are in your faith right now?
            </h1>
            <p className="mb-6 text-xs text-muted-foreground">No right or wrong answer.</p>
            {FAITH_OPTIONS.map((o) => (
              <OptionCard key={o} label={o} selected={a.faith === o} onClick={() => setA({ ...a, faith: o })} />
            ))}
          </div>
        )}

        {step === 8 && (
          <div className="mx-auto max-w-md">
            <h1 className="mb-1 font-serif text-2xl font-bold">
              What are you most hoping IronSharp helps you with?
            </h1>
            <p className="mb-6 text-xs text-muted-foreground">Pick up to two.</p>
            {GOAL_OPTIONS.map((o) => {
              const selected = a.goals.includes(o);
              const dimmed = !selected && a.goals.length >= 2;
              return (
                <div key={o} className={dimmed ? "opacity-40" : ""}>
                  <OptionCard label={o} multi selected={selected} onClick={() => toggleGoal(o)} />
                </div>
              );
            })}
            {a.goals.length === 2 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Maximum 2 selected — deselect one to change your choice.
              </p>
            )}
          </div>
        )}

        {step === 9 && (
          <div className="mx-auto flex max-w-md flex-col items-center pt-8 text-center">
            <h2 className="font-serif text-4xl font-bold tracking-tight">
              Iron<span className="text-primary">Sharp</span>
            </h2>
            <div className="mt-8 w-full rounded-2xl border border-border bg-card p-6">
              <p className="font-serif text-lg italic leading-relaxed text-foreground">
                "As iron sharpens iron, so one person sharpens another."
              </p>
              <p className="mt-3 text-sm font-medium text-muted-foreground">— Proverbs 27:17</p>
            </div>
            <p className="mt-8 font-serif text-lg text-foreground">
              Welcome to the IronSharp community. Let's get started.
            </p>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          {step < 9 ? (
            <Button
              onClick={handleContinue}
              disabled={!canContinue || saving}
              className="h-12 w-full rounded-xl text-base font-semibold"
            >
              {saving ? "Saving..." : step === 8 ? "Finish" : "Continue"}
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/home", { replace: true })}
              className="h-12 w-full rounded-xl text-base font-semibold"
            >
              Let's Go →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingSurvey;