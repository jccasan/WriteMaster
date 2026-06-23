import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileText, ChevronRight, Loader2, Sparkles,
  Check, Copy, ArrowLeft, SkipForward, BookOpen,
  Layers, PlusCircle, RefreshCw, Replace
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "upload" | "select" | "interview" | "mode" | "writing" | "result";

interface ChapterSummary {
  index: number;
  title: string;
  word_count: number;
  preview: string;
}

interface ExpandAnswer {
  question: string;
  answer: string;
}

const INTEGRATION_MODES = [
  {
    id: "integrate" as const,
    icon: <Layers className="w-5 h-5" />,
    label: "Integrate",
    description: "Rewrite the whole chapter, weaving new material into the existing text. Preserves what's working.",
  },
  {
    id: "prepend" as const,
    icon: <PlusCircle className="w-5 h-5" />,
    label: "Prepend",
    description: "Write a new section that comes before the existing chapter. Flows naturally into what's there.",
  },
  {
    id: "append" as const,
    icon: <PlusCircle className="w-5 h-5 rotate-180" />,
    label: "Append",
    description: "Write a new section that comes after the existing chapter. Continues from where it ends.",
  },
  {
    id: "replace" as const,
    icon: <Replace className="w-5 h-5" />,
    label: "Replace",
    description: "Write a completely new version from scratch using your interview answers as the brief.",
  },
];

