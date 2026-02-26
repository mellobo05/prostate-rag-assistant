import { useLocation, useParams } from "wouter";
import { useProfile } from "@/hooks/use-profiles";
import { useAuth } from "@/hooks/use-auth";
import { CaregiverTab } from "@/components/caregiver/CaregiverTab";
import { PatientTab } from "@/components/patient/PatientTab";
import { useState } from "react";
import { ArrowLeft, Stethoscope, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ProfileView() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: profile, isLoading } = useProfile(Number(id));

  const [activeTab, setActiveTab] = useState<'caregiver' | 'patient'>('caregiver');

  if (authLoading || isLoading) {
    return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h2 className="text-2xl font-bold mb-4">Profile not found</h2>
        <Button onClick={() => setLocation("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")} className="shrink-0 bg-white shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{profile.name}</h1>
          <p className="text-muted-foreground">{profile.cancerType}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap p-1 bg-white rounded-2xl mb-8 shadow-sm border border-border w-fit">
        <button
          onClick={() => setActiveTab('caregiver')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
            activeTab === 'caregiver' 
              ? 'bg-primary text-white shadow-md' 
              : 'text-muted-foreground hover:bg-secondary/50'
          }`}
        >
          <Stethoscope className="w-5 h-5" /> Caregiver View
        </button>
        <button
          onClick={() => setActiveTab('patient')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
            activeTab === 'patient' 
              ? 'bg-primary text-white shadow-md' 
              : 'text-muted-foreground hover:bg-secondary/50'
          }`}
        >
          <HeartHandshake className="w-5 h-5" /> Patient View
        </button>
      </div>

      <div className="flex-1">
        {activeTab === 'caregiver' ? (
          <CaregiverTab profile={profile} />
        ) : (
          <PatientTab profile={profile} />
        )}
      </div>
    </div>
  );
}
