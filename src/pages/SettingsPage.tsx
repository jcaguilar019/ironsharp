import AppLayout from "@/components/AppLayout";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Palette, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const SettingsPage = () => {
  const navigate = useNavigate();
  const [partnerDone, setPartnerDone] = useState(true);
  const [morning, setMorning] = useState(true);
  const [nudge, setNudge] = useState(true);
  const [groupComplete, setGroupComplete] = useState(true);

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="mb-6 font-serif text-2xl font-bold">Settings</h1>

        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Appearance</h3>
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate("/themes")} className="h-12 w-full rounded-xl justify-start">
            <Palette className="mr-3 h-4 w-4" /> Themes
          </Button>
        </div>

        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Notifications</h3>
        <div className="mb-6 space-y-4 rounded-xl border border-border bg-card p-4">
          {[
            { label: "Partner completed", desc: "When a group member finishes", value: partnerDone, set: setPartnerDone },
            { label: "Morning reminder", desc: "Daily at 7:00 AM", value: morning, set: setMorning },
            { label: "Accountability nudge", desc: "If you haven't finished by 9 PM", value: nudge, set: setNudge },
            { label: "Group complete", desc: "When everyone finishes", value: groupComplete, set: setGroupComplete },
          ].map(n => (
            <div key={n.label} className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">{n.label}</Label>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <Switch checked={n.value} onCheckedChange={n.set} />
            </div>
          ))}
        </div>

        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Privacy</h3>
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Your responses are visible to your group members only.</p>
        </div>

        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Support</h3>
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate("/help")} className="h-12 w-full rounded-xl justify-start">
            <HelpCircle className="mr-3 h-4 w-4" /> Help Center
          </Button>
        </div>

        <Button variant="destructive" className="h-12 w-full rounded-xl text-base">
          Delete Account
        </Button>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;