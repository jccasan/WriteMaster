import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, PenTool, Copy, Check, Download, RotateCcw, Clock, Trash2 } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import ProseText from "@/components/ProseText";
import NarrativeSliders, { DEFAULT_SLIDERS, type NarrativeSliderValues } from "@/components/NarrativeSliders";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";

interface SavedDraft {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  prompt: string;
  genre: string;
  content: string;
}

export default function ChapterWriter() {
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("");
  const [sliders, setSliders] = useState<NarrativeSliderValues>({ ...DEFAULT_SLIDERS });
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [variants, setVariants] = useState<{ lens: string; content: string }[] | null>(null);
  const [activeVariantTab, setActiveVariantTab] = useState(0);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: drafts } = useQuery<SavedDraft[]>({
    queryKey: ["/api/chapter-drafts"],
  });

  const handleWrite = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/chapter/write-standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          genre: genre.trim() || undefined,
          sliders,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to write chapter");
      setContent(data.content);

      try {
        const saveRes = await fetch("/api/chapter-drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentDraftId,
            prompt: prompt.trim(),
            genre: genre.trim(),
            content: data.content,
          }),
        });
        if (saveRes.ok) {
          const saved = await saveRes.json();
          setCurrentDraftId(saved.id);
          queryClient.invalidateQueries({ queryKey: ["/api/chapter-drafts"] });
        }
      } catch {}

    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!content) return;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chapter.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setContent(null);
    setError(null);
    setCopied(false);
    setCurrentDraftId(null);
    setPrompt("");
    setGenre("");
    setSliders({ ...DEFAULT_SLIDERS });
    setVariants(null);
  };

  const handleWriteVariants = async () => {
    if (!prompt.trim()) return;
    setGeneratingVariants(true);
    setError(null);
    setVariants(null);
    try {
      const res = await fetch("/api/chapter/write-standalone-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          genre: genre.trim() || undefined,
          sliders,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate variants");
      setVariants(data.variants);
      setActiveVariantTab(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingVariants(false);
    }
  };

  const selectVariant = (variantContent: string) => {
    setContent(variantContent);
    setVariants(null);
  };

  const loadDraft = (draft: SavedDraft) => {
    setPrompt(draft.prompt);
    setGenre(draft.genre);
    setContent(draft.content);
    setCurrentDraftId(draft.id);
    setError(null);
    setCopied(false);
  };

  const deleteDraft = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await fetch(`/api/chapter-drafts/${id}`, { method: "DELETE" });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["/api/chapter-drafts"] });
      if (currentDraftId === id) handleReset();
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  if (variants && variants.length > 0) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground" data-testid="text-variant-heading">
                Compare Variants
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                3 different creative approaches — pick the one that works best
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setVariants(null)} className="gap-2" data-testid="button-back-from-variants">
              <RotateCcw className="w-4 h-4" /> Back
            </Button>
          </div>

          <div className="bg-card border border-border shadow-xl rounded-xl overflow-hidden">
            <div className="flex border-b bg-muted/30">
              {variants.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setActiveVariantTab(i)}
                  className={cn(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                    activeVariantTab === i
                      ? "bg-background text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  data-testid={`tab-variant-${i}`}
                >
                  {v.lens}
                </button>
              ))}
            </div>
            <div className="p-6">
              <ProseText
                text={variants[activeVariantTab].content}
                className="prose prose-sm max-w-none dark:prose-invert mb-6"
                data-testid={`text-variant-content-${activeVariantTab}`}
              />
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  size="sm"
                  onClick={() => selectVariant(variants[activeVariantTab].content)}
                  data-testid={`button-use-variant-${activeVariantTab}`}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Use This Version
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (content) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground" data-testid="text-chapter-result-heading">
                Your Chapter
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Generated from your creative prompt
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2" data-testid="button-copy-result">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2" data-testid="button-download-result">
                <Download className="w-4 h-4" /> Download
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-2" data-testid="button-write-another">
                <RotateCcw className="w-4 h-4" /> New
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border shadow-xl rounded-xl overflow-hidden">
            <div className="p-6">
              <RichTextEditor
                content={content}
                readOnly={true}
                maxHeight="none"
                minHeight="400px"
                data-testid="editor-chapter-result"
              />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <PenTool className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-4xl font-serif font-bold text-foreground mb-4" data-testid="text-chapter-writer-heading">
            Chapter Writer
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Describe what you want — a scene, a situation, characters, a mood — and the AI will write a polished chapter from your prompt.
          </p>
        </div>

        {drafts && drafts.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Previous Chapters
            </h3>
            <div className="grid gap-2">
              {drafts.map((draft) => (
                <Card
                  key={draft.id}
                  className="cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => loadDraft(draft)}
                  data-testid={`card-draft-${draft.id}`}
                >
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-draft-title-${draft.id}`}>
                        {draft.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {draft.genre && <span className="mr-2">{draft.genre}</span>}
                        {formatDate(draft.updated_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => deleteDraft(draft.id, e)}
                      data-testid={`button-delete-draft-${draft.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Creative Prompt
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your scene, characters, conflict, setting, mood... anything goes. The more detail you give, the better the chapter. Example: 'A burned-out detective meets an informant at a rainy diner at 3am. She has intel on a missing person case he's been obsessing over, but she's clearly terrified of being seen with him.'"
              className="min-h-[200px] text-base leading-relaxed resize-y"
              disabled={generating}
              data-testid="textarea-prompt"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Genre Hint <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="e.g., contemporary thriller, dark romance, fantasy..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={generating}
              data-testid="input-genre"
            />
          </div>

          <NarrativeSliders
            values={sliders}
            onChange={setSliders}
          />

          <div className="flex gap-3">
            <Button
              onClick={handleWrite}
              size="lg"
              disabled={!prompt.trim() || generating || generatingVariants}
              className="flex-1 h-14 text-base gap-2"
              data-testid="button-write-chapter"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Writing your chapter...
                </>
              ) : (
                <>
                  <PenTool className="w-5 h-5" />
                  Write Chapter
                </>
              )}
            </Button>
            <Button
              onClick={handleWriteVariants}
              size="lg"
              variant="outline"
              disabled={!prompt.trim() || generating || generatingVariants}
              className="h-14 text-base gap-2 px-6"
              data-testid="button-write-variants"
            >
              {generatingVariants ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  3 Variants
                </>
              )}
            </Button>
          </div>
          {generatingVariants && (
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating 3 variant chapters in parallel... This may take a couple minutes.
            </p>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-3 rounded-lg" data-testid="text-error">
              {error}
              <button onClick={() => setError(null)} className="ml-3 font-medium hover:underline">Dismiss</button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
