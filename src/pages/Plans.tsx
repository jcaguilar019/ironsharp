import AppLayout from "@/components/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, ChevronRight } from "lucide-react";

import menImg from "@/assets/plans/mens-devotional.jpg";
import womenImg from "@/assets/plans/womens-devotional.jpg";
import fathersImg from "@/assets/plans/husbands-fathers.jpg";
import mothersImg from "@/assets/plans/wives-mothers.jpg";
import familyImg from "@/assets/plans/family-devotional.jpg";
import marriageImg from "@/assets/plans/marriage.jpg";
import youthImg from "@/assets/plans/youth.jpg";
import newBelieverImg from "@/assets/plans/new-believer.jpg";
import generalImg from "@/assets/plans/general.jpg";

interface PlanCategory {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  image: string;
}

const categories: PlanCategory[] = [
  { id: "men", title: "Men's Devotional", subtitle: "12 Plans", badge: "Popular", image: menImg },
  { id: "women", title: "Women's Devotional", subtitle: "10 Plans", badge: "Popular", image: womenImg },
  { id: "fathers", title: "Husbands & Fathers", subtitle: "8 Plans", badge: "7–30 Day", image: fathersImg },
  { id: "mothers", title: "Wives & Mothers", subtitle: "9 Plans", badge: "7–30 Day", image: mothersImg },
  { id: "family", title: "Family Devotional", subtitle: "6 Plans", badge: "14 Day", image: familyImg },
  { id: "marriage", title: "Marriage", subtitle: "7 Plans", badge: "14 Day", image: marriageImg },
  { id: "youth", title: "Youth", subtitle: "11 Plans", badge: "7 Day", image: youthImg },
  { id: "new-believer", title: "New Believer", subtitle: "5 Plans", badge: "30 Day", image: newBelieverImg },
  { id: "general", title: "General", subtitle: "15 Plans", badge: "Popular", image: generalImg },
];

const Plans = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [planCounts, setPlanCounts] = useState<Record<string, number>>({});
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      const { data } = await supabase
        .from("devotional_plans")
        .select("id, category");
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((p) => {
          const cat = p.category;
          counts[cat] = (counts[cat] || 0) + 1;
        });
        setPlanCounts(counts);
      }
    };
    fetchCounts();
  }, []);

  useEffect(() => {
    const fetchCompleted = async () => {
      if (!user) return;
      const { count } = await supabase
        .from("user_plan_progress")
        .select("plan_id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("completed_at", "is", null);
      setCompletedCount(count || 0);
    };
    fetchCompleted();
  }, [user]);

  const getCategoryCount = (catId: string) => {
    const mapping: Record<string, string> = {
      men: "men",
      women: "women",
      fathers: "fathers",
      mothers: "mothers",
      family: "family",
      marriage: "marriage",
      youth: "youth",
      "new-believer": "new-believer",
      general: "general",
    };
    const dbCat = mapping[catId] || catId;
    const count = planCounts[dbCat] || 0;
    return count > 0 ? `${count} Plan${count !== 1 ? "s" : ""}` : "Coming Soon";
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Browse & Start
        </p>
        <h1 className="mb-6 font-serif text-2xl font-bold">Plans</h1>

        {/* Pinned Completed tile */}
        <button
          onClick={() => {
            if (completedCount > 0) navigate("/plans/completed");
          }}
          disabled={completedCount === 0}
          className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-accent/40 bg-card p-4 text-left transition-colors hover:bg-accent/10 disabled:cursor-default disabled:opacity-70 disabled:hover:bg-card"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-serif text-base font-bold">Completed</p>
            <p className="text-xs text-muted-foreground">
              {completedCount > 0
                ? `${completedCount} plan${completedCount !== 1 ? "s" : ""} finished`
                : "Nothing yet"}
            </p>
          </div>
          {completedCount > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                const dbCat = cat.id;
                const count = planCounts[dbCat] || 0;
                if (count > 0) {
                  navigate(`/plans/${dbCat}`);
                } else {
                  toast({ title: `${cat.title} — Coming Soon` });
                }
              }}
              className="group relative overflow-hidden rounded-2xl text-left"
              style={{ aspectRatio: "4/5" }}
            >
              {/* Image */}
              <img
                src={cat.image}
                alt={cat.title}
                loading="lazy"
                width={512}
                height={640}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              {/* Badge */}
              <div className="absolute right-2 top-2">
                <span className="rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                  {cat.badge}
                </span>
              </div>

              {/* Text */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="font-serif text-base font-bold uppercase leading-tight text-white">
                  {cat.title}
                </h3>
                <p className="mt-0.5 text-xs text-white/70">{getCategoryCount(cat.id)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Plans;