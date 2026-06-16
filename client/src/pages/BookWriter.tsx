import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import RichTextEditor from "@/components/RichTextEditor";
import ProseText from "@/components/ProseText";
import ProseEditor from "@/components/ProseEditor";
import NarrativeSliders, { DEFAULT_SLIDERS, type NarrativeSliderValues } from "@/components/NarrativeSliders";
import {
  Loader2, ArrowLeft, BookOpen, Pencil, Check, X,
  ChevronLeft, ChevronRight, Download, Copy, FileText,
  Sparkles, RefreshCw, Lock, Unlock, GitCommit, Scissors,
  BarChart3, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";

interface ChapterAnalysis {
  type: "beta_reader" | "editorial_assessment" | "developmental_assessment";
  profile?: string;
  result: any;
  ran_at: string;
}

interface BookChapter {
  chapter_number: number;
  title: string;
  outline: string;
  content: string | null;
  summary: string | null;
  status: "outlined" | "writing" | "written" | "committed";
  sliders?: NarrativeSliderValues | null;
  analyses?: ChapterAnalysis[];
}

interface BookProject {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  source_project_id: string | null;
  brain_dump: string;
  dossier: string;
  chapters: BookChapter[];
}

const BETA_PROFILES = [
  { key: "genre_enthusiast", label: "Genre Enthusiast" },
  { key: "casual_commercial", label: "Casual Commercial" },
  { key: "emotion_first", label: "Emotion-First" },
  { key: "pacing_sensitive", label: "Pacing-Sensitive" },
  { key: "critical_craft", label: "Critical Craft" },
];

export default function BookWriter() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const bookId = params.id;

  const [book, setBook] = useState<BookProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<number>(0);
  const [generating, setGenerating] = useState<"outline" | "writing" | "summarizing" | "committing" | "analyzing" | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingOutline, setEditingOutline] = useState(false);
  const [outlineDraft, setOutlineDraft] = useState("");
  const [editingChapterTitle, setEditingChapterTitle] = useState(false);
  const [chapterTitleDraft, setChapterTitleDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [dossierExpanded, setDossierExpanded] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [autopilot, setAutopilot] = useState(false);
  const [autopilotStatus, setAutopilotStatus] = useState("");
  const autopilotCancelRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentDraftRef = useRef<string>("");

  const [rightPanelTab, setRightPanelTab] = useState<"summary" | "analysis">("summary");
  const [activeAnalysisType, setActiveAnalysisType] = useState<"beta_reader" | "editorial_assessment" | "developmental_assessment">("beta_reader");
  const [activeBetaProfile, setActiveBetaProfile] = useState("genre_enthusiast");
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const fetchBook = useCallback(async () => {
    if (!bookId) return;
    try {
      const res = await fetch(`/api/books/${bookId}`);
      if (!res.ok) throw new Error("Book not found");
      const data = await res.json();
      setBook(data);
      if (data.chapters.length > 0 && activeChapter === 0) {
        setActiveChapter(data.chapters.length);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, [bookId]);

  useEffect(() => {
    fetchBook();
  }, [fetchBook]);

  const currentChapter = book?.chapters.find(c => c.chapter_number === activeChapter) || null;

  useEffect(() => {
    setEditingContent(false);
    setEditingSummary(false);
    setEditingOutline(false);
    setEditingChapterTitle(false);
    setAnalyzeError(null);
  }, [activeChapter]);

  useEffect(() => {
    if (currentChapter?.status === "committed") {
      setRightPanelTab("analysis");
    } else {
      setRightPanelTab("summary");
    }
  }, [activeChapter, currentChapter?.status]);

  const saveBookUpdate = useCallback(async (updates: Partial<BookProject>) => {
    if (!bookId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/books/${bookId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const data = await res.json();
          setBook(data);
        } else {
          console.error("Failed to save book update");
        }
      } catch (err) {
        console.error("Save error:", err);
      }
    }, 300);
  }, [bookId]);

  const saveChapterUpdate = useCallback(async (chapterNum: number, updates: Partial<BookChapter>) => {
    if (!bookId) return;
    try {
      const res = await fetch(`/api/books/${bookId}/chapters/${chapterNum}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setBook(data.book);
      } else {
        setError("Failed to save chapter changes");
      }
    } catch (err) {
      console.error("Chapter save error:", err);
      setError("Failed to save chapter changes");
    }
  }, [bookId]);

  const handleGenerateOutline = async () => {
    if (!bookId) return;
    setGenerating("outline");
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/outline-chapter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate outline");
      }
      const data = await res.json();
      setBook(data.book);
      setActiveChapter(data.chapter.chapter_number);
    } catch (err: any) {
      setError(err.message);
    }
    setGenerating(null);
  };

  const handleWriteChapter = async () => {
    if (!bookId || !currentChapter) return;
    setGenerating("writing");
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/write-chapter/${currentChapter.chapter_number}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to write chapter");
      }
      const data = await res.json();
      setBook(data.book);
    } catch (err: any) {
      setError(err.message);
    }
    setGenerating(null);
  };

  const handleSummarize = async () => {
    if (!bookId || !currentChapter) return;
    setGenerating("summarizing");
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/summarize-chapter/${currentChapter.chapter_number}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to summarize chapter");
      }
      const data = await res.json();
      setBook(data.book);
    } catch (err: any) {
      setError(err.message);
    }
    setGenerating(null);
  };

  const handleCommitChapter = async () => {
    if (!bookId || !currentChapter) return;
    setGenerating("committing");
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/commit-chapter/${currentChapter.chapter_number}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to commit chapter");
      }
      const data = await res.json();
      setBook(data.book);
      setRightPanelTab("analysis");
    } catch (err: any) {
      setError(err.message);
    }
    setGenerating(null);
  };

  const handleUnlockChapter = async () => {
    if (!bookId || !currentChapter) return;
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/unlock-chapter/${currentChapter.chapter_number}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unlock chapter");
      }
      const data = await res.json();
      setBook(data.book);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRunAnalysis = async () => {
    if (!bookId || !currentChapter) return;
    setGenerating("analyzing");
    setAnalyzeError(null);
    try {
      const body: any = { analysisType: activeAnalysisType };
      if (activeAnalysisType === "beta_reader") body.betaProfile = activeBetaProfile;
      const res = await fetch(`/api/books/${bookId}/analyze-chapter/${currentChapter.chapter_number}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }
      const data = await res.json();
      setBook(data.book);
    } catch (err: any) {
      setAnalyzeError(err.message);
    }
    setGenerating(null);
  };

  const handleAutopilot = async (maxChapters: number = 32) => {
    if (!bookId || !book) return;
    autopilotCancelRef.current = false;
    setAutopilot(true);
    setError(null);

    try {
      let currentBook = book!;
      let chaptersWritten = 0;

      while (chaptersWritten < maxChapters) {
        if (autopilotCancelRef.current) break;

        const lastCh = currentBook.chapters[currentBook.chapters.length - 1];
        const lastChIsComplete = !lastCh || lastCh.status === "committed";
        const needsOutline = lastChIsComplete;
        const needsWrite = lastCh && lastCh.status === "outlined";
        const needsCommit = lastCh && lastCh.status === "written";

        if (needsOutline) {
          const nextNum = (lastCh?.chapter_number || 0) + 1;
          setAutopilotStatus(`Outlining chapter ${nextNum}...`);
          setGenerating("outline");
          const res = await fetch(`/api/books/${bookId}/outline-chapter`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to generate outline");
          }
          const data = await res.json();
          currentBook = data.book;
          setBook(data.book);
          setActiveChapter(data.chapter.chapter_number);
          setGenerating(null);
        } else if (needsWrite) {
          setAutopilotStatus(`Writing chapter ${lastCh.chapter_number}...`);
          setGenerating("writing");
          const res = await fetch(`/api/books/${bookId}/write-chapter/${lastCh.chapter_number}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to write chapter");
          }
          const data = await res.json();
          currentBook = data.book;
          setBook(data.book);
          setGenerating(null);
        } else if (needsCommit) {
          setAutopilotStatus(`Committing chapter ${lastCh.chapter_number}...`);
          setGenerating("committing");
          const res = await fetch(`/api/books/${bookId}/commit-chapter/${lastCh.chapter_number}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to commit chapter");
          }
          const data = await res.json();
          currentBook = data.book;
          setBook(data.book);
          setGenerating(null);
          chaptersWritten++;
        } else {
          break;
        }

        if (autopilotCancelRef.current) break;
      }
    } catch (err: any) {
      setError(err.message);
    }

    setGenerating(null);
    setAutopilot(false);
    setAutopilotStatus("");
  };

  const handleStopAutopilot = () => {
    autopilotCancelRef.current = true;
    setAutopilotStatus("Stopping after current step...");
  };

  const handleCopyChapter = () => {
    if (!currentChapter?.content) return;
    navigator.clipboard.writeText(currentChapter.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBook = () => {
    if (!book) return;
    const allText = book.chapters
      .filter(c => c.content)
      .sort((a, b) => a.chapter_number - b.chapter_number)
      .map(c => c.content)
      .join("\n\n---\n\n");
    const blob = new Blob([allText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${book.title.replace(/[^a-zA-Z0-9 ]/g, "").trim()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveTitle = () => {
    if (titleDraft.trim() && book) {
      setBook({ ...book, title: titleDraft.trim() });
      setEditingTitle(false);
      saveBookUpdate({ title: titleDraft.trim() });
    }
  };

  const saveOutline = () => {
    if (currentChapter && outlineDraft.trim()) {
      setEditingOutline(false);
      saveChapterUpdate(currentChapter.chapter_number, { outline: outlineDraft.trim() });
    }
  };

  const saveChapterTitle = () => {
    if (currentChapter && chapterTitleDraft.trim()) {
      setEditingChapterTitle(false);
      saveChapterUpdate(currentChapter.chapter_number, { title: chapterTitleDraft.trim() });
    }
  };

  const canGenerateNext = book && (
    book.chapters.length === 0 ||
    book.chapters[book.chapters.length - 1].status === "committed"
  );

  const getChapterAnalysis = (chapter: BookChapter, type: string, profile?: string) => {
    if (!chapter.analyses) return null;
    return chapter.analyses.find(a =>
      a.type === type && (type !== "beta_reader" || a.profile === profile)
    ) || null;
  };


  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error && !book) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate("/my-work")}>Back to My Work</Button>
      </div>
    </div>
  );

  if (!book) return null;

  const isCommitted = currentChapter?.status === "committed";
  const isWritten = currentChapter?.status === "written";
  const isOutlined = currentChapter?.status === "outlined" || currentChapter?.status === "writing";
  const wordCount = currentChapter?.content
    ? currentChapter.content.split(/\s+/).filter(Boolean).length
    : 0;

  const writtenChapters = book.chapters.filter(c => c.content).length;
  const totalWords = book.chapters
    .filter(c => c.content)
    .reduce((sum, c) => sum + (c.content?.split(/\s+/).filter(Boolean).length ?? 0), 0);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/my-work")} className="gap-1.5 h-8 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                className="h-8 text-base font-serif font-bold w-64"
                autoFocus
              />
              <Button size="sm" onClick={saveTitle} className="h-7"><Check className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)} className="h-7"><X className="w-3.5 h-3.5" /></Button>
            </div>
          ) : (
            <button
              onClick={() => { setEditingTitle(true); setTitleDraft(book.title); }}
              className="text-base font-serif font-bold hover:text-primary transition-colors"
            >
              {book.title}
            </button>
          )}
          {/* Book stats */}
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
            <span>{writtenChapters}/{book.chapters.length} chapters</span>
            {totalWords > 0 && <span>{totalWords.toLocaleString()} words</span>}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {book.dossier && (
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-primary"
              onClick={() => navigate(`/book/${bookId}/build`)} title="Expand dossier">
              <Sparkles className="w-3.5 h-3.5" /> Expand
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs text-muted-foreground"
            onClick={() => navigate(`/book/${bookId}/write-advanced`)} title="Advanced chapter writer">
            <BarChart3 className="w-3.5 h-3.5" /> Advanced
          </Button>
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs text-muted-foreground"
            onClick={handleDownloadBook} title="Download as .txt">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR: Chapter navigation ────────────────────────── */}
        <aside className="w-52 shrink-0 border-r border-border/40 bg-muted/10 flex flex-col overflow-hidden">
          <div className="p-3 flex-1 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Chapters</p>
            <div className="space-y-0.5">
              {book.chapters.map(ch => (
                <button
                  key={ch.chapter_number}
                  onClick={() => setActiveChapter(ch.chapter_number)}
                  className={cn(
                    "w-full text-left px-2 py-2 rounded text-xs transition-colors group flex items-center gap-1.5",
                    activeChapter === ch.chapter_number
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="font-mono text-muted-foreground/60 w-5 text-right shrink-0">{ch.chapter_number}</span>
                  <span className="truncate flex-1">{ch.title}</span>
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", {
                    "bg-blue-500": ch.status === "committed",
                    "bg-green-500": ch.status === "written" && ch.summary,
                    "bg-amber-400": ch.status === "written" && !ch.summary,
                    "bg-muted-foreground/30": ch.status === "outlined" || ch.status === "writing",
                  })} />
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar footer actions */}
          <div className="p-3 border-t border-border/40 space-y-2 shrink-0">
            <Button size="sm" variant="outline" className="w-full text-xs gap-1 h-8"
              onClick={handleGenerateOutline} disabled={!canGenerateNext || generating !== null}>
              {generating === "outline" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              {generating === "outline" ? "Generating..." : "Next Chapter"}
            </Button>
            {autopilot ? (
              <div className="space-y-1.5">
                <p className="text-xs text-primary text-center animate-pulse">{autopilotStatus}</p>
                <Button size="sm" variant="destructive" className="w-full text-xs h-7 gap-1" onClick={handleStopAutopilot}>
                  <X className="w-3 h-3" /> Stop
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" className="w-full text-xs h-8 gap-1 text-muted-foreground"
                onClick={() => handleAutopilot()} disabled={generating !== null || (!canGenerateNext && !currentChapter)}>
                <RefreshCw className="w-3 h-3" /> Write Remaining
              </Button>
            )}
          </div>
        </aside>

        {/* ── MAIN AREA: Chapter management ───────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {!currentChapter ? (
            // ── EMPTY STATE ─────────────────────────────────────────────
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-serif font-semibold mb-2">
                {book.chapters.length === 0 ? "Ready to Start" : "Select a Chapter"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                {book.chapters.length === 0
                  ? "Your dossier is loaded. Generate the outline for Chapter 1 to begin."
                  : "Select a chapter from the sidebar to manage it."}
              </p>
              {book.chapters.length === 0 && (
                <Button onClick={handleGenerateOutline} disabled={generating !== null} className="gap-2">
                  {generating === "outline" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate Chapter 1 Outline
                </Button>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

              {/* ── CHAPTER HEADER ──────────────────────────────────────── */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">Ch. {currentChapter.chapter_number}</span>
                    <Badge variant="outline" className={cn("text-xs h-5 px-2", {
                      "border-blue-500 text-blue-600": isCommitted,
                      "border-green-600 text-green-600": isWritten,
                      "border-muted-foreground/40 text-muted-foreground": isOutlined,
                    })}>
                      {isCommitted ? <><Lock className="w-2.5 h-2.5 mr-1" />Committed</> :
                       isWritten ? "Written" : "Outlined"}
                    </Badge>
                    {isWritten && wordCount > 0 && (
                      <span className="text-xs text-muted-foreground">{wordCount.toLocaleString()} words</span>
                    )}
                  </div>
                  {editingChapterTitle ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={chapterTitleDraft}
                        onChange={e => setChapterTitleDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveChapterTitle(); if (e.key === "Escape") setEditingChapterTitle(false); }}
                        className="h-9 text-xl font-serif font-semibold"
                        autoFocus
                      />
                      <Button size="sm" onClick={saveChapterTitle}><Check className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingChapterTitle(false)}><X className="w-3.5 h-3.5" /></Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingChapterTitle(true); setChapterTitleDraft(currentChapter.title); }}
                      className="text-xl font-serif font-semibold hover:text-primary transition-colors text-left"
                    >
                      {currentChapter.title}
                    </button>
                  )}
                </div>

                {/* Navigation arrows */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                    onClick={() => setActiveChapter(currentChapter.chapter_number - 1)}
                    disabled={currentChapter.chapter_number <= 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                    onClick={() => setActiveChapter(currentChapter.chapter_number + 1)}
                    disabled={currentChapter.chapter_number >= book.chapters.length}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* ── OUTLINE ─────────────────────────────────────────────── */}
              <Card className="border-border/60">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outline</span>
                    {!isCommitted && !editingOutline && (
                      <Button size="sm" variant="ghost" className="h-6 text-xs gap-1"
                        onClick={() => { setEditingOutline(true); setOutlineDraft(currentChapter.outline ?? ""); }}>
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>
                    )}
                    {editingOutline && (
                      <div className="flex gap-1">
                        <Button size="sm" className="h-6 text-xs gap-1" onClick={saveOutline}>
                          <Check className="w-3 h-3" /> Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingOutline(false)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    {editingOutline ? (
                      <Textarea
                        value={outlineDraft}
                        onChange={e => setOutlineDraft(e.target.value)}
                        className="resize-none text-sm min-h-[140px] font-sans"
                        placeholder="Write the chapter outline..."
                        autoFocus
                      />
                    ) : currentChapter.outline ? (
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{currentChapter.outline}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No outline yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── SUMMARY ─────────────────────────────────────────────── */}
              {(isWritten || isCommitted) && (
                <Card className="border-border/60">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</span>
                      <div className="flex gap-1">
                        {!isCommitted && currentChapter.content && (
                          <Button size="sm" variant="ghost" className="h-6 text-xs gap-1"
                            onClick={handleSummarize} disabled={generating === "summarizing"}>
                            {generating === "summarizing" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            {currentChapter.summary ? "Regenerate" : "Generate"}
                          </Button>
                        )}
                        {!isCommitted && currentChapter.summary && !editingSummary && (
                          <Button size="sm" variant="ghost" className="h-6 text-xs gap-1"
                            onClick={() => setEditingSummary(true)}>
                            <Pencil className="w-3 h-3" /> Edit
                          </Button>
                        )}
                        {editingSummary && (
                          <div className="flex gap-1">
                            <Button size="sm" className="h-6 text-xs gap-1"
                              onClick={() => { saveChapterUpdate(currentChapter.chapter_number, { summary: outlineDraft }); setEditingSummary(false); }}>
                              <Check className="w-3 h-3" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingSummary(false)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      {editingSummary ? (
                        <Textarea
                          defaultValue={currentChapter.summary ?? ""}
                          onChange={e => setOutlineDraft(e.target.value)}
                          className="resize-none text-sm min-h-[120px]"
                          autoFocus
                        />
                      ) : currentChapter.summary ? (
                        <p className="text-sm text-foreground/80 leading-relaxed">{currentChapter.summary}</p>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground mb-3">No summary yet.</p>
                          {currentChapter.content && (
                            <Button size="sm" variant="outline" className="gap-2"
                              onClick={handleSummarize} disabled={generating === "summarizing"}>
                              {generating === "summarizing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                              Generate Summary
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── ACTION BAR ──────────────────────────────────────────── */}
              <div className={cn(
                "rounded-xl border p-4 space-y-3",
                isCommitted ? "border-blue-500/20 bg-blue-500/5" :
                isWritten ? "border-green-600/20 bg-green-600/5" :
                "border-primary/20 bg-primary/5"
              )}>
                {/* Primary action */}
                {isCommitted ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm text-blue-700 flex-1">
                      <Lock className="w-4 h-4" />
                      <span>This chapter is committed and locked.</span>
                    </div>
                    <Button size="sm" variant="outline" className="gap-2 h-8"
                      onClick={handleUnlockChapter}>
                      <Unlock className="w-3.5 h-3.5" /> Unlock
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-2 h-8"
                      onClick={() => navigate(`/book/${bookId}/write/${currentChapter.chapter_number}`)}>
                      View
                    </Button>
                  </div>
                ) : isWritten ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      onClick={() => navigate(`/book/${bookId}/write/${currentChapter.chapter_number}`)}
                      className="gap-2 h-9">
                      <Pencil className="w-3.5 h-3.5" /> Continue Writing
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2 h-9"
                      onClick={() => navigate(`/book/${bookId}/line-edit/${currentChapter.chapter_number}`)}>
                      <GitCommit className="w-3.5 h-3.5" /> Line Edit
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2 h-9"
                      onClick={() => { sessionStorage.setItem("analyzer_import_text", currentChapter.content || ""); navigate("/chapter-analyzer"); }}>
                      <Scissors className="w-3.5 h-3.5" /> Analyze
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2 h-9"
                      onClick={handleCopyChapter}>
                      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <div className="flex-1" />
                    <Button size="sm" variant="ghost" className="gap-2 h-9 text-muted-foreground"
                      onClick={handleCommitChapter} disabled={generating === "committing"}>
                      {generating === "committing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                      Commit
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      onClick={() => navigate(`/book/${bookId}/write/${currentChapter.chapter_number}`)}
                      className="gap-2 h-9">
                      <Pencil className="w-3.5 h-3.5" /> Write Chapter
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2 h-9 text-primary border-primary/40"
                      onClick={() => navigate(`/book/${bookId}/write-advanced`)}
                      title="Advanced 14-step pipeline">
                      <Sparkles className="w-3.5 h-3.5" /> AI Write
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2 h-9"
                      onClick={handleWriteChapter} disabled={generating === "writing"}>
                      {generating === "writing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                      {generating === "writing" ? "Writing..." : "Quick Write"}
                    </Button>
                  </div>
                )}
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
