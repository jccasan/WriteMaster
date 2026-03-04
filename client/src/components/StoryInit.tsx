import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Sparkles } from "lucide-react";

const GENRES = [
  { id: "fantasy_thriller", label: "Fantasy Thriller" },
  { id: "contemporary_thriller", label: "Contemporary Thriller" },
  { id: "dark_romance", label: "Dark Romance" }
];

interface StoryInitProps {
  onStart: (brainDump: string, genre: string) => void;
}

export default function StoryInit({ onStart }: StoryInitProps) {
  const [brainDump, setBrainDump] = useState("");
  const [genre, setGenre] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (brainDump.trim() && genre) {
      onStart(brainDump, genre);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
          Unleash Your Story
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Pour your raw ideas onto the page. Our AI pipeline will structure, refine, and forge them into a compelling Story Dossier ready for drafting.
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
              <label htmlFor="braindump" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Author Brain Dump
              </label>
              <Textarea
                id="braindump"
                placeholder="A grumpy detective who can talk to ghosts is forced to team up with the spirit of the city's most notorious thief to solve a locked-room mystery..."
                className="min-h-[200px] resize-y text-base p-4 bg-muted/30 focus-visible:bg-background transition-colors"
                value={brainDump}
                onChange={(e) => setBrainDump(e.target.value)}
                data-testid="input-braindump"
              />
              <p className="text-xs text-muted-foreground">
                Include characters, plot fragments, themes, or just the vibes.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="genre" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Primary Genre
              </label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger id="genre" data-testid="select-genre" className="h-12">
                  <SelectValue placeholder="Select a genre template" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((g) => (
                    <SelectItem key={g.id} value={g.id} data-testid={`genre-${g.id}`}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-14 text-base gap-2 group"
                disabled={!brainDump.trim() || !genre}
                data-testid="button-start-pipeline"
              >
                <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                Initialize Story Pipeline
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}