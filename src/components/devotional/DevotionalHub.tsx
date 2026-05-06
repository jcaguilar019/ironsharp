import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronRight, BookOpen } from "lucide-react";

/* ── colour tokens per plan type ── */
const typeColors: Record<string, string> = {
  community: "#89B4C9",
  partner: "#A89070",
  family: "#7FAF8A",
  group: "#B8A86A",
};

const typeLabels: Record<string, string> = {
  community: "WITH THE COMMUNITY",
  partner: "WITH MARCUS",
  family: "WITH THE FAMILY",
  group: "SMALL GROUP — THE FORGE",
};

interface PlanCard {
  id: string;
  type: "community" | "partner" | "family" | "group";
  reference: string;
  planName: string;
  day: number;
  totalDays: number;
  doneCount: number;
  memberCount: number;
  tagline: string;
  hasPodcast?: boolean;
}

const mockPlans: PlanCard[] = [
  {
    id: "1",
    type: "community",
    reference: "Proverbs 27",
    planName: "Proverbs — Wisdom for the Journey",
    day: 14,
    totalDays: 30,
    doneCount: 4200,
    memberCount: 6800,
    tagline: "4.2K have completed today",
    hasPodcast: true,
  },
  {
    id: "2",
    type: "partner",
    reference: "James 1",
    planName: "James — Faith Under Fire",
    day: 5,
    totalDays: 7,
    doneCount: 1,
    memberCount: 2,
    tagline: "Marcus finished · your turn",
  },
  {
    id: "3",
    type: "family",
    reference: "Psalm 23",
    planName: "Psalms for the Family",
    day: 3,
    totalDays: 14,
    doneCount: 2,
    memberCount: 4,
    tagline: "Mom & Dad finished · 2 remaining",
  },
  {
    id: "4",
    type: "group",
    reference: "Romans 8",
    planName: "Romans — Identity in Christ",
    day: 10,
    totalDays: 30,
    doneCount: 3,
    memberCount: 5,
    tagline: "3 of 5 done today",
  },
];

interface Props {
  onOpenPlan: (planId: string) => void;
}

const DevotionalHub = ({ onOpenPlan }: Props) => {
  const activePlans = mockPlans.filter((p) => p.type !== "community");
  const slotsUsed = activePlans.length; // max 3

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      {/* Header */}
      <div className="mb-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {today}
        </p>
        <h1 className="font-serif text-2xl font-bold">Your Active Plans</h1>
      </div>

      {/* 3-slot indicator */}
      <div className="mb-5 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-2 w-2 rounded-full transition-colors"
            style={{
              backgroundColor:
                i < slotsUsed
                  ? "hsl(var(--primary))"
                  : "hsl(var(--muted))",
              border: i < slotsUsed ? "none" : "1px solid hsl(var(--border))",
            }}
          />
        ))}
        <span className="ml-1 text-[11px] text-muted-foreground">
          {slotsUsed}/3 plan slots
        </span>
      </div>

      {/* Plan cards */}
      <div className="space-y-4">
        {mockPlans.map((plan) => {
          const accent = typeColors[plan.type];
          const pct = Math.round((plan.day / plan.totalDays) * 100);

          return (
            <div
              key={plan.id}
              className="relative overflow-hidden rounded-2xl border border-border bg-card"
            >
              {/* Accent bar */}
              <div
                className="h-1 w-full"
                style={{ backgroundColor: accent }}
              />

              <div className="px-4 py-4">
                {/* Type label + podcast badge */}
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold tracking-widest"
                    style={{ color: accent }}
                  >
                    {typeLabels[plan.type]}
                  </span>
                  {plan.hasPodcast && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                      🎙 PODCAST
                    </span>
                  )}
                </div>

                {/* Reference + plan name */}
                <h2 className="font-serif text-lg font-semibold leading-tight">
                  {plan.reference}{" "}
                  <span className="font-sans text-sm font-normal text-muted-foreground">
                    · {plan.planName}
                  </span>
                </h2>

                {/* Day counter */}
                <p className="mt-1 text-xs text-muted-foreground">
                  Day {plan.day} of {plan.totalDays}
                </p>

                {/* Tagline + done count */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {plan.tagline}
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {typeof plan.doneCount === "number" && plan.doneCount > 999
                      ? `${(plan.doneCount / 1000).toFixed(1)}K`
                      : plan.doneCount}
                    /
                    {typeof plan.memberCount === "number" &&
                    plan.memberCount > 999
                      ? `${(plan.memberCount / 1000).toFixed(1)}K`
                      : plan.memberCount}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-2">
                  <Progress value={pct} className="h-1.5" />
                </div>

                {/* Open button */}
                <Button
                  onClick={() => onOpenPlan(plan.id)}
                  className="mt-4 w-full rounded-xl text-sm font-semibold"
                >
                  Open Today's Reading
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Browse Plans */}
      <Button
        variant="outline"
        className="mt-6 w-full rounded-xl border-dashed"
      >
        <BookOpen className="mr-2 h-4 w-4" />
        Browse Plans
      </Button>
    </div>
  );
};

export default DevotionalHub;