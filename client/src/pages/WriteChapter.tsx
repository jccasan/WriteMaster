import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import ProseEditor from "@/components/ProseEditor";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ChevronLeft, ChevronRight, List, Sparkles,
  Scissors, BookOpen, Loader2, X, GitCommit
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BookChapter {
  chapter_number: number;
  title: string;
  outline: string | null;
  content: string | null;
  summary: string | null;
  status: "outlined" | "writing" | "written" | "committed";
}

interface BookProject {
  id: string;
  title: string;
  chapters: BookChapter[];
  dossier?: string;
}

export default function WriteChapter() {
  const params = useParams<{ id: string; chapterNum: string }>();
  const [, navigate] = useLocation();
  const bookId = params.id;
  const chapterNum = parseInt(params.chapterNum ?? "1");

  const [book, setBook] = useState<BookProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"outline" | "chapters">("outline");
  const [wordCountGoal, setWordCountGoal] = useState<number | undefined>(undefined);

  const load = useCallback(async () => {
    if (!bookId) return;
    const r = await fetch(`/api/books/${bookId}`);
    if (r.ok) setBook(await r.json());
    setLoading(false);
  }, [bookId]);

  useEffect(() => { load(); }, [load]);

  const chapter = book?.chapters.find(c => c.chapter_number === chapterNum);
  const prevChapter = book?.chapters.find(c => c.chapter_number === chapterNum - 1);
  const nextChapter = book?.chapters.find(c => c.chapter_number === chapterNum + 1);
  const isCommitted = chapter?.status === "committed";

  const saveContent = useCallback(async (plain: string) => {
    if (!bookId || !chapterNum) return;
    await fetch(`/api/books/${bookId}/chapters/${chapterNum}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: plain, status: "written" }),
    });
    // Refresh book state silently
    const r = await fetch(`/api/books/${bookId}`);
    if (r.ok) setBook(await r.json());
  }, [bookId, chapterNum]);

  const handleAiAction = useCallback(async (action: string, selectedText: string, context: string) => {
    const r = await fetch("/api/ai/prose-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        selected_text: selectedText,
        context,
        chapter_title: chapter?.title ?? "",
      }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error ?? "AI action failed");
    return d.result;
  }, [chapter]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!book || !chapter) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <p className="text-muted-foreground">Chapter not found.</p>
        <Button variant="outline" onClick={() => navigate(`/book/${bookId}`)}>Back to Book</Button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-border/40 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/book/${bookId}`)}
          className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2 h-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">{book.title}</span>
        </Button>

        <div className="h-4 w-px bg-border/40" />

        {/* Chapter navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => prevChapter && navigate(`/book/${bookId}/write/${prevChapter.chapter_number}`)}
            disabled={!prevChapter}
            className="h-7 w-7 p-0 text-muted-foreground"
            title={prevChapter ? `Ch. ${prevChapter.chapter_number}: ${prevChapter.title}` : "No previous chapter"}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center truncate">
            Ch. {chapter.chapter_number}: {chapter.title}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => nextChapter && navigate(`/book/${bookId}/write/${nextChapter.chapter_number}`)}
            disabled={!nextChapter}
            className="h-7 w-7 p-0 text-muted-foreground"
            title={nextChapter ? `Ch. ${nextChapter.chapter_number}: ${nextChapter.title}` : "No next chapter"}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* Word count goal */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Goal:</span>
          <select
            value={wordCountGoal ?? ""}
            onChange={e => setWordCountGoal(e.target.value ? parseInt(e.target.value) : undefined)}
            className="h-7 text-xs rounded border border-border/60 bg-background px-1.5 text-muted-foreground"
          >
            <option value="">None</option>
            <option value="1000">1,000</option>
            <option value="1500">1,500</option>
            <option value="2000">2,000</option>
            <option value="2500">2,500</option>
            <option value="3000">3,000</option>
            <option value="5000">5,000</option>
          </select>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {chapter.outline && !isCommitted && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/book/${bookId}/write-advanced`)}
              className="h-7 gap-1 text-xs text-primary hover:text-primary"
              title="Advanced AI pipeline write"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Write</span>
            </Button>
          )}
          {chapter.content && !isCommitted && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/book/${bookId}/line-edit/${chapterNum}`)}
              className="h-7 gap-1 text-xs"
              title="Line edit pipeline"
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Line Edit</span>
            </Button>
          )}
          {chapter.content && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                sessionStorage.setItem("analyzer_import_text", chapter.content || "");
                navigate("/chapter-analyzer");
              }}
              className="h-7 gap-1 text-xs"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Analyze</span>
            </Button>
          )}
          <Button
            size="sm"
            variant={sidebarOpen ? "secondary" : "ghost"}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-7 gap-1 text-xs"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Notes</span>
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <ProseEditor
            content={chapter.content ?? ""}
            readOnly={isCommitted}
            placeholder={
              chapter.outline
                ? "Start writing this chapter..."
                : "Start writing — or add an outline in the Notes panel to use AI Write."
            }
            onSave={saveContent}
            onAiAction={handleAiAction}
            wordCountGoal={wordCountGoal}
            chapterTitle={chapter.title}
            className="h-full"
          />
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-72 shrink-0 border-l border-border/40 flex flex-col bg-muted/5 animate-in slide-in-from-right-4 duration-200">
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
              <div className="flex gap-1">
                <button
                  onClick={() => setSidebarTab("outline")}
                  className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors", sidebarTab === "outline" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
                >
                  <BookOpen className="w-3 h-3 inline mr-1" />Outline
                </button>
                <button
                  onClick={() => setSidebarTab("chapters")}
                  className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors", sidebarTab === "chapters" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
                >
                  <List className="w-3 h-3 inline mr-1" />Chapters
                </button>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sidebar content */}
            <div className="flex-1 overflow-y-auto p-4 text-sm">
              {sidebarTab === "outline" && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Chapter {chapter.chapter_number} Outline
                  </p>
                  {chapter.outline ? (
                    <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap text-xs">
                      {chapter.outline}
                    </p>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p className="text-xs">No outline yet.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 text-xs h-7"
                        onClick={() => navigate(`/book/${bookId}`)}
                      >
                        Add outline in Book Writer
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {sidebarTab === "chapters" && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    All Chapters
                  </p>
                  {book.chapters.map(c => (
                    <button
                      key={c.chapter_number}
                      onClick={() => navigate(`/book/${bookId}/write/${c.chapter_number}`)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-2",
                        c.chapter_number === chapterNum
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <span className="shrink-0 w-6 text-right opacity-50">{c.chapter_number}.</span>
                      <span className="truncate flex-1">{c.title}</span>
                      <span className={cn("shrink-0 w-1.5 h-1.5 rounded-full", {
                        "bg-green-500": c.status === "committed",
                        "bg-blue-500": c.status === "written",
                        "bg-amber-400": c.status === "writing",
                        "bg-muted-foreground/30": c.status === "outlined",
                      })} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
