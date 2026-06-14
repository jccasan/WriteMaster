import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, ArrowLeft, CheckCircle2, X, AlertCircle, Globe,
  Users, BookOpen, ChevronDown, ChevronUp, Upload, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

type Resolution = "accepted" | "rejected" | "accepted_as_series_exception" | "applied_to_bible";
type ItemType = "book_summary" | "new_character" | "character_update" | "character_status_change" | "bible_conflict" | "world_building_addition" | "world_state_update" | "series_exception";

interface ReviewItem {
  id: string;
  type: ItemType;
  title: string;
  description: string;
  current_value: string;
  proposed_value: string;
  character_name?: string;
  conflict_severity?: "critical" | "significant" | "minor";
  resolution: Resolution | null;
  resolution_note?: string;
}

interface PushSession {
  push_session_id: string;
  universe_id: string;
  series_id: string | null;
  book_id: string;
  book_title: string;
  phase: "generating" | "review" | "applying" | "complete" | "error";
  error?: string;
  book_summary: string;
  review_items: ReviewItem[];
}

const TYPE_LABELS: Record<ItemType, string> = {
  book_summary: "Book Summary",
  new_character: "New Character",
  character_update: "Character Update",
  character_status_change: "Status Change",
  bible_conflict: "Bible Conflict",
  world_building_addition: "World-Building",
  world_state_update: "World State",
  series_exception: "Series Exception",
};

const TYPE_COLORS: Record<ItemType, string> = {
  book_summary: "border-blue-500 text-blue-600",
  new_character: "border-green-600 text-green-600",
  character_update: "border-emerald-500 text-emerald-600",
  character_status_change: "border-orange-500 text-orange-600",
  bible_conflict: "border-red-500 text-red-600",
  world_building_addition: "border-purple-500 text-purple-600",
  world_state_update: "border-cyan-500 text-cyan-600",
  series_exception: "border-amber-500 text-amber-600",
};

