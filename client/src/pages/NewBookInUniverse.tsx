import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, BookOpen, Sparkles, PenTool, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface Universe {
  id: string;
  name: string;
  bible: string;
  series_ids: string[];
}

interface Series {
  id: string;
  name: string;
  book_ids: string[];
}

interface Genre {
  id: string;
  display_name: string;
}

export default function NewBookInUniverse() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const universeId = params.id;

  const [universe, setUniverse] = useState<Universe | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookTitle, setBookTitle] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("standalone");
  const [genre, setGenre] = useState("");

  useEffect(() => {
    if (!universeId) return;
    Promise.all([
      fetch(`/api/universe/${universeId}`).then(r => r.json()),
      fetch(`/api/universe/${universeId}/series`).then(r => r.json()),
      fetch("/api/genres").then(r => r.json()),
    ]).then(([u, s, g]) => {
      setUniverse(u);
      setSeries(s);
      setGenres(g);
    }).catch(() => setError("Failed to load universe"))
    .finally(() => setLoading(false));
  }, [universeId]);

  const startWritingNow = async () => {
    if (!bookTitle.trim()) return;
    setCreating(true);
    setError(null);
    try {
      // Create pantser book
      const r = await fetch("/api/books/pantser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: bookTitle.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);

      // Assign to universe
      await fetch(`/api/universe/${universeId}/assign-book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: data.id,
          series_id: selectedSeriesId === "standalone" ? null : selectedSeriesId,
        }),
      });

      navigate(`/book/${data.id}/write/1`);
    } catch (err: any) {
      setError(err.message);
      setCreating(false);
    }
  };

  const startOutlining = async () => {
    if (!genre) { setError("Select a genre first"); return; }
    setCreating(true);
    setError(null);
    try {
      // Start guided session with universe bible pre-seeded
      const r = await fetch("/api/outline/guided/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre,
          universe_id: universeId,
          series_id: selectedSeriesId === "standalone" ? null : selectedSeriesId,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);

      // Store context for PipelineNew to pick up
      sessionStorage.setItem("outline_session", JSON.stringify({
        session_id: data.session_id,
        universe_id: universeId,
        series_id: selectedSeriesId === "standalone" ? null : selectedSeriesId,
        book_title: bookTitle.trim() || null,
      }));

      navigate(`/outline/guided/${data.session_id}`);
    } catch (err: any) {
      setError(err.message);
      setCreating(false);
    }
  };

  if (loading) return (
    <Layout>
      <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
    </Layout>
  );

  if (!universe) return (
    <Layout><div className="text-center py-20 text-muted-foreground">Universe not found.</div></Layout>
  );

  const hasBible = !!universe.bible?.trim();

  return (
    <Layout>
      <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/universe/${universeId}`)} className="gap-2 -ml-2 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to {universe.name}
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-2xl font-serif font-bold">New Book</h1>
              <p className="text-sm text-muted-foreground">{universe.name}</p>
            </div>
          </div>
          {hasBible && (
            <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary/80 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Story bible detected — world-building questions will be skipped and the AI will focus on this book's specific plot and characters.
            </div>
          )}
        </div>

        {/* Settings */}
        <Card className="border-border/60">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label>Book Title (optional)</Label>
              <Input
                value={bookTitle}
                onChange={e => setBookTitle(e.target.value)}
                placeholder="Working title — you can change this later"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Series</Label>
              <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select series or standalone..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standalone">Standalone (no series)</SelectItem>
                  {series.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Genre <span className="text-xs text-muted-foreground">(required for outlining)</span></Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger>
                  <SelectValue placeholder="Select genre..." />
                </SelectTrigger>
                <SelectContent>
                  {genres.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Path choice */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={startWritingNow}
            disabled={creating}
            className="group p-5 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-primary/5 transition-all text-left space-y-2"
          >
            <PenTool className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            <p className="font-semibold">Start writing now</p>
            <p className="text-xs text-muted-foreground">Open the editor immediately. No outline required.</p>
          </button>

          <button
            onClick={startOutlining}
            disabled={creating || !genre}
            className={cn(
              "group p-5 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-primary/5 transition-all text-left space-y-2",
              !genre && "opacity-50 cursor-not-allowed"
            )}
          >
            <Sparkles className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            <p className="font-semibold">Write an outline</p>
            <p className="text-xs text-muted-foreground">
              {hasBible ? "AI interview focused on plot — world is pre-loaded." : "AI-guided story development interview."}
            </p>
          </button>
        </div>

        {creating && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Setting up...</span>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Layout>
  );
}
