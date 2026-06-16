import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/Layout";
import PipelineRunner, { type PipelineStepDef } from "@/components/PipelineRunner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, BookOpen, Users, Globe, List, CheckCircle2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const P2_STEPS: PipelineStepDef[] = [
  { id: 0, name: "Initialization", desc: "Setting up Pipeline 2", model: "cheap" },
  { id: 1, name: "Character Sheet — Draft", desc: "Expanding all characters with full psychology, sliders, and voice", model: "powerful" },
  { id: 2, name: "Character Sheet — Completeness Check", desc: "Verifying all dossier characters are covered", model: "cheap" },
  { id: 3, name: "Character Sheet — Final", desc: "Implementing completeness fixes", model: "cheap" },
  { id: 4, name: "World-Building — Draft", desc: "Building locations, factions, rules, and atmosphere guide", model: "powerful" },
  { id: 5, name: "World-Building — Consistency Check", desc: "Verifying internal coherence", model: "cheap" },
  { id: 6, name: "World-Building — Final", desc: "Implementing consistency fixes", model: "cheap" },
  { id: 7, name: "Chapter Outline — Draft", desc: "Writing chapter-by-chapter outline with beats and sliders", model: "powerful" },
  { id: 8, name: "Chapter Outline — Continuity Check", desc: "Verifying outline matches dossier beats", model: "powerful" },
  { id: 9, name: "Chapter Outline — Final", desc: "Implementing continuity fixes", model: "cheap" },
];

type P2Phase = "config" | "running" | "done";

interface P2State {
  pipeline2_id: string;
  current_step: number;
  character_sheet_final: string;
  world_building_final: string;
  outline_final: string;
}

interface BookMeta {
  id: string;
  title: string;
  dossier: string;
  source_project_id: string | null;
}

