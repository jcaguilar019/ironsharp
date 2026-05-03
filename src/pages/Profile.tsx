import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Flame, BookOpen, Users, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-8">
        {/* Avatar & Name */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-card text-2xl font-bold">
            {user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <h1 className="font-serif text-xl font-bold">{user?.email || "User"}</h1>
          <p className="text-sm text-muted-foreground">Grace Community Church</p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center rounded-xl border border-border bg-card p-4">
            <Flame className="mb-1 h-5 w-5 text-primary" />
            <span className="text-lg font-bold">5</span>
            <span className="text-xs text-muted-foreground">Day Streak</span>
          </div>
          <div className="flex flex-col items-center rounded-xl border border-border bg-card p-4">
            <BookOpen className="mb-1 h-5 w-5 text-primary" />
            <span className="text-lg font-bold">23</span>
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
        </div>

        {/* Groups */}
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">My Groups</h3>
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Men's Morning Crew</p>
              <p className="text-xs text-muted-foreground">Accountability Partner</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="outline" onClick={() => navigate("/settings")} className="h-12 w-full rounded-xl justify-start">
            <Settings className="mr-3 h-4 w-4" /> Settings
          </Button>
          <Button variant="outline" onClick={async () => { await signOut(); navigate("/"); }} className="h-12 w-full rounded-xl justify-start text-destructive hover:text-destructive">
            Log Out
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;