function ResolutionButtons({ item, hasSeries, onResolve }: {
  item: ReviewItem;
  hasSeries: boolean;
  onResolve: (id: string, resolution: Resolution, note?: string) => void;
}) {
  const [note, setNote] = useState("");
  const isConflict = item.type === "bible_conflict";

  return (
    <div className="mt-3 space-y-2">
      {isConflict && (
        <Textarea
          placeholder="Optional note about this resolution..."
          value={note}
          onChange={e => setNote(e.target.value)}
          className="text-xs resize-none h-16"
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline"
          className={cn("h-7 text-xs gap-1", item.resolution === "accepted" && "bg-green-700/10 border-green-700 text-green-700")}
          onClick={() => onResolve(item.id, "accepted", note)}>
          <Check className="w-3 h-3" /> Accept
        </Button>
        {isConflict && (
          <Button size="sm" variant="outline"
            className={cn("h-7 text-xs gap-1", item.resolution === "applied_to_bible" && "bg-blue-500/10 border-blue-500 text-blue-600")}
            onClick={() => onResolve(item.id, "applied_to_bible", note)}>
            <BookOpen className="w-3 h-3" /> Update Bible
          </Button>
        )}
        {(isConflict || item.type === "world_building_addition") && hasSeries && (
          <Button size="sm" variant="outline"
            className={cn("h-7 text-xs gap-1", item.resolution === "accepted_as_series_exception" && "bg-amber-500/10 border-amber-500 text-amber-600")}
            onClick={() => onResolve(item.id, "accepted_as_series_exception", note)}>
            Series Exception
          </Button>
        )}
        <Button size="sm" variant="outline"
          className={cn("h-7 text-xs gap-1 text-destructive hover:text-destructive", item.resolution === "rejected" && "bg-destructive/10 border-destructive text-destructive")}
          onClick={() => onResolve(item.id, "rejected", note)}>
          <X className="w-3 h-3" /> Reject
        </Button>
      </div>
    </div>
  );
}

export default function PushToUniverse() {
  const params = useParams<{ universeId: string; bookId: string }>();
  const [, navigate] = useLocation();

  const [session, setSession] = useState<PushSession | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<ItemType | "all">("all");

  // Start the push session
  useEffect(() => {
    if (!params.universeId || !params.bookId) return;
    fetch(`/api/universe/${params.universeId}/push/${params.bookId}`, { method: "POST" })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setSessionId(data.push_session_id);
        setStarting(false);
      })
      .catch(err => { setError(err.message); setStarting(false); });
  }, [params.universeId, params.bookId]);

  // Poll for session state
  const poll = useCallback(async () => {
    if (!sessionId) return;
    const r = await fetch(`/api/universe/push-session/${sessionId}`);
    if (r.ok) {
      const data = await r.json();
      setSession(data);
      return data.phase;
    }
    return null;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(async () => {
      const phase = await poll();
      if (phase === "review" || phase === "complete" || phase === "error") {
        clearInterval(interval);
      }
    }, 2000);
    poll(); // immediate first poll
    return () => clearInterval(interval);
  }, [sessionId, poll]);

  const resolveItem = async (itemId: string, resolution: Resolution, note?: string) => {
    if (!sessionId) return;
    const r = await fetch(`/api/universe/push-session/${sessionId}/resolve/${itemId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution, resolution_note: note }),
    });
    if (r.ok) await poll();
  };

  const bulkResolve = async (resolution: Resolution, types?: ItemType[]) => {
    if (!sessionId) return;
    await fetch(`/api/universe/push-session/${sessionId}/bulk-resolve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution, types }),
    });
    await poll();
  };

  const applyAll = async () => {
    if (!sessionId) return;
    setApplying(true);
    setError(null);
    try {
      const r = await fetch(`/api/universe/push-session/${sessionId}/apply`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setApplied(true);
      await poll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const toggleItem = (id: string) => {
    setExpandedItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  if (starting || (!session && !error)) return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Starting push analysis...</p>
      </div>
    </Layout>
  );

  if (error && !session) return (
    <Layout>
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate(`/universe/${params.universeId}`)}>Back to Universe</Button>
      </div>
    </Layout>
  );

  const isGenerating = session?.phase === "generating";
  const isReview = session?.phase === "review";
  const isApplying = session?.phase === "applying";
  const isComplete = session?.phase === "complete";
  const isError = session?.phase === "error";

  const items = session?.review_items ?? [];
  const pending = items.filter(i => !i.resolution).length;
  const resolved = items.filter(i => i.resolution).length;
  const filteredItems = typeFilter === "all" ? items : items.filter(i => i.type === typeFilter);
  const hasSeries = !!session?.series_id;

  const typeCounts = items.reduce((acc, i) => { acc[i.type] = (acc[i.type] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto animate-in fade-in duration-500 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/universe/${params.universeId}`)} className="gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back to Universe
            </Button>
            <h1 className="text-2xl font-serif font-bold mt-2">Push to Universe</h1>
            <p className="text-muted-foreground text-sm">{session?.book_title}</p>
          </div>
          {isReview && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{resolved}/{items.length} resolved</p>
              <p className="text-xs text-muted-foreground">{pending} pending</p>
            </div>
          )}
        </div>

        {/* Status bar */}
        {isGenerating && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div>
                <p className="font-medium text-sm">Analyzing book...</p>
                <p className="text-xs text-muted-foreground">Extracting characters, detecting conflicts, building review items. This takes 30-90 seconds.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isError && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">{session?.error ?? "An error occurred."}</p>
            </CardContent>
          </Card>
        )}

        {isComplete && (
          <Card className="border-green-600/30 bg-green-600/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-sm text-green-700">Push complete</p>
                <p className="text-xs text-muted-foreground">All accepted items have been applied to the universe.</p>
              </div>
              <Button onClick={() => navigate(`/universe/${params.universeId}`)} size="sm" variant="outline">
                View Universe
              </Button>
            </CardContent>
          </Card>
        )}

        {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

        {/* Review UI */}
        {isReview && (
          <>
            {/* Bulk actions + type filters */}
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium">Bulk:</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => bulkResolve("accepted")}>
                    <Check className="w-3 h-3" /> Accept All Pending
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => bulkResolve("accepted", ["new_character", "character_update"])}>
                    <Users className="w-3 h-3" /> Accept All Characters
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => bulkResolve("accepted", ["world_building_addition"])}>
                    <Globe className="w-3 h-3" /> Accept All World-Building
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTypeFilter("all")}
                    className={cn("px-2.5 py-1 rounded text-xs border transition-colors", typeFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}
                  >
                    All ({items.length})
                  </button>
                  {Object.entries(typeCounts).map(([type, count]) => (
                    <button key={type} onClick={() => setTypeFilter(type as ItemType)}
                      className={cn("px-2.5 py-1 rounded text-xs border transition-colors", typeFilter === type ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}
                    >
                      {TYPE_LABELS[type as ItemType]} ({count})
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Review items */}
            <div className="space-y-2">
              {filteredItems.map(item => {
                const isExpanded = expandedItems.has(item.id);
                const isResolved = !!item.resolution;
                return (
                  <Card key={item.id} className={cn("border-border/60 transition-colors", isResolved && "opacity-70")}>
                    <CardContent className="p-0">
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
                      >
                        <div className="mt-0.5 shrink-0">
                          {isResolved ? (
                            item.resolution === "rejected"
                              ? <X className="w-4 h-4 text-muted-foreground" />
                              : <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={cn("text-xs h-4 px-1.5 shrink-0", TYPE_COLORS[item.type])}>
                              {TYPE_LABELS[item.type]}
                            </Badge>
                            {item.conflict_severity && (
                              <Badge variant="outline" className={cn("text-xs h-4 px-1.5", {
                                "border-red-500 text-red-500": item.conflict_severity === "critical",
                                "border-orange-500 text-orange-500": item.conflict_severity === "significant",
                                "border-yellow-500 text-yellow-500": item.conflict_severity === "minor",
                              })}>
                                {item.conflict_severity}
                              </Badge>
                            )}
                            <span className="text-sm font-medium truncate">{item.title}</span>
                          </div>
                          {isResolved && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              → {item.resolution?.replace(/_/g, " ")}
                            </p>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border/40 px-4 pb-4 pt-3 space-y-3">
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          {item.current_value && item.current_value !== "(not in menagerie)" && item.current_value !== "(not in bible)" && item.current_value !== "(no summary exists yet)" && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Current</p>
                              <pre className="text-xs font-mono bg-muted/40 p-2 rounded whitespace-pre-wrap break-words max-h-32 overflow-y-auto">{item.current_value}</pre>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Proposed</p>
                            <pre className="text-xs font-mono bg-muted/40 p-2 rounded whitespace-pre-wrap break-words max-h-48 overflow-y-auto">{item.proposed_value}</pre>
                          </div>
                          <ResolutionButtons item={item} hasSeries={hasSeries} onResolve={resolveItem} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Apply bar */}
            <div className="sticky bottom-4 bg-background/95 backdrop-blur border border-border rounded-lg p-4 shadow-lg flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{pending > 0 ? `${pending} items still pending` : "All items resolved"}</p>
                <p className="text-xs text-muted-foreground">
                  {resolved} resolved · {items.filter(i => i.resolution === "accepted" || i.resolution === "applied_to_bible").length} will be applied
                </p>
              </div>
              <Button
                onClick={applyAll}
                disabled={applying || pending > 0}
                className="gap-2 shrink-0"
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Apply to Universe
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
