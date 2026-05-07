import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Flame, BookOpen, Settings } from "lucide-react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Profile = () => {
  const { user, signOut, displayName } = useAuth();
  const navigate = useNavigate();
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase();

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-6 py-8">
        {/* Avatar & Name */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-card text-2xl font-bold">
            {initials}
          </div>
          <h1 className="font-serif text-xl font-bold">{displayName}</h1>
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

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="outline" onClick={() => navigate("/settings")} className="h-12 w-full rounded-xl justify-start">
            <Settings className="mr-3 h-4 w-4" /> Settings
          </Button>
          <Button variant="outline" onClick={async () => { await signOut(); navigate("/"); }} className="h-12 w-full rounded-xl justify-start text-destructive hover:text-destructive">
            <LogOut className="mr-3 h-4 w-4" /> Log Out
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;