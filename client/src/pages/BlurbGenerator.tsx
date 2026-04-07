import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, Copy, Check, ArrowLeft, BookOpen, Edit3, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Blurb {
  label: string;
  text: string;
  strategy: string;
}

interface BlurbResult {
  blurbs: Blurb[];
}

interface Book {
  id: string;
  title: string;
  dossier: string;
  chapters: Array<{ chapter_number: number; title: string; status: string; summary: string | null }>;
}

interface BookListItem {
  id: string;
  title: string;
  chapters_written: number;
  chapter_count: number;
}

export default function BlurbGenerator() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const bookId = params?.id;

  const [book, setBook] = useState<Book | null>(null);
  const [bookLoading, setBookLoading] = useState(!!bookId);
  const [allBooks, setAllBooks] = useState<BookListItem[]>([]);
  const [booksLoading, setBooksLoading] = useState(!bookId);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BlurbResult | null>(null);
  const [selectedBlurb, setSelectedBlurb] = useState<number>(0);
  const [editMode, setEditMode] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!bookId) {
      fetch("/api/books")
        .then(r => r.ok ? r.json() : [])
        .then(data => { setAllBooks(data); setBooksLoading(false); })
        .catch(() => setBooksLoading(false));
      return;
    }
    fetch(`/api/books/${bookId}`)
      .then(r => r.ok ? r.json() : Promise.reject("Book not found"))
      .then(data => { setBook(data); setBookLoading(false); })
      .catch(() => { setError("Book not found"); setBookLoading(false); });
  }, [bookId]);

  const handleGenerate = async () => {
    if (!bookId || generating) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    setEditMode(false);

    try {
      const res = await fetch(`/api/publishing/blurb/${bookId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate blurbs");
      }
      const data = await res.json();
      setResult(data);
      setSelectedBlurb(0);
    } catch (err: any) {
      setError(err.message);
    }
    setGenerating(false);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleEdit = (text: string) => {
    setEditedText(text);
    setEditMode(true);
  };

  const hasSufficientContent = book && (book.dossier || book.chapters.some(c => c.summary || c.status === "written"));

  if (bookLoading || booksLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!bookId) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <button onClick={() => navigate("/publishing")} className="hover:text-foreground transition-colors">
                Publishing Tools
              </button>
              <ChevronRight className="w-3 h-3" />
              <span>Blurb Generator</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Blurb Generator</h1>
            <p className="text-muted-foreground">Select a book to generate blurbs for:</p>
          </div>
          {allBooks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No books found. <button className="text-primary hover:underline" onClick={() => navigate("/books")}>Create a book</button> first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allBooks.map(b => (
                <Card
                  key={b.id}
                  className="border-border/60 hover:border-primary/30 cursor-pointer transition-all"
                  onClick={() => navigate(`/publishing/blurbs/${b.id}`)}
                  data-testid={`card-book-select-${b.id}`}
                >
                  <CardContent className="pt-4 pb-4 flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{b.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{b.chapters_written}/{b.chapter_count} chapters written</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            {bookId && book ? (
              <>
                <button onClick={() => navigate(`/book/${bookId}`)} className="hover:text-foreground transition-colors">
                  {book.title}
                </button>
                <ChevronRight className="w-3 h-3" />
              </>
            ) : (
              <>
                <button onClick={() => navigate("/publishing")} className="hover:text-foreground transition-colors">
                  Publishing Tools
                </button>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
            <span>Blurb Generator</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2" data-testid="text-page-title">
            Blurb Generator
          </h1>
          <p className="text-muted-foreground">
            Generate 3 Amazon-optimized blurb variants from your book's dossier and chapter summaries. Each follows KDP best practices: hook first, conflict shown, trope signals woven in, cliffhanger ending.
          </p>
        </div>

        {book && (
          <Card className="border-border/60 mb-6" data-testid="card-book-info">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-foreground truncate" data-testid="text-book-title">{book.title}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{book.chapters.length} chapters</span>
                    <span>·</span>
                    <span>{book.chapters.filter(c => c.summary).length} summarized</span>
                    <span>·</span>
                    <span>{book.dossier ? "Dossier available" : "No dossier"}</span>
                  </div>
                </div>
              </div>
              {!hasSufficientContent && (
                <div className="mt-3 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2" data-testid="text-content-warning">
                  This book needs a dossier or at least one written chapter before generating blurbs.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="text-destructive text-sm bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 mb-6" data-testid="text-error">
            {error}
          </div>
        )}

        <div className="flex gap-3 mb-8">
          <Button
            onClick={handleGenerate}
            disabled={!bookId || generating || !hasSufficientContent}
            className="gap-2"
            data-testid="button-generate"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Generating..." : result ? "Regenerate Blurbs" : "Generate Blurbs"}
          </Button>
          {result && (
            <Button variant="outline" onClick={() => handleGenerate()} disabled={generating} className="gap-2" data-testid="button-regenerate">
              <RefreshCw className="w-4 h-4" />
              New Variants
            </Button>
          )}
        </div>

        {generating && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-serif text-foreground mb-1">Crafting your blurbs...</p>
            <p className="text-sm text-muted-foreground">Claude is writing 3 variants using your dossier and chapter context</p>
          </div>
        )}

        {result && !generating && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">3 variants generated.</span>
              Select one to edit or copy.
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {result.blurbs.map((blurb, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedBlurb(i); setEditMode(false); }}
                  className={cn(
                    "text-left p-3 rounded-lg border text-sm transition-all",
                    selectedBlurb === i
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  )}
                  data-testid={`tab-blurb-${i}`}
                >
                  <div className="font-medium mb-1">{blurb.label}</div>
                  <div className="text-xs opacity-70 line-clamp-2">{blurb.strategy}</div>
                </button>
              ))}
            </div>

            {result.blurbs[selectedBlurb] && (
              <Card className="border-primary/30" data-testid="card-selected-blurb">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold text-foreground">
                        {result.blurbs[selectedBlurb].label}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{result.blurbs[selectedBlurb].strategy}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(editMode ? editedText : result.blurbs[selectedBlurb].text)}
                        className="h-8 gap-1 text-xs"
                        data-testid="button-edit-blurb"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {editMode ? "Editing" : "Edit"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(editMode ? editedText : result.blurbs[selectedBlurb].text, selectedBlurb)}
                        className="h-8 gap-1 text-xs"
                        data-testid="button-copy-blurb"
                      >
                        {copiedIndex === selectedBlurb ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedIndex === selectedBlurb ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editMode ? (
                    <Textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="min-h-[200px] text-sm leading-relaxed"
                      autoFocus
                      data-testid="textarea-edit-blurb"
                    />
                  ) : (
                    <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap" data-testid="text-blurb-content">
                      {result.blurbs[selectedBlurb].text}
                    </div>
                  )}
                  {editMode && (
                    <div className="mt-3 flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditMode(false)} data-testid="button-cancel-edit">
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleCopy(editedText, selectedBlurb)} className="gap-1" data-testid="button-copy-edited">
                        <Copy className="w-3.5 h-3.5" /> Copy Edited
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="text-xs text-muted-foreground border border-border/40 rounded-lg px-4 py-3 bg-muted/20" data-testid="text-blurb-tips">
              <strong className="text-foreground">Blurb tips:</strong> Amazon readers make buy decisions in 3-5 seconds. Your first line must hook immediately. Trope signals ("enemies to lovers," "forced proximity") act as search keywords in the blurb. Keep it under 250 words for best formatting on Amazon's product page.
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
