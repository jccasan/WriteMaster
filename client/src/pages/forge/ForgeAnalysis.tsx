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
import { Loader2, Zap, CheckCircle, XCircle } from "lucide-react";

const MODULES = [
  { key: "editorial_assessment", label: "Editorial Assessment" },
  { key: "developmental_editor", label: "Developmental Editor" },
  { key: "copy_editor", label: "Copy Editor" },
  { key: "proofreader", label: "Proofreader" },
  { key: "fact_checker", label: "Fact Checker" },
  { key: "beta_reader", label: "Beta Reader" },
  { key: "structure_analyzer", label: "Structure Analyzer" },
  { key: "character_tracker", label: "Character Tracker" },
  { key: "scene_scanner", label: "Scene Scanner" },
];

export default function ForgeAnalysis() {
  const [, params] = useRoute("/forge/project/:id/analyze");
  const projectId = params?.id || "";

  const [selectedModules, setSelectedModules] = useState<string[]>(
    MODULES.filter(m => m.key !== "beta_reader").map(m => m.key)
  );
  const [jobId, setJobId] = useState<string | null>(null);

  const toggleModule = (key: string) => {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/forge/projects/${projectId}/analyze`, {
        modules: selectedModules,
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
      if (status === "complete" || status === "failed") return false;
      return 2000;
    },
  });

  useEffect(() => {
    if (jobStatus?.status === "complete") {
      queryClient.invalidateQueries({ queryKey: ["/api/forge/projects", projectId] });
    }
  }, [jobStatus?.status, projectId]);

  const isRunning = jobId && jobStatus && jobStatus.status !== "complete" && jobStatus.status !== "failed";
  const isComplete = jobStatus?.status === "complete";
  const isFailed = jobStatus?.status === "failed";

  return (
    <ForgeLayout projectId={projectId}>
      <div className="max-w-2xl animate-in fade-in duration-300">
        <h1 className="text-2xl font-bold text-amber-400 mb-6" data-testid="text-analysis-heading">Analysis</h1>

        {!jobId && (
          <Card className="bg-gray-900 border-amber-900/20 mb-6">
            <CardHeader>
              <CardTitle className="text-gray-100 text-lg">Select Analysis Modules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MODULES.map((mod) => (
                <div key={mod.key} className="flex items-center gap-3">
                  <Checkbox
                    id={mod.key}
                    checked={selectedModules.includes(mod.key)}
                    onCheckedChange={() => toggleModule(mod.key)}
                    className="border-gray-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                    data-testid={`checkbox-module-${mod.key}`}
                  />
                  <Label htmlFor={mod.key} className="text-gray-300 cursor-pointer">{mod.label}</Label>
                </div>
              ))}

              <Button
                onClick={() => analyzeMutation.mutate()}
                disabled={selectedModules.length === 0 || analyzeMutation.isPending}
                className="w-full mt-4 bg-amber-600 hover:bg-amber-700 text-gray-950 font-semibold"
                data-testid="button-start-analysis"
              >
                {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Start Analysis ({selectedModules.length} modules)
              </Button>

              {analyzeMutation.isError && (
                <p className="text-red-400 text-sm" data-testid="text-analysis-error">
                  {(analyzeMutation.error as Error).message}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {jobId && jobStatus && (
          <Card className="bg-gray-900 border-amber-900/20" data-testid="card-job-status">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100 text-lg flex items-center gap-2">
                {isRunning && <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />}
                {isComplete && <CheckCircle className="w-5 h-5 text-green-400" />}
                {isFailed && <XCircle className="w-5 h-5 text-red-400" />}
                Analysis {jobStatus.status === "running" ? "In Progress" : jobStatus.status === "complete" ? "Complete" : jobStatus.status === "failed" ? "Failed" : "Queued"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-amber-400" data-testid="text-progress-percent">{Math.round(jobStatus.progress || 0)}%</span>
                </div>
                <Progress value={jobStatus.progress || 0} className="bg-gray-800 [&>div]:bg-amber-600" data-testid="progress-bar" />
              </div>

              {jobStatus.logs && jobStatus.logs.length > 0 && (
                <div className="bg-gray-950 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs" data-testid="log-display">
                  {jobStatus.logs.map((log: string, i: number) => (
                    <div key={i} className="text-gray-400 py-0.5" data-testid={`log-entry-${i}`}>
                      {log}
                    </div>
                  ))}
                </div>
              )}

              {jobStatus.error && (
                <p className="text-red-400 text-sm" data-testid="text-job-error">{jobStatus.error}</p>
              )}

              {(isComplete || isFailed) && (
                <Button
                  variant="outline"
                  className="border-amber-900/30 text-amber-400"
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
