import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Heart, HandshakeIcon } from "lucide-react";

const roles = [
  { id: "discipler", label: "Discipler", desc: "Lead and model consistency for someone you're mentoring", icon: Shield },
  { id: "disciple", label: "Disciple", desc: "Follow along and grow with your mentor's guidance", icon: Heart },
  { id: "partner", label: "Accountability Partner", desc: "Walk alongside a peer — equal standing, mutual encouragement", icon: HandshakeIcon },
];

const RoleSelect = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8">
      <h1 className="mb-2 font-serif text-3xl font-bold">Your Role</h1>
      <p className="mb-8 text-sm text-muted-foreground">How will you show up for your group?</p>

      <div className="w-full max-w-sm space-y-3">
        {roles.map(({ id, label, desc, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all ${
              selected === id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              selected === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{label}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      <Button
        onClick={() => navigate("/onboarding/plan")}
        disabled={!selected}
        className="mt-8 h-12 w-full max-w-sm rounded-xl text-base font-semibold"
      >
        Continue
      </Button>
    </div>
  );
};

export default RoleSelect;