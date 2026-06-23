import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, BookOpen, Globe, ArrowRight, Clock, ChevronRight, Sparkles, Library, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type FirstTimeStep = "root" | "write" | "write-title";

export default function Home() {
  const [, navigate] = useLocation();
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [recentWork, setRecentWork] = useState<any[]>([]);
  const [universes, setUniverses] = useState<any[]>([]);
  const [firstTimeStep, setFirstTimeStep] = useState<FirstTimeStep>("root");
  const [newBookTitle, setNewBookTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewBookMenu, setShowNewBookMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/books").then(r => r.json()).catch(() => []),
      fetch("/api/universe").then(r => r.json()).catch(() => []),
      fetch("/api/projects").then(r => r.json()).catch(() => []),
    ]).then(([books, univs, projects]) => {
      const hasWork = books.length > 0 || univs.length > 0 || projects.length > 0;
      setIsFirstTime(!hasWork);
      setUniverses(univs ?? []);

      const items: any[] = [];
      for (const b of books.slice(0, 5)) {
        const hasChapter = b.last_written_chapter !== null;
        items.push({
          type: "book",
          id: b.id,
          title: b.title,
          detail: hasChapter
            ? `Ch. ${b.last_written_chapter}: ${b.last_written_chapter_title ?? ""}`
            : `${b.chapters_written || 0}/${b.chapter_count || 0} chapters`,
          subdetail: b.chapter_count > 0 ? `${b.chapters_written}/${b.chapter_count} chapters` : null,
          date: b.updated_at,
          route: `/book/${b.id}`,
          continueRoute: hasChapter ? `/book/${b.id}/write/${b.last_written_chapter}` : null,
        });
      }
      for (const u of univs.slice(0, 2)) {
        items.push({
          type: "universe",
          id: u.id,
          title: u.name,
          detail: `${u.book_count ?? 0} books`,
          date: u.updated_at,
          route: `/universe/${u.id}`,
        });
      }
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentWork(items.slice(0, 6));
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showNewBookMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowNewBookMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNewBookMenu]);

  async function createAndGoWrite() {
    if (!newBookTitle.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newBookTitle.trim() }),
      });
      const book = await r.json();
      if (!r.ok) throw new Error(book.error ?? "Failed to create book");
      navigate(`/book/${book.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  // ── NEW BOOK DROPDOWN ───────────────────────────────────────────────────────
  function NewBookDropdown({ iconSize = "sm" }: { iconSize?: "sm" | "default" }) {
    return (
      <div className="relative" ref={menuRef}>
        <Button
          size={iconSize}
          className="gap-2"
          onClick={() => setShowNewBookMenu(v => !v)}
        >
          <BookOpen className="w-4 h-4" />
          New Book
          <ChevronDown className={cn("w-3 h-3 transition-transform", showNewBookMenu && "rotate-180")} />
        </Button>

        {showNewBookMenu && (
          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-background shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="p-1">
              <button
                onClick={() => { setShowNewBookMenu(false); navigate("/pipeline/new"); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-muted/60 transition-colors text-left"
              >
                <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium">Standalone book</p>
                  <p className="text-xs text-muted-foreground">Not part of a universe</p>
                </div>
              </button>

              {universes.length > 0 && (
                <>
                  <div className="h-px bg-border/60 my-1 mx-1" />
                  <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    In a universe
                  </p>
                  {universes.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { setShowNewBookMenu(false); navigate(`/universe/${u.id}/new-book`); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-muted/60 transition-colors text-left"
                    >
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.book_count ?? 0} books</p>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => { setShowNewBookMenu(false); navigate("/universe"); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-muted/60 transition-colors text-left text-muted-foreground"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    New universe first
                  </button>
                </>
              )}

              {universes.length === 0 && (
                <>
                  <div className="h-px bg-border/60 my-1 mx-1" />
                  <button
                    onClick={() => { setShowNewBookMenu(false); navigate("/universe"); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-muted/60 transition-colors text-left text-muted-foreground"
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Create a universe first</p>
                      <p className="text-xs">Then add books to it</p>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (isFirstTime === null) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // ── FIRST TIME USER ────────────────────────────────────────────────────────
  if (isFirstTime) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto py-16 animate-in fade-in duration-500">
          {firstTimeStep === "root" && (
            <div className="text-center space-y-8">
              <div>
                <h1 className="text-4xl font-serif font-bold mb-3">What do you want to write?</h1>
                <p className="text-muted-foreground">We'll help you get there.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setFirstTimeStep("write")}
                  className="p-6 rounded-xl border border-border/60 hover:border-primary/50 text-left transition-all group"
                >
                  <BookOpen className="w-7 h-7 text-muted-foreground group-hover:text-primary mb-3 transition-colors" />
                  <h2 className="text-xl font-serif font-semibold mb-2">A book</h2>
                  <p className="text-sm text-muted-foreground">Fiction, nonfiction, whatever's in your head.</p>
                  <div className="flex items-center gap-1 text-primary text-sm font-medium mt-4">
                    Get started <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
                <button
                  onClick={() => navigate("/universe")}
                  className="p-6 rounded-xl border border-border/60 hover:border-primary/50 text-left transition-all group"
                >
                  <Globe className="w-7 h-7 text-muted-foreground group-hover:text-primary mb-3 transition-colors" />
                  <h2 className="text-xl font-serif font-semibold mb-2">A universe</h2>
                  <p className="text-sm text-muted-foreground">Create a universe, write a story bible, organize your series.</p>
                  <div className="flex items-center gap-1 text-primary text-sm font-medium mt-4">
                    Build the world <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {firstTimeStep === "write" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <button
                onClick={() => setFirstTimeStep("root")}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-serif font-semibold text-center mb-2">How do you want to start?</h2>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setFirstTimeStep("write-title")}
                  className="p-5 rounded-xl border border-border/60 hover:border-primary/50 text-left transition-all group"
                >
                  <h3 className="font-semibold mb-1">Jump in and write</h3>
                  <p className="text-sm text-muted-foreground">Start with a blank page. AI will help as you go.</p>
                  <div className="flex items-center gap-1 text-primary text-sm font-medium mt-3">
                    Start writing <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
                <button
                  onClick={() => navigate("/pipeline/new")}
                  className="p-5 rounded-xl border border-border/60 hover:border-primary/50 text-left transition-all group"
                >
                  <h3 className="font-semibold mb-1">Write an outline</h3>
                  <p className="text-sm text-muted-foreground">Plan your story with AI before you write the first word.</p>
                  <div className="flex items-center gap-1 text-primary text-sm font-medium mt-3">
                    Start outlining <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {firstTimeStep === "write-title" && (
            <div className="max-w-sm mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <button
                onClick={() => setFirstTimeStep("write")}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-serif font-semibold text-center mb-2">What's your book called?</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">You can change this any time.</p>
              <Input
                placeholder="Book title..."
                value={newBookTitle}
                onChange={e => setNewBookTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createAndGoWrite()}
                autoFocus
                className="text-base h-12"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                onClick={createAndGoWrite}
                disabled={creating || !newBookTitle.trim()}
                size="lg"
                className="w-full gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Start Writing
              </Button>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ── RETURNING USER ─────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-serif font-bold">Welcome back</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/my-work")} className="gap-2">
              <Library className="w-4 h-4" /> All Work
            </Button>
            <NewBookDropdown iconSize="sm" />
          </div>
        </div>

        {recentWork.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No recent work yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Pick up where you left off</p>
            {recentWork.map(item => (
              <Card
                key={`${item.type}-${item.id}`}
                className="border-border/60 hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => navigate(item.route)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-md group-hover:bg-primary/10 transition-colors shrink-0">
                    {item.type === "book"
                      ? <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      : <Globe className="w-4 h-4 text-muted-foreground group-hover:text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                      <span className="text-xs text-muted-foreground/50">·</span>
                      <span className="text-xs text-muted-foreground font-medium">{item.detail}</span>
                      {item.subdetail && (
                        <>
                          <span className="text-xs text-muted-foreground/50">·</span>
                          <span className="text-xs text-muted-foreground/70">{item.subdetail}</span>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground/50">·</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground/50" />
                        <span className="text-xs text-muted-foreground/70">{formatDate(item.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.continueRoute && (
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => { e.stopPropagation(); navigate(item.continueRoute); }}
                      >
                        <Sparkles className="w-3 h-3" /> Continue
                      </Button>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {recentWork.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="p-4 rounded-lg border border-border/60 hover:border-primary/30 transition-all group relative">
              <BookOpen className="w-5 h-5 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
              <p className="text-sm font-medium">New Book</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Standalone or in a universe</p>
              <NewBookDropdown />
            </div>
            <button
              onClick={() => navigate("/universe")}
              className="p-4 rounded-lg border border-border/60 hover:border-primary/30 text-left transition-all group"
            >
              <Globe className="w-5 h-5 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
              <p className="text-sm font-medium">New Universe</p>
              <p className="text-xs text-muted-foreground mt-0.5">Build a world or series</p>
            </button>
            <button
              onClick={() => navigate("/expand")}
              className="p-4 rounded-lg border border-border/60 hover:border-primary/30 text-left transition-all group"
            >
              <Sparkles className="w-5 h-5 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
              <p className="text-sm font-medium">Expand a Chapter</p>
              <p className="text-xs text-muted-foreground mt-0.5">Upload a book, expand with AI</p>
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
