import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Scissors,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ArrowLeft,
  RefreshCw,
  Download,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChapterElement {
  key: string;
  label: string;
  value: string;
}

type Phase = "input" | "extracting" | "editing" | "rewriting" | "result";

export default function ChapterAnalyzer() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("input");
  const [chapterText, setChapterText] = useState("");
  const [elements, setElements] = useState<ChapterElement[]>([]);
  const [rewrittenChapter, setRewrittenChapter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [copied, setCopied] = useState(false);

  const handleExtract = async () => {
    if (!chapterText.trim()) return;
    setPhase("extracting");
    setError(null);

    try {
      const res = await fetch("/api/chapter/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_text: chapterText }),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Server returned an invalid response. Please try again.");
      }
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      if (!data.elements || !Array.isArray(data.elements)) {
        throw new Error("Unexpected response format. Please try again.");
      }
      setElements(data.elements);
      setPhase("editing");
    } catch (err: any) {
      setError(err.message);
      setPhase("input");
    }
  };

  const handleRewrite = async () => {
    setPhase("rewriting");
    setError(null);

    try {
      const res = await fetch("/api/chapter/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_text: chapterText, elements }),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Server returned an invalid response. Please try again.");
      }
      if (!res.ok) throw new Error(data.error || "Rewrite failed");
      if (!data.rewritten_chapter || !data.rewritten_chapter.trim()) {
        throw new Error("Rewrite came back empty. Please try again.");
      }
      setRewrittenChapter(data.rewritten_chapter);
      setPhase("result");
    } catch (err: any) {
      setError(err.message);
      setPhase("editing");
    }
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditLabel(elements[index].label);
    setEditValue(elements[index].value);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const updated = [...elements];
    updated[editingIndex] = {
      ...updated[editingIndex],
      label: editLabel,
      value: editValue,
    };
    setElements(updated);
    setEditingIndex(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  const removeElement = (index: number) => {
    setElements(elements.filter((_, i) => i !== index));
  };

  const addElement = () => {
    if (!newLabel.trim() || !newValue.trim()) return;
    setElements([
      ...elements,
      {
        key: `custom_${Date.now()}`,
        label: newLabel.trim(),
        value: newValue.trim(),
      },
    ]);
    setNewLabel("");
    setNewValue("");
    setAddingNew(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rewrittenChapter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([rewrittenChapter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rewritten-chapter.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartOver = () => {
    setPhase("input");
    setChapterText("");
    setElements([]);
    setRewrittenChapter("");
    setEditingIndex(null);
    setAddingNew(false);
    setNewLabel("");
    setNewValue("");
    setCopied(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")} role="button" tabIndex={0}>
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center text-primary-foreground font-serif font-bold text-xl leading-none">
              S
            </div>
            <h1 className="font-serif font-semibold text-xl tracking-tight">StoryDossier</h1>
          </div>
          <button
            onClick={() => navigate("/")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* INPUT PHASE */}
        {phase === "input" && (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                <Scissors className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-4xl font-serif font-bold text-foreground mb-4">
                Chapter Analyzer
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Paste a chapter below. Claude will extract its core structural elements so you can
                reshape and refine them before generating a rewrite.
              </p>
            </div>

            <Card className="border-border/60 shadow-lg shadow-primary/5">
              <CardHeader>
                <CardTitle className="text-2xl font-serif">Paste Your Chapter</CardTitle>
                <CardDescription>The full text of the chapter you want to analyze and rework.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Textarea
                  placeholder="Paste your chapter text here..."
                  className="min-h-[300px] resize-y text-base p-4 bg-muted/30 focus-visible:bg-background transition-colors"
                  value={chapterText}
                  onChange={(e) => setChapterText(e.target.value)}
                  data-testid="input-chapter-text"
                />
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">
                    {error}
                  </div>
                )}
                <Button
                  onClick={handleExtract}
                  size="lg"
                  className="w-full h-14 text-base gap-2"
                  disabled={!chapterText.trim()}
                  data-testid="button-extract"
                >
                  <Scissors className="w-5 h-5" />
                  Extract Chapter Elements
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* EXTRACTING PHASE */}
        {phase === "extracting" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 animate-in fade-in duration-300">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-lg text-muted-foreground font-serif">
              Analyzing chapter structure...
            </p>
            <p className="text-sm text-muted-foreground">This may take 15-30 seconds</p>
          </div>
        )}

        {/* EDITING PHASE */}
        {phase === "editing" && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <div className="inline-block px-3 py-1 mb-3 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  Structural Elements
                </div>
                <h2 className="text-3xl font-serif font-bold text-foreground">
                  Edit Chapter Elements
                </h2>
                <p className="text-muted-foreground mt-1">
                  Edit values, remove what's not relevant, or add your own elements.
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {elements.map((el, index) => (
                <Card
                  key={el.key}
                  className={cn(
                    "border-border/60 transition-all",
                    editingIndex === index && "ring-2 ring-primary/30"
                  )}
                >
                  <CardContent className="p-4">
                    {editingIndex === index ? (
                      <div className="space-y-3">
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="font-medium text-sm"
                          placeholder="Element label"
                          data-testid={`input-edit-label-${index}`}
                        />
                        <Textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="text-sm min-h-[80px] resize-y"
                          placeholder="Element value"
                          data-testid={`input-edit-value-${index}`}
                        />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={cancelEdit} className="gap-1">
                            <X className="w-3 h-3" /> Cancel
                          </Button>
                          <Button size="sm" onClick={saveEdit} className="gap-1" data-testid={`button-save-edit-${index}`}>
                            <Check className="w-3 h-3" /> Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">
                            {el.label}
                          </h4>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{el.value}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(index)}
                            className="h-8 w-8 p-0"
                            data-testid={`button-edit-${index}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeElement(index)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            data-testid={`button-remove-${index}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Add new element */}
            {addingNew ? (
              <Card className="border-dashed border-2 border-primary/30 mb-6">
                <CardContent className="p-4 space-y-3">
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="font-medium text-sm"
                    placeholder="Element name (e.g., Subplot Thread)"
                    data-testid="input-new-label"
                  />
                  <Textarea
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="text-sm min-h-[80px] resize-y"
                    placeholder="Description of this element..."
                    data-testid="input-new-value"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setAddingNew(false); setNewLabel(""); setNewValue(""); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={addElement}
                      disabled={!newLabel.trim() || !newValue.trim()}
                      data-testid="button-save-new"
                    >
                      Add Element
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button
                variant="outline"
                onClick={() => setAddingNew(true)}
                className="w-full mb-6 gap-2 border-dashed"
                data-testid="button-add-element"
              >
                <Plus className="w-4 h-4" /> Add Custom Element
              </Button>
            )}

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mb-4" data-testid="text-error">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={handleStartOver}
                className="flex-1"
              >
                Start Over
              </Button>
              <Button
                onClick={handleRewrite}
                className="flex-1 gap-2"
                disabled={elements.length === 0}
                data-testid="button-rewrite"
              >
                <RefreshCw className="w-4 h-4" />
                Rewrite Chapter
              </Button>
            </div>
          </div>
        )}

        {/* REWRITING PHASE */}
        {phase === "rewriting" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 animate-in fade-in duration-300">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-lg text-muted-foreground font-serif">
              Rewriting your chapter...
            </p>
            <p className="text-sm text-muted-foreground">Claude is incorporating your structural changes</p>
          </div>
        )}

        {/* RESULT PHASE */}
        {phase === "result" && (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <div className="inline-block px-3 py-1 mb-3 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  Rewritten Chapter
                </div>
                <h2 className="text-3xl font-serif font-bold text-foreground">
                  Your Revised Chapter
                </h2>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2 flex-1 md:flex-none" data-testid="button-copy-rewrite">
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" onClick={handleDownload} className="gap-2 flex-1 md:flex-none" data-testid="button-download-rewrite">
                  <Download className="w-4 h-4" /> Download
                </Button>
              </div>
            </div>

            <Card className="border-border/60 shadow-xl mb-6">
              <CardContent className="p-6 md:p-8">
                <ScrollArea className="max-h-[600px]">
                  <div className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap font-serif">
                    {rewrittenChapter}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button variant="outline" onClick={handleStartOver} className="flex-1" data-testid="button-analyze-another">
                Analyze Another Chapter
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setChapterText(rewrittenChapter);
                  setPhase("input");
                  setElements([]);
                  setRewrittenChapter("");
                }}
                className="flex-1 gap-2"
                data-testid="button-re-analyze"
              >
                <RefreshCw className="w-4 h-4" /> Re-Analyze This Rewrite
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
