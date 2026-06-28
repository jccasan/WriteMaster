import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Heart, ArrowLeft, Plus, Loader2, Sparkles,
  BookOpen, FileText, Layers, ChevronRight,
  Check, Copy, Pencil, Trash2, X, ChevronDown, ChevronUp, Upload
} from "lucide-react";
import { cn } from "@/lib/utils";

import { ManuscriptUpload, ManuscriptEditorView, type EditorChapter, type Issue, type IssueSource } from "@/components/ManuscriptEditor";

type View = "hub" | "new-project" | "parameters" | "studio" | "upload-edit" | "editor";
type StudioTab = "outline" | "beat_sheet" | "scenes" | "new_scene";

const SUBGENRES = [
  { id: "billionaire", label: "Billionaire Romance", desc: "Power differential, wealth as obstacle, fish-out-of-water moments" },
  { id: "small_town_etl", label: "Small-Town Enemies to Lovers", desc: "Community stakes, the town as character, long memories" },
  { id: "workplace_etl", label: "Workplace Enemies to Lovers", desc: "Real professional stakes, forced collaboration, something to lose" },
];

const EMPTY_CHAR = {
  name: "", age: "", job: "", external_goal: "", core_wound: "",
  misbelief: "", deflection_move: "", self_sabotage_trigger: "",
  distortion: "", misbelief_break: "", presents_as: "", actually_feels: "",
};

const EMPTY_PARAMS = {
  subgenre: "billionaire" as const,
  billionaire_lead: "" as any,
  setting: "",
  series_or_standalone: "standalone" as const,
  target_word_count: "22,000",
  enmity_reason: "",
  lead_a: { ...EMPTY_CHAR },
  lead_b: { ...EMPTY_CHAR },
  a_drawn_to_b: "",
  b_drawn_to_a: "",
  what_they_share: "",
  five_year_vision_a: "",
  five_year_vision_b: "",
};

