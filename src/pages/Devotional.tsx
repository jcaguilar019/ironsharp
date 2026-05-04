import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Headphones, ChevronLeft, Mic, Square, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const translations = ["NIV", "ESV", "NLT", "KJV", "NKJV", "CSB", "MSG"];

const passageText = `Do not boast about tomorrow, for you do not know what a day may bring.

Let someone else praise you, and not your own mouth; an outsider, and not your own lips.

Stone is heavy and sand a burden, but a fool's provocation is heavier than both.

Anger is cruel and fury overwhelming, but who can stand before jealousy?

Better is open rebuke than hidden love.

Faithful are the wounds of a friend; profuse are the kisses of an enemy.

One who is full loathes honey from the comb, but to the hungry even what is bitter tastes sweet.

Like a bird that flees its nest is anyone who flees from home.

Perfume and incense bring joy to the heart, and the pleasantness of a friend springs from their heartfelt advice.

Do not forsake your friend or a friend of your family, and do not go to your relative's house when disaster strikes you — better a neighbor nearby than a relative far away.

As iron sharpens iron, so one person sharpens another.`;

const commentary = `Proverbs 27 is a chapter about the value of honest, close relationships. Solomon contrasts the wounds of a faithful friend with the flattery of an enemy — reminding us that real love sometimes tells hard truths. This chapter celebrates proximity, loyalty, and the refining power of doing life with others.`;

const Devotional = () => {
  const [translation, setTranslation] = useState("NIV");
  const [response1, setResponse1] = useState("");
  const [response2, setResponse2] = useState("");
  const [prayer, setPrayer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
    navigate("/waiting");
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-6">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => navigate("/home")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <Select value={translation} onValueChange={setTranslation}>
            <SelectTrigger className="h-8 w-20 rounded-full border-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {translations.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Day 5 of 7</p>
            <h1 className="font-serif text-2xl font-bold">Proverbs 27</h1>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Headphones className="h-5 w-5" />
          </button>
        </div>

        {/* Passage */}
        <div className="mb-6 rounded-xl bg-card p-5">
          <p className="font-serif text-base leading-relaxed whitespace-pre-line">{passageText}</p>
        </div>

        {/* Commentary */}
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Context</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{commentary}</p>
        </div>

        {/* Questions */}
        <div className="mb-6 space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Reflect</h3>
            <p className="mb-3 font-serif text-base italic">
              Where in your own life right now does this passage hit closest to home?
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
              What is God asking you to step into or let go of based on what you just read?
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