import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";

interface Genre {
  id: string;
  display_name: string;
}

export default function PipelineNew() {
  const [, navigate] = useLocation();
  const [brainDump, setBrainDump] = useState("");
  const [genre, setGenre] = useState("");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/genres")
      .then((r) => r.json())
      .then(setGenres)
      .catch(() => setError("Failed to load genres"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brainDump.trim() || !genre) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/project/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brain_dump: brainDump, genre }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");
      navigate(`/pipeline/${data.project_id}`);
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4" data-testid="text-pipeline-heading">
            New Story Pipeline
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Pour your raw ideas onto the page. The AI pipeline will structure, refine, and forge them into a compelling Story Dossier ready for drafting.
          </p>
        </div>

        <Card className="border-border/60 shadow-lg shadow-primary/5">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-serif">Project Initiation</CardTitle>
            <CardDescription>Tell us what's in your head, no matter how messy.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="braindump" className="text-sm font-medium leading-none">
                  Author Brain Dump
                </label>
                <Textarea
                  id="braindump"
                  placeholder="A grumpy detective who can talk to ghosts is forced to team up with the spirit of the city's most notorious thief to solve a locked-room mystery..."
                  className="min-h-[200px] resize-y text-base p-4 bg-muted/30 focus-visible:bg-background transition-colors"
                  value={brainDump}
                  onChange={(e) => setBrainDump(e.target.value)}
                  data-testid="input-braindump"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Include characters, plot fragments, themes, or just the vibes.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="genre" className="text-sm font-medium leading-none">
                  Primary Genre
                </label>
                <Select value={genre} onValueChange={setGenre} disabled={isSubmitting}>
                  <SelectTrigger id="genre" data-testid="select-genre" className="h-12">
                    <SelectValue placeholder="Select a genre template" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map((g) => (
                      <SelectItem key={g.id} value={g.id} data-testid={`genre-${g.id}`}>
                        {g.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-error">
                  {error}
                </div>
              )}

              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-14 text-base gap-2 group"
                  disabled={!brainDump.trim() || !genre || isSubmitting}
                  data-testid="button-start-pipeline"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Project...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                      Initialize Story Pipeline
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
