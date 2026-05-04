import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Users, Shield, BookOpen } from "lucide-react";

const features = [
  { icon: Users, title: "2 Parent Accounts", desc: "Full adult profiles with all IronSharp features" },
  { icon: Shield, title: "2 Child Profiles", desc: "Age-appropriate Youth Mode with parental controls" },
  { icon: BookOpen, title: "Unlimited Family Groups", desc: "Any pairing — father/son, mother/daughter, full family" },
  { icon: CheckCircle2, title: "Family Dashboard", desc: "See who's done their devotional today at a glance" },
];

const FamilyOnboarding = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8">
      <h1 className="mb-2 font-serif text-3xl font-bold text-center">Family Plan</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground max-w-xs">
        One subscription. One household. Every relationship covered.
      </p>

      <div className="mb-8 w-full max-w-sm space-y-4">
        {features.map(f => (
          <div key={f.title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <f.icon className="mt-0.5 h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm space-y-3">
        <div className="rounded-xl border border-primary bg-primary/5 p-4 text-center">
          <p className="text-lg font-bold text-primary">$50–60 / year</p>
          <p className="text-xs text-muted-foreground">Less than $5/month for the whole family</p>
        </div>
        <Button onClick={() => navigate("/family/add-child")} className="h-12 w-full rounded-xl text-base font-semibold">
          Set Up Family Plan
        </Button>
        <Button variant="outline" onClick={() => navigate("/home")} className="h-12 w-full rounded-xl text-base">
          Maybe Later
        </Button>
      </div>
    </div>
  );
};

export default FamilyOnboarding;