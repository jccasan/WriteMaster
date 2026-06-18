import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, ArrowRight, Sparkles, BookOpen, Users, Globe,
  Pause, Play, Check, ChevronDown, ChevronUp, X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscoveredWorld {
  characters: Array<{ name: string; notes: string; first_chapter: number; last_seen_chapter: number }>;
  world_facts: string[];
  open_threads: string[];
  last_extracted_chapter: number;
}

interface PantserSidebarProps {
  bookId: string;
  chapterNum: number;
  chapterTitle: string;
  totalChapters: number;
  onChapterWritten: (content: string) => void;
  onNavigateToChapter?: (num: number) => void;
}

type SidebarTab = "write" | "world";
type WriteMode = "chapter" | "batch" | "book";

export default function PantserSidebar({
  bookId,
  chapterNum,
  chapterTitle,
  totalChapters,
  onChapterWritten,
  onNavigateToChapter,
}: PantserSidebarProps) {
  const [tab, setTab] = useState<SidebarTab>("write");
  const [writeMode, setWriteMode] = useState<WriteMode>("chapter");
  const [premise, setPremise] = useState("");
  const [tense, setTense] = useState<"past" | "present">("past");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autopilot state
  const [autopilotJobId, setAutopilotJobId] = useState<string | null>(null);
  const [autopilotStatus, setAutopilotStatus] = useState<any>(null);
  const [bookChapterCount, setBookChapterCount] = useState(30);
  const [batchCount, setBatchCount] = useState(2);

  // Discovered world
  const [world, setWorld] = useState<DiscoveredWorld | null>(null);
  const [worldExpanded, setWorldExpanded] = useState<"characters" | "facts" | "threads" | null>(null);

  const loadWorld = useCallback(async () => {
    const r = await fetch(`/api/books/${bookId}/discovered-world`);
    if (r.ok) setWorld(await r.json());
  }, [bookId]);

  useEffect(() => { loadWorld(); }, [loadWorld, chapterNum]);

  // Poll autopilot status
  useEffect(() => {
    if (!autopilotJobId) return;
    const interval = setInterval(async () => {
      const r = await fetch(`/api/autopilot/${autopilotJobId}/status`);
      if (r.ok) {
        const status = await r.json();
        setAutopilotStatus(status);
        if (status.status === "done" || status.status === "error") {
          clearInterval(interval);
          loadWorld();
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [autopilotJobId, loadWorld]);

  const writeFast = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/books/${bookId}/chapters/${chapterNum}/write-fast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ premise, tense }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Write failed");
      onChapterWritten(d.content);
      await loadWorld();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startAutopilot = async () => {
    setLoading(true);
    setError(null);
    const isBatch = writeMode === "batch";
    const chapterCount = isBatch
      ? chapterNum + batchCount - 1  // write from current chapter to current + batchCount
      : bookChapterCount;
    try {
      const r = await fetch(`/api/books/${bookId}/autopilot/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          premise,
          tense,
          chapter_count: chapterCount,
          start_chapter: chapterNum,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to start");
      setAutopilotJobId(d.job_id);
      setAutopilotStatus({
        status: "running",
        current_chapter: d.starting_chapter,
        total_chapters: chapterCount,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pauseAutopilot = async () => {
    if (!autopilotJobId) return;
    await fetch(`/api/autopilot/${autopilotJobId}/pause`, { method: "POST" });
    setAutopilotStatus((s: any) => ({ ...s, status: "paused" }));
  };

  const worldCharCount = world?.characters.length ?? 0;
  const worldFactCount = world?.world_facts.length ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border/40 shrink-0">
        <button
          onClick={() => setTab("write")}
          className={cn("flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors",
            tab === "write" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="w-3 h-3" /> AI Write
        </button>
        <button
          onClick={() => setTab("world")}
          className={cn("flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors relative",
            tab === "world" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Globe className="w-3 h-3" /> World
          {(worldCharCount + worldFactCount) > 0 && (
            <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </button>
      </div>

      {/* ── WRITE TAB ──────────────────────────────────────────────────────── */}
      {tab === "write" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active autopilot */}
          {autopilotStatus && autopilotStatus.status !== "done" && (
            <div className={cn("p-3 rounded-lg border space-y-2",
              autopilotStatus.status === "running" ? "border-primary/30 bg-primary/5" :
              autopilotStatus.status === "error" ? "border-destructive/30 bg-destructive/5" :
              "border-border/40 bg-muted/20"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  {autopilotStatus.status === "running" ? "Writing book..." :
                   autopilotStatus.status === "paused" ? "Paused" :
                   autopilotStatus.status === "done" ? "Complete" : "Error"}
                </span>
                {autopilotStatus.status === "running" && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={pauseAutopilot}>
                    <Pause className="w-3 h-3" /> Pause
                  </Button>
                )}
                {autopilotStatus.status === "paused" && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-primary" onClick={startAutopilot}>
                    <Play className="w-3 h-3" /> Resume
                  </Button>
                )}
              </div>
              {autopilotStatus.status !== "done" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Chapter {autopilotStatus.current_chapter} of {autopilotStatus.total_chapters}</span>
                    <span>{Math.round((autopilotStatus.current_chapter / autopilotStatus.total_chapters) * 100)}%</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(autopilotStatus.current_chapter / autopilotStatus.total_chapters) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {autopilotStatus.status === "done" && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> All {autopilotStatus.total_chapters} chapters written
                </p>
              )}
              {autopilotStatus.error && (
                <p className="text-xs text-destructive">{autopilotStatus.error}</p>
              )}
            </div>
          )}

          {/* Mode selector */}
          {(!autopilotStatus || autopilotStatus.status === "done") && (
            <>
              <div className="flex gap-1">
                {([
                  { key: "chapter" as const, label: "This Chapter" },
                  { key: "batch" as const, label: "Next N Chapters" },
                  { key: "book" as const, label: "Whole Book" },
                ]).map(m => (
                  <button
                    key={m.key}
                    onClick={() => setWriteMode(m.key)}
                    className={cn("flex-1 py-1.5 text-xs rounded border transition-colors",
                      writeMode === m.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Tense */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Tense:</span>
                {(["past", "present"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTense(t)}
                    className={cn("px-2 py-0.5 text-xs rounded border transition-colors",
                      tense === t ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Batch count */}
              {writeMode === "batch" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Write next:</span>
                  <div className="flex gap-1">
                    {[2, 3, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setBatchCount(n)}
                        className={cn("px-2.5 py-1 text-xs rounded border transition-colors",
                          batchCount === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                    <span className="text-xs text-muted-foreground self-center">chapters</span>
                  </div>
                </div>
              )}

              {/* Premise input */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  {writeMode === "chapter"
                    ? `Direction for Chapter ${chapterNum} (optional)`
                    : writeMode === "batch"
                    ? `Direction for next ${batchCount} chapters (optional)`
                    : "Story premise (optional)"}
                </label>
                <Textarea
                  value={premise}
                  onChange={e => setPremise(e.target.value)}
                  placeholder={writeMode === "chapter"
                    ? "e.g. She finds the letter and confronts him..."
                    : "e.g. A detective discovers her partner works for the cartel..."
                  }
                  className="text-xs resize-none h-20"
                />
              </div>

              {/* Book chapter count if writing whole book */}
              {writeMode === "book" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Total chapters:</span>
                  <select
                    value={bookChapterCount}
                    onChange={e => setBookChapterCount(parseInt(e.target.value))}
                    className="h-7 text-xs rounded border border-border bg-background px-1.5"
                  >
                    {[10, 15, 20, 25, 30, 40, 50].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              )}

              {error && <p className="text-xs text-destructive">{error}</p>}

              {/* Write button */}
              <Button
                onClick={writeMode === "chapter" ? writeFast : startAutopilot}
                disabled={loading}
                className="w-full gap-2"
                size="sm"
              >
                {loading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing...</>
                  : writeMode === "chapter"
                  ? <><Sparkles className="w-3.5 h-3.5" /> Write Chapter {chapterNum}</>
                  : writeMode === "batch"
                  ? <><Sparkles className="w-3.5 h-3.5" /> Write Next {batchCount} Chapters</>
                  : <><Sparkles className="w-3.5 h-3.5" /> Write {bookChapterCount} Chapters</>
                }
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                {writeMode === "batch"
                  ? `Writes chapters ${chapterNum}–${chapterNum + batchCount - 1} · ~${batchCount * 30}s`
                  : "Fast mode · ~30 sec per chapter"
                }
              </p>
            </>
          )}
        </div>
      )}

      {/* ── WORLD TAB ──────────────────────────────────────────────────────── */}
      {tab === "world" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(!world || (world.characters.length === 0 && world.world_facts.length === 0)) ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Your world will appear here as you write.</p>
              <p className="text-xs mt-1">Characters, facts, and open threads are extracted automatically.</p>
            </div>
          ) : (
            <>
              {/* Characters */}
              {world.characters.length > 0 && (
                <div>
                  <button
                    onClick={() => setWorldExpanded(worldExpanded === "characters" ? null : "characters")}
                    className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 hover:text-foreground transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> Characters ({world.characters.length})
                    </span>
                    {worldExpanded === "characters" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {worldExpanded === "characters" && (
                    <div className="space-y-2">
                      {world.characters.map((char, i) => (
                        <div key={i} className="p-2 rounded bg-muted/30 border border-border/40">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium">{char.name}</span>
                            <span className="text-xs text-muted-foreground">Ch. {char.first_chapter}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{char.notes}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* World facts */}
              {world.world_facts.length > 0 && (
                <div>
                  <button
                    onClick={() => setWorldExpanded(worldExpanded === "facts" ? null : "facts")}
                    className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 hover:text-foreground transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> World Facts ({world.world_facts.length})
                    </span>
                    {worldExpanded === "facts" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {worldExpanded === "facts" && (
                    <div className="space-y-1">
                      {world.world_facts.map((fact, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <span className="text-primary mt-0.5 shrink-0">·</span>
                          <span>{fact}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Open threads */}
              {world.open_threads.length > 0 && (
                <div>
                  <button
                    onClick={() => setWorldExpanded(worldExpanded === "threads" ? null : "threads")}
                    className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 hover:text-foreground transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" /> Open Threads ({world.open_threads.length})
                    </span>
                    {worldExpanded === "threads" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {worldExpanded === "threads" && (
                    <div className="space-y-1">
                      {world.open_threads.map((thread, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <span className="text-amber-500 mt-0.5 shrink-0">·</span>
                          <span>{thread}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                Last updated after Ch. {world.last_extracted_chapter}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
