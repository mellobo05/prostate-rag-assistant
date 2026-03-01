import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useProfiles, useCreateProfile } from "@/hooks/use-profiles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, User, Calendar, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const createProfile = useCreateProfile();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    dateOfBirth: "",
    cancerType: "Prostate Cancer",
    stage: "",
    medicalHistory: ""
  });

  if (authLoading || profilesLoading) {
    return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProfile.mutateAsync({
        name: formData.name,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
        cancerType: formData.cancerType,
        stage: formData.stage,
        medicalHistory: formData.medicalHistory,
      });
      setIsModalOpen(false);
      setFormData({ name: "", dateOfBirth: "", cancerType: "Prostate Cancer", stage: "", medicalHistory: "" });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patient Profiles</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor care records</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-5 h-5" />
          Add Patient
        </Button>
      </div>

      {!profiles?.length ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-dashed border-border p-12 flex flex-col items-center justify-center text-center shadow-sm"
        >
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6 text-primary">
            <User className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold mb-2">No profiles found</h3>
          <p className="text-muted-foreground max-w-sm mb-8">
            Start by creating a patient profile to track medical history, reports, and access the AI companion.
          </p>
          <Button onClick={() => setIsModalOpen(true)}>Create First Profile</Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={profile.id}
              onClick={() => setLocation(`/profiles/${profile.id}`)}
              className="glass-card p-6 rounded-3xl cursor-pointer group hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-teal-400/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <User className="w-7 h-7" />
                </div>
                <div className="px-3 py-1 bg-accent/30 text-accent-foreground text-xs font-semibold rounded-full">
                  {profile.cancerType}
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">{profile.name}</h3>
              <div className="space-y-2 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {profile.dateOfBirth ? format(new Date(profile.dateOfBirth), "MMM d, yyyy") : "DOB unknown"}
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Stage: {profile.stage || "Not specified"}
                </div>
                <div className="flex items-center gap-2 mt-2 px-2 py-1 bg-primary/5 rounded-lg text-xs font-mono text-primary" data-testid={`text-profile-id-${profile.id}`}>
                  Telegram Bot ID: <span className="font-bold ml-1">{profile.id}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Patient Profile">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Full Name" 
            required 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g. John Doe"
          />
          <Input 
            label="Date of Birth" 
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
          />
          <Input 
            label="Cancer Type" 
            value={formData.cancerType}
            onChange={(e) => setFormData({...formData, cancerType: e.target.value})}
            placeholder="Prostate Cancer"
          />
          <Input 
            label="Current Stage" 
            value={formData.stage}
            onChange={(e) => setFormData({...formData, stage: e.target.value})}
            placeholder="e.g. Metastatic"
          />
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/80 ml-1">Brief Medical History</label>
            <textarea 
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all min-h-[100px]"
              value={formData.medicalHistory}
              onChange={(e) => setFormData({...formData, medicalHistory: e.target.value})}
              placeholder="Prior treatments, medications..."
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createProfile.isPending}>Create Profile</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
