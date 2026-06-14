import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Globe, ChevronRight, Clock, Trash2, Upload } from "lucide-react";

interface UniverseSummary {
  id: string;
  name: string;
  description: string;
  updated_at: string;
  series_count: number;
  book_count: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function UniverseDashboard() {
  const [, navigate] = useLocation();
  const [universes, setUniverses] = useState<UniverseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newBible, setNewBible] = useState("");
  const [uploadingBible, setUploadingBible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/universe");
      if (r.ok) setUniverses(await r.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleBibleUpload = async (file: File) => {
    setUploadingBible(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const r = await fetch("/api/universe/extract-bible-text", {
        method: "POST",
        body: formData,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setNewBible(data.text);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingBible(false);
    }
  };

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/universe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), bible: newBible.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      navigate(`/universe/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setCreating(false);
    }
  };

  const del = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this universe? This does not delete books or series.")) return;
    await fetch(`/api/universe/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-4xl font-serif font-bold mb-3">Universes</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Organize your series and books under shared story bibles, character menageries, and world states.
          </p>
        </div>

        <Button onClick={() => setShowNew(!showNew)} size="lg" className="w-full gap-2 mb-6">
          <Plus className="w-5 h-5" /> New Universe
        </Button>

        {showNew && (
          <Card className="border-border/60 mb-6">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="uname">Universe Name *</Label>
                <Input id="uname" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Oracle Veil Universe" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="udesc">Description</Label>
                <Input id="udesc" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description of this universe" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ubible">Story Bible</Label>
                  <label className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 cursor-pointer transition-colors">
                    {uploadingBible
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Extracting...</>
                      : <><Upload className="w-3 h-3" /> Import from file</>
                    }
                    <input
                      type="file"
                      accept=".pdf,.docx,.md,.txt"
                      className="hidden"
                      disabled={uploadingBible}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleBibleUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <Textarea
                  id="ubible"
                  value={newBible}
                  onChange={e => setNewBible(e.target.value)}
                  placeholder="World-building notes, magic system rules, geography, factions...&#10;&#10;Or upload a .pdf, .docx, .md, or .txt file using Import from file above."
                  className="resize-none h-40 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Upload will populate this field — you can edit before creating.
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3">
                <Button onClick={create} disabled={creating || !newName.trim()} className="flex-1">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Universe
                </Button>
                <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : universes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No universes yet. Create one to start organizing your fiction.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {universes.map(u => (
              <Card
                key={u.id}
                className="border-border/60 hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => navigate(`/universe/${u.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <Globe className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{u.name}</h4>
                    {u.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{u.description}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{formatDate(u.updated_at)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{u.series_count} series · {u.book_count} standalone</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm" variant="ghost"
                      className="h-8 w-8 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => del(u.id, e)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
