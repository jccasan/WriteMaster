/**
 * ManuscriptEditor.tsx — structured issue tracker for manuscript editing
 */
import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, Sparkles, AlertCircle, Download,
  Wand2, FileText, Check, Copy, Upload, BookOpen,
  ChevronRight, X, SkipForward, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditorChapter { title: string; content: string; }

type IssueStatus = "open" | "done" | "skipped";
type IssueCategory = "Character" | "Plot" | "Timeline" | "Information" | "Prose" | "AI-Tell" | "Other";

interface Issue {
  id: number;
  category: IssueCategory;
  chapter: string;
  chapterIdx: number;
  problem: string;
  fix: string;
  quote: string;
  status: IssueStatus;
  applyResult?: string;
  applying?: boolean;
}

const CATEGORY_COLORS: Record<IssueCategory, string> = {
  Character:   "bg-purple-500/10 text-purple-600 border-purple-400/30",
  Plot:        "bg-amber-500/10 text-amber-600 border-amber-400/30",
  Timeline:    "bg-blue-500/10 text-blue-600 border-blue-400/30",
  Information: "bg-emerald-500/10 text-emerald-600 border-emerald-400/30",
  Prose:       "bg-rose-500/10 text-rose-600 border-rose-400/30",
  "AI-Tell":   "bg-orange-500/10 text-orange-600 border-orange-400/30",
  Other:       "bg-muted text-muted-foreground border-border",
};

function parseCategory(raw: string): IssueCategory {
  const s = raw.toLowerCase();
  if (s.includes("character")) return "Character";
  if (s.includes("plot")) return "Plot";
  if (s.includes("timeline") || s.includes("continuity")) return "Timeline";
  if (s.includes("information") || s.includes("info")) return "Information";
  if (s.includes("prose") || s.includes("passage") || s.includes("weak")) return "Prose";
  if (s.includes("ai") || s.includes("tell") || s.includes("banned")) return "AI-Tell";
  return "Other";
}

function resolveChapterIdx(chapterTitle: string, chapters: EditorChapter[]): number {
  if (!chapterTitle) return -1;
  const normalized = chapterTitle.toLowerCase().trim();
  return chapters.findIndex(ch =>
    ch.title.toLowerCase().includes(normalized) || normalized.includes(ch.title.toLowerCase())
  );
}

function parseContinuityOutput(text: string, chapters: EditorChapter[]): Issue[] {
  const issues: Issue[] = [];
  const blocks = text.split(/\n(?=\[\d+\]\.)/);
  for (const block of blocks) {
    const numMatch = block.match(/^\[(\d+)\]\./);
    if (!numMatch) continue;
    const id = parseInt(numMatch[1]);
    const category = block.match(/CATEGORY:\s*(.+)/i)?.[1]?.trim() ?? "Other";
    const chapter = block.match(/CHAPTER:\s*(.+)/i)?.[1]?.trim() ?? "";
    const problem = block.match(/PROBLEM:\s*([\s\S]+?)(?=\n\s+FIX:|$)/i)?.[1]?.trim() ?? "";
    const fix = block.match(/FIX:\s*([\s\S]+?)(?=\n\[|\n\n|$)/i)?.[1]?.trim() ?? "";
    const quoteMatch = problem.match(/"([^"]{10,})"/);
    if (problem || fix) {
      issues.push({ id, category: parseCategory(category), chapter, chapterIdx: resolveChapterIdx(chapter, chapters), problem, fix, quote: quoteMatch?.[1] ?? "", status: "open" });
    }
  }
  return issues;
}

