import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Copy, Check, Loader2, RotateCcw } from "lucide-react";

interface StoryResultProps {
  projectId: string;
  onReset: () => void;
}

export default function StoryResult({ projectId, onReset }: StoryResultProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dossierMarkdown, setDossierMarkdown] = useState("");
  const [bestPitch, setBestPitch] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const sections = parseDossierSections(dossierMarkdown);

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
              <div className="prose prose-stone max-w-none">
                {sections.map((section, i) => (
                  <div key={i} className="mb-8">
                    {section.heading && (
                      <h3 className="text-xl font-serif font-semibold text-primary border-b border-border pb-2 mb-4">
                        {section.heading}
                      </h3>
                    )}
                    <div className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
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

function parseDossierSections(markdown: string): Array<{ heading: string; content: string }> {
  const lines = markdown.split("\n");
  const sections: Array<{ heading: string; content: string }> = [];
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      if (currentHeading || currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
      }
      currentHeading = headingMatch[1];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentHeading || currentContent.length > 0) {
    sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
  }

  return sections;
}
