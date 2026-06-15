import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, BookOpen, Globe, ArrowRight, Clock, ChevronRight, Sparkles, Library } from "lucide-react";
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
  const [firstTimeStep, setFirstTimeStep] = useState<FirstTimeStep>("root");
  const [newBookTitle, setNewBookTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/books").then(r => r.json()).catch(() => []),
      fetch("/api/universe").then(r => r.json()).catch(() => []),
      fetch("/api/projects").then(r => r.json()).catch(() => []),
    ]).then(([books, universes, projects]) => {
      const hasWork = books.length > 0 || universes.length > 0 || projects.length > 0;
      setIsFirstTime(!hasWork);

      // Build recent work list
      const items: any[] = [];
      for (const b of books.slice(0, 4)) {
        items.push({ type: "book", id: b.id, title: b.title, detail: `${b.chapters_written || 0}/${b.chapter_count || 0} chapters`, date: b.updated_at, route: `/book/${b.id}` });
      }
      for (const u of universes.slice(0, 2)) {
        items.push({ type: "universe", id: u.id, title: u.name, detail: `${u.series_count} series`, date: u.updated_at, route: `/universe/${u.id}` });
      }
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentWork(items.slice(0, 6));
    });
  }, []);

  const createAndGoWrite = async () => {
    if (!newBookTitle.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newBookTitle.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to create book");
      navigate(`/book/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setCreating(false);
    }
  };

  if (isFirstTime === null) return (
    <Layout>
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    </Layout>
  );

  // ── FIRST TIME ─────────────────────────────────────────────────────────────
  if (isFirstTime) return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-12">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-serif font-bold text-2xl mx-auto mb-6">
            W
          </div>
          <h1 className="text-4xl font-serif font-bold mb-3">Welcome to WriteMaster</h1>
          <p className="text-muted-foreground text-lg">What would you like to do?</p>
        </div>

        {firstTimeStep === "root" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setFirstTimeStep("write")}
              className="group p-8 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-primary/5 transition-all text-left"
            >
              <BookOpen className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h2 className="text-xl font-serif font-semibold mb-2">Start writing your first book</h2>
              <p className="text-sm text-muted-foreground">Jump straight into writing or plan it out first.</p>
              <div className="flex items-center gap-1 text-primary text-sm font-medium mt-4">
                Get started <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            <button
              onClick={() => navigate("/universe")}
              className="group p-8 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-primary/5 transition-all text-left"
            >
              <Globe className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h2 className="text-xl font-serif font-semibold mb-2">Build your first world</h2>
              <p className="text-sm text-muted-foreground">Create a universe, write a story bible, organize your series.</p>
              <div className="flex items-center gap-1 text-primary text-sm font-medium mt-4">
                Build a world <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}

        {firstTimeStep === "write" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6"
            >
              ← Back
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setFirstTimeStep("write-title")}
                className="group p-8 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-primary/5 transition-all text-left"
              >
                <Sparkles className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h2 className="text-xl font-serif font-semibold mb-2">Start writing now</h2>
                <p className="text-sm text-muted-foreground">Open the editor and start writing. No setup required.</p>
                <div className="flex items-center gap-1 text-primary text-sm font-medium mt-4">
                  Open editor <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              <button
                onClick={() => navigate("/pipeline/new")}
                className="group p-8 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-primary/5 transition-all text-left"
              >
                <Library className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h2 className="text-xl font-serif font-semibold mb-2">Write an outline</h2>
                <p className="text-sm text-muted-foreground">Plan your story with AI before you write the first word.</p>
                <div className="flex items-center gap-1 text-primary text-sm font-medium mt-4">
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
            <Button size="sm" onClick={() => navigate("/my-work?new=book")} className="gap-2">
              <BookOpen className="w-4 h-4" /> New Book
            </Button>
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
                    {item.type === "book" ? <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-primary" /> : <Globe className="w-4 h-4 text-muted-foreground group-hover:text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                      <span className="text-xs text-muted-foreground/50">·</span>
                      <span className="text-xs text-muted-foreground">{item.detail}</span>
                      <span className="text-xs text-muted-foreground/50">·</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground/50" />
                        <span className="text-xs text-muted-foreground/70">{formatDate(item.date)}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground shrink-0 transition-colors" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {recentWork.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/my-work?new=book")}
              className="p-4 rounded-lg border border-border/60 hover:border-primary/30 text-left transition-all group"
            >
              <BookOpen className="w-5 h-5 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
              <p className="text-sm font-medium">New Book</p>
              <p className="text-xs text-muted-foreground mt-0.5">Start writing or outlining</p>
            </button>
            <button
              onClick={() => navigate("/universe")}
              className="p-4 rounded-lg border border-border/60 hover:border-primary/30 text-left transition-all group"
            >
              <Globe className="w-5 h-5 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
              <p className="text-sm font-medium">New Universe</p>
              <p className="text-xs text-muted-foreground mt-0.5">Build a world or series</p>
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