function CharacterForm({ label, value, onChange }: { label: string; value: any; onChange: (v: any) => void }) {
  const field = (key: string, placeholder: string, multiline = false) => (
    <div key={key}>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{placeholder}</label>
      {multiline ? (
        <Textarea value={value[key] ?? ""} onChange={e => onChange({ ...value, [key]: e.target.value })}
          className="text-sm resize-none min-h-[70px]" placeholder={placeholder} />
      ) : (
        <Input value={value[key] ?? ""} onChange={e => onChange({ ...value, [key]: e.target.value })}
          className="text-sm h-9" placeholder={placeholder} />
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm border-b border-border/60 pb-2">{label}</h3>
      <div className="grid grid-cols-2 gap-3">
        {field("name", "Name")}
        {field("age", "Age")}
      </div>
      {field("job", "Job / Role")}
      {field("external_goal", "External goal (what they want before romance complicates it)", true)}
      {field("core_wound", "Core wound (the specific past event, not a category)", true)}
      {field("misbelief", "Misbelief (the lie they tell themselves about love or worth)", true)}
      <div className="pt-1">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Misbelief behaviors:</p>
        <div className="space-y-2 pl-2 border-l-2 border-primary/20">
          {field("deflection_move", "What they do when someone gets too close", true)}
          {field("self_sabotage_trigger", "What they do when things go well (self-sabotage)", true)}
          {field("misbelief_break", "The specific line or moment that cracks the misbelief", true)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("presents_as", "Presents to the world as...", true)}
        {field("actually_feels", "Actually feels...", true)}
      </div>
    </div>
  );
}

export default function Romance() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<View>("hub");
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubgenre, setNewSubgenre] = useState("billionaire");
  const [params, setParams] = useState<any>({ ...EMPTY_PARAMS });
  const [savingParams, setSavingParams] = useState(false);
  const [tab, setTab] = useState<StudioTab>("outline");
  const [generating, setGenerating] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sceneForm, setSceneForm] = useState({ purpose: "", pov: "lead_a", beat_position: "", length: "1,500-2,500 words", context: "", title: "" });
  const [expandedScene, setExpandedScene] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showLeadB, setShowLeadB] = useState(false);
  const [editorChapters, setEditorChapters] = useState<EditorChapter[]>([]);
  const [editorIssues, setEditorIssues] = useState<Issue[]>([]);
  const [editorIssueSource, setEditorIssueSource] = useState<IssueSource>(null);

  useEffect(() => {
    fetch("/api/romance").then(r => r.json()).then(setProjects).catch(() => {});
  }, []);

  const loadProject = async (id: string) => {
    const r = await fetch(`/api/romance/${id}`);
    const p = await r.json();
    setSelectedProject(p);
    if (p.parameters) setParams(p.parameters);
    setView("studio");
  };

  const createProject = async () => {
    setCreating(true);
    try {
      const r = await fetch("/api/romance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, subgenre: newSubgenre }),
      });
      const p = await r.json();
      setSelectedProject(p);
      setParams({ ...EMPTY_PARAMS, subgenre: newSubgenre });
      setView("parameters");
    } finally {
      setCreating(false);
    }
  };

  const saveParameters = async () => {
    setSavingParams(true);
    try {
      const r = await fetch(`/api/romance/${selectedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters: params }),
      });
      const p = await r.json();
      setSelectedProject(p);
      setView("studio");
      setTab("outline");
    } finally {
      setSavingParams(false);
    }
  };

  const generate = async (type: "outline" | "beat-sheet") => {
    setGenerating(type);
    setError(null);
    try {
      const r = await fetch(`/api/romance/${selectedProject.id}/${type}`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setSelectedProject((prev: any) => ({
        ...prev,
        outline: type === "outline" ? data.outline : prev.outline,
        beat_sheet: type === "beat-sheet" ? data.beat_sheet : prev.beat_sheet,
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(null);
    }
  };

  const draftScene = async () => {
    setGenerating("scene");
    setError(null);
    try {
      const r = await fetch(`/api/romance/${selectedProject.id}/scene`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sceneForm),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setSelectedProject((prev: any) => ({ ...prev, scenes: [...(prev.scenes ?? []), data] }));
      setTab("scenes");
      setSceneForm({ purpose: "", pov: "lead_a", beat_position: "", length: "1,500-2,500 words", context: "", title: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(null);
    }
  };

  const saveSceneEdit = async (sceneId: string) => {
    await fetch(`/api/romance/${selectedProject.id}/scene/${sceneId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    setSelectedProject((prev: any) => ({
      ...prev,
      scenes: prev.scenes.map((s: any) => s.id === sceneId ? { ...s, content: editContent } : s),
    }));
    setEditingScene(null);
  };

  const deleteScene = async (sceneId: string) => {
    await fetch(`/api/romance/${selectedProject.id}/scene/${sceneId}`, { method: "DELETE" });
    setSelectedProject((prev: any) => ({
      ...prev,
      scenes: prev.scenes.filter((s: any) => s.id !== sceneId),
    }));
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const leadAName = params?.lead_a?.name || "Lead A";
  const leadBName = params?.lead_b?.name || "Lead B";

  if (view === "upload-edit") return (
    <Layout>
      <ManuscriptUpload
        onParsed={chapters => { setEditorChapters(chapters); setView("editor"); }}
        onBack={() => setView("hub")}
        backLabel="Romance Studio"
      />
    </Layout>
  );

  if (view === "editor") return (
    <ManuscriptEditorView
      initialChapters={editorChapters}
      onBack={() => setView("hub")}
      backLabel="Romance Studio"
      persistedIssues={editorIssues}
      persistedIssueSource={editorIssueSource}
      onIssuesChange={(issues, src) => { setEditorIssues(issues); setEditorIssueSource(src ?? null); }}
      onClearSession={() => { setEditorChapters([]); setEditorIssues([]); setEditorIssueSource(null); setView("hub"); }}
    />
  );

  if (view === "hub") return (
    <Layout>
      <div className="max-w-2xl mx-auto py-10 animate-in fade-in duration-300">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Home
        </button>
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-5 h-5 text-rose-400" />
              <h1 className="text-3xl font-serif font-bold">Romance Studio</h1>
            </div>
            <p className="text-muted-foreground text-sm">Billionaire · Small-Town ETL · Workplace ETL · KU-optimized</p>
          </div>
          <Button onClick={() => setView("new-project")} className="gap-2">
            <Plus className="w-4 h-4" /> New Project
          </Button>
          <Button variant="outline" onClick={() => setView("upload-edit")} className="gap-2">
            <Upload className="w-4 h-4" /> Upload for Editing
          </Button>
        </div>
        {editorChapters.length > 0 && (
          <button
            onClick={() => setView("editor")}
            className="w-full text-left p-4 rounded-lg border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all mb-2 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">Resume editing session</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editorChapters.length} chapter{editorChapters.length !== 1 ? "s" : ""} loaded
                  {editorIssues.length > 0 && ` · ${editorIssues.filter(i => i.status === "open").length} issues remaining`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </button>
        )}
        {projects.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border/40 rounded-xl">
            <Heart className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No romance projects yet.</p>
            <Button className="mt-4 gap-2" onClick={() => setView("new-project")}>
              <Plus className="w-4 h-4" /> Start your first project
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map(p => (
              <button key={p.id} onClick={() => loadProject(p.id)}
                className="w-full text-left p-4 rounded-lg border border-border/60 hover:border-rose-400/40 hover:bg-rose-500/5 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {p.subgenre === "billionaire" ? "Billionaire" : p.subgenre === "small_town_etl" ? "Small-Town ETL" : "Workplace ETL"}
                      </Badge>
                      {p.has_outline && <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30">Outline ✓</Badge>}
                      {p.has_beat_sheet && <Badge variant="outline" className="text-xs text-blue-600 border-blue-500/30">Beat Sheet ✓</Badge>}
                      {p.scene_count > 0 && <Badge variant="outline" className="text-xs">{p.scene_count} scene{p.scene_count !== 1 ? "s" : ""}</Badge>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );

  if (view === "new-project") return (
    <Layout>
      <div className="max-w-xl mx-auto py-10 animate-in fade-in duration-300">
        <button onClick={() => setView("hub")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <h2 className="text-2xl font-serif font-bold mb-6">New Romance Project</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Working title</label>
            <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. 'The Merger'" className="h-10" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Subgenre</label>
            <div className="space-y-2">
              {SUBGENRES.map(sg => (
                <button key={sg.id} onClick={() => setNewSubgenre(sg.id)}
                  className={cn("w-full text-left p-3.5 rounded-lg border-2 transition-all",
                    newSubgenre === sg.id ? "border-rose-400 bg-rose-500/5" : "border-border/60 hover:border-rose-400/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{sg.label}</p>
                    {newSubgenre === sg.id && <Check className="w-4 h-4 text-rose-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{sg.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <Button onClick={createProject} disabled={!newTitle.trim() || creating} className="w-full gap-2" size="lg">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
            Create Project
          </Button>
        </div>
      </div>
    </Layout>
  );

  if (view === "parameters") return (
    <Layout>
      <div className="max-w-2xl mx-auto py-10 animate-in fade-in duration-300">
        <button onClick={() => setView("hub")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <h2 className="text-2xl font-serif font-bold mb-1">Story Parameters</h2>
        <p className="text-sm text-muted-foreground mb-8">These feed directly into every generation step.</p>
        <div className="space-y-8">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm border-b border-border/60 pb-2">Story Setup</h3>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Setting (city, season, industry — be specific)</label>
              <Input value={params.setting} onChange={e => setParams({ ...params, setting: e.target.value })} placeholder="e.g. 'Chicago, January. Commercial real estate.'" />
            </div>
            {params.subgenre === "billionaire" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Which lead is the billionaire?</label>
                <div className="flex gap-2">
                  {["hero", "heroine", "undecided"].map(v => (
                    <button key={v} onClick={() => setParams({ ...params, billionaire_lead: v })}
                      className={cn("px-3 py-1.5 rounded-lg border text-sm transition-all capitalize",
                        params.billionaire_lead === v ? "border-rose-400 bg-rose-500/5" : "border-border/60 hover:border-rose-400/40"
                      )}
                    >{v}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Series or standalone?</label>
                <div className="flex gap-2">
                  {["standalone", "series"].map(v => (
                    <button key={v} onClick={() => setParams({ ...params, series_or_standalone: v })}
                      className={cn("px-3 py-1.5 rounded-lg border text-sm transition-all capitalize",
                        params.series_or_standalone === v ? "border-rose-400 bg-rose-500/5" : "border-border/60 hover:border-rose-400/40"
                      )}
                    >{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Target word count</label>
                <Input value={params.target_word_count} onChange={e => setParams({ ...params, target_word_count: e.target.value })} placeholder="75,000" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">The enmity (a real grievance, not a misunderstanding)</label>
              <Textarea value={params.enmity_reason} onChange={e => setParams({ ...params, enmity_reason: e.target.value })}
                placeholder="What specifically made them enemies?" className="resize-none min-h-[80px] text-sm" />
            </div>
          </div>

          <CharacterForm label={`Lead A${leadAName !== "Lead A" ? ` — ${leadAName}` : ""}`}
            value={params.lead_a} onChange={v => setParams({ ...params, lead_a: v })} />

          <div>
            <button onClick={() => setShowLeadB(!showLeadB)}
              className="flex items-center gap-2 text-sm font-semibold mb-3 hover:text-primary transition-colors w-full text-left"
            >
              {showLeadB ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Lead B{leadBName !== "Lead B" ? ` — ${leadBName}` : ""}
              {!showLeadB && <span className="text-xs font-normal text-muted-foreground ml-1">(click to expand)</span>}
            </button>
            {showLeadB && (
              <CharacterForm label={`Lead B${leadBName !== "Lead B" ? ` — ${leadBName}` : ""}`}
                value={params.lead_b} onChange={v => setParams({ ...params, lead_b: v })} />
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm border-b border-border/60 pb-2">The Dynamic</h3>
            {[
              ["a_drawn_to_b", `Why ${leadAName} is drawn to ${leadBName} beyond looks`],
              ["b_drawn_to_a", `Why ${leadBName} is drawn to ${leadAName} beyond looks`],
              ["what_they_share", "What they share that neither would admit"],
              ["five_year_vision_a", `${leadAName}'s 5-year vision`],
              ["five_year_vision_b", `${leadBName}'s 5-year vision`],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
                <Textarea value={params[key]} onChange={e => setParams({ ...params, [key]: e.target.value })}
                  placeholder={label as string} className="resize-none min-h-[70px] text-sm" />
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={saveParameters} disabled={savingParams} size="lg" className="w-full gap-2">
            {savingParams ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Save & Open Studio
          </Button>
        </div>
      </div>
    </Layout>
  );

  if (view === "studio" && selectedProject) return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 h-12 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("hub")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Heart className="w-4 h-4 text-rose-400" />
          <span className="font-medium text-sm">{selectedProject.title}</span>
          <Badge variant="outline" className="text-xs">
            {selectedProject.subgenre === "billionaire" ? "Billionaire" : selectedProject.subgenre === "small_town_etl" ? "Small-Town ETL" : "Workplace ETL"}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setView("parameters")}>
          <Pencil className="w-3.5 h-3.5" /> Parameters
        </Button>
      </div>

      <div className="flex border-b border-border/40 px-6 shrink-0">
        {[
          { id: "outline", label: "Outline", icon: <FileText className="w-3.5 h-3.5" /> },
          { id: "beat_sheet", label: "Beat Sheet", icon: <Layers className="w-3.5 h-3.5" /> },
          { id: "scenes", label: `Scenes (${selectedProject.scenes?.length ?? 0})`, icon: <BookOpen className="w-3.5 h-3.5" /> },
          { id: "new_scene", label: "Draft Scene", icon: <Plus className="w-3.5 h-3.5" /> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as StudioTab)}
            className={cn("flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors",
              tab === t.id ? "border-rose-400 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        {tab === "outline" && (
          <div className="max-w-3xl mx-auto">
            {selectedProject.outline ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl font-bold">Story Outline</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => copy(selectedProject.outline, "outline")} className="gap-1.5 h-8">
                      {copied === "outline" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === "outline" ? "Copied" : "Copy"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generate("outline")} disabled={!!generating} className="gap-1.5 h-8">
                      {generating === "outline" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Regenerate
                    </Button>
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/20 rounded-xl border border-border/60 p-6">
                  {selectedProject.outline}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No outline yet.</p>
                {!selectedProject.parameters ? (
                  <Button onClick={() => setView("parameters")} className="gap-2">
                    <Pencil className="w-4 h-4" /> Set parameters first
                  </Button>
                ) : (
                  <Button onClick={() => generate("outline")} disabled={!!generating} className="gap-2">
                    {generating === "outline" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Generate Outline
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "beat_sheet" && (
          <div className="max-w-3xl mx-auto">
            {selectedProject.beat_sheet ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl font-bold">Beat Sheet</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => copy(selectedProject.beat_sheet, "beats")} className="gap-1.5 h-8">
                      {copied === "beats" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === "beats" ? "Copied" : "Copy"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generate("beat-sheet")} disabled={!!generating} className="gap-1.5 h-8">
                      {generating === "beat-sheet" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Regenerate
                    </Button>
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/20 rounded-xl border border-border/60 p-6">
                  {selectedProject.beat_sheet}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <Layers className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">
                  {!selectedProject.outline ? "Generate the outline first." : "Ready to build the beat sheet."}
                </p>
                <Button onClick={() => selectedProject.outline ? generate("beat-sheet") : setTab("outline")}
                  disabled={!!generating} className="gap-2">
                  {generating === "beat-sheet" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {selectedProject.outline ? "Generate Beat Sheet" : "Go to Outline first"}
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === "scenes" && (
          <div className="max-w-3xl mx-auto space-y-3">
            {(selectedProject.scenes ?? []).length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No scenes drafted yet.</p>
                <Button onClick={() => setTab("new_scene")} className="gap-2">
                  <Plus className="w-4 h-4" /> Draft first scene
                </Button>
              </div>
            ) : (
              (selectedProject.scenes ?? []).map((scene: any) => (
                <div key={scene.id} className="border border-border/60 rounded-lg overflow-hidden">
                  <button onClick={() => setExpandedScene(expandedScene === scene.id ? null : scene.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors text-left"
                  >
                    <div>
                      <p className="font-medium text-sm">{scene.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        POV: {scene.pov === "lead_a" ? leadAName : leadBName} · {scene.beat_position}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{scene.content?.split(/\s+/).filter(Boolean).length ?? 0} words</span>
                      {expandedScene === scene.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>
                  {expandedScene === scene.id && (
                    <div className="border-t border-border/40">
                      {editingScene === scene.id ? (
                        <div className="p-4 space-y-3">
                          <Textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                            className="min-h-[400px] text-sm font-sans resize-none" />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveSceneEdit(scene.id)} className="gap-1.5 h-8">
                              <Check className="w-3.5 h-3.5" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingScene(null)} className="gap-1.5 h-8">
                              <X className="w-3.5 h-3.5" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-muted/10">
                            <Button variant="ghost" size="sm" onClick={() => copy(scene.content, scene.id)} className="gap-1 h-7 text-xs">
                              {copied === scene.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingScene(scene.id); setEditContent(scene.content); }} className="gap-1 h-7 text-xs">
                              <Pencil className="w-3 h-3" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteScene(scene.id)} className="gap-1 h-7 text-xs text-destructive hover:text-destructive">
                              <Trash2 className="w-3 h-3" /> Delete
                            </Button>
                          </div>
                          <div className="p-6 text-sm leading-relaxed whitespace-pre-wrap">{scene.content}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "new_scene" && (
          <div className="max-w-xl mx-auto space-y-4">
            <h2 className="font-serif text-xl font-bold">Draft a Scene</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Scene title (optional)</label>
              <Input value={sceneForm.title} onChange={e => setSceneForm({ ...sceneForm, title: e.target.value })} placeholder="e.g. 'The elevator confrontation'" className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Scene purpose (one sentence)</label>
              <Textarea value={sceneForm.purpose} onChange={e => setSceneForm({ ...sceneForm, purpose: e.target.value })}
                placeholder="e.g. 'First time they're forced to work together; mutual irritation reveals mutual respect'" className="resize-none min-h-[80px] text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">POV character</label>
              <div className="flex gap-2">
                {[["lead_a", leadAName], ["lead_b", leadBName]].map(([val, label]) => (
                  <button key={val} onClick={() => setSceneForm({ ...sceneForm, pov: val })}
                    className={cn("px-3 py-1.5 rounded-lg border text-sm transition-all",
                      sceneForm.pov === val ? "border-rose-400 bg-rose-500/5" : "border-border/60 hover:border-rose-400/40"
                    )}
                  >{label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Where in the story</label>
              <Input value={sceneForm.beat_position} onChange={e => setSceneForm({ ...sceneForm, beat_position: e.target.value })}
                placeholder="e.g. 'Act 2, after the midpoint shift'" className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Target length</label>
              <Input value={sceneForm.length} onChange={e => setSceneForm({ ...sceneForm, length: e.target.value })} className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Context from prior scenes (optional)</label>
              <Textarea value={sceneForm.context} onChange={e => setSceneForm({ ...sceneForm, context: e.target.value })}
                placeholder="What just happened? What does the POV character know right now?" className="resize-none min-h-[90px] text-sm" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={draftScene} disabled={!sceneForm.purpose || !sceneForm.beat_position || !!generating} size="lg" className="w-full gap-2">
              {generating === "scene" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating === "scene" ? "Writing..." : "Draft Scene"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return null;
}
