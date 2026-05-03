import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const VerifyEmail = () => {
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  const resend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: "" });
    setResending(false);
    if (error) {
      toast({ title: "Could not resend", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email resent!" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mb-3 font-serif text-3xl font-bold">Check Your Inbox</h1>
      <p className="mb-8 max-w-xs text-sm text-muted-foreground">
        We've sent a verification link to your email. Click the link to activate your account.
      </p>
      <Button variant="outline" onClick={resend} disabled={resending} className="mb-4 h-12 rounded-xl">
        {resending ? "Sending..." : "Resend Email"}
      </Button>
      <Link to="/login" className="text-sm text-primary hover:underline">
        Back to login
      </Link>
    </div>
  );
};

export default VerifyEmail;