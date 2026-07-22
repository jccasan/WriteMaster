import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Upload,
  PenLine,
} from "lucide-react";
import Layout from "@/components/Layout";

interface BookSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  chapter_count: number;
  chapters_written: number;
  last_written_chapter: number | null;
  last_written_chapter_title: string | null;
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // "Just write" — create a blank pantser book and land in the editor.
  const startWriting = async () => {
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/books/pantser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() || "Untitled Book" }),
      });
      const book = await r.json();
      if (!r.ok) throw new Error(book.error ?? "Failed to create book");
      navigate(`/book/${book.id}/write/1`);
    } catch (err: any) {
      setError(err.message);
      setCreating(false);
    }
  };

  const uploadManuscript = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/books/upload-manuscript", { method: "POST", body: form });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Upload failed");
      navigate(`/book/${data.id}/write/1`);
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
    }
  };

  const createStandaloneBook = async () => {
    setCreating(true);
    setError(null);
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
        setBooks(Array.isArray(data) ? data : []);
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

  const writeRoute = (book: BookSummary) =>
    `/book/${book.id}/write/${book.last_written_chapter ?? 1}`;

  // Every way to work on a book, named plainly. One desk, many drawers.
  const MODES = [
    { label: "Write", hint: "Open the manuscript in the rich-text editor", icon: <PenLine className="w-3 h-3" />, route: writeRoute },
    { label: "Studio", hint: "Prompt-driven writing with story bible & memory", icon: <Feather className="w-3 h-3" />, route: (b: BookSummary) => `/book/${b.id}/studio` },
    { label: "Classic Writer", hint: "Chapter-by-chapter writer with autopilot", icon: <PenTool className="w-3 h-3" />, route: (b: BookSummary) => `/book/${b.id}` },
    { label: "Story Docs", hint: "Expand dossier into character sheet, world bible & outline", icon: <FileStack className="w-3 h-3" />, route: (b: BookSummary) => `/book/${b.id}/build` },
    { label: "Advanced Draft", hint: "13-step high-quality chapter pipeline", icon: <Wand2 className="w-3 h-3" />, route: (b: BookSummary) => `/book/${b.id}/write-advanced` },
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
            Every book on your desk, and every way to work on it. Start from a
            blank page, bring in a manuscript, or plan first.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.docx"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) uploadManuscript(f);
            e.target.value = "";
          }}
        />

        {showTitleInput ? (
          <div className="bookplate rounded-sm p-5 mb-8 max-w-md mx-auto animate-in fade-in slide-in-from-top-1 duration-200">
            <p className="catalog-label text-[11px] mb-2">A new book</p>
            <p className="font-serif font-semibold mb-3">What's it called? (You can change this later.)</p>
            <div className="flex gap-2">
              <Input
                placeholder="Untitled Book"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !creating && startWriting()}
                autoFocus
              />
              <Button onClick={startWriting} disabled={creating} className="gap-1.5 shrink-0">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                Write
              </Button>
            </div>
            <button
              className="text-xs text-muted-foreground hover:text-foreground mt-2"
              onClick={() => setShowTitleInput(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <Button
              onClick={() => { setNewTitle(""); setShowTitleInput(true); }}
              size="lg"
              className="h-16 text-sm gap-2 flex-col sm:flex-row"
              data-testid="button-start-writing"
            >
              <PenLine className="w-5 h-5" />
              Start Writing
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="lg"
              variant="outline"
              className="h-16 text-sm gap-2 flex-col sm:flex-row"
              disabled={uploading}
              data-testid="button-upload-manuscript"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              {uploading ? "Reading..." : "Upload a Book"}
            </Button>
            <Button
              onClick={createStandaloneBook}
              size="lg"
              variant="outline"
              className="h-16 text-sm gap-2 flex-col sm:flex-row"
              disabled={creating}
              data-testid="button-new-studio-book"
            >
              <Feather className="w-5 h-5" />
              Studio Book
            </Button>
            <Button
              onClick={() => navigate("/pipeline/new")}
              size="lg"
              variant="outline"
              className="h-16 text-sm gap-2 flex-col sm:flex-row"
              data-testid="button-new-book"
            >
              <Sparkles className="w-5 h-5" />
              Plan First
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive text-center mb-6">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nothing on the desk yet. Start writing, upload a manuscript, or plan a story first.</p>
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
                onClick={() => navigate(writeRoute(book))}
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
                        variant={mode.label === "Write" ? "default" : "outline"}
                        className="h-7 px-2.5 text-xs gap-1.5"
                        title={mode.hint}
                        onClick={(e) => { e.stopPropagation(); navigate(mode.route(book)); }}
                      >
                        <span className={mode.label === "Write" ? "" : "text-brass"}>{mode.icon}</span> {mode.label}
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
