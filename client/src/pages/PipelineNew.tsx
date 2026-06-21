import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Sparkles, MessageCircle, FileText, Layers,
  AlertTriangle, Check, ChevronDown, ChevronUp, Plus, Minus,
  ArrowRight, Send, Save, X
} from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "pick" | "guided" | "braindump" | "hybrid";

interface Genre { id: string; display_name: string; }

interface ContradictionFlag {
  id: string;
  description: string;
  earlier_statement: string;
  current_statement: string;
  question_numbers: [number, number];
  resolved: boolean;
}

interface GuidedMessage {
  role: "ai" | "user";
  content: string;
  question_number?: number;
  contradiction_flag?: ContradictionFlag;
}

interface GuidedSession {
  session_id: string;
  phase: string;
  messages: GuidedMessage[];
  contradictions: ContradictionFlag[];
  question_count: number;
  max_questions: number;
  project_id: string | null;
}

interface HybridQuestion {
  id: string;
  label: string;
  placeholder: string;
}

interface OutlineChapter {
  num: number;
  title: string;
  beats: string;
}

export default function PipelineNew() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("pick");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genre, setGenre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [dismissedSessions, setDismissedSessions] = useState<Set<string>>(new Set());

  // Guided state
  const [guidedSession, setGuidedSession] = useState<GuidedSession | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [readyToSynthesize, setReadyToSynthesize] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [contradictionLogOpen, setContradictionLogOpen] = useState(true);
  const [newContradiction, setNewContradiction] = useState<ContradictionFlag | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Brain dump state
  const [bdTitle, setBdTitle] = useState("");
  const [bdProtagonist, setBdProtagonist] = useState("");
  const [bdConflict, setBdConflict] = useState("");
  const [bdWorld, setBdWorld] = useState("");
  const [bdFreeform, setBdFreeform] = useState("");
  const [bdChapters, setBdChapters] = useState<OutlineChapter[]>([]);
  const [showOutline, setShowOutline] = useState(false);
  const [suggestingBeats, setSuggestingBeats] = useState(false);

  // Hybrid state
  const [hybridQuestions, setHybridQuestions] = useState<HybridQuestion[]>([]);
  const [hybridAnswers, setHybridAnswers] = useState<Record<string, string>>({});
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [expandedFollowUps, setExpandedFollowUps] = useState<Record<string, string>>({});
  const [loadingExpand, setLoadingExpand] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/genres").then(r => r.json()).then(setGenres).catch(() => {});
    fetch("/api/outline/hybrid/questions").then(r => r.json()).then(d => setHybridQuestions(d.questions ?? [])).catch(() => {});

    // Load in-progress sessions
    fetch("/api/outline/guided")
      .then(r => r.json())
      .then(sessions => setSavedSessions(Array.isArray(sessions) ? sessions : []))
      .catch(() => {});

    // Check for a pre-started guided session (from NewBookInUniverse)
    const stored = sessionStorage.getItem("outline_session");
    if (stored) {
      sessionStorage.removeItem("outline_session");
      try {
        const parsed = JSON.parse(stored);
        if (parsed.session_id) {
          fetch(`/api/outline/guided/${parsed.session_id}`)
            .then(r => r.json())
            .then(session => {
              setGuidedSession(session);
              setGenre(session.genre);
              setMode("guided");
            })
            .catch(() => {});
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [guidedSession?.messages]);

  // ── GUIDED ──────────────────────────────────────────────────────────────────

  const startGuided = async () => {
    if (!genre) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/outline/guided/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setGuidedSession(data);
      setMode("guided");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const sendAnswer = async () => {
    if (!currentAnswer.trim() || !guidedSession || loading) return;
    setLoading(true);
    const answer = currentAnswer.trim();
    setCurrentAnswer("");
    try {
      const r = await fetch(`/api/outline/guided/${guidedSession.session_id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setGuidedSession(data.session);
      if (data.contradiction) {
        setNewContradiction(data.contradiction);
        setContradictionLogOpen(true);
        setTimeout(() => setNewContradiction(null), 4000);
      }
      if (data.ready_to_synthesize) setReadyToSynthesize(true);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const synthesizeGuided = async () => {
    if (!guidedSession) return;
    setSynthesizing(true);
    setError(null);
    try {
      const r = await fetch(`/api/outline/guided/${guidedSession.session_id}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      navigate(`/pipeline/${data.project_id}`);
    } catch (err: any) { setError(err.message); setSynthesizing(false); }
  };

  const resolveContradiction = async (id: string) => {
    if (!guidedSession) return;
    await fetch(`/api/outline/guided/${guidedSession.session_id}/resolve-contradiction/${id}`, { method: "POST" });
    setGuidedSession(prev => prev ? {
      ...prev,
      contradictions: prev.contradictions.map(c => c.id === id ? { ...c, resolved: true } : c)
    } : prev);
  };

  // ── BRAIN DUMP ───────────────────────────────────────────────────────────────

  const initBlankOutline = () => {
    const chapters: OutlineChapter[] = Array.from({ length: 32 }, (_, i) => ({
      num: i + 1, title: `Chapter ${i + 1}`, beats: ""
    }));
    setBdChapters(chapters);
    setShowOutline(true);
  };

  const suggestBeats = async () => {
    if (!genre) { setError("Select a genre first"); return; }
    setSuggestingBeats(true);
    try {
      const r = await fetch("/api/outline/braindump/suggest-beats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, protagonist: bdProtagonist, central_conflict: bdConflict, world: bdWorld }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setBdChapters(data.chapters);
      setShowOutline(true);
    } catch (err: any) { setError(err.message); }
    finally { setSuggestingBeats(false); }
  };

  const submitBrainDump = async () => {
    if (!genre) { setError("Select a genre first"); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/outline/braindump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bdTitle, genre,
          protagonist: bdProtagonist,
          central_conflict: bdConflict,
          world: bdWorld,
          freeform: bdFreeform,
          outline_chapters: showOutline ? bdChapters : [],
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      navigate(`/pipeline/${data.project_id}`);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ── HYBRID ────────────────────────────────────────────────────────────────────

  const expandQuestion = async (qId: string) => {
    if (!hybridAnswers[qId]) return;
    setLoadingExpand(qId);
    try {
      const r = await fetch("/api/outline/hybrid/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: qId, current_answer: hybridAnswers[qId], all_answers: hybridAnswers }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setExpandedFollowUps(prev => ({ ...prev, [qId]: data.follow_ups }));
      setExpandedQuestion(qId);
    } catch (err: any) { setError(err.message); }
    finally { setLoadingExpand(null); }
  };

  const submitHybrid = async () => {
    if (!genre) { setError("Select a genre first"); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/outline/hybrid/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, answers: hybridAnswers }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      navigate(`/pipeline/${data.project_id}`);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const unresolved = guidedSession?.contradictions.filter(c => !c.resolved).length ?? 0;

  // ── MODE PICKER ───────────────────────────────────────────────────────────────

  const resumeSession = async (sessionId: string) => {
    try {
      const r = await fetch(`/api/outline/guided/${sessionId}`);
      if (!r.ok) return;
      const session = await r.json();
      setGuidedSession(session);
      setGenre(session.genre);
      if (session.phase !== "questioning") setReadyToSynthesize(true);
      setMode("guided");
    } catch {}
  };

  const dismissSession = async (sessionId: string) => {
    setDismissedSessions(prev => new Set(Array.from(prev).concat(sessionId)));
    // Optionally delete from server
    await fetch(`/api/outline/guided/${sessionId}`, { method: "DELETE" }).catch(() => {});
    setSavedSessions(prev => prev.filter(s => s.session_id !== sessionId));
  };

  if (mode === "pick") return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-4xl font-serif font-bold mb-3">Write an Outline</h1>
          <p className="text-muted-foreground text-lg">How would you like to build your story?</p>
        </div>

        {/* Resume in-progress sessions */}
        {savedSessions.filter(s => !dismissedSessions.has(s.session_id)).length > 0 && (
          <div className="mb-6 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resume in progress</p>
            {savedSessions
              .filter(s => !dismissedSessions.has(s.session_id))
              .map(session => (
                <div
                  key={session.session_id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5"
                >
                  <MessageCircle className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.genre} · {session.question_count} question{session.question_count !== 1 ? "s" : ""} answered
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1 shrink-0"
                    onClick={() => resumeSession(session.session_id)}
                  >
                    Resume
                  </Button>
                  <button
                    onClick={() => dismissSession(session.session_id)}
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    title="Discard interview"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
        )}

        <div className="mb-6">
          <Label className="text-sm font-medium mb-2 block">Genre</Label>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select a genre..." />
            </SelectTrigger>
            <SelectContent>
              {genres.map(g => <SelectItem key={g.id} value={g.id}>{g.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4">
          {[
            {
              key: "guided" as const,
              icon: <MessageCircle className="w-6 h-6 text-primary" />,
              title: "Guided Interview",
              desc: "AI asks you up to 50 adaptive questions about your story. Best for when you have a rough idea but want to develop it fully.",
              detail: "~20-40 minutes · Most thorough",
            },
            {
              key: "hybrid" as const,
              icon: <Layers className="w-6 h-6 text-primary" />,
              title: "Quick Questions",
              desc: "Answer 8 key questions. Expand any answer you want to go deeper on. Good when you have a clear concept but want some structure.",
              detail: "~5-10 minutes · Balanced",
            },
            {
              key: "braindump" as const,
              icon: <FileText className="w-6 h-6 text-primary" />,
              title: "Brain Dump",
              desc: "Fill in structured fields and a freeform notes area. Optionally add a chapter-by-chapter outline. Good when you already know your story.",
              detail: "~5 minutes · Most flexible",
            },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => {
                if (!genre) { setError("Select a genre first"); return; }
                setError(null);
                if (item.key === "guided") { startGuided(); return; }
                setMode(item.key);
              }}
              disabled={loading}
              className="group p-6 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0 group-hover:bg-primary/20 transition-colors">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    <span className="text-xs text-muted-foreground">{item.detail}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 mt-6 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Starting interview...
          </div>
        )}
        {error && <p className="text-sm text-destructive mt-4 text-center">{error}</p>}
      </div>
    </Layout>
  );

  // ── GUIDED MODE ───────────────────────────────────────────────────────────────

  if (mode === "guided" && guidedSession) return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-12 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Story Interview</span>
          <Badge variant="outline" className="text-xs">
            {guidedSession.question_count} question{guidedSession.question_count !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {unresolved > 0 && (
            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 gap-1">
              <AlertTriangle className="w-3 h-3" /> {unresolved} conflict{unresolved !== 1 ? "s" : ""}
            </Badge>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 h-8 text-muted-foreground hover:text-foreground text-xs"
            onClick={() => {
              // Session is already persisted server-side on every answer.
              // Store session ID so we can surface it on the home/my-work page.
              localStorage.setItem("saved_interview_session", guidedSession.session_id);
              navigate("/");
            }}
          >
            <Save className="w-3.5 h-3.5" />
            Save & Exit
          </Button>
          {readyToSynthesize && (
            <Button
              size="sm"
              onClick={synthesizeGuided}
              disabled={synthesizing}
              className="gap-2 h-8"
            >
              {synthesizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Build Dossier
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {guidedSession.messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "ai"
                    ? "bg-muted text-foreground rounded-tl-sm"
                    : "bg-primary text-primary-foreground rounded-tr-sm"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          {!readyToSynthesize && (
            <div className="border-t border-border/40 p-4">
              <div className="flex gap-3 max-w-3xl mx-auto">
                <Textarea
                  value={currentAnswer}
                  onChange={e => setCurrentAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAnswer(); } }}
                  placeholder="Type your answer... (Enter to send, Shift+Enter for new line)"
                  className="resize-none min-h-[80px] text-sm"
                  disabled={loading}
                />
                <Button
                  onClick={sendAnswer}
                  disabled={loading || !currentAnswer.trim()}
                  className="shrink-0 h-auto"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {guidedSession.question_count} question{guidedSession.question_count !== 1 ? "s" : ""} so far · AI decides when ready
              </p>
            </div>
          )}

          {readyToSynthesize && (
            <div className="border-t border-border/40 p-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Interview complete. {unresolved > 0 ? `Resolve ${unresolved} conflict${unresolved !== 1 ? "s" : ""} in the sidebar, or ` : ""}
                click Build Dossier to generate your Story Dossier.
              </p>
              <Button onClick={synthesizeGuided} disabled={synthesizing} size="lg" className="gap-2">
                {synthesizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Build Dossier
              </Button>
            </div>
          )}
        </div>

        {/* Contradiction sidebar */}
        <div className="w-72 shrink-0 border-l border-border/40 flex flex-col bg-muted/5">
          <button
            onClick={() => setContradictionLogOpen(!contradictionLogOpen)}
            className="flex items-center justify-between px-4 py-3 border-b border-border/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Conflict Log
              {unresolved > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">
                  {unresolved}
                </span>
              )}
            </span>
            {contradictionLogOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {contradictionLogOpen && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {newContradiction && (
                <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 animate-in slide-in-from-top-2 duration-300">
                  <p className="text-xs font-medium text-amber-700 flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" /> New conflict detected
                  </p>
                  <p className="text-xs text-amber-700/80">{newContradiction.description}</p>
                </div>
              )}

              {guidedSession.contradictions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No conflicts detected yet. Keep going!
                </p>
              ) : (
                guidedSession.contradictions.map(c => (
                  <div key={c.id} className={cn(
                    "p-3 rounded-lg border text-xs space-y-2",
                    c.resolved ? "border-border/40 bg-muted/20 opacity-60" : "border-amber-500/30 bg-amber-500/5"
                  )}>
                    <p className={cn("font-medium", c.resolved ? "text-muted-foreground" : "text-amber-700")}>
                      {c.resolved && <Check className="w-3 h-3 inline mr-1" />}
                      {c.description}
                    </p>
                    <div className="space-y-1">
                      <p className="text-muted-foreground"><span className="font-medium">Earlier:</span> {c.earlier_statement}</p>
                      <p className="text-muted-foreground"><span className="font-medium">Latest:</span> {c.current_statement}</p>
                    </div>
                    {!c.resolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs gap-1 w-full"
                        onClick={() => resolveContradiction(c.id)}
                      >
                        <Check className="w-3 h-3" /> Mark resolved
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── BRAIN DUMP MODE ───────────────────────────────────────────────────────────

  if (mode === "braindump") return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-in fade-in duration-300 space-y-6">
        <div>
          <button onClick={() => setMode("pick")} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
            ← Back
          </button>
          <h1 className="text-3xl font-serif font-bold">Brain Dump</h1>
          <p className="text-muted-foreground mt-1">Fill in what you know. Leave blank anything you haven't figured out yet.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Genre</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger><SelectValue placeholder="Select genre..." /></SelectTrigger>
              <SelectContent>{genres.map(g => <SelectItem key={g.id} value={g.id}>{g.display_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title (optional)</Label>
            <Input value={bdTitle} onChange={e => setBdTitle(e.target.value)} placeholder="Working title..." />
          </div>
          <div className="space-y-1.5">
            <Label>Protagonist</Label>
            <Textarea value={bdProtagonist} onChange={e => setBdProtagonist(e.target.value)} placeholder="Who is your main character? What do they want? What are they hiding from themselves?" className="resize-none h-24 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label>Central Conflict</Label>
            <Textarea value={bdConflict} onChange={e => setBdConflict(e.target.value)} placeholder="The main problem or opposition driving the story..." className="resize-none h-24 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label>World / Setting</Label>
            <Textarea value={bdWorld} onChange={e => setBdWorld(e.target.value)} placeholder="Where and when? Any unusual rules about how this world works?" className="resize-none h-24 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label>Everything else</Label>
            <Textarea value={bdFreeform} onChange={e => setBdFreeform(e.target.value)} placeholder="Characters, plot fragments, themes, the ending, the vibe — anything else in your head..." className="resize-none h-36 text-sm" />
          </div>
        </div>

        {/* Outline section */}
        <div className="border border-border/60 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-muted/20">
            <div>
              <p className="text-sm font-medium">Chapter Outline (optional)</p>
              <p className="text-xs text-muted-foreground">Add a chapter-by-chapter outline if you have one</p>
            </div>
            <div className="flex gap-2">
              {!showOutline && (
                <>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={initBlankOutline}>
                    <Plus className="w-3 h-3 mr-1" /> Blank outline
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={suggestBeats} disabled={suggestingBeats}>
                    {suggestingBeats ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    Suggest beats
                  </Button>
                </>
              )}
              {showOutline && (
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowOutline(false)}>
                  <Minus className="w-3 h-3 mr-1" /> Hide
                </Button>
              )}
            </div>
          </div>
          {showOutline && bdChapters.length > 0 && (
            <div className="max-h-96 overflow-y-auto p-4 space-y-2">
              {bdChapters.map((ch, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-xs text-muted-foreground w-8 shrink-0 pt-2">Ch.{ch.num}</span>
                  <Input
                    value={ch.title}
                    onChange={e => setBdChapters(prev => prev.map((c, j) => j === i ? { ...c, title: e.target.value } : c))}
                    className="h-8 text-xs w-32 shrink-0"
                    placeholder={`Chapter ${ch.num}`}
                  />
                  <Input
                    value={ch.beats}
                    onChange={e => setBdChapters(prev => prev.map((c, j) => j === i ? { ...c, beats: e.target.value } : c))}
                    className="h-8 text-xs flex-1"
                    placeholder="Beat or summary..."
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={submitBrainDump} disabled={loading || !genre} size="lg" className="w-full gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Build Story Dossier
        </Button>
      </div>
    </Layout>
  );

  // ── HYBRID MODE ───────────────────────────────────────────────────────────────

  if (mode === "hybrid") return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-in fade-in duration-300 space-y-6">
        <div>
          <button onClick={() => setMode("pick")} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
            ← Back
          </button>
          <h1 className="text-3xl font-serif font-bold">Quick Questions</h1>
          <p className="text-muted-foreground mt-1">Answer what you know. Expand any answer to go deeper.</p>
        </div>

        <div className="space-y-1.5">
          <Label>Genre</Label>
          <Select value={genre} onValueChange={setGenre}>
            <SelectTrigger><SelectValue placeholder="Select genre..." /></SelectTrigger>
            <SelectContent>{genres.map(g => <SelectItem key={g.id} value={g.id}>{g.display_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {hybridQuestions.map(q => (
            <Card key={q.id} className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <Label className="text-sm font-medium">{q.label}</Label>
                <Textarea
                  value={hybridAnswers[q.id] ?? ""}
                  onChange={e => setHybridAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder={q.placeholder}
                  className="resize-none h-20 text-sm"
                />
                {hybridAnswers[q.id]?.trim() && (
                  <div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-6 gap-1 text-primary"
                      onClick={() => expandedQuestion === q.id ? setExpandedQuestion(null) : expandQuestion(q.id)}
                      disabled={loadingExpand === q.id}
                    >
                      {loadingExpand === q.id
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Getting follow-ups...</>
                        : expandedQuestion === q.id
                        ? <><ChevronUp className="w-3 h-3" /> Hide follow-ups</>
                        : <><Sparkles className="w-3 h-3" /> Expand this</>
                      }
                    </Button>
                    {expandedQuestion === q.id && expandedFollowUps[q.id] && (
                      <div className="mt-2 p-3 rounded bg-primary/5 border border-primary/20 text-xs text-foreground/80 whitespace-pre-wrap">
                        {expandedFollowUps[q.id]}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={submitHybrid}
          disabled={loading || !genre || Object.values(hybridAnswers).every(v => !v?.trim())}
          size="lg"
          className="w-full gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Build Story Dossier
        </Button>
      </div>
    </Layout>
  );

  return null;
}