export default function Expand() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("upload");
  const [uploading, setUploading] = useState(false);
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [chapterContents, setChapterContents] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<ChapterSummary | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState<ExpandAnswer[]>([]);
  const [interviewDone, setInterviewDone] = useState(false);
  const [integrationMode, setIntegrationMode] = useState<"integrate" | "prepend" | "append" | "replace" | null>(null);
  const [writing, setWriting] = useState(false);
  const [result, setResult] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const r = await fetch("/api/expand/upload", { method: "POST", body: form });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Upload failed");
      setChapters(data.chapters);
      setChapterContents(data.chapter_contents);
      setStep("select");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const selectChapter = async (chapter: ChapterSummary) => {
    setSelectedChapter(chapter);
    setError(null);
    try {
      const r = await fetch("/api/expand/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_title: chapter.title,
          chapter_content: chapterContents[chapter.index] ?? "",
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to start session");
      setSessionId(data.session_id);
      setCurrentQuestion(data.question);
      setQuestionNumber(data.question_number);
      setTotalQuestions(data.total_questions);
      setStep("interview");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submitAnswer = async (skip = false) => {
    if (!sessionId || submitting) return;
    if (!skip && !currentAnswer.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const endpoint = skip
        ? `/api/expand/session/${sessionId}/skip`
        : `/api/expand/session/${sessionId}/answer`;
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: currentAnswer.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to submit answer");

      if (!skip) {
        setAnswers(prev => [...prev, { question: currentQuestion, answer: currentAnswer.trim() }]);
      }
      setCurrentAnswer("");

      if (data.done) {
        setInterviewDone(true);
        setStep("mode");
      } else {
        setCurrentQuestion(data.question);
        setQuestionNumber(data.question_number);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startWriting = async () => {
    if (!sessionId || !integrationMode) return;
    setWriting(true);
    setStep("writing");
    setError(null);
    try {
      const r = await fetch(`/api/expand/session/${sessionId}/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration_mode: integrationMode }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Writing failed");
      setResult(data.result);
      setStep("result");
    } catch (err: any) {
      setError(err.message);
      setStep("mode");
    } finally {
      setWriting(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    if (sessionId) fetch(`/api/expand/session/${sessionId}`, { method: "DELETE" }).catch(() => {});
    setStep("upload");
    setChapters([]);
    setChapterContents([]);
    setSelectedChapter(null);
    setSessionId(null);
    setCurrentQuestion("");
    setCurrentAnswer("");
    setAnswers([]);
    setInterviewDone(false);
    setIntegrationMode(null);
    setResult("");
    setError(null);
  };

  // ── STEP: UPLOAD ────────────────────────────────────────────────────────────
  if (step === "upload") return (
    <Layout>
      <div className="max-w-xl mx-auto py-10 animate-in fade-in duration-300">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Home
        </button>
        <h1 className="text-3xl font-serif font-bold mb-2">Expand a Chapter</h1>
        <p className="text-muted-foreground mb-8">Upload your book, pick a chapter, and let AI help you expand or rewrite it.</p>

        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border/60 hover:border-primary/50 rounded-xl p-12 text-center cursor-pointer transition-all group"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Parsing your file...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
              <Upload className="w-8 h-8" />
              <div>
                <p className="font-medium">Drop your book here</p>
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
            onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />
        </div>

        {error && <p className="text-sm text-destructive mt-4">{error}</p>}
      </div>
    </Layout>
  );

  // ── STEP: SELECT CHAPTER ────────────────────────────────────────────────────
  if (step === "select") return (
    <Layout>
      <div className="max-w-2xl mx-auto py-10 animate-in fade-in duration-300">
        <button onClick={() => setStep("upload")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Upload different file
        </button>
        <h1 className="text-2xl font-serif font-bold mb-2">Select a Chapter</h1>
        <p className="text-muted-foreground mb-6">Found {chapters.length} chapter{chapters.length !== 1 ? "s" : ""}. Pick the one you want to expand.</p>

        <div className="space-y-2">
          {chapters.map(ch => (
            <button
              key={ch.index}
              onClick={() => selectChapter(ch)}
              className="w-full text-left p-4 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-muted/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{ch.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ch.preview}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">{ch.word_count.toLocaleString()} words</Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-destructive mt-4">{error}</p>}
      </div>
    </Layout>
  );

  // ── STEP: INTERVIEW ─────────────────────────────────────────────────────────
  if (step === "interview") return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-12 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Chapter Interview</span>
          <Badge variant="outline" className="text-xs">
            {questionNumber} / {totalQuestions}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{selectedChapter?.title}</span>
          {questionNumber > 1 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={() => setStep("mode")}
            >
              Skip to writing
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border/40 shrink-0">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((questionNumber - 1) / totalQuestions) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-6 py-8 gap-6 overflow-y-auto">
        {/* Prior answers */}
        {answers.length > 0 && (
          <div className="space-y-3">
            {answers.map((a, i) => (
              <div key={i} className="space-y-1">
                <p className="text-xs text-muted-foreground">{a.question}</p>
                <p className="text-sm bg-muted/30 rounded-lg px-3 py-2">{a.answer}</p>
              </div>
            ))}
          </div>
        )}

        {/* Current question */}
        <div className="space-y-4">
          <p className="text-base font-medium leading-relaxed">{currentQuestion}</p>
          <Textarea
            value={currentAnswer}
            onChange={e => setCurrentAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAnswer(); } }}
            placeholder="Your answer... (Enter to continue, Shift+Enter for new line)"
            className="resize-none min-h-[100px] text-sm"
            disabled={submitting}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => submitAnswer(false)}
              disabled={submitting || !currentAnswer.trim()}
              className="gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {questionNumber < totalQuestions ? "Next Question" : "Finish Interview"}
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => submitAnswer(true)}
              disabled={submitting}
              className="gap-1.5 text-muted-foreground text-xs"
            >
              <SkipForward className="w-3.5 h-3.5" /> Skip
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── STEP: MODE SELECTION ────────────────────────────────────────────────────
  if (step === "mode") return (
    <Layout>
      <div className="max-w-xl mx-auto py-10 animate-in fade-in duration-300">
        <button onClick={() => setStep("interview")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to interview
        </button>
        <h1 className="text-2xl font-serif font-bold mb-2">How should AI integrate the new content?</h1>
        <p className="text-muted-foreground mb-6">This controls what you get back.</p>

        <div className="grid gap-3 mb-6">
          {INTEGRATION_MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => setIntegrationMode(mode.id)}
              className={cn(
                "text-left p-4 rounded-xl border-2 transition-all",
                integrationMode === mode.id
                  ? "border-primary bg-primary/5"
                  : "border-border/60 hover:border-primary/40 hover:bg-muted/20"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-1.5 rounded-lg shrink-0 transition-colors",
                  integrationMode === mode.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {mode.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{mode.label}</p>
                    {integrationMode === mode.id && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{mode.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        <Button
          onClick={startWriting}
          disabled={!integrationMode || writing}
          size="lg"
          className="w-full gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Write It
        </Button>
      </div>
    </Layout>
  );

  // ── STEP: WRITING ───────────────────────────────────────────────────────────
  if (step === "writing") return (
    <Layout>
      <div className="max-w-xl mx-auto py-20 text-center animate-in fade-in duration-300">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <h2 className="text-xl font-serif font-semibold mb-2">Writing your chapter...</h2>
        <p className="text-sm text-muted-foreground">
          {integrationMode === "integrate" && "Weaving new material into the existing text."}
          {integrationMode === "prepend" && "Writing the new opening section."}
          {integrationMode === "append" && "Writing the new closing section."}
          {integrationMode === "replace" && "Writing a fresh version from your brief."}
        </p>
      </div>
    </Layout>
  );

  // ── STEP: RESULT ────────────────────────────────────────────────────────────
  if (step === "result") return (
    <Layout>
      <div className="max-w-3xl mx-auto py-8 animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold">{selectedChapter?.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {INTEGRATION_MODES.find(m => m.id === integrationMode)?.label} · {result.split(/\s+/).filter(Boolean).length.toLocaleString()} words
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyResult}
              className={cn("gap-1.5 h-8", copied && "text-green-600 border-green-600")}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("mode")}
              className="gap-1.5 h-8"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try different mode
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="gap-1.5 h-8"
            >
              <FileText className="w-3.5 h-3.5" />
              New chapter
            </Button>
          </div>
        </div>

        <div className="prose prose-sm max-w-none bg-muted/20 rounded-xl border border-border/60 p-6">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground m-0">
            {result}
          </pre>
        </div>
      </div>
    </Layout>
  );

  return null;
}
