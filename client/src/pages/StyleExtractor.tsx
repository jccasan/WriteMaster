import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, Sparkles, Check, Copy,
  BookOpen, ChevronDown, ChevronUp, AlertCircle, Pencil, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

// Saved style guides from data/style-guides/
function SavedGuides({ onLoad }: { onLoad: (content: string, name: string) => void }) {
  const [guides, setGuides] = useState<{ filename: string; name: string; content: string }[]>([]);
  useEffect(() => {
    fetch("/api/tools/style-guides").then(r => r.json()).then(d => setGuides(d.guides ?? [])).catch(() => {});
  }, []);
  if (!guides.length) return null;
  return (
    <div className="border border-border/60 rounded-lg p-3 bg-muted/10">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Saved style guides</p>
      <div className="space-y-1">
        {guides.map(g => (
          <button key={g.filename} onClick={() => onLoad(g.content, g.name)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted/40 transition-colors text-left">
            <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {g.name}
          </button>
        ))}
      </div>
    </div>
  );
}

type Step = "input" | "generating" | "result";

interface PassagePreview {
  calm: string;
  dialogue: string;
  action: string;
}

export default function StyleExtractor() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("input");
  const [sampleText, setSampleText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [genre, setGenre] = useState("");
  const [styleGuide, setStyleGuide] = useState("");
  const [passages, setPassages] = useState<PassagePreview | null>(null);
  const [showPassages, setShowPassages] = useState(false);
  const [generatingStep, setGeneratingStep] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Book save
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const wordCount = sampleText.trim().split(/\s+/).filter(Boolean).length;
  const wordCountColor = wordCount < 1000 ? "text-amber-600" : wordCount < 3000 ? "text-blue-600" : "text-emerald-600";
  const wordCountLabel = wordCount < 1000 ? "too short" : wordCount < 3000 ? "good" : "ideal";

  const generate = async () => {
    if (sampleText.trim().length < 500) return;
    setStep("generating");
    setError(null);
    setGeneratingStep("Extracting representative passages...");

    try {
      const r = await fetch("/api/tools/extract-style-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample_text: sampleText, author_name: authorName, genre }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Extraction failed");
      setStyleGuide(data.style_guide);
      setPassages(data.passages ?? null);

      // Load books for save option
      const booksRes = await fetch("/api/books");
      const booksData = await booksRes.json();
      setBooks(booksData ?? []);

      setStep("result");
    } catch (err: any) {
      setError(err.message);
      setStep("input");
    }
  };

  const saveToBook = async () => {
    if (!selectedBookId || !styleGuide) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/books/${selectedBookId}/style-guide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style_guide: styleGuide }),
      });
      if (!r.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(styleGuide);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-10 animate-in fade-in duration-300">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Home
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-1">Style Extractor</h1>
          <p className="text-muted-foreground text-sm">
            Paste your own writing. Get a style guide that tells the AI exactly how to sound like you.
          </p>
        </div>

        {step === "input" && (
          <div className="space-y-5">
            {/* Saved style guides */}
            <SavedGuides onLoad={(guide, name) => { setStyleGuide(guide); setAuthorName(name); setStep("result"); fetch("/api/books").then(r => r.json()).then(setBooks).catch(() => {}); }} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Author name (optional)</label>
                <input value={authorName} onChange={e => setAuthorName(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border/60 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Your pen name" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Genre (optional)</label>
                <input value={genre} onChange={e => setGenre(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border/60 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Contemporary romance" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-muted-foreground">Your writing sample</label>
                <span className={cn("text-xs font-medium", wordCountColor)}>
                  {wordCount.toLocaleString()} words{wordCount > 0 ? ` — ${wordCountLabel}` : ""}
                </span>
              </div>
              <Textarea
                value={sampleText}
                onChange={e => setSampleText(e.target.value)}
                placeholder="Paste 2–5 chapters of your existing writing here. More text = better style guide. Ideally include chapters with different scene types: a quiet moment, a dialogue-heavy scene, and an action or tension scene."
                className="min-h-[320px] text-sm font-mono resize-none leading-relaxed"
              />
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <p>Minimum: 500 words. Recommended: 2,000+ words across varied scene types.</p>
                <p>The extractor automatically pulls representative passages (calm, dialogue, action) before generating the guide — you don't need to curate the input.</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <Button onClick={generate} disabled={sampleText.trim().length < 500} size="lg" className="w-full gap-2">
              <Sparkles className="w-4 h-4" /> Extract Style Guide
            </Button>
          </div>
        )}

        {step === "generating" && (
          <div className="flex flex-col items-center gap-6 py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div>
              <p className="font-medium mb-1">Analyzing your writing</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Step 1: Extracting representative passages (calm, dialogue, action) in parallel.
                Step 2: Generating style guide from those passages.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">This takes 30–60 seconds for thorough analysis.</p>
          </div>
        )}

        {step === "result" && (
          <div className="space-y-5">
            {/* Actions bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-xs">Generated</Badge>
                {authorName && <span className="text-sm text-muted-foreground">{authorName}</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={copy}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 h-8" onClick={() => { setStep("input"); setStyleGuide(""); setPassages(null); }}>
                  <Pencil className="w-3.5 h-3.5" /> New extract
                </Button>
              </div>
            </div>

            {/* Save to book */}
            {books.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/40">
                <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                <select value={selectedBookId} onChange={e => setSelectedBookId(e.target.value)}
                  className="flex-1 text-sm bg-transparent border-none focus:outline-none">
                  <option value="">Save to a book...</option>
                  {books.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
                <Button size="sm" className="h-7 text-xs gap-1" disabled={!selectedBookId || saving} onClick={saveToBook}>
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3" /> : null}
                  {saved ? "Saved" : "Save"}
                </Button>
              </div>
            )}

            {/* Passages preview */}
            {passages && (
              <div className="border border-border/40 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowPassages(!showPassages)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/20 transition-colors"
                >
                  <span className="font-medium text-sm">Extracted passages used for analysis</span>
                  {showPassages ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showPassages && (
                  <div className="border-t border-border/40 p-4 space-y-4">
                    {[
                      ["Calm / Descriptive", passages.calm],
                      ["Dialogue", passages.dialogue],
                      ["Action / Tension", passages.action],
                    ].map(([label, text]) => (
                      <div key={label}>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap bg-muted/20 rounded p-3 border border-border/30">{text}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Style guide */}
            <div className="bg-muted/10 rounded-xl border border-border/60 p-6">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{styleGuide}</pre>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </div>
    </Layout>
  );
}
