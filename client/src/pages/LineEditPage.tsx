import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/Layout";
import PipelineRunner, { type PipelineStepDef } from "@/components/PipelineRunner";
import DiffView from "@/components/DiffView";
import { computeChangeBlocks, resolveText, type ChangeBlock } from "@/lib/diffChanges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle, Check, X } from "lucide-react";

const P4_STEPS: PipelineStepDef[] = [
  { id: 0, name: "Initialization", desc: "Loading chapter text and style guide", model: "cheap" },
  { id: 1, name: "AI-Isms Scan", desc: "Detecting banned words, patterns, and structural AI tells", model: "cheap" },
  { id: 2, name: "Dialogue Audit", desc: "Checking naturalness, subtext, and on-the-nose lines", model: "cheap" },
  { id: 3, name: "Pacing Audit", desc: "Checking sentence rhythm, beige passages, and frictionless filler", model: "cheap" },
  { id: 4, name: "Addiction Loop Audit", desc: "Scoring stakes, hooks, and re-hooks against the engagement framework", model: "cheap" },
  { id: 5, name: "Edit Plan Consolidation", desc: "Merging all findings into a prioritized edit plan", model: "cheap" },
  { id: 6, name: "Line Edit Rewrite", desc: "Implementing every flagged fix — change-nothing-else rule", model: "powerful" },
  { id: 7, name: "Verification", desc: "Confirming the plan was applied without new issues introduced", model: "cheap" },
];

