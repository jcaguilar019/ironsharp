import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera } from "lucide-react";

const CompleteProfile = () => {
  const [name, setName] = useState("");
  const [church, setChurch] = useState("");
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8">
      <h1 className="mb-2 font-serif text-3xl font-bold">Complete Your Profile</h1>
      <p className="mb-8 text-sm text-muted-foreground">Let your group know who you are</p>

      <div className="mb-6">
        <button className="flex h-24 w-24 items-center justify-center rounded-full bg-card border-2 border-dashed border-border hover:border-primary transition-colors">
          <Camera className="h-8 w-8 text-muted-foreground" />
        </button>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div>
          <Label htmlFor="name">Display Name</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="mt-1 h-12 rounded-xl" />
        </div>
        <div>
          <Label htmlFor="church">Home Church <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="church" value={church} onChange={e => setChurch(e.target.value)} placeholder="e.g. Grace Community Church" className="mt-1 h-12 rounded-xl" />
        </div>
        <Button
          onClick={() => navigate("/onboarding/role")}
          disabled={!name.trim()}
          className="h-12 w-full rounded-xl text-base font-semibold"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default CompleteProfile;