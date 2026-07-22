import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, CheckCircle, XCircle, Clock, Gauge, Send } from "lucide-react";

const MODULES = [
  { key: "editorial_assessment", label: "Editorial Assessment" },
  { key: "developmental_editor", label: "Developmental Editor" },
  { key: "copy_editor", label: "Line Editor" },
  { key: "proofreader", label: "Copy Editor / Proofreader" },
  { key: "fact_checker", label: "Continuity & Fact Auditor" },
  { key: "beta_reader", label: "Reader Panel" },
  { key: "structure_analyzer", label: "Structure Analyzer" },
  { key: "character_tracker", label: "Character Tracker" },
  { key: "scene_scanner", label: "Scene Scanner" },
  { key: "addiction_loop", label: "Addiction Loop Audit" },
  { key: "sme_reviewer", label: "Subject-Matter Experts" },
  { key: "publishing_review", label: "Publishing Review Panel" },
];

const SME_DOMAINS = [
  { key: "federal_procedure", label: "Federal Procedure" },
  { key: "intelligence_tradecraft", label: "Intelligence Tradecraft" },
  { key: "legal_realism", label: "Legal Realism" },
  { key: "medical_realism", label: "Medical Realism" },
  { key: "military_operations", label: "Military Operations" },
  { key: "forensics_evidence", label: "Forensics & Evidence" },
  { key: "cybersecurity_technology", label: "Cybersecurity & Technology" },
];

const BETA_PROFILES = [
  { key: "genre_enthusiast", label: "Genre Enthusiast" },
  { key: "casual_commercial", label: "Casual Commercial" },
  { key: "emotion_first", label: "Emotion-First" },
  { key: "pacing_sensitive", label: "Pacing-Sensitive" },
  { key: "critical_craft", label: "Critical Craft" },
  { key: "commercial_thriller", label: "Commercial Thriller Reader" },
  { key: "pacing_suspense", label: "Pacing & Suspense Reader" },
  { key: "character_arc", label: "Character Arc Reader" },
  { key: "dialogue_voice", label: "Dialogue & Voice Reader" },
  { key: "emotional_impact", label: "Emotional Impact Reader" },
  { key: "skeptical_mainstream", label: "Skeptical Mainstream Reader" },
  { key: "series_ending", label: "Series & Ending Reader" },
];

const QUICK_MODULES = ["editorial_assessment", "character_tracker", "developmental_editor"];
const FULL_MODULES = MODULES.filter(m => m.key !== "beta_reader" && m.key !== "publishing_review").map(m => m.key);
const SUBMISSION_MODULES = ["editorial_assessment", "character_tracker", "publishing_review"];

type Preset = "quick" | "full" | "submission" | "custom";