export default function LineEditPage() {
  const params = useParams<{ id: string; chapterNum: string }>();
  const [, navigate] = useLocation();
  const bookId = params.id;
  const chapterNum = parseInt(params.chapterNum ?? "1");

  const [phase, setPhase] = useState<"loading" | "running" | "done">("loading");
  const [p4Id, setP4Id] = useState<string | null>(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [editedDraft, setEditedDraft] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<ChangeBlock[]>([]);
  const [accepted, setAccepted] = useState<Record<number, boolean>>({});
  const [viewMode, setViewMode] = useState<"changes" | "clean">("changes");
  const [verificationPassed, setVerificationPassed] = useState<boolean | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId || !chapterNum) return;
    // Auto-start the pipeline
    fetch(`/api/books/${bookId}/line-edit/${chapterNum}/start`, { method: "POST" })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setP4Id(data.pipeline4_id);
        setPhase("running");
      })
      .catch(err => setError(err.message));

    // Also fetch the book to get chapter title
    fetch(`/api/books/${bookId}`)
      .then(r => r.json())
      .then(data => {
        const ch = data.chapters?.find((c: any) => c.chapter_number === chapterNum);
        if (ch) setChapterTitle(ch.title);
      })
      .catch(() => {});
  }, [bookId, chapterNum]);

  const runStep = useCallback(async () => {
    if (!p4Id) throw new Error("No session");
    const r = await fetch(`/api/pipeline4/${p4Id}/run-step`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Step failed");
    return data;
  }, [p4Id]);

  const onComplete = async () => {
    if (!p4Id) return;
    const r = await fetch(`/api/pipeline4/${p4Id}/state`);
    if (r.ok) {
      const d = await r.json();
      setEditedDraft(d.edited_draft);
      setVerificationPassed(d.verification?.includes("PASSED") ?? null);
      const computed = computeChangeBlocks(d.original_text ?? "", d.edited_draft ?? "");
      setBlocks(computed);
      // Default every flagged edit to accepted — matches the previous
      // behavior of applying the full rewrite; declining is opt-out.
      setAccepted(Object.fromEntries(computed.filter(b => b.type === "change").map(b => [b.id, true])));
    }
    setPhase("done");
  };

  const changeBlocks = useMemo(() => blocks.filter(b => b.type === "change"), [blocks]);
  const acceptedCount = changeBlocks.filter(b => accepted[b.id] ?? true).length;
  const declinedCount = changeBlocks.length - acceptedCount;
  const finalText = useMemo(() => resolveText(blocks, accepted), [blocks, accepted]);

  const toggleChange = (id: number) => {
    setAccepted(prev => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const setAllAccepted = (value: boolean) => {
    setAccepted(Object.fromEntries(changeBlocks.map(b => [b.id, value])));
  };

  const applyToBook = async () => {
    if (!p4Id) return;
    setApplying(true);
    try {
      const r = await fetch(`/api/pipeline4/${p4Id}/apply-to-book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: finalText }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      setApplied(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  if (phase === "loading") return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        {error ? (
          <div className="text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => navigate(`/book/${bookId}`)}>Back to Book</Button>
          </div>
        ) : (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Starting line edit pipeline...</p>
          </>
        )}
      </div>
    </Layout>
  );

  if (phase === "running") return (
    <Layout>
      <PipelineRunner
        title={`Line Editing Ch. ${chapterNum}`}
        subtitle={chapterTitle}
        steps={P4_STEPS}
        runStepFn={runStep}
        onComplete={onComplete}
        completeLabel="Review & Apply Edits →"
      >
        <Card className="bg-muted/30 border-none shadow-none">
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider">What this fixes</p>
            {["Banned words & phrases", "Not just X but Y patterns", "Participial editorializing tails", "On-the-nose dialogue", "Frictionless filler", "Beige passages", "Sentence monotony"].map(item => (
              <p key={item} className="text-xs flex items-start gap-1.5">
                <span className="text-primary mt-0.5">·</span> {item}
              </p>
            ))}
          </CardContent>
        </Card>
      </PipelineRunner>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto animate-in fade-in duration-500 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/book/${bookId}`)} className="gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back to Book
            </Button>
            <h1 className="text-2xl font-serif font-bold mt-2">
              Line Edit — Ch. {chapterNum}: {chapterTitle}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground text-sm">
                {Math.round(finalText.split(/\s+/).length)} words
              </p>
              {verificationPassed !== null && (
                <Badge variant="outline" className={verificationPassed ? "border-green-600 text-green-600" : "border-amber-500 text-amber-600"}>
                  {verificationPassed ? "Verification passed" : "Review verification"}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            {!applied ? (
              <Button onClick={applyToBook} disabled={applying} className="gap-2">
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Apply to Book
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-700/10 px-3 py-2 rounded-md">
                <CheckCircle2 className="w-4 h-4" /> Applied
              </div>
            )}
          </div>
        </div>

        {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

        {verificationPassed === false && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            Verification flagged potential issues — review the edited text carefully before applying.
          </div>
        )}

        {changeBlocks.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{changeBlocks.length}</span> changes —{" "}
                <span className="text-green-700 dark:text-green-400">{acceptedCount} accepted</span>
                {declinedCount > 0 && <>, <span className="text-destructive">{declinedCount} declined</span></>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setAllAccepted(true)}>
                <Check className="w-3 h-3" /> Accept All
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setAllAccepted(false)}>
                <X className="w-3 h-3" /> Decline All
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <div className="flex rounded-md border border-border overflow-hidden">
                <button
                  onClick={() => setViewMode("changes")}
                  className={`px-2.5 py-1 text-xs ${viewMode === "changes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  Changes
                </button>
                <button
                  onClick={() => setViewMode("clean")}
                  className={`px-2.5 py-1 text-xs ${viewMode === "clean" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  Clean text
                </button>
              </div>
            </div>
          </div>
        )}

        <Card className="border-border/60">
          <CardContent className="p-6 max-h-[70vh] overflow-y-auto">
            {changeBlocks.length === 0 ? (
              <pre className="text-sm whitespace-pre-wrap break-words leading-relaxed text-foreground font-sans">
                {editedDraft ?? "No edited draft found."}
              </pre>
            ) : viewMode === "changes" ? (
              <DiffView blocks={blocks} accepted={accepted} onToggle={toggleChange} />
            ) : (
              <pre className="text-sm whitespace-pre-wrap break-words leading-relaxed text-foreground font-sans">
                {finalText}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
