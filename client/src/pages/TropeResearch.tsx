import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, BookMarked, Repeat2, Lightbulb, TrendingUp, Building2, Save, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecurringTrope {
  name: string;
  description: string;
  series_frequency: string;
}

interface UniqueTrope {
  name: string;
  description: string;
  combination_potential: string;
}

interface TrendingCombo {
  combo: string;
  why: string;
  title_example: string;
}

interface SeriesBranding {
  consistency_advice: string;
  reader_promise: string;
  differentiation: string;
  title_pattern: string;
}

interface TropeResearchResult {
  niche: string;
  recurring_tropes: RecurringTrope[];
  unique_tropes: UniqueTrope[];
  trending_combinations: TrendingCombo[];
  series_branding: SeriesBranding;
  kdp_notes: string;
}

const FREQUENCY_COLORS: Record<string, string> = {
  "use in every book": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "use in 80% of books": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "use occasionally": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function TropeResearch() {
  const [, navigate] = useLocation();
  const [niche, setNiche] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TropeResearchResult | null>(null);
  const [saved, setSaved] = useState(false);

  const handleResearch = async () => {
    if (!niche.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/publishing/trope-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: niche.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Research failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSeedPipeline = () => {
    if (!result) return;
    const recurringNames = result.recurring_tropes.map(t => t.name).join(", ");
    const uniqueNames = result.unique_tropes.map(t => t.name).join(", ");
    const summary = `Trope Research: ${result.niche}\n\nRecurring Tropes (use every book): ${recurringNames}\n\nUnique Tropes (pick 2-3 per book): ${uniqueNames}\n\nSeries Promise: ${result.series_branding.reader_promise}`;
    const brainDumpPrefix = `[Trope Research: ${result.niche}]\nRecurring tropes: ${recurringNames}\nUnique tropes: ${uniqueNames}\n\nMy story idea: `;
    sessionStorage.setItem("pipeline_trope_seed", JSON.stringify({ summary, brainDumpPrefix }));
    navigate("/pipeline/new");
  };

  const handleSave = () => {
    if (!result) return;
    const json = JSON.stringify(result, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trope-research-${result.niche.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getFrequencyColor = (freq: string) => {
    const key = Object.keys(FREQUENCY_COLORS).find(k => freq.toLowerCase().includes(k));
    return key ? FREQUENCY_COLORS[key] : "bg-muted text-muted-foreground";
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <button onClick={() => navigate("/publishing")} className="hover:text-foreground transition-colors">
              Publishing Tools
            </button>
            <ChevronRight className="w-3 h-3" />
            <span>Trope Research</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2" data-testid="text-page-title">
            Trope Research Tool
          </h1>
          <p className="text-muted-foreground">
            Enter a niche or subgenre to get AI-powered trope analysis: recurring tropes, unique angles, trending combinations, and series branding strategy.
          </p>
        </div>

        <div className="flex gap-3 mb-8">
          <Input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleResearch()}
            placeholder="e.g. Small Town Mafia Romance, Dark Fantasy Romance, Cozy Mystery..."
            className="flex-1"
            disabled={loading}
            data-testid="input-niche"
          />
          <Button
            onClick={handleResearch}
            disabled={!niche.trim() || loading}
            className="gap-2 shrink-0"
            data-testid="button-research"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? "Analyzing..." : "Research Tropes"}
          </Button>
        </div>

        {error && (
          <div className="text-destructive text-sm bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 mb-6" data-testid="text-error">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-serif text-foreground mb-1">Analyzing your niche...</p>
            <p className="text-sm text-muted-foreground">Claude is researching tropes, trends, and strategy for "{niche}"</p>
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-serif font-semibold text-foreground" data-testid="text-result-niche">
                  {result.niche}
                </h2>
                <p className="text-sm text-muted-foreground">Trope analysis complete</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedPipeline}
                  className="gap-2"
                  data-testid="button-seed-pipeline"
                >
                  <Sparkles className="w-4 h-4" />
                  Start Pipeline with These Tropes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  className="gap-2"
                  data-testid="button-save-results"
                >
                  <Save className="w-4 h-4" />
                  {saved ? "Saved!" : "Save as JSON"}
                </Button>
              </div>
            </div>

            <Card className="border-border/60" data-testid="card-recurring-tropes">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Repeat2 className="w-4 h-4 text-primary" />
                  Recurring Tropes
                  <Badge variant="secondary" className="ml-1 text-xs">{result.recurring_tropes.length}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">What readers expect in every book in this niche</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.recurring_tropes.map((trope, i) => (
                    <div key={i} className="border border-border/40 rounded-lg p-4" data-testid={`card-recurring-trope-${i}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="font-semibold text-sm text-foreground">{trope.name}</h4>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", getFrequencyColor(trope.series_frequency))}>
                          {trope.series_frequency}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{trope.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60" data-testid="card-unique-tropes">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Unique Tropes
                  <Badge variant="secondary" className="ml-1 text-xs">{result.unique_tropes.length}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">Fresher angles to differentiate your books (pick 2-3 per book)</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.unique_tropes.map((trope, i) => (
                    <div key={i} className="border border-border/40 rounded-lg p-4" data-testid={`card-unique-trope-${i}`}>
                      <h4 className="font-semibold text-sm text-foreground mb-2">{trope.name}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-2">{trope.description}</p>
                      <p className="text-xs text-primary/80 font-medium">{trope.combination_potential}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60" data-testid="card-trending-combos">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Trending Combinations
                </CardTitle>
                <p className="text-xs text-muted-foreground">Trope pairings resonating with readers right now</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.trending_combinations.map((combo, i) => (
                    <div key={i} className="border border-border/40 rounded-lg p-4" data-testid={`card-trending-combo-${i}`}>
                      <h4 className="font-semibold text-sm text-foreground mb-1">{combo.combo}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-2">{combo.why}</p>
                      <p className="text-xs text-muted-foreground/70 italic">Example: "{combo.title_example}"</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60" data-testid="card-series-branding">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  Series Branding Strategy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reader Promise</h4>
                    <p className="text-sm text-foreground leading-relaxed">{result.series_branding.reader_promise}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Series Consistency</h4>
                    <p className="text-sm text-foreground leading-relaxed">{result.series_branding.consistency_advice}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Book-to-Book Differentiation</h4>
                    <p className="text-sm text-foreground leading-relaxed">{result.series_branding.differentiation}</p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Suggested Title Pattern</h4>
                    <p className="text-sm text-foreground font-medium">{result.series_branding.title_pattern}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60" data-testid="card-kdp-notes">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <BookMarked className="w-4 h-4 text-purple-500" />
                  KDP Strategy Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground leading-relaxed">{result.kdp_notes}</p>
              </CardContent>
            </Card>

            <div className="border border-border/40 rounded-lg p-4 bg-muted/20 text-sm text-muted-foreground" data-testid="text-usage-hint">
              <strong className="text-foreground">Using these results:</strong> Save this research as JSON to reference when starting a new book project. When creating a new pipeline, use the recurring tropes as your foundation and pick 2-3 unique tropes to differentiate each book.
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
