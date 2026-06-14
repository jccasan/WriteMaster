import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Plus,
  Trash2,
  Clock,
  BookOpen,
  ChevronRight,
  PenTool,
  Sparkles,
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

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-4xl font-serif font-bold text-foreground mb-4">
            Book Writer
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Turn your Story Dossiers into full books, chapter by chapter. Create a book from the pipeline results or browse your existing books below.
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
            New Book (via Story Pipeline)
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No books yet. Complete a Story Pipeline and click "Write the Book" to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Your Books ({books.length})
            </h3>
            {books.map((book) => (
              <Card
                key={book.id}
                className="border-border/60 hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => navigate(`/book/${book.id}/studio`)}
                data-testid={`card-book-${book.id}`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate" data-testid={`text-book-title-${book.id}`}>
                      {book.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{formatDate(book.updated_at)}</span>
                      </div>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        {book.chapters_written}/{book.chapter_count} chapters written
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                      onClick={(e) => { e.stopPropagation(); navigate(`/book/${book.id}/build`); }}
                      title="Expand dossier into Character Sheet, World-Building, and Chapter Outline"
                    >
                      <Sparkles className="w-3 h-3" /> P2
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                      onClick={(e) => { e.stopPropagation(); navigate(`/book/${book.id}/write-advanced`); }}
                      title="Advanced chapter writer (14-step pipeline)"
                    >
                      <PenTool className="w-3 h-3" /> Write
                    </Button>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
