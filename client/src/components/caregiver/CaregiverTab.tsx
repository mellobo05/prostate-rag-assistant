import { useState } from "react";
import { useReports, useCreateReport } from "@/hooks/use-reports";
import { useGenerateAnalysis } from "@/hooks/use-analysis";
import type { PatientProfile } from "@shared/schema";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PsaChart } from "./PsaChart";
import { Plus, Brain, FileText, Calendar, Activity } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export function CaregiverTab({ profile }: { profile: PatientProfile }) {
  const { data: reports, isLoading: reportsLoading } = useReports(profile.id);
  const createReport = useCreateReport(profile.id);
  const analyze = useGenerateAnalysis();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    reportDate: new Date().toISOString().split('T')[0],
    reportType: "PSA",
    psaLevel: "",
    findings: ""
  });

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createReport.mutateAsync({
        reportDate: new Date(formData.reportDate),
        reportType: formData.reportType,
        psaLevel: formData.reportType === 'PSA' ? formData.psaLevel : undefined,
        findings: formData.findings,
      });
      setIsModalOpen(false);
      setFormData({ ...formData, psaLevel: "", findings: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async () => {
    try {
      const res = await analyze.mutateAsync(profile.id);
      setAnalysisResult(res.analysis);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Analytics & Quick info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary"/> PSA Trend
              </h3>
            </div>
            {reportsLoading ? (
              <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
            ) : (
              <PsaChart reports={reports || []} />
            )}
          </div>

          <div className="glass-card p-6 rounded-3xl bg-gradient-to-br from-white to-accent/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-primary"/> AI Analysis & Treatment Plan
                </h3>
                <p className="text-muted-foreground text-sm max-w-xl mb-4">
                  Generate a comprehensive summary of the medical history, recent reports, and suggested next steps based on latest oncology guidelines.
                </p>
              </div>
              <Button onClick={handleAnalyze} isLoading={analyze.isPending} className="shrink-0">
                Generate Analysis
              </Button>
            </div>
            
            {analysisResult && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 p-5 bg-white/80 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-inner border border-border"
              >
                {analysisResult}
              </motion.div>
            )}
            {analyze.isError && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-xl text-sm font-medium">
                Failed to generate analysis. Ensure the backend endpoint is fully implemented.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Reports */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 rounded-3xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Medical Reports</h3>
              <Button size="icon" variant="secondary" onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4"/>
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[600px]">
              {reportsLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading reports...</div>
              ) : reports?.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                  <FileText className="w-10 h-10 mb-3 opacity-20"/>
                  <p>No reports added yet.</p>
                </div>
              ) : (
                reports?.map((report) => (
                  <div key={report.id} className="p-4 bg-secondary/50 rounded-2xl hover:bg-secondary transition-colors border border-border/50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-foreground bg-white px-2 py-1 rounded-md text-xs shadow-sm">
                        {report.reportType}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3"/>
                        {format(new Date(report.reportDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    {report.reportType === 'PSA' && report.psaLevel && (
                      <div className="text-2xl font-bold text-primary mb-1">{report.psaLevel} <span className="text-sm font-medium text-muted-foreground">ng/mL</span></div>
                    )}
                    {report.findings && (
                      <p className="text-sm text-foreground/80 line-clamp-3 mt-2">{report.findings}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Medical Report">
        <form onSubmit={handleCreateReport} className="space-y-4">
          <Input 
            label="Date of Report" 
            type="date"
            required
            value={formData.reportDate}
            onChange={(e) => setFormData({...formData, reportDate: e.target.value})}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/80 ml-1">Report Type</label>
            <select 
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-border text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              value={formData.reportType}
              onChange={(e) => setFormData({...formData, reportType: e.target.value})}
            >
              <option value="PSA">PSA Test</option>
              <option value="PET Scan">PET Scan</option>
              <option value="Biopsy">Biopsy</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          {formData.reportType === 'PSA' && (
            <Input 
              label="PSA Level (ng/mL)" 
              type="number"
              step="0.01"
              required
              value={formData.psaLevel}
              onChange={(e) => setFormData({...formData, psaLevel: e.target.value})}
              placeholder="e.g. 4.5"
            />
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground/80 ml-1">Findings / Notes</label>
            <textarea 
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all min-h-[120px]"
              value={formData.findings}
              onChange={(e) => setFormData({...formData, findings: e.target.value})}
              placeholder="Describe scan results or general notes..."
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createReport.isPending}>Save Report</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
