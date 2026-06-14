import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import RichTextEditor from "@/components/RichTextEditor";
import ProseText from "@/components/ProseText";
import NarrativeSliders, { DEFAULT_SLIDERS, type NarrativeSliderValues } from "@/components/NarrativeSliders";
import {
  Loader2,
  ArrowLeft,
  BookOpen,
  Pencil,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  FileText,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Scissors,
  Lock,
  Unlock,
  GitCommit,
  Users,
  ClipboardList,
  BarChart3,
  BookMarked,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => navigate("/books")}>Back to Books</Button>
        </div>
      </div>
    );
  }

  if (!book) return null;

  const isCommitted = currentChapter?.status === "committed";

  return (
    <Layout fullScreen>
      <div className="border-b border-border/40 bg-background/95 px-4 h-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/books")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            data-testid="button-back-books"
          >
            <ArrowLeft className="w-4 h-4" /> Books
          </button>
          <span className="text-border">|</span>
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="text-lg font-serif font-bold h-9 w-64"
                onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                autoFocus
                data-testid="input-book-title"
              />
              <Button size="sm" variant="ghost" onClick={saveTitle} className="h-8 w-8 p-0">
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <h1
              className="font-serif font-semibold text-lg tracking-tight cursor-pointer hover:text-primary/80 transition-colors group flex items-center gap-1"
              onClick={() => { setTitleDraft(book.title); setEditingTitle(true); }}
              data-testid="text-book-title"
            >
              <BookOpen className="w-4 h-4 text-primary" />
              {book.title}
              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {book.chapters.filter(c => c.status === "written" || c.status === "committed").length}/{book.chapters.length} chapters written
            {book.chapters.filter(c => c.status === "committed").length > 0 && (
              <> · {book.chapters.filter(c => c.status === "committed").length} committed</>
            )}
          </span>
          {(book.dossier && book.chapters.some(c => c.status === "written")) && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/publishing/blurbs/${bookId}`)}
                className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                data-testid="button-publishing-blurbs"
              >
                <BookMarked className="w-3.5 h-3.5" /> Blurb
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/publishing/titles-keywords/${bookId}`)}
                className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                data-testid="button-publishing-titles"
              >
                <BookMarked className="w-3.5 h-3.5" /> Title & Keywords
              </Button>
            </>
          )}
          {book.dossier && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/book/${bookId}/build`)}
              className="gap-1 text-xs text-muted-foreground hover:text-primary"
              data-testid="button-pipeline2"
              title="Pipeline 2 — Expand dossier into Character Sheet, World-Building, and Chapter Outline"
            >
              <Sparkles className="w-3.5 h-3.5" /> Expand
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/book/${bookId}/write-advanced`)}
            className="gap-1 text-xs text-muted-foreground hover:text-primary"
            data-testid="button-advanced-write-header"
            title="Advanced Writer — 14-step chapter pipeline"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Advanced
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadBook}
            disabled={!book.chapters.some(c => c.content)}
            className="gap-1"
            data-testid="button-download-book"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR — Chapter Navigation */}
        <aside className="w-56 shrink-0 border-r border-border/40 bg-muted/20 overflow-y-auto">
          <div className="p-3">
            <button
              onClick={() => setDossierExpanded(!dossierExpanded)}
              className="w-full text-left text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between hover:text-foreground transition-colors"
              data-testid="button-toggle-dossier"
            >
              Story Dossier
              {dossierExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {dossierExpanded && (
              <div className="mb-3 text-xs text-foreground/70 bg-background border border-border/40 rounded p-2 max-h-60 overflow-y-auto">
                <ProseText
                  text={book.dossier.substring(0, 2000) + (book.dossier.length > 2000 ? "..." : "")}
                  paragraphClassName="mb-1.5"
                />
              </div>
            )}

            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Chapters
            </div>
            <div className="space-y-1">
              {book.chapters.map((ch) => (
                <button
                  key={ch.chapter_number}
                  onClick={() => setActiveChapter(ch.chapter_number)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded text-sm transition-colors",
                    activeChapter === ch.chapter_number
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  )}
                  data-testid={`button-chapter-nav-${ch.chapter_number}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-muted-foreground w-4">{ch.chapter_number}</span>
                    <span className="truncate flex-1 text-xs">{ch.title}</span>
                    {ch.status === "committed" && (
                      <Lock className="w-3 h-3 text-blue-500 shrink-0" />
                    )}
                    {ch.status === "written" && ch.summary && (
                      <Check className="w-3 h-3 text-green-500 shrink-0" />
                    )}
                    {ch.status === "written" && !ch.summary && (
                      <div className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
                    )}
                    {ch.status === "outlined" && (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateOutline}
              disabled={!canGenerateNext || generating !== null}
              className="w-full mt-3 gap-1 text-xs"
              data-testid="button-generate-next-outline"
            >
              {generating === "outline" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              {generating === "outline" ? "Generating..." : "Next Chapter"}
            </Button>

            {autopilot ? (
              <div className="mt-2 space-y-2">
                <div className="text-xs text-primary font-medium text-center animate-pulse" data-testid="text-autopilot-status">
                  {autopilotStatus}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStopAutopilot}
                  className="w-full gap-1 text-xs"
                  data-testid="button-autopilot-stop"
                >
                  <X className="w-3 h-3" /> Stop Autopilot
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAutopilot()}
                disabled={generating !== null || (!canGenerateNext && !(currentChapter && (currentChapter.status === "outlined" || currentChapter.status === "written")))}
                className="w-full mt-1 gap-1 text-xs text-muted-foreground"
                data-testid="button-autopilot-sidebar"
              >
                <RefreshCw className="w-3 h-3" /> Write Remaining
              </Button>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT — Split View */}
        <div className="flex-1 flex min-w-0">
          {/* LEFT PANEL — Chapter Content */}
          <div className="flex-1 min-w-0 overflow-y-auto border-r border-border/20">
            {!currentChapter ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-serif font-semibold text-foreground mb-2">
                  {book.chapters.length === 0 ? "Ready to Start Writing" : "Select a Chapter"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  {book.chapters.length === 0
                    ? "Your dossier and brain dump are loaded. Click the button below to generate the outline for Chapter 1."
                    : "Choose a chapter from the sidebar or generate the next one."}
                </p>
                {book.chapters.length === 0 && (
                  <div className="flex flex-col gap-2 items-center">
                    <Button
                      onClick={handleGenerateOutline}
                      disabled={generating !== null}
                      className="gap-2"
                      data-testid="button-start-chapter-1"
                    >
                      {generating === "outline" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {generating === "outline" ? "Generating Outline..." : "Generate Chapter 1 Outline"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAutopilot()}
                      disabled={generating !== null}
                      className="gap-2"
                      data-testid="button-autopilot-start"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Write Entire Book
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 max-w-3xl mx-auto">
                {/* Chapter Title */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Chapter {currentChapter.chapter_number}
                    </span>
                    {currentChapter.status === "outlined" && (
                      <Badge variant="secondary" className="text-xs py-0 h-5" data-testid="badge-status-outlined">Outlined</Badge>
                    )}
                    {currentChapter.status === "writing" && (
                      <Badge className="text-xs py-0 h-5 bg-yellow-500/10 text-yellow-600 border-yellow-500/20" data-testid="badge-status-writing">Writing...</Badge>
                    )}
                    {currentChapter.status === "written" && (
                      <Badge className="text-xs py-0 h-5 bg-green-500/10 text-green-600 border-green-500/20" data-testid="badge-status-written">Written</Badge>
                    )}
                    {currentChapter.status === "committed" && (
                      <Badge className="text-xs py-0 h-5 bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1" data-testid="badge-status-committed">
                        <Lock className="w-2.5 h-2.5" /> Committed
                      </Badge>
                    )}
                  </div>
                  {editingChapterTitle ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={chapterTitleDraft}
                        onChange={(e) => setChapterTitleDraft(e.target.value)}
                        className="text-2xl font-serif font-bold h-10"
                        onKeyDown={(e) => e.key === "Enter" && saveChapterTitle()}
                        autoFocus
                        data-testid="input-chapter-title"
                      />
                      <Button size="sm" variant="ghost" onClick={saveChapterTitle} className="h-8 w-8 p-0">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingChapterTitle(false)} className="h-8 w-8 p-0">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <h2
                      className={cn(
                        "text-2xl font-serif font-bold text-foreground flex items-center gap-2",
                        !isCommitted && "cursor-pointer hover:text-primary/80 transition-colors group"
                      )}
                      onClick={() => {
                        if (!isCommitted) { setChapterTitleDraft(currentChapter.title); setEditingChapterTitle(true); }
                      }}
                    >
                      {currentChapter.title}
                      {!isCommitted && <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />}
                    </h2>
                  )}
                </div>

                {/* Outline Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Outline</h3>
                    {!editingOutline && currentChapter.status === "outlined" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setOutlineDraft(currentChapter.outline); setEditingOutline(true); }}
                        className="h-7 gap-1 text-xs"
                        data-testid="button-edit-outline"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>
                    )}
                  </div>
                  {editingOutline ? (
                    <div className="space-y-2">
                      <Textarea
                        value={outlineDraft}
                        onChange={(e) => setOutlineDraft(e.target.value)}
                        className="min-h-[200px] text-sm resize-y"
                        data-testid="input-outline"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setEditingOutline(false)}>Cancel</Button>
                        <Button size="sm" onClick={saveOutline} data-testid="button-save-outline">Save Outline</Button>
                      </div>
                    </div>
                  ) : (
                    <Card className="border-border/40 bg-muted/20">
                      <CardContent className="p-4">
                        <ProseText
                          text={currentChapter.outline}
                          className="text-sm text-foreground/80"
                          paragraphClassName="mb-2"
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Narrative Sliders — before writing */}
                {currentChapter.status === "outlined" && !editingOutline && (
                  <NarrativeSliders
                    values={currentChapter.sliders || DEFAULT_SLIDERS}
                    onChange={(newSliders) => {
                      saveChapterUpdate(currentChapter.chapter_number, { sliders: newSliders });
                    }}
                  />
                )}

                {/* Write Chapter Button */}
                {currentChapter.status === "outlined" && !editingOutline && (
                  <Button
                    onClick={handleWriteChapter}
                    disabled={generating !== null}
                    className="w-full h-12 gap-2 mb-6"
                    data-testid="button-write-chapter"
                  >
                    {generating === "writing" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Writing Chapter... (this may take a minute)
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Write This Chapter
                      </>
                    )}
                  </Button>
                )}

                {/* Writing Spinner */}
                {generating === "writing" && currentChapter.status !== "written" && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-lg text-muted-foreground font-serif">Writing chapter...</p>
                    <p className="text-sm text-muted-foreground">Claude is crafting your prose</p>
                  </div>
                )}

                {/* Chapter Content */}
                {currentChapter.content && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Chapter Text</h3>
                      <div className="flex items-center gap-1">
                        {isCommitted ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleUnlockChapter}
                            className="h-7 gap-1 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-50"
                            data-testid="button-unlock-chapter"
                          >
                            <Unlock className="w-3 h-3" /> Unlock to Edit
                          </Button>
                        ) : (
                          <>
                            {editingContent ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => {
                                    saveChapterUpdate(currentChapter.chapter_number, { content: contentDraftRef.current });
                                    setEditingContent(false);
                                  }}
                                  className="h-7 gap-1 text-xs"
                                  data-testid="button-save-content"
                                >
                                  <Check className="w-3 h-3" /> Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingContent(false)}
                                  className="h-7 gap-1 text-xs"
                                >
                                  <X className="w-3 h-3" /> Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    contentDraftRef.current = currentChapter.content || "";
                                    setEditingContent(true);
                                  }}
                                  className="h-7 gap-1 text-xs"
                                  data-testid="button-edit-content"
                                >
                                  <Pencil className="w-3 h-3" /> Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCopyChapter}
                                  className="h-7 gap-1 text-xs"
                                  data-testid="button-copy-chapter"
                                >
                                  {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                  {copied ? "Copied" : "Copy"}
                                </Button>
                                {currentChapter.content && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      sessionStorage.setItem("analyzer_import_text", currentChapter.content || "");
                                      navigate("/chapter-analyzer");
                                    }}
                                    className="h-7 gap-1 text-xs"
                                    data-testid="button-analyze-chapter"
                                  >
                                    <Scissors className="w-3 h-3" /> Analyze
                                  </Button>
                                )}
                                {currentChapter.outline && currentChapter.status !== "committed" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => navigate(`/book/${bookId}/write-advanced`)}
                                    className="h-7 gap-1 text-xs text-primary hover:text-primary"
                                    data-testid="button-advanced-write"
                                    title="Write this chapter using the 14-step advanced pipeline"
                                  >
                                    <Sparkles className="w-3 h-3" /> Advanced Write
                                  </Button>
                                )}
                                {currentChapter.content && currentChapter.status !== "committed" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => navigate(`/book/${bookId}/line-edit/${currentChapter.chapter_number}`)}
                                    className="h-7 gap-1 text-xs"
                                    data-testid="button-line-edit"
                                    title="Run the 7-step line editing pipeline to remove AI-isms"
                                  >
                                    <GitCommit className="w-3 h-3" /> Line Edit
                                  </Button>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {isCommitted && (
                      <div className="mb-3 flex items-center gap-2 p-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs text-blue-700">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>This chapter is committed and locked. Click "Unlock to Edit" to make changes.</span>
                      </div>
                    )}

                    <RichTextEditor
                      content={currentChapter.content}
                      readOnly={!editingContent || isCommitted}
                      onChange={(_html, plain) => {
                        contentDraftRef.current = plain;
                      }}
                      maxHeight="600px"
                      minHeight="300px"
                      placeholder="Chapter content..."
                      data-testid="editor-chapter-content"
                    />
                  </div>
                )}

                {/* Commit Button — shown when written and has content, not yet committed */}
                {currentChapter.status === "written" && currentChapter.content && !editingContent && (
                  <div className="mb-6 p-4 border border-border/40 rounded-lg bg-muted/10">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">Ready to commit this chapter?</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Committing auto-generates a continuity summary, locks the chapter, and unlocks the next chapter prompt.
                        </p>
                      </div>
                      <Button
                        onClick={handleCommitChapter}
                        disabled={generating !== null}
                        className="gap-2 ml-4 bg-blue-600 hover:bg-blue-700 text-white"
                        data-testid="button-commit-chapter"
                      >
                        {generating === "committing" ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Committing...
                          </>
                        ) : (
                          <>
                            <GitCommit className="w-4 h-4" />
                            Commit Chapter
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Chapter Navigation */}
                <div className="flex gap-3 pt-4 border-t border-border/30">
                  {currentChapter.chapter_number > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveChapter(currentChapter.chapter_number - 1)}
                      className="gap-1"
                    >
                      <ChevronLeft className="w-3 h-3" /> Previous
                    </Button>
                  )}
                  <div className="flex-1" />
                  {book.chapters.find(c => c.chapter_number === currentChapter.chapter_number + 1) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveChapter(currentChapter.chapter_number + 1)}
                      className="gap-1"
                    >
                      Next <ChevronRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL — Summary & Analysis */}
          <div className="w-80 shrink-0 overflow-y-auto bg-muted/10">
            {currentChapter ? (
              <div className="p-4">
                {/* Tab switcher */}
                <div className="flex gap-1 mb-4 bg-muted/40 rounded-lg p-1">
                  <button
                    onClick={() => setRightPanelTab("summary")}
                    className={cn(
                      "flex-1 text-xs py-1.5 px-2 rounded-md transition-colors font-medium",
                      rightPanelTab === "summary"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    data-testid="tab-summary"
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => setRightPanelTab("analysis")}
                    className={cn(
                      "flex-1 text-xs py-1.5 px-2 rounded-md transition-colors font-medium flex items-center justify-center gap-1",
                      rightPanelTab === "analysis"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                      !isCommitted && "opacity-50"
                    )}
                    data-testid="tab-analysis"
                    title={!isCommitted ? "Commit the chapter to run analysis" : undefined}
                  >
                    <BarChart3 className="w-3 h-3" /> Analysis
                  </button>
                </div>

                {rightPanelTab === "summary" && (
                  <>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      Chapter {currentChapter.chapter_number} Summary
                    </h3>

                    {currentChapter.status === "written" && !currentChapter.summary && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2">
                          Generate a summary so the next chapter can build on this one. Or commit the chapter to auto-generate it.
                        </p>
                        <Button
                          onClick={handleSummarize}
                          disabled={generating !== null}
                          size="sm"
                          className="w-full gap-1"
                          data-testid="button-summarize"
                        >
                          {generating === "summarizing" ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" /> Summarizing...
                            </>
                          ) : (
                            <>
                              <FileText className="w-3 h-3" /> Generate Summary
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {currentChapter.summary ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1 mb-1">
                          {editingSummary ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  saveChapterUpdate(currentChapter.chapter_number, { summary: contentDraftRef.current });
                                  setEditingSummary(false);
                                }}
                                className="h-6 gap-1 text-[10px]"
                                data-testid="button-save-summary"
                              >
                                <Check className="w-3 h-3" /> Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingSummary(false)}
                                className="h-6 gap-1 text-[10px]"
                              >
                                <X className="w-3 h-3" /> Cancel
                              </Button>
                            </>
                          ) : !isCommitted ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                contentDraftRef.current = currentChapter.summary || "";
                                setEditingSummary(true);
                              }}
                              className="h-6 gap-1 text-[10px]"
                              data-testid="button-edit-summary"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </Button>
                          ) : null}
                        </div>
                        <RichTextEditor
                          content={currentChapter.summary}
                          readOnly={!editingSummary}
                          onChange={(_html, plain) => {
                            contentDraftRef.current = plain;
                          }}
                          maxHeight="500px"
                          minHeight="100px"
                          placeholder="Chapter summary..."
                          className="text-xs"
                          data-testid="editor-chapter-summary"
                        />
                        {currentChapter.status === "written" && currentChapter.summary && currentChapter.chapter_number === book.chapters.length && (
                          <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded text-xs text-amber-700">
                            Commit this chapter to unlock the next chapter outline.
                          </div>
                        )}
                        {currentChapter.status === "committed" && currentChapter.chapter_number === book.chapters.length && (
                          <Button
                            onClick={handleGenerateOutline}
                            disabled={generating !== null}
                            size="sm"
                            className="w-full gap-1"
                            data-testid="button-next-chapter-from-committed"
                          >
                            {generating === "outline" ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" /> Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3" /> Generate Next Chapter Outline
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    ) : currentChapter.status === "outlined" ? (
                      <div className="text-center py-8">
                        <FileText className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          Summary will appear here after the chapter is written and summarized.
                        </p>
                      </div>
                    ) : null}

                    {/* Previous Chapter Summaries */}
                    {currentChapter.chapter_number > 1 && (
                      <div className="mt-6 pt-4 border-t border-border/30">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Previous Chapters
                        </h4>
                        <div className="space-y-2">
                          {book.chapters
                            .filter(c => c.chapter_number < currentChapter.chapter_number && c.summary)
                            .sort((a, b) => b.chapter_number - a.chapter_number)
                            .map(c => (
                              <details key={c.chapter_number} className="text-xs">
                                <summary className="cursor-pointer text-foreground/60 hover:text-foreground transition-colors py-1">
                                  Ch. {c.chapter_number}: {c.title}
                                </summary>
                                <div className="mt-1 pl-3 border-l-2 border-border/30 text-foreground/50 max-h-40 overflow-y-auto">
                                  <ProseText text={c.summary} paragraphClassName="mb-1" />
                                </div>
                              </details>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {rightPanelTab === "analysis" && (
                  <div>
                    {!isCommitted ? (
                      <div className="text-center py-12">
                        <Lock className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-sm font-medium text-foreground mb-1">Chapter Not Yet Committed</p>
                        <p className="text-xs text-muted-foreground">
                          Commit the chapter to run FORGE analysis: beta readers, editorial assessment, and developmental assessment.
                        </p>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Chapter Analysis
                        </h3>

                        {/* Analysis Type Selector */}
                        <div className="space-y-1 mb-3">
                          <button
                            onClick={() => setActiveAnalysisType("beta_reader")}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2",
                              activeAnalysisType === "beta_reader"
                                ? "bg-primary/10 text-primary"
                                : "text-foreground/70 hover:bg-muted hover:text-foreground"
                            )}
                            data-testid="button-analysis-type-beta"
                          >
                            <Users className="w-3.5 h-3.5" /> Beta Readers
                            {currentChapter.analyses?.some(a => a.type === "beta_reader") && (
                              <Check className="w-3 h-3 text-green-500 ml-auto" />
                            )}
                          </button>
                          <button
                            onClick={() => setActiveAnalysisType("editorial_assessment")}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2",
                              activeAnalysisType === "editorial_assessment"
                                ? "bg-primary/10 text-primary"
                                : "text-foreground/70 hover:bg-muted hover:text-foreground"
                            )}
                            data-testid="button-analysis-type-editorial"
                          >
                            <ClipboardList className="w-3.5 h-3.5" /> Editorial Assessment
                            {currentChapter.analyses?.some(a => a.type === "editorial_assessment") && (
                              <Check className="w-3 h-3 text-green-500 ml-auto" />
                            )}
                          </button>
                          <button
                            onClick={() => setActiveAnalysisType("developmental_assessment")}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2",
                              activeAnalysisType === "developmental_assessment"
                                ? "bg-primary/10 text-primary"
                                : "text-foreground/70 hover:bg-muted hover:text-foreground"
                            )}
                            data-testid="button-analysis-type-developmental"
                          >
                            <BarChart3 className="w-3.5 h-3.5" /> Developmental Assessment
                            {currentChapter.analyses?.some(a => a.type === "developmental_assessment") && (
                              <Check className="w-3 h-3 text-green-500 ml-auto" />
                            )}
                          </button>
                        </div>

                        {/* Beta Profile Picker */}
                        {activeAnalysisType === "beta_reader" && (
                          <div className="mb-3">
                            <label className="text-xs text-muted-foreground mb-1 block">Reader Persona</label>
                            <select
                              value={activeBetaProfile}
                              onChange={(e) => setActiveBetaProfile(e.target.value)}
                              className="w-full text-xs border border-border/50 rounded-md px-2 py-1.5 bg-background text-foreground"
                              data-testid="select-beta-profile"
                            >
                              {BETA_PROFILES.map(p => (
                                <option key={p.key} value={p.key}>{p.label}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Run Analysis Button */}
                        <Button
                          onClick={handleRunAnalysis}
                          disabled={generating !== null}
                          size="sm"
                          className="w-full gap-1 mb-4"
                          data-testid="button-run-analysis"
                        >
                          {generating === "analyzing" ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              {activeAnalysisType === "beta_reader"
                                ? `Run ${BETA_PROFILES.find(p => p.key === activeBetaProfile)?.label || "Beta Reader"}`
                                : activeAnalysisType === "editorial_assessment"
                                  ? "Run Editorial Assessment"
                                  : "Run Developmental Assessment"}
                            </>
                          )}
                        </Button>

                        {analyzeError && (
                          <div className="mb-3 p-2 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded" data-testid="text-analyze-error">
                            {analyzeError}
                          </div>
                        )}

                        {/* Analysis Results */}
                        {activeAnalysisType === "beta_reader" && (() => {
                          const analysis = getChapterAnalysis(currentChapter, "beta_reader", activeBetaProfile);
                          if (!analysis) return (
                            <div className="text-center py-6 text-xs text-muted-foreground" data-testid="text-no-analysis">
                              No beta reader results yet. Run the analysis above.
                            </div>
                          );
                          const r = analysis.result;
                          return (
                            <div className="space-y-3 text-xs" data-testid="panel-beta-reader-results">
                              <div className="text-[10px] text-muted-foreground">
                                {r.profileName} · {new Date(analysis.ran_at).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full font-medium text-[10px]",
                                  r.wouldKeepReading
                                    ? "bg-green-500/10 text-green-700"
                                    : "bg-red-500/10 text-red-700"
                                )} data-testid="text-beta-would-keep-reading">
                                  {r.wouldKeepReading ? "Would Keep Reading" : "Might Not Continue"}
                                </span>
                              </div>
                              {r.hookedAt && (
                                <div>
                                  <p className="font-medium text-foreground mb-0.5">Hooked At</p>
                                  <p className="text-foreground/70" data-testid="text-beta-hooked-at">{r.hookedAt}</p>
                                </div>
                              )}
                              {r.attentionSaggedAt && (
                                <div>
                                  <p className="font-medium text-foreground mb-0.5">Attention Sagged At</p>
                                  <p className="text-foreground/70" data-testid="text-beta-sag">{r.attentionSaggedAt}</p>
                                </div>
                              )}
                              {r.strongestMoments?.length > 0 && (
                                <div>
                                  <p className="font-medium text-foreground mb-0.5">Strongest Moments</p>
                                  <ul className="space-y-0.5" data-testid="list-beta-strongest">
                                    {r.strongestMoments.map((m: string, i: number) => (
                                      <li key={i} className="text-foreground/70 flex gap-1"><span className="text-green-500">•</span>{m}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {r.confusionPoints?.length > 0 && (
                                <div>
                                  <p className="font-medium text-foreground mb-0.5">Confusion Points</p>
                                  <ul className="space-y-0.5" data-testid="list-beta-confusion">
                                    {r.confusionPoints.map((m: string, i: number) => (
                                      <li key={i} className="text-foreground/70 flex gap-1"><span className="text-yellow-500">•</span>{m}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {r.finalEmotionalReaction && (
                                <div>
                                  <p className="font-medium text-foreground mb-0.5">Final Reaction</p>
                                  <p className="text-foreground/70" data-testid="text-beta-final-reaction">{r.finalEmotionalReaction}</p>
                                </div>
                              )}
                              {r.recommendation && (
                                <div className="p-2 bg-muted/30 rounded text-foreground/80 italic" data-testid="text-beta-recommendation">
                                  "{r.recommendation}"
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {activeAnalysisType === "editorial_assessment" && (() => {
                          const analysis = getChapterAnalysis(currentChapter, "editorial_assessment");
                          if (!analysis) return (
                            <div className="text-center py-6 text-xs text-muted-foreground" data-testid="text-no-editorial-analysis">
                              No editorial assessment yet. Run the analysis above.
                            </div>
                          );
                          const r = analysis.result;
                          return (
                            <div className="space-y-3 text-xs" data-testid="panel-editorial-results">
                              <div className="text-[10px] text-muted-foreground">
                                Editorial Assessment · {new Date(analysis.ran_at).toLocaleDateString()}
                              </div>
                              {r.overallImpression && (
                                <div className="p-2 bg-muted/30 rounded text-foreground/80" data-testid="text-editorial-impression">
                                  {r.overallImpression}
                                </div>
                              )}
                              {r.strengths?.length > 0 && (
                                <div>
                                  <p className="font-medium text-foreground mb-0.5">Strengths</p>
                                  <ul className="space-y-0.5" data-testid="list-editorial-strengths">
                                    {r.strengths.map((s: string, i: number) => (
                                      <li key={i} className="text-foreground/70 flex gap-1"><span className="text-green-500">+</span>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {r.weaknesses?.length > 0 && (
                                <div>
                                  <p className="font-medium text-foreground mb-0.5">Weaknesses</p>
                                  <ul className="space-y-0.5" data-testid="list-editorial-weaknesses">
                                    {r.weaknesses.map((s: string, i: number) => (
                                      <li key={i} className="text-foreground/70 flex gap-1"><span className="text-red-400">−</span>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {r.continuityNotes?.length > 0 && (
                                <div>
                                  <p className="font-medium text-foreground mb-0.5">Continuity Notes</p>
                                  <ul className="space-y-0.5" data-testid="list-editorial-continuity">
                                    {r.continuityNotes.map((s: string, i: number) => (
                                      <li key={i} className="text-foreground/70 flex gap-1"><span className="text-blue-400">·</span>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {r.issues?.length > 0 && (
                                <div>
                                  <p className="font-medium text-foreground mb-0.5">Issues</p>
                                  <div className="space-y-1.5" data-testid="list-editorial-issues">
                                    {r.issues.map((issue: any, i: number) => (
                                      <div key={i} className={cn(
                                        "p-2 rounded border text-[10px]",
                                        issue.severity === "critical" && "border-red-400/40 bg-red-500/5",
                                        issue.severity === "major" && "border-orange-400/40 bg-orange-500/5",
                                        issue.severity === "moderate" && "border-yellow-400/40 bg-yellow-500/5",
                                        issue.severity === "minor" && "border-border/40 bg-muted/20",
                                      )}>
                                        <div className="flex items-center gap-1 mb-0.5">
                                          <span className="font-medium">{issue.title}</span>
                                          <span className="text-muted-foreground">({issue.severity})</span>
                                        </div>
                                        <p className="text-foreground/70">{issue.description}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {activeAnalysisType === "developmental_assessment" && (() => {
                          const analysis = getChapterAnalysis(currentChapter, "developmental_assessment");
                          if (!analysis) return (
                            <div className="text-center py-6 text-xs text-muted-foreground" data-testid="text-no-developmental-analysis">
                              No developmental assessment yet. Run the analysis above.
                            </div>
                          );
                          const r = analysis.result;
                          const ratingColor = (rating: string) => {
                            if (rating === "strong" || rating === "high") return "text-green-600";
                            if (rating === "adequate" || rating === "medium") return "text-yellow-600";
                            return "text-red-500";
                          };
                          return (
                            <div className="space-y-3 text-xs" data-testid="panel-developmental-results">
                              <div className="text-[10px] text-muted-foreground">
                                Developmental Assessment · {new Date(analysis.ran_at).toLocaleDateString()}
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { label: "Pacing", value: r.pacing },
                                  { label: "Stakes", value: r.stakes },
                                  { label: "Causality", value: r.causality },
                                ].map(({ label, value }) => (
                                  value && (
                                    <div key={label} className="p-2 bg-muted/30 rounded text-center" data-testid={`text-dev-${label.toLowerCase()}`}>
                                      <p className="text-muted-foreground text-[10px] mb-0.5">{label}</p>
                                      <p className={cn("font-semibold capitalize", ratingColor(value.rating))}>{value.rating}</p>
                                    </div>
                                  )
                                ))}
                              </div>
                              {r.pacing?.notes && <p className="text-foreground/70" data-testid="text-dev-pacing-notes"><span className="font-medium text-foreground">Pacing: </span>{r.pacing.notes}</p>}
                              {r.stakes?.notes && <p className="text-foreground/70" data-testid="text-dev-stakes-notes"><span className="font-medium text-foreground">Stakes: </span>{r.stakes.notes}</p>}
                              {r.causality?.notes && <p className="text-foreground/70" data-testid="text-dev-causality-notes"><span className="font-medium text-foreground">Causality: </span>{r.causality.notes}</p>}
                              {r.characterArcs?.length > 0 && (
                                <div>
                                  <p className="font-medium text-foreground mb-0.5">Character Arcs</p>
                                  <div className="space-y-1" data-testid="list-dev-character-arcs">
                                    {r.characterArcs.map((arc: any, i: number) => (
                                      <div key={i} className="flex gap-1">
                                        <span className="font-medium text-foreground shrink-0">{arc.character}:</span>
                                        <span className="text-foreground/70">{arc.arc}</span>
                                        <span className={cn("ml-auto shrink-0 text-[10px]", ratingColor(arc.strength))}>{arc.strength}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {r.sceneByScene?.length > 0 && (
                                <div>
                                  <p className="font-medium text-foreground mb-0.5">Scene Analysis</p>
                                  <div className="space-y-1.5" data-testid="list-dev-scene-analysis">
                                    {r.sceneByScene.map((scene: any, i: number) => (
                                      <div key={i} className="p-2 bg-muted/20 rounded text-[10px]">
                                        <div className="flex items-center justify-between mb-0.5">
                                          <span className="font-medium">Scene {scene.sceneIndex + 1}</span>
                                          <span className={cn(
                                            "px-1 py-0.5 rounded text-[9px] font-medium",
                                            scene.rating === "essential" && "bg-green-500/10 text-green-700",
                                            scene.rating === "strong" && "bg-blue-500/10 text-blue-700",
                                            scene.rating === "useful_but_weak" && "bg-yellow-500/10 text-yellow-700",
                                            scene.rating === "underperforming" && "bg-orange-500/10 text-orange-700",
                                            scene.rating === "redundant" && "bg-red-500/10 text-red-700",
                                          )}>{scene.rating?.replace(/_/g, " ")}</span>
                                        </div>
                                        <p className="text-foreground/70">{scene.purpose}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {r.thematicNotes?.length > 0 && (
                                <div>
                                  <p className="font-medium text-foreground mb-0.5">Thematic Notes</p>
                                  <ul className="space-y-0.5" data-testid="list-dev-thematic-notes">
                                    {r.thematicNotes.map((n: string, i: number) => (
                                      <li key={i} className="text-foreground/70 flex gap-1"><span className="text-purple-400">·</span>{n}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center pt-16">
                <FileText className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Select or generate a chapter to see its summary here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-2 rounded-lg shadow-lg z-50 max-w-lg" data-testid="text-error">
          {error}
          <button onClick={() => setError(null)} className="ml-3 font-medium hover:underline">Dismiss</button>
        </div>
      )}
    </Layout>
  );
}

function Plus(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  );
}
