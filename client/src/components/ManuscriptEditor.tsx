/**
 * ManuscriptEditor.tsx
 * Shared full-manuscript editor used by Romance Studio and Expand page.
 * Handles: chapter sidebar, editable textarea, AI toolbar,
 * continuity check, line edit, AI-tell scan, passage rewrite, export.
 */

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, Sparkles, AlertCircle, Download,
  Wand2, FileText, Check, Copy, Upload, BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditorChapter {
  title: string;
  content: string;
}

interface ManuscriptEditorProps {
  onBack: () => void;
  backLabel?: string;
}

// ─── FILE UPLOAD SCREEN ──────────────────────────────────────────────────────

interface UploadScreenProps {
  onParsed: (chapters: EditorChapter[]) => void;
  onBack: () => void;
  backLabel?: string;
}

export function ManuscriptUpload({ onParsed, onBack, backLabel = "Back" }: UploadScreenProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const r = await fetch("/api/expand/upload", { method: "POST", body: form });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Upload failed");
      const chapters: EditorChapter[] = data.chapters.map((ch: any, i: number) => ({
        title: ch.title,
        content: data.chapter_contents[i] ?? "",
      }));
      onParsed(chapters);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }, [onParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="max-w-xl mx-auto py-10 animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> {backLabel}
      </button>
      <h2 className="text-2xl font-serif font-bold mb-2">Upload Manuscript</h2>
      <p className="text-muted-foreground text-sm mb-8">Upload your finished draft to edit and analyze it.</p>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border/60 hover:border-primary/50 rounded-xl p-12 text-center cursor-pointer transition-all group"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Parsing chapters...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
            <Upload className="w-8 h-8" />
            <div>
              <p className="font-medium">Drop your manuscript here</p>
              <p className="text-sm mt-1">or click to browse</p>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2">.docx · .txt · .md · .pdf</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.docx,.pdf"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
      {error && <p className="text-sm text-destructive mt-4">{error}</p>}
    </div>
  );
}

// ─── EDITOR ──────────────────────────────────────────────────────────────────

interface EditorProps {
  initialChapters: EditorChapter[];
  onBack: () => void;
  backLabel?: string;
}