export default function ForgeAnalysis() {
  const [, params] = useRoute("/forge/project/:id/analyze");
  const projectId = params?.id || "";

  const [preset, setPreset] = useState<Preset>("full");
  const [selectedModules, setSelectedModules] = useState<string[]>(FULL_MODULES);
  const [selectedSmeDomains, setSelectedSmeDomains] = useState<string[]>([]);
  const [selectedBetaProfiles, setSelectedBetaProfiles] = useState<string[]>(BETA_PROFILES.map(p => p.key));
  const [jobId, setJobId] = useState<string | null>(null);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === "quick") setSelectedModules([...QUICK_MODULES]);
    else if (p === "full") setSelectedModules([...FULL_MODULES]);
    else if (p === "submission") setSelectedModules([...SUBMISSION_MODULES]);
  };

  const toggleModule = (key: string) => {
    setPreset("custom");
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSmeDomain = (key: string) => {
    setSelectedSmeDomains(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleBetaProfile = (key: string) => {
    setSelectedBetaProfiles(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/forge/projects/${projectId}/analyze`, {
        modules: selectedModules,
        smeReviewers: selectedModules.includes("sme_reviewer") ? selectedSmeDomains : [],
        betaReaderProfiles: selectedModules.includes("beta_reader") ? selectedBetaProfiles : [],
      });
      return res.json();
    },
    onSuccess: (data) => {
      setJobId(data.jobId);
    },
  });

  const { data: jobStatus } = useQuery<any>({
    queryKey: ["/api/forge/jobs", jobId],
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "complete" || status === "error" || status === "cancelled") return false;
      return 2000;
    },
  });

  // Re-attach to a job that is still running server-side after a page
  // reload — jobs keep going in the background even if the tab closes.
  const { data: revision } = useQuery<any>({
    queryKey: ["/api/forge/projects", projectId, "revision"],
    enabled: !!projectId && !jobId,
  });
  const { data: allJobs } = useQuery<any[]>({
    queryKey: ["/api/forge/jobs"],
    enabled: !!projectId && !jobId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (jobId || !revision || !allJobs) return;
    const running = allJobs.find(j =>
      j.revisionVersionId === revision.id &&
      j.analysisType === "full_analysis" &&
      j.status !== "complete" && j.status !== "error" && j.status !== "cancelled"
    );
    if (running) setJobId(running.id);
  }, [jobId, revision, allJobs]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/forge/jobs/${jobId}/cancel`, {});
      return res.json();
    },
  });

  useEffect(() => {
    if (jobStatus?.status === "complete") {
      queryClient.invalidateQueries({ queryKey: ["/api/forge/projects", projectId] });
    }
  }, [jobStatus?.status, projectId]);

  const isRunning = jobId && jobStatus && jobStatus.status !== "complete" && jobStatus.status !== "error" && jobStatus.status !== "cancelled";
  const isComplete = jobStatus?.status === "complete";
  const isFailed = jobStatus?.status === "error";
  const isCancelled = jobStatus?.status === "cancelled";

  return (
    <ForgeLayout projectId={projectId}>
      <div className="max-w-2xl animate-in fade-in duration-300">
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-6" data-testid="text-analysis-heading">Analysis</h1>

        {!jobId && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                onClick={() => applyPreset("quick")}
                className={`p-4 rounded-sm border text-left transition-colors ${
                  preset === "quick"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
                data-testid="button-preset-quick"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="w-4 h-4 text-brass" />
                  <span className="font-semibold text-foreground">Quick</span>
                </div>
                <p className="text-xs text-muted-foreground">3 core modules. ~10-15 min for a full novel.</p>
              </button>
              <button
                onClick={() => applyPreset("full")}
                className={`p-4 rounded-sm border text-left transition-colors ${
                  preset === "full"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
                data-testid="button-preset-full"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-brass" />
                  <span className="font-semibold text-foreground">Full</span>
                </div>
                <p className="text-xs text-muted-foreground">Core editorial modules in parallel. ~15-25 min for a full novel.</p>
              </button>
              <button
                onClick={() => applyPreset("submission")}
                className={`p-4 rounded-sm border text-left transition-colors ${
                  preset === "submission"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
                data-testid="button-preset-submission"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Send className="w-4 h-4 text-brass" />
                  <span className="font-semibold text-foreground">Submission</span>
                </div>
                <p className="text-xs text-muted-foreground">Agent, acquisitions, positioning, and package readers.</p>
              </button>
            </div>

            <Card className="bookplate rounded-sm mb-6">
              <CardHeader>
                <CardTitle className="text-foreground text-lg flex items-center justify-between">
                  <span>Modules</span>
                  {preset === "custom" && <Badge variant="outline" className="border-border text-muted-foreground text-xs">Custom</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {MODULES.map((mod) => (
                  <div key={mod.key}>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={mod.key}
                        checked={selectedModules.includes(mod.key)}
                        onCheckedChange={() => toggleModule(mod.key)}
                        data-testid={`checkbox-module-${mod.key}`}
                      />
                      <Label htmlFor={mod.key} className="text-foreground/80 cursor-pointer">{mod.label}</Label>
                    </div>

                    {mod.key === "sme_reviewer" && selectedModules.includes("sme_reviewer") && (
                      <div className="ml-7 mt-2 space-y-2 border-l border-border pl-4">
                        <p className="text-xs text-muted-foreground">
                          Leave all unchecked to auto-route: a router pass reads the manuscript and activates only the relevant experts.
                        </p>
                        {SME_DOMAINS.map((domain) => (
                          <div key={domain.key} className="flex items-center gap-2">
                            <Checkbox
                              id={`sme-${domain.key}`}
                              checked={selectedSmeDomains.includes(domain.key)}
                              onCheckedChange={() => toggleSmeDomain(domain.key)}
                              className="h-3.5 w-3.5"
                              data-testid={`checkbox-sme-${domain.key}`}
                            />
                            <Label htmlFor={`sme-${domain.key}`} className="text-muted-foreground text-sm cursor-pointer">{domain.label}</Label>
                          </div>
                        ))}
                      </div>
                    )}

                    {mod.key === "beta_reader" && selectedModules.includes("beta_reader") && (
                      <div className="ml-7 mt-2 space-y-2 border-l border-border pl-4">
                        <p className="text-xs text-muted-foreground">
                          Each selected reader reviews every section independently.
                        </p>
                        {BETA_PROFILES.map((profile) => (
                          <div key={profile.key} className="flex items-center gap-2">
                            <Checkbox
                              id={`beta-${profile.key}`}
                              checked={selectedBetaProfiles.includes(profile.key)}
                              onCheckedChange={() => toggleBetaProfile(profile.key)}
                              className="h-3.5 w-3.5"
                              data-testid={`checkbox-beta-${profile.key}`}
                            />
                            <Label htmlFor={`beta-${profile.key}`} className="text-muted-foreground text-sm cursor-pointer">{profile.label}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  onClick={() => analyzeMutation.mutate()}
                  disabled={selectedModules.length === 0 || analyzeMutation.isPending}
                  className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  data-testid="button-start-analysis"
                >
                  {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                  Start Analysis ({selectedModules.length} modules)
                </Button>

                {analyzeMutation.isError && (
                  <p className="text-destructive text-sm" data-testid="text-analysis-error">
                    {(analyzeMutation.error as Error).message}
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {jobId && jobStatus && (
          <Card className="bookplate rounded-sm" data-testid="card-job-status">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-lg flex items-center gap-2">
                {isRunning && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                {isComplete && <CheckCircle className="w-5 h-5 text-green-700" />}
                {isFailed && <XCircle className="w-5 h-5 text-destructive" />}
                {isCancelled && <XCircle className="w-5 h-5 text-muted-foreground" />}
                Analysis {isComplete ? "Complete" : isFailed ? "Failed" : isCancelled ? "Cancelled" : "In Progress"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-primary" data-testid="text-progress-percent">{Math.round(jobStatus.progress || 0)}%</span>
                </div>
                <Progress value={jobStatus.progress || 0} className="bg-secondary [&>div]:bg-primary" data-testid="progress-bar" />
              </div>

              {jobStatus.logs && jobStatus.logs.length > 0 && (
                <div className="bg-muted border border-border rounded-sm p-3 max-h-64 overflow-y-auto font-mono text-xs" data-testid="log-display">
                  {jobStatus.logs.map((log: string, i: number) => (
                    <div key={i} className="text-muted-foreground py-0.5" data-testid={`log-entry-${i}`}>
                      {log}
                    </div>
                  ))}
                </div>
              )}

              {jobStatus.error && (
                <p className="text-destructive text-sm" data-testid="text-job-error">{jobStatus.error}</p>
              )}

              {isRunning && (
                <Button
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending || cancelMutation.isSuccess}
                  data-testid="button-stop-analysis"
                >
                  {cancelMutation.isPending || cancelMutation.isSuccess ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Stopping after current calls...</>
                  ) : (
                    <><XCircle className="w-4 h-4 mr-2" /> Stop Analysis</>
                  )}
                </Button>
              )}

              {isCancelled && (
                <p className="text-muted-foreground text-sm" data-testid="text-job-cancelled">
                  Analysis stopped. Results gathered before cancelling are kept; the editorial letter was not generated.
                </p>
              )}

              {(isComplete || isFailed || isCancelled) && (
                <Button
                  variant="outline"
                  className="border-border text-primary hover:bg-primary/10"
                  onClick={() => { setJobId(null); }}
                  data-testid="button-new-analysis"
                >
                  Run New Analysis
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ForgeLayout>
  );
}