export default function BookBuild() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const bookId = params.id;

  const [phase, setPhase] = useState<P2Phase>("config");
  const [book, setBook] = useState<BookMeta | null>(null);
  const [loadingBook, setLoadingBook] = useState(true);
  const [targetChapters, setTargetChapters] = useState(30);
  const [genre, setGenre] = useState("");
  const [p2Id, setP2Id] = useState<string | null>(null);
  const [p2State, setP2State] = useState<P2State | null>(null);
  const [starting, setStarting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [activeTab, setActiveTab] = useState<"characters" | "world" | "outline">("characters");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    fetch(`/api/books/${bookId}`)
      .then(r => r.json())
      .then(data => { setBook(data); if (data.source_project_id) fetchGenre(data.source_project_id); })
      .catch(() => setError("Failed to load book"))
      .finally(() => setLoadingBook(false));
  }, [bookId]);

  const fetchGenre = async (projectId: string) => {
    try {
      const r = await fetch(`/api/project/${projectId}/state`);
      if (r.ok) { const d = await r.json(); setGenre(d.genre ?? ""); }
    } catch {}
  };

  const startPipeline = async () => {
    if (!bookId) return;
    setStarting(true);
    setError(null);
    try {
      const r = await fetch(`/api/books/${bookId}/pipeline2/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_chapters: targetChapters, genre }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to start");
      setP2Id(data.pipeline2_id);
      setPhase("running");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const runStep = useCallback(async () => {
    if (!p2Id) throw new Error("No pipeline session");
    const r = await fetch(`/api/pipeline2/${p2Id}/run-step`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Step failed");
    return data;
  }, [p2Id]);

  const onPipelineComplete = async () => {
    if (!p2Id) return;
    const r = await fetch(`/api/pipeline2/${p2Id}/state`);
    if (r.ok) { const d = await r.json(); setP2State(d); }
    setPhase("done");
  };

  const applyToBook = async () => {
    if (!p2Id) return;
    setApplying(true);
    try {
      const r = await fetch(`/api/pipeline2/${p2Id}/apply-to-book`, { method: "POST" });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      setApplied(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  if (loadingBook) return (
    <Layout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></Layout>
  );

  if (!book) return (
    <Layout><div className="text-center py-20 text-muted-foreground">Book not found.</div></Layout>
  );

  // ── CONFIG ────────────────────────────────────────────────────────────────
  if (phase === "config") return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/book/${bookId}`)} className="gap-2 mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back to Book
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg"><BookOpen className="w-5 h-5 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-serif font-bold">Expand Dossier</h1>
              <p className="text-muted-foreground text-sm">{book.title}</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            Pipeline 2 takes your Story Dossier and expands it into three full working documents:
            a Character Sheet, a World-Building guide, and a Chapter Outline — ready for the advanced chapter writer.
          </p>
        </div>

        {!book.dossier && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm">
            This book has no Story Dossier. Complete Pipeline 1 first, then create a book from the result.
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: <Users className="w-5 h-5" />, label: "Character Sheet", desc: "Full profiles with psychology, sliders, and voice reference" },
            { icon: <Globe className="w-5 h-5" />, label: "World-Building", desc: "Locations, factions, rules, atmosphere, and reveal timing" },
            { icon: <List className="w-5 h-5" />, label: "Chapter Outline", desc: "Chapter-by-chapter beats, POV, word counts, and cliffhangers" },
          ].map(item => (
            <Card key={item.label} className="border-border/60">
              <CardContent className="p-4 text-center space-y-2">
                <div className="flex justify-center text-primary">{item.icon}</div>
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="chapters">Target Chapter Count</Label>
              <Input
                id="chapters"
                type="number"
                min={5}
                max={100}
                value={targetChapters}
                onChange={e => setTargetChapters(parseInt(e.target.value) || 30)}
                className="max-w-[120px]"
              />
              <p className="text-xs text-muted-foreground">The outline will be structured for approximately this many chapters.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="genre">Genre (optional override)</Label>
              <Input
                id="genre"
                placeholder={genre || "auto-detect from dossier"}
                value={genre}
                onChange={e => setGenre(e.target.value)}
                className="max-w-[280px]"
              />
              <p className="text-xs text-muted-foreground">Leave blank to use your source pipeline genre.</p>
            </div>
          </CardContent>
        </Card>

        {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

        <Button
          onClick={startPipeline}
          disabled={starting || !book.dossier}
          size="lg"
          className="w-full gap-2"
        >
          {starting ? <><Loader2 className="w-4 h-4 animate-spin" />Starting...</> : "Run Pipeline 2 →"}
        </Button>
      </div>
    </Layout>
  );

  // ── RUNNING ───────────────────────────────────────────────────────────────
  if (phase === "running") return (
    <Layout>
      <PipelineRunner
        title="Expanding Dossier"
        subtitle={book.title}
        steps={P2_STEPS}
        runStepFn={runStep}
        onComplete={onPipelineComplete}
        completeLabel="View & Apply Results →"
      >
        <Card className="bg-muted/30 border-none shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Outputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { icon: <Users className="w-4 h-4" />, label: "Character Sheet" },
              { icon: <Globe className="w-4 h-4" />, label: "World-Building" },
              { icon: <List className="w-4 h-4" />, label: "Chapter Outline" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 text-muted-foreground">
                {item.icon}
                <span>{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-none shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Target</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{targetChapters} chapters</p>
            {genre && <p className="capitalize">{genre.replace(/_/g, " ")}</p>}
          </CardContent>
        </Card>
      </PipelineRunner>
    </Layout>
  );

  // ── DONE ──────────────────────────────────────────────────────────────────
  const tabs = [
    { key: "characters" as const, label: "Character Sheet", icon: <Users className="w-4 h-4" />, content: p2State?.character_sheet_final },
    { key: "world" as const, label: "World-Building", icon: <Globe className="w-4 h-4" />, content: p2State?.world_building_final },
    { key: "outline" as const, label: "Chapter Outline", icon: <List className="w-4 h-4" />, content: p2State?.outline_final },
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto animate-in fade-in duration-500 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/book/${bookId}`)} className="gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back to Book
            </Button>
            <h1 className="text-2xl font-serif font-bold mt-2">Pipeline 2 Complete</h1>
            <p className="text-muted-foreground text-sm">{book.title}</p>
          </div>
          <div className="flex gap-3">
            {!applied ? (
              <Button onClick={applyToBook} disabled={applying} className="gap-2">
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Apply to Book
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-700/10 px-3 py-2 rounded-md">
                <CheckCircle2 className="w-4 h-4" />
                Applied to book
              </div>
            )}
            {applied && (
              <Button onClick={() => navigate(`/book/${bookId}`)} className="gap-2">
                <BookOpen className="w-4 h-4" /> Start Writing →
              </Button>
            )}
          </div>
        </div>

        {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

        {/* Tabs */}
        <div className="border-b border-border/40 flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tabs.map(tab => (
          activeTab === tab.key && (
            <Card key={tab.key} className="border-border/60">
              <CardContent className="p-6">
                {tab.content ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed text-foreground max-h-[70vh] overflow-y-auto">
                    {tab.content}
                  </pre>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">No content yet.</div>
                )}
              </CardContent>
            </Card>
          )
        ))}
      </div>
    </Layout>
  );
}
