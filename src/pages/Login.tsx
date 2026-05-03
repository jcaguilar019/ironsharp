import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/home");
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({ title: "Google sign-in failed", description: String(result.error), variant: "destructive" });
      return;
    }
    if (result.redirected) return;
    navigate("/home");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8">
      <h1 className="mb-8 font-serif text-3xl font-bold">Welcome Back</h1>
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 h-12 rounded-xl" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 h-12 rounded-xl" />
        </div>
        <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-base font-semibold">
          {loading ? "Signing in..." : "Log In"}
        </Button>
      </form>

      <div className="my-6 flex w-full max-w-sm items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" onClick={handleGoogle} className="h-12 w-full max-w-sm rounded-xl text-base">
        Continue with Google
      </Button>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm">
        <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
        <p className="text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;