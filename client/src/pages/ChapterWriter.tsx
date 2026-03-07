import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PenTool, Copy, Check, Download, RotateCcw } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import NarrativeSliders, { DEFAULT_SLIDERS, type NarrativeSliderValues } from "@/components/NarrativeSliders";
import Layout from "@/components/Layout";

export default function ChapterWriter() {
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("");
  const [sliders, setSliders] = useState<NarrativeSliderValues>({ ...DEFAULT_SLIDERS });
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
  };

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

          <Button
            onClick={handleWrite}
            size="lg"
            disabled={!prompt.trim() || generating}
            className="w-full h-14 text-base gap-2"
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
