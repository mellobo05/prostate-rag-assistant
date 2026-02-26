import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Activity, LogOut, User } from "lucide-react";
import { Button } from "../ui/Button";

export function Navbar() {
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <nav className="sticky top-0 z-30 w-full glass-card border-b-0 border-x-0 rounded-none px-4 sm:px-6 lg:px-8 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
          <div className="bg-primary text-white p-2 rounded-xl shadow-md shadow-primary/20">
            <Activity className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            OncoCare AI
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-foreground/80 px-4 py-2 bg-secondary rounded-full">
              <User className="w-4 h-4 text-primary" />
              {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              isLoading={isLoggingOut}
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-muted-foreground hover:text-destructive transition-colors" />
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
