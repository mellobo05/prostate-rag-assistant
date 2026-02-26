import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Activity, ShieldCheck, HeartPulse } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

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
    <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-4 sm:p-8 max-w-6xl mx-auto w-full gap-12 lg:gap-24">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex-1 text-center md:text-left space-y-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/50 text-accent-foreground font-medium text-sm mb-4">
          <ShieldCheck className="w-4 h-4" />
          Secure & Private Healthcare Companion
        </div>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-foreground leading-[1.1] text-balance">
          Empowering your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">cancer care</span> journey.
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl text-balance leading-relaxed">
          Maintain medical histories, visualize PSA levels, and access a palliative AI companion tailored for patient comfort.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-white shadow-sm text-primary"><Activity className="w-6 h-6"/></div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground">Track Vitals</h3>
              <p className="text-sm text-muted-foreground">Keep all reports organized</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-white shadow-sm text-primary"><HeartPulse className="w-6 h-6"/></div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground">AI Companion</h3>
              <p className="text-sm text-muted-foreground">Gentle, voice-based support</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 sm:p-10 rounded-3xl flex flex-col items-center text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 text-white relative z-10">
            <Activity className="w-10 h-10" />
          </div>
          
          <div className="space-y-2 relative z-10">
            <h2 className="text-3xl font-bold">Welcome Back</h2>
            <p className="text-muted-foreground">Please sign in to access your profiles and reports.</p>
          </div>

          <div className="w-full relative z-10">
            <Button 
              className="w-full text-lg py-6 shadow-xl"
              onClick={() => window.location.href = "/api/login"}
            >
              Continue with Replit
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4 relative z-10">
            By continuing, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
