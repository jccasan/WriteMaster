import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/Layout";
import PipelineRunner, { type PipelineStepDef } from "@/components/PipelineRunner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Sparkles, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, PlayCircle, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

const P3_STEPS: PipelineStepDef[] = [
  { id: 0, name: "Initialization", desc: "Loading context documents and building input state", model: "cheap" },
  { id: 1, name: "Plot Context Selection", desc: "Extracting this chapter's plot section from full outline", model: "cheap" },
  { id: 2, name: "Character Context Selection", desc: "Selecting relevant character profiles for this chapter", model: "cheap" },
  { id: 3, name: "World-Building Context Selection", desc: "Extracting relevant world elements for this scene", model: "cheap" },
  { id: 4, name: "Word Count Estimation", desc: "Determining target length based on pacing and scene density", model: "cheap" },
  { id: 5, name: "Plot Scene Brief", desc: "Writing expanded scene beats and cliffhanger specification", model: "powerful" },
  { id: 6, name: "Character Scene Brief", desc: "Adjusting sliders and removing future detail leaks", model: "powerful" },
  { id: 7, name: "World Scene Brief", desc: "Establishing active locations and world rules for this scene", model: "cheap" },
  { id: 8, name: "Chronology Check A", desc: "Pre-draft continuity check against full outline", model: "powerful" },
  { id: 9, name: "Scene Brief Consolidation", desc: "Merging briefs and applying chronology corrections", model: "cheap" },
  { id: 10, name: "First Draft", desc: "Writing full chapter prose from consolidated scene brief", model: "powerful" },
  { id: 11, name: "Chronology Check B", desc: "Post-draft continuity check against last 20,000 words", model: "powerful" },
  { id: 12, name: "Style Check", desc: "Comparing prose against style guide (skipped if none on file)", model: "powerful" },
  { id: 13, name: "Final Rewrite", desc: "Implementing chronology and style fixes", model: "powerful" },
];

interface BookChapter {
  chapter_number: number;
  title: string;
  outline: string;
  content: string | null;
  status: "outlined" | "writing" | "written" | "committed";
}

interface BookProject {
  id: string;
  title: string;
  chapters: BookChapter[];
  documents?: { id: string; name: string; type: string }[];
}

interface BatchItem {
  chapterNum: number;
  chapterTitle: string;
  p3Id: string | null;
  status: "queued" | "running" | "done" | "error";
  errorMsg?: string;
}

type PagePhase = "config" | "single-running" | "batch-running" | "single-done" | "batch-done";

