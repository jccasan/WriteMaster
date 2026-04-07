import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Sparkles, Copy, Check, ChevronRight, BookOpen,
  Hash, LayoutList, RefreshCw, Search, Type
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TitleOption {
  title: string;
  subtitle: string;
  tropes_embedded: string[];
  reasoning: string;
}

interface Keyword {
  phrase: string;
  intent: string;
  competition: string;
}

interface Category {
  path: string;
  reasoning: string;
}

interface TitleKeywordResult {
  titles: TitleOption[];
  keywords: Keyword[];
  categories: Category[];
  keyword_strategy: string;
}

interface Book {
  id: string;
  title: string;
  dossier: string;
  chapters: Array<{ chapter_number: number; status: string; summary: string | null }>;
}

interface BookListItem {
  id: string;
  title: string;
  chapters_written: number;
  chapter_count: number;
}

const COMPETITION_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function PublishingTools() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const bookId = params?.id;

  const [book, setBook] = useState<Book | null>(null);
  const [bookLoading, setBookLoading] = useState(!!bookId);
  const [allBooks, setAllBooks] = useState<BookListItem[]>([]);
  const [booksLoading, setBooksLoading] = useState(!bookId);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TitleKeywordResult | null>(null);
  const [activeTab, setActiveTab] = useState<"titles" | "keywords">("titles");
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<number | null>(null);

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
    setSelectedTitle(null);

    try {
      const res = await fetch(`/api/publishing/titles-keywords/${bookId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate titles and keywords");
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
    setGenerating(false);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(key);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const copyAllKeywords = () => {
    if (!result) return;
    const text = result.keywords.map(k => k.phrase).join("\n");
    handleCopy(text, "all-keywords");
  };

  const hasSufficientContent = book && (book.dossier || book.chapters.some(c => c.status === "written" || c.summary));

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
              <span>Title & Keywords</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Title & Keyword Generator</h1>
            <p className="text-muted-foreground">Select a book to generate titles and keywords for:</p>
          </div>
          {allBooks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No books found. <button className="text-primary hover:underline" onClick={() => navigate("/books")}>Create a book</button> first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allBooks.map((b) => (
                <Card
                  key={b.id}
                  className="border-border/60 hover:border-primary/30 cursor-pointer transition-all"
                  onClick={() => navigate(`/publishing/titles-keywords/${b.id}`)}
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
            <span>Title & Keywords</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2" data-testid="text-page-title">
            Title & Keyword Generator
          </h1>
          <p className="text-muted-foreground">
            Generate trope-forward title options and Amazon-optimized keywords from your book's dossier and content.
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
                    <span>{book.dossier ? "Dossier available" : "No dossier"}</span>
                  </div>
                </div>
              </div>
              {!hasSufficientContent && (
                <div className="mt-3 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2" data-testid="text-content-warning">
                  This book needs a dossier or at least one chapter summary before generating titles and keywords.
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
            {generating ? "Generating..." : result ? "Regenerate" : "Generate Titles & Keywords"}
          </Button>
          {result && (
            <Button variant="outline" onClick={handleGenerate} disabled={generating} className="gap-2" data-testid="button-regenerate">
              <RefreshCw className="w-4 h-4" />
              New Options
            </Button>
          )}
        </div>

        {generating && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-serif text-foreground mb-1">Generating titles and keywords...</p>
            <p className="text-sm text-muted-foreground">Claude is analyzing your book's tropes and content</p>
          </div>
        )}

        {result && !generating && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex border border-border/40 rounded-lg overflow-hidden w-fit">
              <button
                onClick={() => setActiveTab("titles")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "titles" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                data-testid="tab-titles"
              >
                <Type className="w-4 h-4" />
                Titles ({result.titles.length})
              </button>
              <button
                onClick={() => setActiveTab("keywords")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === "keywords" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                data-testid="tab-keywords"
              >
                <Hash className="w-4 h-4" />
                Keywords & Categories
              </button>
            </div>

            {activeTab === "titles" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Click a title to select it. Each title embeds tropes readers search for.</p>
                <div className="space-y-3">
                  {result.titles.map((option, i) => (
                    <Card
                      key={i}
                      className={cn(
                        "border cursor-pointer transition-all",
                        selectedTitle === i ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/40"
                      )}
                      onClick={() => setSelectedTitle(selectedTitle === i ? null : i)}
                      data-testid={`card-title-${i}`}
                    >
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground leading-tight">
                              {option.title}
                              {option.subtitle && (
                                <span className="font-normal text-muted-foreground"> — {option.subtitle}</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {option.tropes_embedded.map((trope, j) => (
                                <Badge key={j} variant="secondary" className="text-xs font-normal" data-testid={`badge-trope-${i}-${j}`}>
                                  {trope}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleCopy(`${option.title}${option.subtitle ? `: ${option.subtitle}` : ""}`, `title-${i}`); }}
                            className="h-8 w-8 p-0 shrink-0"
                            data-testid={`button-copy-title-${i}`}
                          >
                            {copiedItem === `title-${i}` ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                        {selectedTitle === i && (
                          <div className="mt-3 pt-3 border-t border-border/30">
                            <p className="text-xs text-muted-foreground leading-relaxed">{option.reasoning}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "keywords" && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Hash className="w-4 h-4 text-primary" />
                        7 Amazon Keywords
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Long-tail phrases optimized for Amazon search (KDP allows exactly 7)</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyAllKeywords}
                      className="gap-1 text-xs"
                      data-testid="button-copy-all-keywords"
                    >
                      {copiedItem === "all-keywords" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedItem === "all-keywords" ? "Copied!" : "Copy All"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {result.keywords.map((kw, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 border border-border/40 rounded-lg p-3"
                        data-testid={`card-keyword-${i}`}
                      >
                        <div className="flex items-center gap-2 shrink-0 mt-0.5">
                          <span className="text-xs font-mono text-muted-foreground/60 w-4">{i + 1}</span>
                          <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", COMPETITION_COLORS[kw.competition.toLowerCase()] || "bg-muted text-muted-foreground")}>
                            {kw.competition}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground" data-testid={`text-keyword-phrase-${i}`}>{kw.phrase}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{kw.intent}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(kw.phrase, `kw-${i}`)}
                          className="h-7 w-7 p-0 shrink-0"
                          data-testid={`button-copy-keyword-${i}`}
                        >
                          {copiedItem === `kw-${i}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    ))}
                  </div>

                  {result.keyword_strategy && (
                    <div className="mt-4 bg-muted/30 border border-border/40 rounded-lg p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5" /> Keyword Strategy
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">{result.keyword_strategy}</p>
                    </div>
                  )}
                </div>

                {result.categories.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                      <LayoutList className="w-4 h-4 text-primary" />
                      Recommended Categories
                    </h3>
                    <div className="space-y-3">
                      {result.categories.map((cat, i) => (
                        <Card key={i} className="border-border/40" data-testid={`card-category-${i}`}>
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-foreground font-mono" data-testid={`text-category-path-${i}`}>{cat.path}</div>
                                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{cat.reasoning}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopy(cat.path, `cat-${i}`)}
                                className="h-7 w-7 p-0 shrink-0"
                                data-testid={`button-copy-category-${i}`}
                              >
                                {copiedItem === `cat-${i}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground border border-border/40 rounded-lg px-4 py-3 bg-muted/20" data-testid="text-keyword-tips">
                  <strong className="text-foreground">KDP keyword tip:</strong> Use the 7-keyword limit strategically. Each keyword field accepts a phrase up to 50 characters. Don't repeat words already in your title or subtitle — Amazon already indexes those. Prioritize low-competition phrases where you can rank.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
