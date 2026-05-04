import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Splash = () => {
  const navigate = useNavigate();
  const { isDemo } = useAuth();

  useEffect(() => {
    if (isDemo) {
      // Auto-redirect to home in demo mode after a brief splash
      const timer = setTimeout(() => navigate("/home", { replace: true }), 1500);
      return () => clearTimeout(timer);
    }
  }, [isDemo, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="mb-6">
        <h1 className="font-serif text-5xl font-bold tracking-tight text-foreground">
          Iron<span className="text-primary">Sharp</span>
        </h1>
        <p className="mt-2 font-serif text-lg italic text-muted-foreground">
          Sharpen each other. Every day.
        </p>
      </div>

      <p className="mb-10 max-w-xs text-sm text-muted-foreground leading-relaxed">
        "As iron sharpens iron, so one person sharpens another."
        <br />
        <span className="font-medium">— Proverbs 27:17</span>
      </p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {isDemo ? (
          <Button
            onClick={() => navigate("/home", { replace: true })}
            className="h-12 rounded-xl text-base font-semibold"
          >
            Enter App
          </Button>
        ) : (
          <>
            <Button
              onClick={() => navigate("/signup")}
              className="h-12 rounded-xl text-base font-semibold"
            >
              Sign Up
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/login")}
              className="h-12 rounded-xl text-base font-semibold"
            >
              Log In
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Splash;