import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Trash2,
  Clock,
  BookOpen,
  ChevronRight,
  PenTool,
  Sparkles,
  Feather,
  FileStack,
  Wand2,
} from "lucide-react";
import Layout from "@/components/Layout";

interface BookSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  chapter_count: number;
  chapters_written: number;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function Books() {
  const [, navigate] = useLocation();
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const createStandaloneBook = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brain_dump: "", dossier: "", title: "Untitled Book" }),
      });
      if (res.ok) {
        const book = await res.json();
        navigate(`/book/${book.id}/studio`);
      }
    } catch (err) {
      console.error("Create error:", err);
    }
    setCreating(false);
  };

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch("/api/books");
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const deleteBook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchBooks();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Every way to work on a book, named plainly. One desk, many drawers.
  const MODES = [
    { label: "Studio", hint: "Prompt-driven writing with story bible & memory", icon: <Feather className="w-3 h-3" />, route: (id: string) => `/book/${id}/studio` },
    { label: "Classic Writer", hint: "Chapter-by-chapter writer with autopilot", icon: <PenTool className="w-3 h-3" />, route: (id: string) => `/book/${id}` },
    { label: "Story Docs", hint: "Expand dossier into character sheet, world bible & outline", icon: <FileStack className="w-3 h-3" />, route: (id: string) => `/book/${id}/build` },
    { label: "Advanced Draft", hint: "13-step high-quality chapter pipeline", icon: <Wand2 className="w-3 h-3" />, route: (id: string) => `/book/${id}/write-advanced` },
  ];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-10">
          <p className="catalog-label text-xs mb-3">Wing II — Write</p>
          <h2 className="text-4xl font-serif font-bold text-foreground mb-3">
            The Writing Desk
          </h2>
          <div className="library-rule max-w-xs mx-auto mb-4" />
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Every book on your desk, and every way to work on it. Draft in the
            Studio, run the Classic Writer's autopilot, or send a chapter
            through the Advanced pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <Button
            onClick={createStandaloneBook}
            size="lg"
            className="h-14 text-base gap-2"
            disabled={creating}
            data-testid="button-new-studio-book"
          >
            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenTool className="w-5 h-5" />}
            New Book (with Story Bible)
          </Button>
          <Button
            onClick={() => navigate("/pipeline/new")}
            size="lg"
            variant="outline"
            className="h-14 text-base gap-2"
            data-testid="button-new-book"
          >
            <Sparkles className="w-5 h-5" />
            New Book (via Story Dossier)
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No books yet. Complete a Story Dossier and click "Write the Book" to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="catalog-label text-xs mb-3">
              On the shelf ({books.length})
            </p>
            {books.map((book) => (
              <div
                key={book.id}
                className="bookplate rounded-sm hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate(`/book/${book.id}/studio`)}
                data-testid={`card-book-${book.id}`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-base font-semibold text-foreground truncate" data-testid={`text-book-title-${book.id}`}>
                        {book.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formatDate(book.updated_at)}</span>
                        </div>
                        <span className="text-xs px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary font-medium">
                          {book.chapters_written}/{book.chapter_count} chapters written
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => deleteBook(book.id, e)}
                        data-testid={`button-delete-book-${book.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50 flex-wrap">
                    {MODES.map(mode => (
                      <Button
                        key={mode.label}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs gap-1.5"
                        title={mode.hint}
                        onClick={(e) => { e.stopPropagation(); navigate(mode.route(book.id)); }}
                      >
                        <span className="text-brass">{mode.icon}</span> {mode.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
