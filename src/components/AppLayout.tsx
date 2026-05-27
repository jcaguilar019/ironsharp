import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "./BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("survey_completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data?.survey_completed_at) {
        navigate("/onboarding/survey", { replace: true });
      } else {
        setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, loading, navigate]);

  if (loading || !user || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-16">
      <div className="flex-1">{children}</div>
      <BottomNav />
    </div>
  );
};

export default AppLayout;