import { useState } from "react";
import { useReports, useCreateReport } from "@/hooks/use-reports";
import { useGenerateAnalysis } from "@/hooks/use-analysis";
import { useUploadPdf, useQueryDocuments, useDocuments } from "@/hooks/use-documents";
import type { PatientProfile } from "@shared/schema";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PsaChart } from "./PsaChart";
import { Plus, Brain, FileText, Calendar, Activity, Upload, MessageSquare, FileUp, Loader2, Send } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export function CaregiverTab({ profile }: { profile: PatientProfile }) {
  const { data: reports, isLoading: reportsLoading } = useReports(profile.id);
  const createReport = useCreateReport(profile.id);
  const analyze = useGenerateAnalysis();
  const uploadPdf = useUploadPdf(profile.id);
  const queryDocs = useQueryDocuments(profile.id);
  const { data: documentsData } = useDocuments(profile.id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState<string | null>(null);

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

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadPdf.mutateAsync(file);
    } catch (err) {
      console.error(err);
    }
    e.target.value = "";
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    try {
      const res = await queryDocs.mutateAsync(question);
      setQaAnswer(res.answer);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary"/> Upload Medical Documents
              </h3>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Upload medical documents (PDF, images) to automatically extract PSA levels, findings, and enable Q&A. Supports scanned/image-based documents.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer" data-testid="button-upload-pdf">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp"
                  className="hidden"
                  onChange={handlePdfUpload}
                  disabled={uploadPdf.isPending}
                />
                <div className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity">
                  <FileUp className="w-4 h-4" />
                  {uploadPdf.isPending ? "Processing..." : "Choose File"}
                </div>
              </label>
              {uploadPdf.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting data from document...
                </div>
              )}
            </div>

            {uploadPdf.isSuccess && uploadPdf.data && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800"
              >
                <strong>{uploadPdf.data.fileName}</strong> processed successfully.
                {uploadPdf.data.reportsExtracted > 0 && (
                  <span> Extracted {uploadPdf.data.reportsExtracted} report(s).</span>
                )}
              </motion.div>
            )}
            {uploadPdf.isError && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-xl text-sm">
                Failed to process PDF. Please try again with a text-based PDF.
              </div>
            )}

            {documentsData?.documents && documentsData.documents.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {documentsData.documents.map((doc: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-lg text-xs font-medium text-foreground" data-testid={`text-document-${i}`}>
                    <FileText className="w-3 h-3" />
                    {doc}
                  </span>
                ))}
              </div>
            )}
          </div>

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

          <div className="glass-card p-6 rounded-3xl">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-primary"/> Ask About Reports
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Ask any question about the uploaded medical documents. Great for preparing questions before a doctor visit.
            </p>
            <form onSubmit={handleAskQuestion} className="flex gap-2" data-testid="form-query">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What was the last PSA level? Any recommended treatments?"
                className="flex-1 px-4 py-3 rounded-xl bg-white border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                disabled={queryDocs.isPending}
                data-testid="input-question"
              />
              <Button type="submit" isLoading={queryDocs.isPending} className="shrink-0" data-testid="button-ask">
                <Send className="w-4 h-4 mr-1" /> Ask
              </Button>
            </form>

            {qaAnswer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-5 bg-white/80 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-inner border border-border"
                data-testid="text-qa-answer"
              >
                {qaAnswer}
              </motion.div>
            )}
            {queryDocs.isError && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-xl text-sm">
                Failed to query documents. Please try again.
              </div>
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
              <Button onClick={handleAnalyze} isLoading={analyze.isPending} className="shrink-0" data-testid="button-analyze">
                Generate Analysis
              </Button>
            </div>

            {analysisResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 p-5 bg-white/80 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-inner border border-border"
                data-testid="text-analysis-result"
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

        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 rounded-3xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Medical Reports</h3>
              <Button size="icon" variant="secondary" onClick={() => setIsModalOpen(true)} data-testid="button-add-report">
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
                  <p className="text-xs mt-1">Upload a PDF or add reports manually.</p>
                </div>
              ) : (
                reports?.map((report) => (
                  <div key={report.id} className="p-4 bg-secondary/50 rounded-2xl hover:bg-secondary transition-colors border border-border/50" data-testid={`card-report-${report.id}`}>
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
              data-testid="select-report-type"
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
              data-testid="input-findings"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createReport.isPending} data-testid="button-save-report">Save Report</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
