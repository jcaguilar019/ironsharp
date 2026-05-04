import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Headphones, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const YouthDevotional = () => {
  const navigate = useNavigate();
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");

  return (
    <div className="flex min-h-screen flex-col pb-16">
      <div className="mx-auto w-full max-w-lg px-6 py-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">Youth Plan</span>
          <span className="text-xs text-muted-foreground">Day 3 of 7</span>
        </div>
        <h1 className="mb-1 font-serif text-2xl font-bold">Psalm 139</h1>
        <p className="mb-6 text-sm text-muted-foreground">Known by God — Identity & Worth</p>

        {/* Listen Button */}
        <button className="mb-6 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Headphones className="h-4 w-4 text-primary" />
          Listen to this chapter
        </button>

        {/* Scripture excerpt */}
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <p className="font-serif text-sm leading-relaxed text-foreground">
            <sup className="text-primary mr-1">13</sup>For you created my inmost being; you knit me together in my mother's womb.
            <sup className="text-primary mx-1">14</sup>I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.
            <sup className="text-primary mx-1">15</sup>My frame was not hidden from you when I was made in the secret place, when I was woven together in the depths of the earth.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Psalm 139:13–15 · NIV</p>
        </div>

        {/* Commentary */}
        <div className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">What This Means</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            God made you on purpose. Not by accident. Before anyone at school knew your name, God already knew everything about you — and He called it wonderful. When you feel invisible or not enough, this psalm says the opposite is true.
          </p>
        </div>

        {/* Reflection Questions */}
        <div className="mb-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reflection</h3>
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium">Where in your life this week did you feel like you didn't belong — and what do you think God says about that?</p>
            <Textarea value={q1} onChange={e => setQ1(e.target.value)} placeholder="Write your thoughts..." className="min-h-[80px] rounded-xl" />
          </div>
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium">Is there someone at school you've been avoiding or ignoring? What would it look like to treat them the way this passage says?</p>
            <Textarea value={q2} onChange={e => setQ2(e.target.value)} placeholder="Write your thoughts..." className="min-h-[80px] rounded-xl" />
          </div>
        </div>

        <Button className="h-12 w-full rounded-xl text-base font-semibold">
          <Send className="mr-2 h-4 w-4" /> Submit Reflection
        </Button>
      </div>
    </div>
  );
};

export default YouthDevotional;