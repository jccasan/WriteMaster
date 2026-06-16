import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, ArrowLeft, Save, Plus, Trash2, BookOpen, Users, Globe,
  MapPin, ChevronDown, ChevronUp, Edit2, Check, X, Upload, List, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "bible" | "menagerie" | "series" | "world_state" | "push_history";

interface Universe {
  id: string; name: string; description: string; bible: string;
  world_state: any; series_ids: string[]; standalone_book_ids: string[];
  push_history: any[];
}
interface Series {
  id: string; name: string; description: string; series_notes: string;
  book_ids: string[]; universe_id: string;
}
interface Character {
  id: string; name: string; aliases: string[]; current_status: string;
  accumulated_notes: string; appearances: any[]; first_appeared_book_title: string;
  image_base64?: string;
}
interface Book { id: string; title: string; }

export default function UniverseView() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const universeId = params.id;

  const [universe, setUniverse] = useState<Universe | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [menagerie, setMenagerie] = useState<{ characters: Character[] } | null>(null);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("bible");

  // Bible edit
  const [editingBible, setEditingBible] = useState(false);
  const [bibleDraft, setBibleDraft] = useState("");
  const [savingBible, setSavingBible] = useState(false);

  // Series management
  const [newSeriesName, setNewSeriesName] = useState("");
  const [creatingSeries, setCreatingSeries] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [editingSeriesNotes, setEditingSeriesNotes] = useState<string | null>(null);
  const [seriesNotesDraft, setSeriesNotesDraft] = useState("");

  // Menagerie state
  const [charFilter, setCharFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedChar, setExpandedChar] = useState<string | null>(null);
  const [menagerieUploading, setMenagerieUploading] = useState(false);
  const [menagerieApplying, setMenagerieApplying] = useState(false);
  const [menagerieExtracted, setMenagerieExtracted] = useState<any[]>([]);
  const [menagerieSourceLabel, setMenagerieSourceLabel] = useState("");
  const [menagerieElapsed, setMenagerieElapsed] = useState(0);

  // Elapsed timer for extraction
  useEffect(() => {
    if (!menagerieUploading) { setMenagerieElapsed(0); return; }
    const interval = setInterval(() => setMenagerieElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [menagerieUploading]);

  // World state
  const [editingWorldState, setEditingWorldState] = useState(false);
  const [worldStateDraft, setWorldStateDraft] = useState("");

  // Book assignment
  const [assignBookId, setAssignBookId] = useState("");
  const [assignSeriesId, setAssignSeriesId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!universeId) return;
    setLoading(true);
    try {
      const [uRes, sRes, mRes, bRes] = await Promise.all([
        fetch(`/api/universe/${universeId}`),
        fetch(`/api/universe/${universeId}/series`),
        fetch(`/api/universe/${universeId}/menagerie`),
        fetch("/api/books"),
      ]);
      if (uRes.ok) { const u = await uRes.json(); setUniverse(u); setBibleDraft(u.bible ?? ""); }
      if (sRes.ok) setSeries(await sRes.json());
      if (mRes.ok) setMenagerie(await mRes.json());
      if (bRes.ok) setAllBooks(await bRes.json());
    } catch {}
    setLoading(false);
  }, [universeId]);

  useEffect(() => { load(); }, [load]);

  const saveBible = async () => {
    if (!universe) return;
    setSavingBible(true);
    try {
      const r = await fetch(`/api/universe/${universeId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bible: bibleDraft }),
      });
      if (r.ok) { const u = await r.json(); setUniverse(u); setEditingBible(false); }
    } catch {}
    setSavingBible(false);
  };

  const createSeries = async () => {
    if (!newSeriesName.trim()) return;
    setCreatingSeries(true);
    try {
      const r = await fetch(`/api/universe/${universeId}/series`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSeriesName.trim() }),
      });
      if (r.ok) { setNewSeriesName(""); await load(); }
    } catch {}
    setCreatingSeries(false);
  };

  const saveSeriesNotes = async (seriesId: string) => {
    const r = await fetch(`/api/universe/series/${seriesId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ series_notes: seriesNotesDraft }),
    });
    if (r.ok) { setEditingSeriesNotes(null); await load(); }
  };

  const promoteNote = async (seriesId: string, noteText: string) => {
    if (!confirm("Promote this note to the universe bible?")) return;
    await fetch(`/api/universe/series/${seriesId}/promote-note`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note_text: noteText }),
    });
    await load();
  };

  const assignBook = async () => {
    if (!assignBookId) return;
    setAssigning(true);
    setError(null);
    try {
      const r = await fetch(`/api/universe/${universeId}/assign-book`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id: assignBookId, series_id: assignSeriesId || null }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      setAssignBookId(""); setAssignSeriesId("");
      await load();
    } catch (err: any) { setError(err.message); }
    setAssigning(false);
  };

  const deleteSeries = async (sid: string) => {
    if (!confirm("Delete this series? Books will not be deleted.")) return;
    await fetch(`/api/universe/series/${sid}`, { method: "DELETE" });
    await load();
  };

  const saveWorldState = async () => {
    if (!universe) return;
    try {
      const parsed = JSON.parse(worldStateDraft);
      const r = await fetch(`/api/universe/${universeId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ world_state: parsed }),
      });
      if (r.ok) { const u = await r.json(); setUniverse(u); setEditingWorldState(false); }
    } catch { setError("Invalid JSON in world state editor"); }
  };

  if (loading) return <Layout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></Layout>;
  if (!universe) return <Layout><div className="text-center py-20 text-muted-foreground">Universe not found.</div></Layout>;

  const TABS = [
    { key: "bible" as const, label: "Story Bible", icon: <BookOpen className="w-4 h-4" /> },
    { key: "menagerie" as const, label: `Menagerie (${menagerie?.characters.length ?? 0})`, icon: <Users className="w-4 h-4" /> },
    { key: "series" as const, label: `Series (${series.length})`, icon: <List className="w-4 h-4" /> },
    { key: "world_state" as const, label: "World State", icon: <Globe className="w-4 h-4" /> },
    { key: "push_history" as const, label: `Push History (${universe.push_history?.length ?? 0})`, icon: <Upload className="w-4 h-4" /> },
  ];

  const filteredChars = (menagerie?.characters ?? []).filter(c => {
    const matchName = c.name.toLowerCase().includes(charFilter.toLowerCase());
    const matchStatus = statusFilter === "all" || c.current_status === statusFilter;
    return matchName && matchStatus;
  });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/universe")} className="gap-2 -ml-2 mb-2">
              <ArrowLeft className="w-4 h-4" /> All Universes
            </Button>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-serif font-bold">{universe.name}</h1>
            </div>
            {universe.description && <p className="text-muted-foreground text-sm mt-1 ml-8">{universe.description}</p>}
          </div>
        </div>

        {error && <div className="mb-4 text-sm text-destructive bg-destructive/10 p-3 rounded-md flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        {/* Tabs */}
        <div className="border-b border-border/40 flex gap-0 mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ── BIBLE ───────────────────────────────────────────────────────── */}
        {activeTab === "bible" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Story Bible</h2>
              <div className="flex items-center gap-2">
                {/* File upload */}
                <label className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border cursor-pointer transition-colors",
                  "border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                )}>
                  <Upload className="w-3.5 h-3.5" />
                  Import File
                  <input
                    type="file"
                    accept=".pdf,.docx,.md,.txt"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("mode", universe.bible ? "append" : "replace");
                      try {
                        const r = await fetch(`/api/universe/${universeId}/bible/upload`, {
                          method: "POST",
                          body: formData,
                        });
                        const data = await r.json();
                        if (!r.ok) throw new Error(data.error);
                        await load();
                        setBibleDraft((await (await fetch(`/api/universe/${universeId}`)).json()).bible ?? "");
                      } catch (err: any) {
                        setError(err.message);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                {universe.bible && (
                  <label className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border cursor-pointer transition-colors",
                    "border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                  )}>
                    <Plus className="w-3.5 h-3.5" />
                    Append File
                    <input
                      type="file"
                      accept=".pdf,.docx,.md,.txt"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("mode", "append");
                        try {
                          const r = await fetch(`/api/universe/${universeId}/bible/upload`, {
                            method: "POST",
                            body: formData,
                          });
                          const data = await r.json();
                          if (!r.ok) throw new Error(data.error);
                          await load();
                          setBibleDraft((await (await fetch(`/api/universe/${universeId}`)).json()).bible ?? "");
                        } catch (err: any) {
                          setError(err.message);
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
                {!editingBible ? (
                  <Button variant="outline" size="sm" onClick={() => setEditingBible(true)} className="gap-2">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveBible} disabled={savingBible} className="gap-2">
                      {savingBible ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingBible(false); setBibleDraft(universe.bible ?? ""); }}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Accepts .pdf, .docx, .md, .txt — Import replaces the bible; Append adds below existing content.
            </p>
            {editingBible ? (
              <Textarea
                value={bibleDraft}
                onChange={e => setBibleDraft(e.target.value)}
                className="min-h-[600px] font-mono text-sm resize-none"
                placeholder="Write your story bible here. Use Markdown headers to organize sections:

## World Overview
## Magic System
## Geography
## Factions
## Rules and Limitations
## Timeline
..."
              />
            ) : (
              <Card className="border-border/60">
                <CardContent className="p-6">
                  {universe.bible ? (
                    <pre className="text-sm whitespace-pre-wrap break-words leading-relaxed text-foreground font-sans max-h-[70vh] overflow-y-auto">
                      {universe.bible}
                    </pre>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p>No story bible yet. Click Edit to write one.</p>
                      <p className="text-xs mt-1">This is the authoritative reference for all books in this universe.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── MENAGERIE ───────────────────────────────────────────────────── */}
        {activeTab === "menagerie" && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center flex-wrap">
              <Input
                placeholder="Filter by name..."
                value={charFilter}
                onChange={e => setCharFilter(e.target.value)}
                className="max-w-[220px] h-8 text-sm"
              />
              {["all", "alive", "dead", "missing", "retired", "unknown"].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn("px-2.5 py-1 rounded text-xs font-medium border transition-colors",
                    statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                  )}>
                  {s}
                </button>
              ))}
              <span className="text-xs text-muted-foreground ml-auto">{filteredChars.length} character{filteredChars.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Upload buttons */}
            <div className="flex gap-2 flex-wrap items-center">

                {/* Import existing menagerie */}
                <label className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border cursor-pointer transition-colors",
                  menagerieUploading ? "opacity-50 pointer-events-none" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                )}>
                  <Upload className="w-3.5 h-3.5" /> Import menagerie
                  <input
                    type="file"
                    accept=".pdf,.docx,.md,.txt"
                    className="hidden"
                    disabled={menagerieUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setMenagerieUploading(true);
                      setError(null);
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("source_label", file.name.replace(/\.[^.]+$/, ""));
                      try {
                        const r = await fetch(`/api/universe/${universeId}/menagerie/import`, { method: "POST", body: formData });
                        const data = await r.json();
                        if (!r.ok) throw new Error(data.error ?? "Upload failed");
                        const jobId = data.job_id;
                        const startTime = Date.now();
                        const poll = async (): Promise<void> => {
                          if (Date.now() - startTime > 3 * 60 * 1000) throw new Error("Import timed out after 3 minutes");
                          const pr = await fetch(`/api/universe/${universeId}/menagerie/import/${jobId}`);
                          if (!pr.ok) throw new Error("Lost connection");
                          const result = await pr.json();
                          if (result.status === "error") throw new Error(result.error ?? "Import failed");
                          if (result.status === "running") return new Promise(resolve => setTimeout(() => resolve(poll()), 3000));
                          if (!result.characters?.length) throw new Error("No characters found in file");
                          setMenagerieExtracted(result.characters.map((c: any) => ({ ...c, accepted: true })));
                          setMenagerieSourceLabel(result.source_label ?? file.name);
                        };
                        await poll();
                      } catch (err: any) {
                        setError(err.message ?? "Import failed");
                      } finally {
                        setMenagerieUploading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>

                {/* Extract from story */}
                <label className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border cursor-pointer transition-colors",
                  menagerieUploading
                    ? "border-primary/50 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                )}>
                  {menagerieUploading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Working... {menagerieElapsed > 5 ? `(${menagerieElapsed}s)` : ""}</>
                    : <><Users className="w-3.5 h-3.5" /> Extract from story</>
                  }
                  <input
                    type="file"
                    accept=".pdf,.docx,.md,.txt"
                    className="hidden"
                    disabled={menagerieUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setMenagerieUploading(true);
                      setError(null);
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("source_label", file.name.replace(/\.[^.]+$/, ""));
                      try {
                        const r = await fetch(`/api/universe/${universeId}/menagerie/extract`, { method: "POST", body: formData });
                        const data = await r.json();
                        if (!r.ok) throw new Error(data.error ?? "Upload failed");
                        const jobId = data.job_id;
                        const startTime = Date.now();
                        const TIMEOUT_MS = 10 * 60 * 1000; // 10 min for large files
                        const poll = async (): Promise<void> => {
                          if (Date.now() - startTime > TIMEOUT_MS) throw new Error("Extraction timed out");
                          const pr = await fetch(`/api/universe/${universeId}/menagerie/extract/${jobId}`);
                          if (!pr.ok) throw new Error("Lost connection to extraction job");
                          const result = await pr.json();
                          if (result.status === "error") throw new Error(result.error ?? "Extraction failed");
                          if (result.status === "running") return new Promise(resolve => setTimeout(() => resolve(poll()), 3000));
                          if (!result.characters?.length) throw new Error("No characters found in this file");
                          setMenagerieExtracted(result.characters.map((c: any) => ({ ...c, accepted: true })));
                          setMenagerieSourceLabel(result.source_label ?? file.name);
                        };
                        await poll();
                      } catch (err: any) {
                        setError(err.message ?? "Something went wrong");
                      } finally {
                        setMenagerieUploading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              </div>

            {/* Extraction review panel */}
            {menagerieExtracted.length > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Review Extracted Characters</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {menagerieSourceLabel} · {menagerieExtracted.filter(c => c.accepted).length} selected
                        · {menagerieExtracted.filter(c => c.is_new && c.accepted).length} new
                        · {menagerieExtracted.filter(c => !c.is_new && c.accepted).length} updates
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => setMenagerieExtracted(prev => prev.map(c => ({ ...c, accepted: true })))}>
                        Select All
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => setMenagerieExtracted(prev => prev.map(c => ({ ...c, accepted: false })))}>
                        Deselect All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                  {menagerieExtracted.map((char, i) => (
                    <div key={i} className={cn(
                      "flex items-start gap-3 p-3 rounded-md border transition-colors cursor-pointer",
                      char.accepted ? "border-primary/30 bg-background" : "border-border/40 bg-muted/30 opacity-50"
                    )} onClick={() => setMenagerieExtracted(prev => prev.map((c, j) => j === i ? { ...c, accepted: !c.accepted } : c))}>
                      <div className={cn(
                        "mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
                        char.accepted ? "border-primary bg-primary" : "border-muted-foreground/40"
                      )}>
                        {char.accepted && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{char.name}</span>
                          <Badge variant="outline" className="text-xs h-4 px-1.5">{char.role}</Badge>
                          <Badge variant="outline" className={cn("text-xs h-4 px-1.5", {
                            "border-green-600 text-green-600": char.current_status === "alive",
                            "border-red-600 text-red-600": char.current_status === "dead",
                          })}>{char.status}</Badge>
                          {!char.is_new && <Badge variant="outline" className="text-xs h-4 px-1.5 border-amber-500 text-amber-600">update</Badge>}
                          {char.is_new && <Badge variant="outline" className="text-xs h-4 px-1.5 border-green-600 text-green-600">new</Badge>}
                        </div>
                        {char.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{char.notes}</p>}
                      </div>
                    </div>
                  ))}
                </CardContent>
                <div className="p-4 border-t border-border/40 flex gap-3">
                  <Button
                    className="flex-1"
                    disabled={menagerieApplying || menagerieExtracted.filter(c => c.accepted).length === 0}
                    onClick={async () => {
                      setMenagerieApplying(true);
                      setError(null);
                      try {
                        const r = await fetch(`/api/universe/${universeId}/menagerie/apply-extracted`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            characters: menagerieExtracted,
                            source_label: menagerieSourceLabel,
                          }),
                        });
                        const data = await r.json();
                        if (!r.ok) throw new Error(data.error);
                        setMenagerieExtracted([]);
                        await load();
                      } catch (err: any) {
                        setError(err.message);
                      } finally {
                        setMenagerieApplying(false);
                      }
                    }}
                  >
                    {menagerieApplying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Add {menagerieExtracted.filter(c => c.accepted).length} Characters to Menagerie
                  </Button>
                  <Button variant="outline" onClick={() => setMenagerieExtracted([])}>Cancel</Button>
                </div>
              </Card>
            )}

            {filteredChars.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No characters yet. Characters are added when you push finalized books.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredChars.map(char => (
                  <Card key={char.id} className="border-border/60">
                    <CardContent className="p-0">
                      <button
                        onClick={() => setExpandedChar(expandedChar === char.id ? null : char.id)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
                      >
                        {/* Avatar thumbnail */}
                        <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden border border-border/60 bg-muted flex items-center justify-center">
                          {char.image_base64 ? (
                            <img src={char.image_base64} alt={char.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-muted-foreground">
                              {char.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{char.name}</span>
                            {char.aliases.length > 0 && <span className="text-xs text-muted-foreground">({char.aliases.join(", ")})</span>}
                            <Badge variant="outline" className={cn("text-xs h-4 px-1.5", {
                              "border-green-600 text-green-600": char.current_status === "alive",
                              "border-red-600 text-red-600": char.current_status === "dead",
                              "border-amber-500 text-amber-500": char.current_status === "missing",
                              "border-muted-foreground text-muted-foreground": char.current_status === "retired" || char.current_status === "unknown",
                            })}>
                              {char.current_status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            First appeared: {char.first_appeared_book_title} · {char.appearances.length} book{char.appearances.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        {expandedChar === char.id ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                      </button>
                      {expandedChar === char.id && (
                        <div className="px-4 pb-4 border-t border-border/40 pt-3 space-y-4">
                          {/* Portrait + upload */}
                          <div className="flex gap-4 items-start">
                            <div className="shrink-0">
                              <div className="w-24 h-32 rounded-lg overflow-hidden border border-border/60 bg-muted flex items-center justify-center">
                                {char.image_base64 ? (
                                  <img src={char.image_base64} alt={char.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-3xl font-medium text-muted-foreground">
                                    {char.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 mt-2">
                                <label className="flex items-center justify-center gap-1 px-2 py-1 rounded text-xs border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 cursor-pointer transition-colors">
                                  <Upload className="w-3 h-3" />
                                  {char.image_base64 ? "Change" : "Add photo"}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const formData = new FormData();
                                      formData.append("image", file);
                                      try {
                                        const r = await fetch(`/api/universe/${universeId}/menagerie/character/${char.id}/image`, {
                                          method: "POST",
                                          body: formData,
                                        });
                                        if (r.ok) await load();
                                        else { const d = await r.json(); setError(d.error); }
                                      } catch (err: any) { setError(err.message); }
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                {char.image_base64 && (
                                  <button
                                    onClick={async () => {
                                      await fetch(`/api/universe/${universeId}/menagerie/character/${char.id}/image`, { method: "DELETE" });
                                      await load();
                                    }}
                                    className="flex items-center justify-center gap-1 px-2 py-1 rounded text-xs border border-border text-destructive/70 hover:text-destructive hover:border-destructive/50 transition-colors"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground whitespace-pre-wrap">{char.accumulated_notes}</p>
                            </div>
                          </div>
                          {char.appearances.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Appearances</p>
                              <div className="space-y-1">
                                {char.appearances.map((a: any, i: number) => (
                                  <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                                    <BookOpen className="w-3 h-3 shrink-0" />
                                    <span>{a.book_title}</span>
                                    {a.chapter_numbers?.length > 0 && <span>· Ch. {a.chapter_numbers.join(", ")}</span>}
                                    <Badge variant="outline" className="text-xs h-3.5 px-1">{a.role_in_book}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SERIES ──────────────────────────────────────────────────────── */}
        {activeTab === "series" && (
          <div className="space-y-6">
            {/* Top actions */}
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => {
                  // Navigate to new book flow with universe pre-selected
                  navigate(`/universe/${universeId}/new-book`);
                }}
                className="gap-2"
              >
                <BookOpen className="w-4 h-4" /> New Book in this Universe
              </Button>
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder="New series name..."
                  value={newSeriesName}
                  onChange={e => setNewSeriesName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createSeries()}
                  className="max-w-[240px]"
                />
                <Button onClick={createSeries} disabled={creatingSeries || !newSeriesName.trim()} variant="outline" className="gap-2">
                  {creatingSeries ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} New Series
                </Button>
              </div>
            </div>

            {/* Assign book to universe/series */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Assign a Book</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={assignBookId}
                    onChange={e => setAssignBookId(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1 min-w-[200px]"
                  >
                    <option value="">Select a book...</option>
                    {allBooks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                  <select
                    value={assignSeriesId}
                    onChange={e => setAssignSeriesId(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1 min-w-[180px]"
                  >
                    <option value="">Standalone (no series)</option>
                    {series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <Button onClick={assignBook} disabled={assigning || !assignBookId} size="sm">
                    {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Series list */}
            <div className="space-y-3">
              {series.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No series yet.</div>
              ) : series.map(s => {
                const isExpanded = expandedSeries.has(s.id);
                const seriesBooks = allBooks.filter(b => s.book_ids.includes(b.id));
                return (
                  <Card key={s.id} className="border-border/60">
                    <CardContent className="p-0">
                      <button
                        onClick={() => setExpandedSeries(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
                      >
                        <List className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium text-sm">{s.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{s.book_ids.length} books</span>
                        </div>
                        <Button
                          size="sm" variant="ghost"
                          className="h-6 w-6 p-0 text-destructive opacity-60 hover:opacity-100"
                          onClick={e => { e.stopPropagation(); deleteSeries(s.id); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border/40 p-4 space-y-4">
                          {/* Books in reading order */}
                          {seriesBooks.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Books (reading order)</p>
                              <div className="space-y-1">
                                {s.book_ids.map((bid, idx) => {
                                  const bk = allBooks.find(b => b.id === bid);
                                  return bk ? (
                                    <div key={bid} className="flex items-center gap-2 text-sm">
                                      <span className="text-xs text-muted-foreground w-5 text-right">{idx + 1}.</span>
                                      <span>{bk.title}</span>
                                      <button
                                        onClick={() => navigate(`/universe/${universeId}/push/${bid}`)}
                                        className="ml-auto text-xs text-primary hover:underline"
                                      >Push</button>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}

                          {/* Series notes */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Series Notes</p>
                              {editingSeriesNotes !== s.id ? (
                                <Button
                                  size="sm" variant="ghost" className="h-6 gap-1 text-xs"
                                  onClick={() => { setEditingSeriesNotes(s.id); setSeriesNotesDraft(s.series_notes); }}
                                >
                                  <Edit2 className="w-3 h-3" /> Edit
                                </Button>
                              ) : (
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs" onClick={() => saveSeriesNotes(s.id)}>
                                    <Check className="w-3 h-3" /> Save
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingSeriesNotes(null)}>
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            {editingSeriesNotes === s.id ? (
                              <Textarea
                                value={seriesNotesDraft}
                                onChange={e => setSeriesNotesDraft(e.target.value)}
                                className="text-sm resize-none h-32 font-mono"
                                placeholder="Series-specific exceptions or additions to the universe bible..."
                              />
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                {s.series_notes ? (
                                  <div className="space-y-2">
                                    <pre className="whitespace-pre-wrap text-xs font-sans text-foreground/80">{s.series_notes}</pre>
                                    <Button size="sm" variant="outline" className="text-xs h-6"
                                      onClick={() => promoteNote(s.id, s.series_notes)}>
                                      Promote to Universe Bible
                                    </Button>
                                  </div>
                                ) : <span className="text-xs italic">No series-specific notes.</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Standalones */}
            {universe.standalone_book_ids.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Standalone Books</p>
                <div className="space-y-1">
                  {universe.standalone_book_ids.map(bid => {
                    const bk = allBooks.find(b => b.id === bid);
                    return bk ? (
                      <div key={bid} className="flex items-center gap-2 text-sm p-2 rounded border border-border/40">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <span>{bk.title}</span>
                        <button
                          onClick={() => navigate(`/universe/${universeId}/push/${bid}`)}
                          className="ml-auto text-xs text-primary hover:underline"
                        >Push</button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── WORLD STATE ─────────────────────────────────────────────────── */}
        {activeTab === "world_state" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">World State</h2>
                <p className="text-xs text-muted-foreground">Cross-book state — updated on each push</p>
              </div>
              {universe.world_state && !editingWorldState && (
                <Button variant="outline" size="sm" onClick={() => { setEditingWorldState(true); setWorldStateDraft(JSON.stringify(universe.world_state, null, 2)); }} className="gap-2">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </Button>
              )}
            </div>

            {!universe.world_state ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No world state yet. Push a finalized book to populate this.</p>
              </div>
            ) : editingWorldState ? (
              <div className="space-y-3">
                <Textarea
                  value={worldStateDraft}
                  onChange={e => setWorldStateDraft(e.target.value)}
                  className="font-mono text-xs h-[500px] resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveWorldState} className="gap-2"><Save className="w-3.5 h-3.5" /> Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingWorldState(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { key: "active_threats", label: "Active Threats" },
                  { key: "open_threads", label: "Open Threads" },
                  { key: "dead_characters", label: "Confirmed Dead" },
                  { key: "knowledge_revelations", label: "Known to World" },
                  { key: "political_and_alliance_changes", label: "Political State" },
                  { key: "destroyed_or_changed_locations", label: "Changed Locations" },
                ].map(({ key, label }) => {
                  const items = (universe.world_state as any)?.[key] ?? [];
                  if (!items.length) return null;
                  return (
                    <div key={key}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
                      <ul className="space-y-1">
                        {items.map((item: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-primary mt-0.5">·</span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {universe.world_state?.freeform_notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                    <p className="text-sm">{universe.world_state.freeform_notes}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Last updated: {universe.world_state?.last_updated_book_title ?? "—"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── PUSH HISTORY ────────────────────────────────────────────────── */}
        {activeTab === "push_history" && (
          <div className="space-y-3">
            {!universe.push_history?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Upload className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No push history. Push a finalized book to see it here.</p>
              </div>
            ) : [...universe.push_history].reverse().map((record: any, i: number) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{record.book_title}</span>
                    <span className="text-xs text-muted-foreground">{new Date(record.pushed_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{record.new_characters_added} new chars</span>
                    <span>{record.characters_updated} updated</span>
                    <span>{record.conflicts_found} conflicts ({record.conflicts_resolved} resolved)</span>
                    <span>{record.review_items_accepted} accepted / {record.review_items_rejected} rejected</span>
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
