import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Activity, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Link } from "wouter";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 sm:p-10 rounded-3xl flex flex-col items-center text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          <div className="w-20 h-20 bg-gradient-to-br from-primary to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 text-white relative z-10">
            <LogIn className="w-10 h-10" />
          </div>

          <div className="space-y-2 relative z-10">
            <h2 className="text-3xl font-bold">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to access your patient profiles and reports.</p>
          </div>

          <div className="w-full relative z-10 space-y-4">
            <Button
              className="w-full text-lg py-6 shadow-xl"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-login"
            >
              Log In
            </Button>
          </div>

          <p className="text-sm text-muted-foreground relative z-10">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary font-semibold hover:underline" data-testid="link-signup">
              Sign up for free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
