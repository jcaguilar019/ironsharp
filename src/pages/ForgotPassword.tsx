import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
        <h1 className="mb-3 font-serif text-3xl font-bold">Check Your Email</h1>
        <p className="mb-6 max-w-xs text-sm text-muted-foreground">
          If an account exists for {email}, you'll receive a password reset link shortly.
        </p>
        <Link to="/login" className="text-sm text-primary hover:underline">Back to login</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8">
      <h1 className="mb-3 font-serif text-3xl font-bold">Forgot Password</h1>
      <p className="mb-8 max-w-xs text-center text-sm text-muted-foreground">
        Enter your email and we'll send you a link to reset your password.
      </p>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 h-12 rounded-xl" />
        </div>
        <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-base font-semibold">
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>
      <Link to="/login" className="mt-6 text-sm text-primary hover:underline">Back to login</Link>
    </div>
  );
};

export default ForgotPassword;