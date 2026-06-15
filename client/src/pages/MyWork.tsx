import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, BookOpen, Globe, Plus, ChevronRight, Clock,
  Trash2, Sparkles, PenTool, Search, List
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type NewFlow = null | "book-choice" | "book-title" | "universe";

export default function MyWork() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const [books, setBooks] = useState<any[]>([]);
  const [universes, setUniverses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"all" | "books" | "universes">("all");
  const [newFlow, setNewFlow] = useState<NewFlow>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newUniverseName, setNewUniverseName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [b, u] = await Promise.all([
      fetch("/api/books").then(r => r.json()).catch(() => []),
      fetch("/api/universe").then(r => r.json()).catch(() => []),
    ]);
    setBooks(b);
    setUniverses(u);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // If ?new=book in URL, open new book flow
    if (search.includes("new=book")) setNewFlow("book-choice");
  }, []);

  const createBook = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      navigate(`/book/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setCreating(false);
    }
  };

  const createUniverse = async () => {
    if (!newUniverseName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/universe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUniverseName.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      navigate(`/universe/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setCreating(false);
    }
  };

  const deleteBook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this book? This cannot be undone.")) return;
    await fetch(`/api/books/${id}`, { method: "DELETE" });
    load();
  };

  const deleteUniverse = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this universe? Books will not be deleted.")) return;
    await fetch(`/api/universe/${id}`, { method: "DELETE" });
    load();
  };

  const filteredBooks = books.filter(b => b.title.toLowerCase().includes(filter.toLowerCase()));
  const filteredUniverses = universes.filter(u => u.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-in fade-in duration-300">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-serif font-bold">My Work</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setNewFlow("book-choice"); setNewTitle(""); setError(null); }}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4" /> New Book
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setNewFlow("universe"); setNewUniverseName(""); setError(null); }}
              className="gap-2"
            >
              <Globe className="w-4 h-4" /> New Universe
            </Button>
          </div>
        </div>

        {/* New book flow */}
        {newFlow === "book-choice" && (
          <Card className="border-primary/30 bg-primary/5 mb-6">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-serif font-semibold text-lg">Start a new book</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setNewFlow("book-title")}
                  className="p-4 rounded-lg border border-border bg-background hover:border-primary/50 text-left transition-all group"
                >
                  <Sparkles className="w-5 h-5 text-primary mb-2" />
                  <p className="text-sm font-medium">Start writing now</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Open the editor, no setup</p>
                </button>
                <button
                  onClick={() => navigate("/pipeline/new")}
                  className="p-4 rounded-lg border border-border bg-background hover:border-primary/50 text-left transition-all group"
                >
                  <PenTool className="w-5 h-5 text-primary mb-2" />
                  <p className="text-sm font-medium">Write an outline</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Plan before you write</p>
                </button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setNewFlow(null)} className="text-muted-foreground">
                Cancel
              </Button>
            </CardContent>
          </Card>
        )}

        {newFlow === "book-title" && (
          <Card className="border-primary/30 bg-primary/5 mb-6">
            <CardContent className="p-6 space-y-3">
              <h2 className="font-serif font-semibold">What's your book called?</h2>
              <Input
                placeholder="Book title..."
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createBook()}
                autoFocus
                className="bg-background"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button onClick={createBook} disabled={creating || !newTitle.trim()} className="gap-2">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Start Writing
                </Button>
                <Button variant="ghost" onClick={() => setNewFlow(null)} className="text-muted-foreground">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {newFlow === "universe" && (
          <Card className="border-primary/30 bg-primary/5 mb-6">
            <CardContent className="p-6 space-y-3">
              <h2 className="font-serif font-semibold">Name your universe</h2>
              <Input
                placeholder="e.g. Oracle Veil Universe"
                value={newUniverseName}
                onChange={e => setNewUniverseName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createUniverse()}
                autoFocus
                className="bg-background"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button onClick={createUniverse} disabled={creating || !newUniverseName.trim()} className="gap-2">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create Universe
                </Button>
                <Button variant="ghost" onClick={() => setNewFlow(null)} className="text-muted-foreground">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter + tabs */}
        {(books.length > 0 || universes.length > 0) && (
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "books", "universes"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-medium border transition-colors capitalize",
                    tab === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {t === "all" ? `All (${books.length + universes.length})` : t === "books" ? `Books (${books.length})` : `Universes (${universes.length})`}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : books.length === 0 && universes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <List className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No work yet. Create a book or universe to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Books */}
            {(tab === "all" || tab === "books") && filteredBooks.map(book => (
              <Card
                key={book.id}
                className="border-border/60 hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => navigate(`/book/${book.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-md group-hover:bg-primary/10 transition-colors shrink-0">
                    <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{book.title}</p>
                      {book.chapters_written > 0 && (
                        <Badge variant="outline" className="text-xs h-4 px-1.5 shrink-0">
                          {book.chapters_written}/{book.chapter_count} ch
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground/50" />
                      <span className="text-xs text-muted-foreground/70">{formatDate(book.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => deleteBook(book.id, e)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Universes */}
            {(tab === "all" || tab === "universes") && filteredUniverses.map(universe => (
              <Card
                key={universe.id}
                className="border-border/60 hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => navigate(`/universe/${universe.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-md group-hover:bg-primary/10 transition-colors shrink-0">
                    <Globe className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{universe.name}</p>
                      {universe.series_count > 0 && (
                        <Badge variant="outline" className="text-xs h-4 px-1.5 shrink-0">
                          {universe.series_count} series
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground/50" />
                      <span className="text-xs text-muted-foreground/70">{formatDate(universe.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => deleteUniverse(universe.id, e)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
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