function parseScanOutput(text: string, chapters: EditorChapter[], activeChapter: EditorChapter): Issue[] {
  const issues: Issue[] = [];
  const blocks = text.split(/\n(?=\[\d+\]\.)/);
  for (const block of blocks) {
    const numMatch = block.match(/^\[(\d+)\]\./);
    if (!numMatch) continue;
    const id = parseInt(numMatch[1]);
    const quote = block.match(/(?:LINE|ORIGINAL):\s*"([^"]+)"/i)?.[1]?.trim() ?? "";
    const category = block.match(/(?:CATEGORY|ISSUE):\s*(.+)/i)?.[1]?.trim() ?? "AI-Tell";
    const fix = block.match(/FIX:\s*([\s\S]+?)(?=\n\[|\n\n|$)/i)?.[1]?.trim() ?? "";
    if (quote || fix) {
      issues.push({ id, category: parseCategory(category), chapter: activeChapter.title, chapterIdx: chapters.findIndex(ch => ch.title === activeChapter.title), problem: quote ? `"${quote}"` : category, fix, quote, status: "open" });
    }
  }
  return issues;
}

// Upload screen
interface UploadProps { onParsed: (c: EditorChapter[]) => void; onBack: () => void; backLabel?: string; }
export function ManuscriptUpload({ onParsed, onBack, backLabel = "Back" }: UploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFile = useCallback(async (file: File) => {
    setUploading(true); setError(null);
    const form = new FormData(); form.append("file", file);
    try {
      const r = await fetch("/api/expand/upload", { method: "POST", body: form });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Upload failed");
      onParsed(data.chapters.map((ch: any, i: number) => ({ title: ch.title, content: data.chapter_contents[i] ?? "" })));
    } catch (err: any) { setError(err.message); }
    finally { setUploading(false); }
  }, [onParsed]);
  return (
    <div className="max-w-xl mx-auto py-10 animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"><ArrowLeft className="w-3.5 h-3.5" /> {backLabel}</button>
      <h2 className="text-2xl font-serif font-bold mb-2">Upload Manuscript</h2>
      <p className="text-muted-foreground text-sm mb-8">Upload your finished draft to edit and analyze it.</p>
      <div onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border/60 hover:border-primary/50 rounded-xl p-12 text-center cursor-pointer transition-all group">
        {uploading ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-sm">Parsing chapters...</p></div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
            <Upload className="w-8 h-8" />
            <div><p className="font-medium">Drop your manuscript here</p><p className="text-sm mt-1">or click to browse</p></div>
            <p className="text-xs text-muted-foreground/60 mt-2">.docx .txt .md .pdf</p>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept=".txt,.md,.docx,.pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
      {error && <p className="text-sm text-destructive mt-4">{error}</p>}
    </div>
  );
}

// Issue card
function IssueCard({ issue, isActive, onNavigate, onApplyFix, onMarkDone, onSkip, onApprove, onRejectFix }: {
  issue: Issue; isActive: boolean;
  onNavigate: () => void; onApplyFix: () => void;
  onMarkDone: () => void; onSkip: () => void;
  onApprove: (r: string) => void; onRejectFix: () => void;
}) {
  const [showFix, setShowFix] = useState(false);
  if (issue.status !== "open") return (
    <div className={cn("px-3 py-2 rounded-lg border flex items-center justify-between gap-2 text-xs",
      issue.status === "done" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600" : "bg-muted/20 border-border/40 text-muted-foreground line-through"
    )}>
      <span className="truncate">{issue.problem.slice(0, 60)}{issue.problem.length > 60 ? "..." : ""}</span>
      <Badge variant="outline" className="text-xs shrink-0 capitalize">{issue.status}</Badge>
    </div>
  );
  return (
    <div className={cn("rounded-lg border transition-all", isActive ? "border-primary/40 bg-primary/5" : "border-border/60")}>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn("text-xs border shrink-0", CATEGORY_COLORS[issue.category])}>{issue.category}</Badge>
          {issue.chapter && (
            <button onClick={onNavigate} className="text-xs text-primary hover:underline flex items-center gap-0.5 shrink-0">
              {issue.chapter.slice(0, 28)}{issue.chapter.length > 28 ? "..." : ""}<ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
        <p className="text-xs leading-relaxed text-foreground/80">{issue.problem}</p>
        {showFix && issue.fix && (
          <div className="bg-muted/30 rounded p-2 border border-border/40">
            <p className="text-xs font-medium text-muted-foreground mb-1">Fix:</p>
            <p className="text-xs leading-relaxed text-foreground/70">{issue.fix}</p>
          </div>
        )}
        {issue.applyResult && (
          <div className="space-y-2">
            <div className="bg-emerald-500/5 rounded p-2 border border-emerald-500/20">
              <p className="text-xs font-medium text-emerald-600 mb-1">Rewritten:</p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{issue.applyResult}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => onApprove(issue.applyResult!)}><Check className="w-3 h-3" /> Apply</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={onRejectFix}><X className="w-3 h-3" /> Discard</Button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap text-xs">
          <button onClick={() => setShowFix(!showFix)} className="text-muted-foreground hover:text-foreground">{showFix ? "Hide" : "Show"} fix</button>
          {issue.quote && !issue.applyResult && (
            <><span className="text-muted-foreground/30">·</span>
            <button onClick={onApplyFix} disabled={issue.applying} className="text-primary hover:underline flex items-center gap-1 disabled:opacity-50">
              {issue.applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Apply with AI
            </button></>
          )}
          <span className="text-muted-foreground/30">·</span>
          <button onClick={onMarkDone} className="text-emerald-600 hover:underline">Done</button>
          <span className="text-muted-foreground/30">·</span>
          <button onClick={onSkip} className="text-muted-foreground hover:underline">Skip</button>
        </div>
      </div>
    </div>
  );
}

// Main editor
interface EditorProps { initialChapters: EditorChapter[]; onBack: () => void; backLabel?: string; }
export function ManuscriptEditorView({ initialChapters, onBack, backLabel = "Back" }: EditorProps) {
  const [chapters, setChapters] = useState<EditorChapter[]>(initialChapters);
  const [activeIdx, setActiveIdx] = useState(0);
  const [aiPanel, setAiPanel] = useState<"none" | "issues" | "rewrite">("issues");
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueSource, setIssueSource] = useState<"continuity" | "scan" | null>(null);
  const [rewritePassage, setRewritePassage] = useState("");
  const [rewriteInstruction, setRewriteInstruction] = useState("");
  const [rewriteResult, setRewriteResult] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeChapter = chapters[activeIdx];
  const wordCount = activeChapter?.content.split(/\s+/).filter(Boolean).length ?? 0;
  const totalWords = chapters.reduce((sum, ch) => sum + ch.content.split(/\s+/).filter(Boolean).length, 0);
  const openIssues = issues.filter(i => i.status === "open");
  const doneIssues = issues.filter(i => i.status === "done");

  const updateContent = (idx: number, content: string) => setChapters(prev => prev.map((ch, i) => i === idx ? { ...ch, content } : ch));
  const updateIssue = (id: number, patch: Partial<Issue>) => setIssues(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

  const applyFixWithAI = async (issue: Issue) => {
    if (!issue.quote) return;
    updateIssue(issue.id, { applying: true });
    try {
      const r = await fetch("/api/edit-book/rewrite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passage: issue.quote, instruction: issue.fix, chapter_context: chapters[issue.chapterIdx >= 0 ? issue.chapterIdx : activeIdx]?.content.slice(0, 600) ?? "" }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      updateIssue(issue.id, { applying: false, applyResult: data.result });
    } catch (err: any) { setError(err.message); updateIssue(issue.id, { applying: false }); }
  };

  const approveAppliedFix = (issue: Issue, result: string) => {
    const targetIdx = issue.chapterIdx >= 0 ? issue.chapterIdx : activeIdx;
    const ch = chapters[targetIdx];
    if (!ch) return;
    updateContent(targetIdx, ch.content.replace(issue.quote, result));
    updateIssue(issue.id, { status: "done", applyResult: undefined });
  };

  const runContinuityCheck = async () => {
    setAiLoading("continuity"); setIssues([]); setIssueSource(null); setAiPanel("issues"); setError(null);
    try {
      const r = await fetch("/api/edit-book/continuity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chapters }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setIssues(parseContinuityOutput(data.result, chapters)); setIssueSource("continuity");
    } catch (err: any) { setError(err.message); }
    finally { setAiLoading(null); }
  };

  const runLineEdit = async () => {
    setAiLoading("line-edit"); setError(null);
    try {
      const r = await fetch("/api/edit-book/line-edit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chapter_title: activeChapter.title, content: activeChapter.content, style_notes: styleNotes }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      updateContent(activeIdx, data.result);
    } catch (err: any) { setError(err.message); }
    finally { setAiLoading(null); }
  };

  const runScan = async () => {
    setAiLoading("scan"); setIssues([]); setIssueSource(null); setAiPanel("issues"); setError(null);
    try {
      const r = await fetch("/api/edit-book/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chapter_title: activeChapter.title, content: activeChapter.content }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setIssues(parseScanOutput(data.result, chapters, activeChapter)); setIssueSource("scan");
    } catch (err: any) { setError(err.message); }
    finally { setAiLoading(null); }
  };

  const runRewrite = async () => {
    if (!rewritePassage.trim()) return;
    setAiLoading("rewrite"); setRewriteResult(""); setError(null);
    try {
      const r = await fetch("/api/edit-book/rewrite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passage: rewritePassage, instruction: rewriteInstruction, chapter_context: activeChapter.content.slice(0, 600) }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setRewriteResult(data.result);
    } catch (err: any) { setError(err.message); }
    finally { setAiLoading(null); }
  };

  const applyManualRewrite = () => {
    if (!rewriteResult || !rewritePassage) return;
    updateContent(activeIdx, activeChapter.content.replace(rewritePassage, rewriteResult));
    setRewritePassage(""); setRewriteInstruction(""); setRewriteResult(""); setAiPanel("none");
  };

  const exportManuscript = () => {
    const text = chapters.map(ch => `${ch.title}\n${"─".repeat(Math.min(ch.title.length, 40))}\n\n${ch.content}`).join("\n\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "manuscript-edited.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 h-11 border-b border-border/40 shrink-0 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground shrink-0"><ArrowLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium truncate">{activeChapter?.title}</span>
          <Badge variant="outline" className="text-xs shrink-0">{wordCount.toLocaleString()} w</Badge>
          <span className="text-xs text-muted-foreground/40 hidden sm:inline">{totalWords.toLocaleString()} total</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {error && <span className="text-xs text-destructive max-w-[180px] truncate">{error}</span>}
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={runContinuityCheck} disabled={!!aiLoading}>
            {aiLoading === "continuity" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />} Full Check
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={runLineEdit} disabled={!!aiLoading}>
            {aiLoading === "line-edit" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Line Edit
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={runScan} disabled={!!aiLoading}>
            {aiLoading === "scan" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} AI-Tells
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setAiPanel(aiPanel === "rewrite" ? "none" : "rewrite")}>
            <Wand2 className="w-3.5 h-3.5" /> Rewrite
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={exportManuscript}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-44 border-r border-border/40 flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{chapters.length} Ch.</p>
            {issues.length > 0 && (
              <Badge variant="outline" className={cn("text-xs", openIssues.length > 0 ? "border-amber-500/40 text-amber-600" : "border-emerald-500/40 text-emerald-600")}>
                {openIssues.length > 0 ? `${openIssues.length} open` : "All done"}
              </Badge>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {chapters.map((ch, i) => {
              const chIssues = issues.filter(iss => iss.chapterIdx === i && iss.status === "open");
              return (
                <button key={i} onClick={() => setActiveIdx(i)} className={cn("w-full text-left px-3 py-2.5 text-xs transition-colors border-b border-border/20 relative",
                  i === activeIdx ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground")}>
                  <p className="truncate pr-5">{ch.title}</p>
                  <p className="text-muted-foreground/50 mt-0.5">{ch.content.split(/\s+/).filter(Boolean).length.toLocaleString()} w</p>
                  {chIssues.length > 0 && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">{chIssues.length}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="p-2 border-t border-border/40">
            <Textarea value={styleNotes} onChange={e => setStyleNotes(e.target.value)} placeholder="Style notes..." className="text-xs resize-none min-h-[48px]" />
          </div>
        </div>

        <div className="flex flex-1 min-w-0 min-h-0">
          <textarea value={activeChapter?.content ?? ""} onChange={e => updateContent(activeIdx, e.target.value)}
            className="flex-1 w-full p-6 text-sm leading-relaxed font-sans bg-background resize-none focus:outline-none" spellCheck />

          {aiPanel !== "none" && (
            <div className="w-80 border-l border-border/40 flex flex-col shrink-0">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {aiPanel === "issues" ? (issueSource === "continuity" ? "Full Check" : issueSource === "scan" ? "AI-Tells" : "Issues") : "Rewrite"}
                  </p>
                  {aiPanel === "issues" && issues.length > 0 && (
                    <span className="text-xs text-muted-foreground">{doneIssues.length}/{issues.length} done</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {aiPanel === "issues" && issueSource && (
                    <button onClick={issueSource === "continuity" ? runContinuityCheck : runScan} className="text-muted-foreground hover:text-foreground" title="Re-run">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={() => setAiPanel("none")} className="text-muted-foreground hover:text-foreground ml-1"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {aiPanel === "issues" && issues.length > 0 && (
                <div className="px-3 pt-2 pb-1 shrink-0">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(doneIssues.length / issues.length) * 100}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{openIssues.length} remaining</span>
                    <button onClick={() => setIssues(prev => prev.map(i => ({ ...i, status: "skipped" as IssueStatus })))}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                      <SkipForward className="w-3 h-3" /> Skip all
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {aiPanel === "issues" && (
                  (aiLoading === "continuity" || aiLoading === "scan") ? (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground py-8 text-center">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <p className="text-sm">{aiLoading === "continuity" ? "Reading full manuscript..." : "Scanning chapter..."}</p>
                    </div>
                  ) : issues.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <BookOpen className="w-6 h-6 mx-auto text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">Run <strong>Full Check</strong> or <strong>AI-Tells</strong> to see issues here.</p>
                    </div>
                  ) : (
                    issues.map(issue => (
                      <IssueCard key={issue.id} issue={issue} isActive={issue.chapterIdx === activeIdx}
                        onNavigate={() => issue.chapterIdx >= 0 && setActiveIdx(issue.chapterIdx)}
                        onApplyFix={() => applyFixWithAI(issue)}
                        onMarkDone={() => updateIssue(issue.id, { status: "done" })}
                        onSkip={() => updateIssue(issue.id, { status: "skipped" })}
                        onApprove={result => approveAppliedFix(issue, result)}
                        onRejectFix={() => updateIssue(issue.id, { applyResult: undefined })}
                      />
                    ))
                  )
                )}

                {aiPanel === "rewrite" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Paste passage</label>
                      <Textarea value={rewritePassage} onChange={e => setRewritePassage(e.target.value)} placeholder="Exact text from editor..." className="resize-none min-h-[100px] text-xs" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Instruction (optional)</label>
                      <Textarea value={rewriteInstruction} onChange={e => setRewriteInstruction(e.target.value)} placeholder="e.g. 'shorter and more tense'" className="resize-none min-h-[56px] text-xs" />
                    </div>
                    <Button onClick={runRewrite} disabled={!rewritePassage.trim() || !!aiLoading} className="w-full gap-2 h-8 text-xs">
                      {aiLoading === "rewrite" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />} Rewrite
                    </Button>
                    {rewriteResult && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">Result</p>
                          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => { navigator.clipboard.writeText(rewriteResult); setCopied("rewrite"); setTimeout(() => setCopied(null), 2000); }}>
                            {copied === "rewrite" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-3 border border-border/40">{rewriteResult}</pre>
                        <Button onClick={applyManualRewrite} size="sm" className="w-full gap-1.5 h-8 text-xs"><Check className="w-3.5 h-3.5" /> Replace in editor</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
