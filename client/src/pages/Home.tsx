import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, BookOpen, Globe, ArrowRight, Clock, ChevronRight, Sparkles,
  ChevronDown, Plus, Map, Feather, Scissors, Stamp,
} from "lucide-react";
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

// The four wings of the library, in the order a book gets made.
const WINGS = [
  {
    label: "Plan",
    icon: <Map className="w-5 h-5" />,
    title: "The Map Room",
    desc: "Turn a brain dump into a story dossier. Build universes and series bibles.",
    route: "/pipeline",
  },
  {
    label: "Write",
    icon: <Feather className="w-5 h-5" />,
    title: "The Writing Desk",
    desc: "Draft books chapter by chapter, with autopilot and narrative sliders.",
    route: "/books",
  },
  {
    label: "Edit",
    icon: <Scissors className="w-5 h-5" />,
    title: "The Editor's Office",
    desc: "Full manuscript analysis, beta readers, line edits, and quick feedback.",
    route: "/forge",
  },
  {
    label: "Publish",
    icon: <Stamp className="w-5 h-5" />,
    title: "The Publishing House",
    desc: "Trope research, blurbs, titles, and keywords tuned for KDP.",
    route: "/publishing",
  },
];

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
    ]).then(([booksRaw, univsRaw, projectsRaw]) => {
      // Guard against error payloads ({error: ...}) so a failing API can't blank the page
      const books = Array.isArray(booksRaw) ? booksRaw : [];
      const univs = Array.isArray(univsRaw) ? univsRaw : [];
      const projects = Array.isArray(projectsRaw) ? projectsRaw : [];
      const hasWork = books.length > 0 || univs.length > 0 || projects.length > 0;
      setIsFirstTime(!hasWork);
      setUniverses(univs);

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
      const r = await fetch("/api/books/pantser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newBookTitle.trim() }),
      });
      const book = await r.json();
      if (!r.ok) throw new Error(book.error ?? "Failed to create book");
      navigate(`/book/${book.id}/write/1`);
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
          <div className="absolute right-0 top-full mt-1 z-50 w-56 bookplate rounded-sm animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="p-1">
              <button
                onClick={() => { setShowNewBookMenu(false); navigate("/pipeline/new"); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm hover:bg-accent/60 transition-colors text-left"
              >
                <BookOpen className="w-4 h-4 text-brass shrink-0" />
                <div>
                  <p className="font-medium">Standalone book</p>
                  <p className="text-xs text-muted-foreground">Not part of a universe</p>
                </div>
              </button>

              {universes.length > 0 && (
                <>
                  <div className="library-rule my-1 mx-1" />
                  <p className="px-3 py-1 catalog-label text-[11px]">
                    In a universe
                  </p>
                  {universes.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { setShowNewBookMenu(false); navigate(`/universe/${u.id}/new-book`); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm hover:bg-accent/60 transition-colors text-left"
                    >
                      <Globe className="w-4 h-4 text-brass shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.book_count ?? 0} books</p>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => { setShowNewBookMenu(false); navigate("/universe"); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm hover:bg-accent/60 transition-colors text-left text-muted-foreground"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    New universe first
                  </button>
                </>
              )}

              {universes.length === 0 && (
                <>
                  <div className="library-rule my-1 mx-1" />
                  <button
                    onClick={() => { setShowNewBookMenu(false); navigate("/universe"); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm hover:bg-accent/60 transition-colors text-left text-muted-foreground"
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
                <p className="catalog-label text-xs mb-3">Welcome to the library</p>
                <h1 className="text-4xl font-serif font-bold mb-3">What do you want to write?</h1>
                <p className="text-muted-foreground">We'll help you get there.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setFirstTimeStep("write")}
                  className="bookplate p-6 rounded-sm text-left transition-all group hover:shadow-md"
                >
                  <BookOpen className="w-7 h-7 text-brass mb-3" />
                  <h2 className="text-xl font-serif font-semibold mb-2">A book</h2>
                  <p className="text-sm text-muted-foreground">Fiction, nonfiction, whatever's in your head.</p>
                  <div className="flex items-center gap-1 text-primary text-sm font-medium mt-4">
                    Get started <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
                <button
                  onClick={() => navigate("/universe")}
                  className="bookplate p-6 rounded-sm text-left transition-all group hover:shadow-md"
                >
                  <Globe className="w-7 h-7 text-brass mb-3" />
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
                  className="bookplate p-5 rounded-sm text-left transition-all group hover:shadow-md"
                >
                  <h3 className="font-semibold mb-1 font-serif">Jump in and write</h3>
                  <p className="text-sm text-muted-foreground">Start with a blank page. AI will help as you go.</p>
                  <div className="flex items-center gap-1 text-primary text-sm font-medium mt-3">
                    Start writing <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
                <button
                  onClick={() => navigate("/pipeline/new")}
                  className="bookplate p-5 rounded-sm text-left transition-all group hover:shadow-md"
                >
                  <h3 className="font-semibold mb-1 font-serif">Write an outline</h3>
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
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="catalog-label text-xs mb-1.5">The library is open</p>
            <h1 className="text-3xl font-serif font-bold">Welcome back</h1>
          </div>
          <NewBookDropdown iconSize="sm" />
        </div>
        <div className="library-rule mb-8" />

        {recentWork.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No recent work yet.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-10">
            <p className="catalog-label text-xs mb-3">On your desk — pick up where you left off</p>
            {recentWork.map(item => (
              <div
                key={`${item.type}-${item.id}`}
                className="bookplate rounded-sm hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate(item.route)}
              >
                <div className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-sm shrink-0">
                    {item.type === "book"
                      ? <BookOpen className="w-4 h-4 text-brass" />
                      : <Globe className="w-4 h-4 text-brass" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate font-serif text-base">{item.title}</p>
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
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="catalog-label text-xs mb-3">The four wings</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WINGS.map((wing, i) => (
            <button
              key={wing.label}
              onClick={() => navigate(wing.route)}
              className="bookplate p-5 rounded-sm text-left transition-all group hover:shadow-md"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-brass">{wing.icon}</span>
                <span className="catalog-label text-[11px]">{`${i + 1}. ${wing.label}`}</span>
              </div>
              <p className="font-serif font-semibold text-lg">{wing.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{wing.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
