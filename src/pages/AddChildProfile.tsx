import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Camera } from "lucide-react";

const grades = ["5th Grade", "6th Grade", "7th Grade", "8th Grade", "9th Grade"];

const AddChildProfile = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");

  return (
    <div className="flex min-h-screen flex-col px-8 py-6">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="mb-2 font-serif text-2xl font-bold">Add Child Profile</h1>
      <p className="mb-8 text-sm text-muted-foreground">Create a Youth Mode profile linked to your family plan.</p>

      {/* Photo placeholder */}
      <div className="mb-6 flex justify-center">
        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 border-dashed border-border bg-card text-muted-foreground">
          <Camera className="h-6 w-6 mb-1" />
          <span className="text-[10px]">Add Photo</span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm space-y-5">
        <div>
          <Label htmlFor="child-name">Child's Name</Label>
          <Input id="child-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Daniel" className="mt-1 h-12 rounded-xl" />
        </div>

        <div>
          <Label>Grade Level</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {grades.map(g => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  selectedGrade === g
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">COPPA Notice:</strong> For children under 13, a parental consent email will be sent before the profile activates. You'll review what data is collected and explicitly agree.
          </p>
        </div>

        <Button onClick={() => navigate("/family")} className="h-12 w-full rounded-xl text-base font-semibold">
          Create Profile
        </Button>
      </div>
    </div>
  );
};

export default AddChildProfile;