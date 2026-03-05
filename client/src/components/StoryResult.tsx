import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import RichTextEditor from "@/components/RichTextEditor";
import { Download, Copy, Check, Loader2, RotateCcw, BookOpen, Pencil, X } from "lucide-react";

interface StoryResultProps {
  projectId: string;
  onReset: () => void;
}

export default function StoryResult({ projectId, onReset }: StoryResultProps) {
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dossierMarkdown, setDossierMarkdown] = useState("");
  const [bestPitch, setBestPitch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creatingBook, setCreatingBook] = useState(false);
  const [editingDossier, setEditingDossier] = useState(false);
  const dossierDraftRef = useRef("");

  useEffect(() => {
    fetch(`/api/project/${projectId}/final`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDossierMarkdown(data.dossier_final);
        setBestPitch(data.best_pitch);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(dossierMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([dossierMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "story-dossier.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleWriteBook = async () => {
    setCreatingBook(true);
    try {
      const res = await fetch(`/api/books/from-project/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create book");
      navigate(`/book/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setCreatingBook(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={onReset}>Start Over</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <div className="inline-block px-3 py-1 mb-3 rounded-full bg-primary/10 text-primary text-sm font-medium tracking-wide">
            Final Story Dossier
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            Your Story Dossier
          </h2>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2 flex-1 md:flex-none" data-testid="button-copy">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" onClick={handleDownload} className="gap-2 flex-1 md:flex-none" data-testid="button-download">
            <Download className="w-4 h-4" /> Download .md
          </Button>
          <Button
            size="sm"
            onClick={handleWriteBook}
            disabled={creatingBook}
            className="gap-2 flex-1 md:flex-none"
            data-testid="button-write-book"
          >
            {creatingBook ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            {creatingBook ? "Creating..." : "Write the Book"}
          </Button>
          <Button variant="outline" size="sm" onClick={onReset} className="gap-2 flex-1 md:flex-none" data-testid="button-start-new">
            <RotateCcw className="w-4 h-4" /> New
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border shadow-xl rounded-xl overflow-hidden">
        <Tabs defaultValue="full" className="w-full">
          <div className="border-b border-border bg-muted/20 px-4 pt-4">
            <TabsList className="bg-transparent h-auto p-0 gap-6">
              {["full", "pitch", "raw"].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-3 pt-2 text-base font-medium capitalize"
                >
                  {tab === "full" ? "Full Dossier" : tab === "pitch" ? "Best Pitch" : "Raw Markdown"}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="p-6 md:p-8">
            <TabsContent value="full" className="mt-0 focus-visible:outline-none">
              <div className="flex items-center justify-end gap-1 mb-3">
                {editingDossier ? (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={async () => {
                        setDossierMarkdown(dossierDraftRef.current);
                        setEditingDossier(false);
                        try {
                          await fetch(`/api/project/${projectId}/dossier`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ dossier: dossierDraftRef.current }),
                          });
                        } catch {}
                      }}
                      className="h-7 gap-1 text-xs"
                      data-testid="button-save-dossier"
                    >
                      <Check className="w-3 h-3" /> Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingDossier(false)}
                      className="h-7 gap-1 text-xs"
                    >
                      <X className="w-3 h-3" /> Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      dossierDraftRef.current = dossierMarkdown;
                      setEditingDossier(true);
                    }}
                    className="h-7 gap-1 text-xs"
                    data-testid="button-edit-dossier"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                )}
              </div>
              <RichTextEditor
                content={dossierMarkdown}
                readOnly={!editingDossier}
                onChange={(_html, plain) => {
                  dossierDraftRef.current = plain;
                }}
                maxHeight="600px"
                minHeight="300px"
                placeholder="Story dossier..."
                data-testid="editor-dossier"
              />
            </TabsContent>

            <TabsContent value="pitch" className="mt-0 focus-visible:outline-none">
              <div className="bg-muted/10 border border-border/50 rounded-lg p-6">
                <h3 className="text-xl font-serif font-semibold text-primary mb-4">Selected Best Pitch</h3>
                <div className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {bestPitch}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="raw" className="mt-0 focus-visible:outline-none">
              <ScrollArea className="h-[600px]">
                <pre className="text-sm font-mono bg-muted/30 p-4 rounded-lg whitespace-pre-wrap break-words text-foreground/80">
                  {dossierMarkdown}
                </pre>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

