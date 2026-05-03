import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, UserPlus } from "lucide-react";

const GroupSetup = () => {
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8">
      <h1 className="mb-2 font-serif text-3xl font-bold">Your Group</h1>
      <p className="mb-8 text-sm text-muted-foreground">Start or join a group to do life together</p>

      {!mode ? (
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => setMode("create")}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-border bg-card p-4 hover:border-primary/40 transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Create a Group</p>
              <p className="text-sm text-muted-foreground">Start fresh and invite others</p>
            </div>
          </button>
          <button
            onClick={() => setMode("join")}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-border bg-card p-4 hover:border-primary/40 transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Users className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Join a Group</p>
              <p className="text-sm text-muted-foreground">Enter an invite code</p>
            </div>
          </button>
        </div>
      ) : mode === "create" ? (
        <div className="w-full max-w-sm space-y-4">
          <div>
            <Label htmlFor="groupName">Group Name</Label>
            <Input id="groupName" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. Men's Morning Crew" className="mt-1 h-12 rounded-xl" />
          </div>
          <Button
            onClick={() => navigate("/home")}
            disabled={!groupName.trim()}
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            Create & Continue
          </Button>
          <button onClick={() => setMode(null)} className="w-full text-center text-sm text-primary hover:underline">Back</button>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-4">
          <div>
            <Label htmlFor="code">Invite Code</Label>
            <Input id="code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Enter code" className="mt-1 h-12 rounded-xl text-center tracking-widest text-lg" />
          </div>
          <Button
            onClick={() => navigate("/home")}
            disabled={!inviteCode.trim()}
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            Join & Continue
          </Button>
          <button onClick={() => setMode(null)} className="w-full text-center text-sm text-primary hover:underline">Back</button>
        </div>
      )}
    </div>
  );
};

export default GroupSetup;