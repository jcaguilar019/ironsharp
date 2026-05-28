import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIERS, type MembershipTier } from "@/lib/membership";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentTier, setCurrentTier] = useState<MembershipTier>("free");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("membership_tier")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.membership_tier) setCurrentTier(data.membership_tier as MembershipTier);
    })();
  }, [user]);

  const handleUpgrade = (tier: MembershipTier) => {
    if (tier === currentTier) return;
    toast("Payments coming soon", {
      description: "Membership upgrades will be available shortly.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between px-6 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        </div>

        <div className="px-6 pt-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">IRONSHARP</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Choose Your Plan</h1>
          <p className="mt-2 text-sm italic text-muted-foreground">
            All plans include every theme. Upgrade anytime.
          </p>
        </div>

        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-visible px-6 pb-2 pt-4">
          {TIERS.map((t) => {
            const isCurrent = currentTier === t.id;
            const isPaid = t.id !== "free";
            return (
              <div
                key={t.id}
                className="relative shrink-0 snap-start"
                style={{ width: "calc(100% - 60px)", minWidth: 230, maxWidth: 280 }}
              >
                {t.mostPopular && (
                  <div
                    className="absolute left-1/2 -top-3 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md"
                    style={{ background: t.color }}
                  >
                    Most Popular
                  </div>
                )}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="h-1" style={{ background: t.color }} />
                  <div className="p-5">
                    <h2 className="font-serif text-lg font-bold" style={{ color: t.color }}>
                      {t.name}
                    </h2>
                    <p className="text-[11px] italic text-muted-foreground">{t.tagline}</p>

                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-serif text-4xl font-bold text-foreground">{t.price}</span>
                      {t.priceLabel && (
                        <span className="text-sm text-muted-foreground">{t.priceLabel}</span>
                      )}
                    </div>

                    <div
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ background: t.pale, color: t.color }}
                    >
                      <Users className="h-3 w-3" />
                      {t.people}
                    </div>

                    <ul className="mt-4 space-y-2">
                      {t.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 font-serif text-xs leading-snug">
                          <Star
                            className="mt-0.5 h-3 w-3 shrink-0"
                            style={{ color: t.color, fill: t.color }}
                          />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleUpgrade(t.id)}
                      disabled={isCurrent && t.id === "free"}
                      className="mt-5 w-full rounded-xl py-3 text-[13px] font-bold transition-opacity disabled:opacity-60"
                      style={
                        isPaid && !isCurrent
                          ? { background: t.color, color: "#fff" }
                          : {
                              background: "transparent",
                              color: t.color,
                              border: `1.5px solid ${t.color}`,
                            }
                      }
                    >
                      {isCurrent ? "Current Plan" : t.id === "free" ? "Current Plan" : `Start ${t.name}`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 pt-4">
          <Button
            variant="outline"
            onClick={() => navigate("/home")}
            className="h-12 w-full rounded-xl text-base"
          >
            Start with Free →
          </Button>
          <p className="mt-4 text-center text-xs italic text-muted-foreground">
            All plans include every theme. Upgrade anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;