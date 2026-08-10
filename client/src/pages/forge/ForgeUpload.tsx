import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { queryClient } from "@/lib/queryClient";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, CheckCircle, GitCompare, XCircle, ArrowRight, Zap } from "lucide-react";

export default function ForgeUpload() {
  const [, params] = useRoute("/forge/project/:id/upload");
  const projectId = params?.id || "";

  const [fileType, setFileType] = useState("manuscript");
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("fileType", fileType);
      if (selectedFile) {
        formData.append("manuscript", selectedFile);
      } else if (pastedText.trim()) {
        formData.append("text", pastedText);
      } else {
        throw new Error("Provide a file or paste text");
      }
      const res = await fetch(`/api/forge/projects/${projectId}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forge/projects", projectId] });
    },
  });

  const result = uploadMutation.data;

  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyText, setVerifyText] = useState("");
  const [verifyJobId, setVerifyJobId] = useState<string | null>(null);
  const verifyFileInputRef = useRef<HTMLInputElement>(null);

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (verifyFile) {
        formData.append("manuscript", verifyFile);
      } else if (verifyText.trim()) {
        formData.append("text", verifyText);
      } else {
        throw new Error("Provide a revised draft file or paste text");
      }
      const res = await fetch(`/api/forge/projects/${projectId}/verify-revision`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || (await res.text()));
      }
      return res.json();
    },
    onSuccess: (data) => {
      setVerifyJobId(data.jobId);
      queryClient.invalidateQueries({ queryKey: ["/api/forge/projects", projectId] });
    },
  });

  const { data: verifyJobStatus } = useQuery<any>({
    queryKey: ["/api/forge/jobs", verifyJobId],
    enabled: !!verifyJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "complete" || status === "error" || status === "cancelled") return false;
      return 2000;
    },
  });

  // Re-attach to a verification job still running server-side after reload.
  const { data: latestRevision } = useQuery<any>({
    queryKey: ["/api/forge/projects", projectId, "revision"],
    enabled: !!projectId && !verifyJobId,
  });
  const { data: allJobs } = useQuery<any[]>({
    queryKey: ["/api/forge/jobs"],
    enabled: !!projectId && !verifyJobId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (verifyJobId || !latestRevision || !allJobs) return;
    const running = allJobs.find(j =>
      j.revisionVersionId === latestRevision.id &&
      j.analysisType === "revision_verification" &&
      j.status !== "complete" && j.status !== "error" && j.status !== "cancelled"
    );
    if (running) setVerifyJobId(running.id);
  }, [verifyJobId, latestRevision, allJobs]);

  const cancelVerifyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/forge/jobs/${verifyJobId}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const verifyRunning = verifyJobId && verifyJobStatus && verifyJobStatus.status !== "complete" && verifyJobStatus.status !== "error" && verifyJobStatus.status !== "cancelled";
  const verifyComplete = verifyJobStatus?.status === "complete";
  const verifyFailed = verifyJobStatus?.status === "error";
  const verifyCancelled = verifyJobStatus?.status === "cancelled";

  return (
    <ForgeLayout projectId={projectId}>
      <div className="max-w-2xl animate-in fade-in duration-300">
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-1" data-testid="text-upload-heading">Draft &amp; Revisions</h1>
        <p className="text-sm text-muted-foreground mb-6">Upload source material, replace the current draft, or verify a revised manuscript.</p>

        <Card className="bookplate rounded-sm mb-6">
          <CardContent className="p-6 space-y-5">
            <div>
              <Label className="text-foreground/80 mb-2 block">File Type</Label>
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger className="bg-background" data-testid="select-file-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manuscript">Manuscript</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="story_bible">Story Bible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-foreground/80 mb-2 block">Upload File (.txt, .docx)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.docx"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                data-testid="input-file-upload"
              />
              <Button
                variant="outline"
                className="w-full border-dashed border-border text-foreground/80 hover:bg-accent h-20"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-choose-file"
              >
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-5 h-5 text-brass" />
                  {selectedFile ? (
                    <span className="text-primary text-sm">{selectedFile.name}</span>
                  ) : (
                    <span className="text-sm">Click to choose a file</span>
                  )}
                </div>
              </Button>
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">OR paste text</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <Textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your manuscript text here..."
                className="bg-background min-h-[200px] font-mono text-sm"
                data-testid="textarea-paste"
              />
            </div>

            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || (!selectedFile && !pastedText.trim())}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              data-testid="button-upload"
            >
              {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload & Parse
            </Button>

            {uploadMutation.isError && (
              <p className="text-destructive text-sm" data-testid="text-upload-error">
                {(uploadMutation.error as Error).message}
              </p>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-card border border-green-700/40 rounded-sm" data-testid="card-upload-result">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-700 flex items-center gap-2 text-lg">
                <CheckCircle className="w-5 h-5" /> Upload Successful
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="grid grid-cols-3 gap-4">
                {result.chaptersDetected !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-chapters-detected">{result.chaptersDetected}</p>
                    <p className="text-xs text-muted-foreground">Chapters Detected</p>
                  </div>
                )}
                {result.chunksCreated !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-chunks-created">{result.chunksCreated}</p>
                    <p className="text-xs text-muted-foreground">Chunks Created</p>
                  </div>
                )}
                {result.totalWords !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-word-count">{result.totalWords.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Words</p>
                  </div>
                )}
              </div>
              <Link
                href={`/forge/project/${projectId}/analyze`}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-semibold h-10 px-4 no-underline"
                data-testid="link-choose-editing-options"
              >
                <Zap className="w-4 h-4" /> Choose editing options <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
        )}

        <Card className="bookplate rounded-sm mt-6" data-testid="card-verify-revision">
          <CardHeader>
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-brass" />
              Verify Revised Draft
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Upload a new draft to check it against the current draft's issue ledger.
              Each prior issue is classified as fixed, partially fixed, displaced, unchanged,
              worsened, or intentionally declined — and unresolved issues carry forward.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!verifyJobId && (
              <>
                <input
                  ref={verifyFileInputRef}
                  type="file"
                  accept=".txt,.docx"
                  className="hidden"
                  onChange={(e) => setVerifyFile(e.target.files?.[0] || null)}
                  data-testid="input-verify-file"
                />
                <Button
                  variant="outline"
                  className="w-full border-dashed border-border text-foreground/80 hover:bg-accent h-16"
                  onClick={() => verifyFileInputRef.current?.click()}
                  data-testid="button-choose-verify-file"
                >
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-4 h-4 text-brass" />
                    {verifyFile ? (
                      <span className="text-primary text-sm">{verifyFile.name}</span>
                    ) : (
                      <span className="text-sm">Choose revised draft (.txt, .docx)</span>
                    )}
                  </div>
                </Button>

                <Textarea
                  value={verifyText}
                  onChange={(e) => setVerifyText(e.target.value)}
                  placeholder="...or paste the revised manuscript text here"
                  className="bg-background min-h-[120px] font-mono text-sm"
                  data-testid="textarea-verify-paste"
                />

                <Button
                  onClick={() => verifyMutation.mutate()}
                  disabled={verifyMutation.isPending || (!verifyFile && !verifyText.trim())}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  data-testid="button-verify-revision"
                >
                  {verifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <GitCompare className="w-4 h-4 mr-2" />}
                  Verify Against Issue Ledger
                </Button>

                {verifyMutation.isError && (
                  <p className="text-destructive text-sm" data-testid="text-verify-error">
                    {(verifyMutation.error as Error).message}
                  </p>
                )}
              </>
            )}

            {verifyJobId && verifyJobStatus && (
              <div className="space-y-3" data-testid="verify-job-status">
                <div className="flex items-center gap-2 text-foreground">
                  {verifyRunning && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                  {verifyComplete && <CheckCircle className="w-4 h-4 text-green-700" />}
                  {verifyFailed && <XCircle className="w-4 h-4 text-destructive" />}
                  {verifyCancelled && <XCircle className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm">
                    {verifyRunning && "Verification in progress..."}
                    {verifyComplete && "Verification complete — see the Revision Verification Report in Reports."}
                    {verifyFailed && "Verification failed."}
                    {verifyCancelled && "Verification cancelled — no ledger changes were applied."}
                  </span>
                </div>
                <Progress value={verifyJobStatus.progress || 0} className="bg-secondary [&>div]:bg-primary" />
                {verifyJobStatus.logs && verifyJobStatus.logs.length > 0 && (
                  <div className="bg-muted border border-border rounded-sm p-3 max-h-40 overflow-y-auto font-mono text-xs">
                    {verifyJobStatus.logs.map((log: string, i: number) => (
                      <div key={i} className="text-muted-foreground py-0.5">{log}</div>
                    ))}
                  </div>
                )}
                {verifyJobStatus.error && (
                  <p className="text-destructive text-sm">{verifyJobStatus.error}</p>
                )}
                {verifyRunning && (
                  <Button
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => cancelVerifyMutation.mutate()}
                    disabled={cancelVerifyMutation.isPending || cancelVerifyMutation.isSuccess}
                    data-testid="button-stop-verification"
                  >
                    {cancelVerifyMutation.isPending || cancelVerifyMutation.isSuccess ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Stopping...</>
                    ) : (
                      <><XCircle className="w-4 h-4 mr-2" /> Stop Verification</>
                    )}
                  </Button>
                )}
                {(verifyComplete || verifyFailed || verifyCancelled) && (
                  <Button
                    variant="outline"
                    className="border-border text-primary hover:bg-primary/10"
                    onClick={() => { setVerifyJobId(null); setVerifyFile(null); setVerifyText(""); }}
                    data-testid="button-new-verification"
                  >
                    Verify Another Draft
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ForgeLayout>
  );
}