export function ManuscriptEditorView({ initialChapters, onBack, backLabel = "Back" }: EditorProps) {
  const [chapters, setChapters] = useState<EditorChapter[]>(initialChapters);
  const [activeIdx, setActiveIdx] = useState(0);
  const [aiPanel, setAiPanel] = useState<"none" | "continuity" | "scan" | "rewrite">("continuity");
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [continuityResult, setContinuityResult] = useState("");
  const [scanResult, setScanResult] = useState("");
  const [rewritePassage, setRewritePassage] = useState("");
  const [rewriteInstruction, setRewriteInstruction] = useState("");
  const [rewriteResult, setRewriteResult] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeChapter = chapters[activeIdx];
  const wordCount = activeChapter?.content.split(/\s+/).filter(Boolean).length ?? 0;
  const totalWords = chapters.reduce((sum, ch) => sum + ch.content.split(/\s+/).filter(Boolean).length, 0);

  const updateContent = (idx: number, content: string) => {
    setChapters(prev => prev.map((ch, i) => i === idx ? { ...ch, content } : ch));
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const runContinuityCheck = async () => {
    setAiLoading("continuity");
    setContinuityResult("");
    setAiPanel("continuity");
    setError(null);
    try {
      const r = await fetch("/api/edit-book/continuity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapters }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setContinuityResult(data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAiLoading(null);
    }
  };

  const runLineEdit = async () => {
    setAiLoading("line-edit");
    setError(null);
    try {
      const r = await fetch("/api/edit-book/line-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_title: activeChapter.title,
          content: activeChapter.content,
          style_notes: styleNotes,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      updateContent(activeIdx, data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAiLoading(null);
    }
  };

  const runScan = async () => {
    setAiLoading("scan");
    setScanResult("");
    setAiPanel("scan");
    setError(null);
    try {
      const r = await fetch("/api/edit-book/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_title: activeChapter.title, content: activeChapter.content }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setScanResult(data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAiLoading(null);
    }
  };

  const runRewrite = async () => {
    if (!rewritePassage.trim()) return;
    setAiLoading("rewrite");
    setRewriteResult("");
    setError(null);
    try {
      const r = await fetch("/api/edit-book/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage: rewritePassage,
          instruction: rewriteInstruction,
          chapter_context: activeChapter.content.slice(0, 600),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setRewriteResult(data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAiLoading(null);
    }
  };

  const applyRewrite = () => {
    if (!rewriteResult || !rewritePassage) return;
    const updated = activeChapter.content.replace(rewritePassage, rewriteResult);
    updateContent(activeIdx, updated);
    setRewritePassage("");
    setRewriteInstruction("");
    setRewriteResult("");
    setAiPanel("none");
  };

  const exportManuscript = () => {
    const text = chapters
      .map(ch => `${ch.title}\n${"─".repeat(Math.min(ch.title.length, 40))}\n\n${ch.content}`)
      .join("\n\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manuscript-edited.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border/40 shrink-0 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground shrink-0 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium truncate">{activeChapter?.title}</span>
          <Badge variant="outline" className="text-xs shrink-0">{wordCount.toLocaleString()} words</Badge>
          <span className="text-xs text-muted-foreground/50 hidden sm:inline">{totalWords.toLocaleString()} total</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {error && <span className="text-xs text-destructive">{error}</span>}
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={runContinuityCheck} disabled={!!aiLoading}>
            {aiLoading === "continuity" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />}
            Full Check
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={runLineEdit} disabled={!!aiLoading}>
            {aiLoading === "line-edit" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Line Edit
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={runScan} disabled={!!aiLoading}>
            {aiLoading === "scan" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            AI-Tells
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
            onClick={() => setAiPanel(aiPanel === "rewrite" ? "none" : "rewrite")}>
            <Wand2 className="w-3.5 h-3.5" /> Rewrite
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={exportManuscript}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-48 border-r border-border/40 flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-border/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {chapters.length} Chapter{chapters.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chapters.map((ch, i) => (
              <button key={i} onClick={() => { setActiveIdx(i); }}
                className={cn(
                  "w-full text-left px-3 py-2.5 text-xs transition-colors border-b border-border/20",
                  i === activeIdx
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <p className="truncate">{ch.title}</p>
                <p className="text-muted-foreground/50 mt-0.5">
                  {ch.content.split(/\s+/).filter(Boolean).length.toLocaleString()} w
                </p>
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-border/40">
            <p className="text-xs text-muted-foreground mb-1">Style notes</p>
            <Textarea value={styleNotes} onChange={e => setStyleNotes(e.target.value)}
              placeholder="voice, register, rules..." className="text-xs resize-none min-h-[56px]" />
          </div>
        </div>

        {/* Editor */}
        <div className="flex flex-1 min-w-0 min-h-0">
          <textarea
            value={activeChapter?.content ?? ""}
            onChange={e => updateContent(activeIdx, e.target.value)}
            className="flex-1 w-full p-6 text-sm leading-relaxed font-sans bg-background resize-none focus:outline-none"
            spellCheck
          />

          {/* AI panel */}
          {aiPanel !== "none" && (
            <div className="w-88 border-l border-border/40 flex flex-col shrink-0" style={{ width: "22rem" }}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 shrink-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {aiPanel === "continuity" ? "Manuscript Analysis" : aiPanel === "scan" ? "AI-Tell Scan" : "Rewrite Passage"}
                </p>
                <button onClick={() => setAiPanel("none")} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>

              {aiPanel === "continuity" && (
                <div className="flex-1 overflow-y-auto p-4">
                  {aiLoading === "continuity" ? (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground py-8 text-center">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <p className="text-sm">Reading all chapters...</p>
                      <p className="text-xs">Checking characters, plot, timeline, and prose quality.</p>
                    </div>
                  ) : continuityResult ? (
                    <div className="space-y-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 w-full justify-end"
                        onClick={() => copy(continuityResult, "continuity")}>
                        {copied === "continuity" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy all
                      </Button>
                      <pre className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/80">{continuityResult}</pre>
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-3">
                      <BookOpen className="w-6 h-6 mx-auto text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">Click <strong>Full Check</strong> to analyze the full manuscript for inconsistencies, plot holes, and weak passages.</p>
                    </div>
                  )}
                </div>
              )}

              {aiPanel === "scan" && (
                <div className="flex-1 overflow-y-auto p-4">
                  {aiLoading === "scan" ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                      <Loader2 className="w-4 h-4 animate-spin" /> Scanning...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 w-full justify-end"
                        onClick={() => copy(scanResult, "scan")}>
                        {copied === "scan" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                      </Button>
                      <pre className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/80">{scanResult}</pre>
                    </div>
                  )}
                </div>
              )}

              {aiPanel === "rewrite" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Paste passage to rewrite</label>
                    <Textarea value={rewritePassage} onChange={e => setRewritePassage(e.target.value)}
                      placeholder="Exact text from editor..." className="resize-none min-h-[100px] text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Instruction (optional)</label>
                    <Textarea value={rewriteInstruction} onChange={e => setRewriteInstruction(e.target.value)}
                      placeholder="e.g. 'shorter and more tense'" className="resize-none min-h-[56px] text-xs" />
                  </div>
                  <Button onClick={runRewrite} disabled={!rewritePassage.trim() || !!aiLoading} className="w-full gap-2 h-8 text-xs">
                    {aiLoading === "rewrite" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    Rewrite
                  </Button>
                  {rewriteResult && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Result</p>
                        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1"
                          onClick={() => copy(rewriteResult, "rewrite")}>
                          {copied === "rewrite" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                      <pre className="text-xs leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-3 border border-border/40">{rewriteResult}</pre>
                      <Button onClick={applyRewrite} size="sm" className="w-full gap-1.5 h-8 text-xs">
                        <Check className="w-3.5 h-3.5" /> Replace in editor
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