export default function BookWriteAdvanced() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const bookId = params.id;

  const [book, setBook] = useState<BookProject | null>(null);
  const [loadingBook, setLoadingBook] = useState(true);
  const [phase, setPhase] = useState<PagePhase>("config");

  // Config
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [tense, setTense] = useState<"past" | "present">("past");
  const [authorNotes, setAuthorNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Single
  const [singleP3Id, setSingleP3Id] = useState<string | null>(null);
  const [singleChapterNum, setSingleChapterNum] = useState<number | null>(null);
  const [singleDraft, setSingleDraft] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  // Batch
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchCurrentP3Id, setBatchCurrentP3Id] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const batchCancelRef = useRef(false);

  useEffect(() => {
    if (!bookId) return;
    fetch(`/api/books/${bookId}`)
      .then(r => r.json())
      .then(data => { setBook(data); })
      .catch(() => setError("Failed to load book"))
      .finally(() => setLoadingBook(false));
  }, [bookId]);

  const toggleChapter = (num: number) => {
    setSelectedChapters(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a, b) => a - b)
    );
  };

  const selectAll = () => {
    if (!book) return;
    const eligible = book.chapters.filter(c => c.outline && c.status !== "committed").map(c => c.chapter_number);
    setSelectedChapters(eligible);
  };

  const startSingle = async (chapterNum: number) => {
    setError(null);
    try {
      const r = await fetch(`/api/books/${bookId}/write-chapter-v2/${chapterNum}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tense, author_notes: authorNotes }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to start");
      setSingleP3Id(data.pipeline3_id);
      setSingleChapterNum(chapterNum);
      setPhase("single-running");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const runSingleStep = useCallback(async () => {
    if (!singleP3Id) throw new Error("No session");
    const r = await fetch(`/api/pipeline3/${singleP3Id}/run-step`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Step failed");
    return data;
  }, [singleP3Id]);

  const onSingleComplete = async () => {
    if (!singleP3Id) return;
    const r = await fetch(`/api/pipeline3/${singleP3Id}/state`);
    if (r.ok) { const d = await r.json(); setSingleDraft(d.final_draft); }
    setPhase("single-done");
  };

  const applyToBook = async () => {
    if (!singleP3Id) return;
    setApplying(true);
    try {
      const r = await fetch(`/api/pipeline3/${singleP3Id}/apply-to-book`, { method: "POST" });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      setApplied(true);
      if (book) {
        setBook(prev => {
          if (!prev) return prev;
          return { ...prev, chapters: prev.chapters.map(c => c.chapter_number === singleChapterNum ? { ...c, status: "written" as const } : c) };
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  // ── BATCH ──────────────────────────────────────────────────────────────────
  const startBatch = async () => {
    if (!book || selectedChapters.length === 0) return;
    const queue: BatchItem[] = selectedChapters.map(num => ({
      chapterNum: num,
      chapterTitle: book.chapters.find(c => c.chapter_number === num)?.title ?? `Chapter ${num}`,
      p3Id: null,
      status: "queued",
    }));
    setBatchQueue(queue);
    setBatchIndex(0);
    batchCancelRef.current = false;
    setPhase("batch-running");
    setBatchRunning(true);
    await runBatchFrom(queue, 0);
  };

  const runBatchFrom = async (queue: BatchItem[], startIdx: number) => {
    let idx = startIdx;
    while (idx < queue.length && !batchCancelRef.current) {
      const item = queue[idx];
      // Start this chapter's pipeline
      let p3Id: string;
      try {
        const r = await fetch(`/api/books/${bookId}/write-chapter-v2/${item.chapterNum}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tense, author_notes: authorNotes }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to start");
        p3Id = d.pipeline3_id;
      } catch (err: any) {
        setBatchQueue(prev => prev.map((q, i) => i === idx ? { ...q, status: "error", errorMsg: err.message } : q));
        idx++;
        continue;
      }

      setBatchQueue(prev => prev.map((q, i) => i === idx ? { ...q, p3Id, status: "running" } : q));
      setBatchCurrentP3Id(p3Id);

      // Run all steps for this chapter
      try {
        let done = false;
        while (!done && !batchCancelRef.current) {
          const r = await fetch(`/api/pipeline3/${p3Id}/run-step`, { method: "POST" });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error ?? "Step failed");
          if (d.is_complete) done = true;
          await new Promise(res => setTimeout(res, 300));
        }
        if (batchCancelRef.current) break;

        // Apply to book
        await fetch(`/api/pipeline3/${p3Id}/apply-to-book`, { method: "POST" });
        setBatchQueue(prev => prev.map((q, i) => i === idx ? { ...q, status: "done" } : q));
      } catch (err: any) {
        setBatchQueue(prev => prev.map((q, i) => i === idx ? { ...q, status: "error", errorMsg: err.message } : q));
      }

      setBatchIndex(idx + 1);
      idx++;
    }
    setBatchRunning(false);
    if (idx >= queue.length) setPhase("batch-done");
  };

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (loadingBook) return (
    <Layout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></Layout>
  );
  if (!book) return (
    <Layout><div className="text-center py-20 text-muted-foreground">Book not found.</div></Layout>
  );

  const hasP2Docs = book.documents?.some(d => d.type === "character_sheet") ?? false;
  const eligibleChapters = book.chapters.filter(c => c.outline && c.status !== "committed");

  // ── CONFIG ────────────────────────────────────────────────────────────────
  if (phase === "config") return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/book/${bookId}`)} className="gap-2 mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back to Book
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg"><Sparkles className="w-5 h-5 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-serif font-bold">Advanced Chapter Writer</h1>
              <p className="text-muted-foreground text-sm">{book.title}</p>
            </div>
          </div>
        </div>

        {!hasP2Docs && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-4 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Pipeline 2 documents not found</p>
              <p className="mt-0.5">This book has no expanded Character Sheet, World-Building, or Chapter Outline. The advanced writer will fall back to the Story Dossier. For best results, <button onClick={() => navigate(`/book/${bookId}/build`)} className="underline">run Pipeline 2 first</button>.</p>
            </div>
          </div>
        )}

        {hasP2Docs && (
          <div className="bg-green-700/10 border border-green-700/20 text-green-700 dark:text-green-400 p-3 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Pipeline 2 documents detected — Character Sheet, World-Building, and Chapter Outline will be used.
          </div>
        )}

        {/* Global settings */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Global Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Narrative Tense</Label>
              <div className="flex gap-2">
                {(["past", "present"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTense(t)}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-sm font-medium border transition-colors",
                      tense === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {t === "past" ? "Past tense" : "Present tense"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Author Notes (applied to all chapters)</Label>
              <Textarea
                id="notes"
                placeholder="Any instructions for the AI across all chapters — tone notes, things to include or avoid, style reminders..."
                value={authorNotes}
                onChange={e => setAuthorNotes(e.target.value)}
                className="text-sm resize-none h-20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Chapter selection */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Select Chapters</CardTitle>
            <button onClick={selectAll} className="text-xs text-primary hover:underline">Select all eligible</button>
          </CardHeader>
          <CardContent>
            {eligibleChapters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No chapters with outlines found. Add chapter outlines in the Book Writer first.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {eligibleChapters.map(chapter => {
                  const selected = selectedChapters.includes(chapter.chapter_number);
                  return (
                    <button
                      key={chapter.chapter_number}
                      onClick={() => toggleChapter(chapter.chapter_number)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-md border text-left transition-all",
                        selected ? "border-primary/50 bg-primary/5" : "border-border/60 hover:border-primary/30"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        selected ? "border-primary bg-primary" : "border-muted-foreground/40"
                      )}>
                        {selected && <CheckCircle2 className="w-2.5 h-2.5 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">Ch. {chapter.chapter_number}</span>
                        <span className="text-sm text-muted-foreground ml-2 truncate">{chapter.title}</span>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-xs shrink-0",
                        chapter.status === "written" ? "border-green-600 text-green-600" : "border-muted-foreground/40 text-muted-foreground"
                      )}>
                        {chapter.status}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

        {selectedChapters.length > 0 && (
          <div className="flex gap-3">
            {selectedChapters.length === 1 ? (
              <Button onClick={() => startSingle(selectedChapters[0])} size="lg" className="flex-1 gap-2">
                <PlayCircle className="w-4 h-4" /> Write Chapter {selectedChapters[0]}
              </Button>
            ) : (
              <Button onClick={startBatch} size="lg" className="flex-1 gap-2">
                <ListChecks className="w-4 h-4" /> Write {selectedChapters.length} Chapters (Batch)
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );

  // ── SINGLE RUNNING ────────────────────────────────────────────────────────
  if (phase === "single-running") {
    const chapterTitle = book.chapters.find(c => c.chapter_number === singleChapterNum)?.title ?? "";
    return (
      <Layout>
        <PipelineRunner
          title={`Writing Chapter ${singleChapterNum}`}
          subtitle={chapterTitle}
          steps={P3_STEPS}
          runStepFn={runSingleStep}
          onComplete={onSingleComplete}
          completeLabel="Review & Apply Draft →"
        >
          <Card className="bg-muted/30 border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Settings</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>Tense: {tense}</p>
              <p>Source: {hasP2Docs ? "P2 documents" : "Story Dossier"}</p>
            </CardContent>
          </Card>
        </PipelineRunner>
      </Layout>
    );
  }

  // ── SINGLE DONE ───────────────────────────────────────────────────────────
  if (phase === "single-done") {
    const chapterTitle = book.chapters.find(c => c.chapter_number === singleChapterNum)?.title ?? "";
    return (
      <Layout>
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Button variant="ghost" size="sm" onClick={() => setPhase("config")} className="gap-2 -ml-2">
                <ArrowLeft className="w-4 h-4" /> Write another chapter
              </Button>
              <h1 className="text-2xl font-serif font-bold mt-2">Chapter {singleChapterNum}: {chapterTitle}</h1>
              <p className="text-muted-foreground text-sm">Advanced pipeline complete — {Math.round((singleDraft ?? "").split(/\s+/).length)} words</p>
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
              <Button variant="outline" onClick={() => navigate(`/book/${bookId}`)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Book Writer
              </Button>
            </div>
          </div>
          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
          <Card className="border-border/60">
            <CardContent className="p-6">
              <pre className="text-sm whitespace-pre-wrap break-words leading-relaxed text-foreground max-h-[70vh] overflow-y-auto font-sans">
                {singleDraft ?? "No draft generated."}
              </pre>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // ── BATCH RUNNING / DONE ──────────────────────────────────────────────────
  if (phase === "batch-running" || phase === "batch-done") {
    const done = batchQueue.filter(q => q.status === "done").length;
    const errors = batchQueue.filter(q => q.status === "error").length;
    const progress = Math.round((done / batchQueue.length) * 100);

    return (
      <Layout>
        <div className="max-w-3xl mx-auto animate-in fade-in duration-500 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-serif font-bold">Batch Write</h1>
              <p className="text-muted-foreground text-sm">{book.title} — {batchQueue.length} chapters</p>
            </div>
            {phase === "batch-done" && (
              <Button onClick={() => navigate(`/book/${bookId}`)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Book
              </Button>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{done}/{batchQueue.length} chapters complete{errors > 0 ? `, ${errors} errors` : ""}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {batchRunning && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Running chapter {batchQueue[batchIndex]?.chapterNum}...
            </div>
          )}

          <div className="space-y-2">
            {batchQueue.map((item, i) => (
              <div key={i} className={cn(
                "flex items-center gap-3 p-3 rounded-md border transition-colors",
                item.status === "done" ? "border-green-600/30 bg-green-600/5" :
                item.status === "error" ? "border-destructive/30 bg-destructive/5" :
                item.status === "running" ? "border-primary/30 bg-primary/5" :
                "border-border/40"
              )}>
                <div className="shrink-0">
                  {item.status === "done" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                   item.status === "error" ? <AlertCircle className="w-4 h-4 text-destructive" /> :
                   item.status === "running" ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> :
                   <Clock className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium">Ch. {item.chapterNum}</span>
                  <span className="text-sm text-muted-foreground ml-2">{item.chapterTitle}</span>
                  {item.errorMsg && <p className="text-xs text-destructive mt-0.5">{item.errorMsg}</p>}
                </div>
                <Badge variant="outline" className={cn(
                  "text-xs",
                  item.status === "done" ? "border-green-600 text-green-600" :
                  item.status === "error" ? "border-destructive text-destructive" :
                  item.status === "running" ? "border-primary text-primary" : ""
                )}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>

          {phase === "batch-done" && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                {errors === 0 ? `All ${done} chapters written and applied to your book.` : `${done} chapters complete, ${errors} failed.`}
              </p>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return null;
}
