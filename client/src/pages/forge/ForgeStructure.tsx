import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitBranch, Zap } from "lucide-react";
import { useMemo } from "react";

const BEAT_COLORS: Record<string, string> = {
  inciting_incident: "bg-red-700",
  first_plot_point: "bg-orange-700",
  midpoint: "bg-amber-700",
  second_plot_point: "bg-yellow-700",
  climax: "bg-red-600",
  resolution: "bg-green-700",
  pinch_point: "bg-purple-700",
  dark_moment: "bg-stone-500",
  hook: "bg-blue-700",
  setup: "bg-cyan-700",
  opening: "bg-teal-700",
  plot_turn: "bg-orange-600",
  denouement: "bg-emerald-700",
};

const BEAT_DOT_COLORS: Record<string, string> = {
  inciting_incident: "#b91c1c",
  first_plot_point: "#c2410c",
  midpoint: "#b45309",
  second_plot_point: "#a16207",
  climax: "#dc2626",
  resolution: "#15803d",
  pinch_point: "#7e22ce",
  dark_moment: "#78716c",
  hook: "#1d4ed8",
  setup: "#0e7490",
  opening: "#0f766e",
  plot_turn: "#ea580c",
  denouement: "#047857",
};

function getBeatColor(beatType: string): string {
  const key = beatType.toLowerCase().replace(/\s+/g, "_");
  return BEAT_COLORS[key] || "bg-amber-700";
}

function getBeatDotColor(beatType: string): string {
  const key = beatType.toLowerCase().replace(/\s+/g, "_");
  return BEAT_DOT_COLORS[key] || "#b45309";
}

function formatBeatType(beatType: string): string {
  return beatType
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function ForgeStructure() {
  const [, params] = useRoute("/forge/project/:id/structure");
  const projectId = params?.id || "";

  const { data: beats, isLoading } = useQuery<any[]>({
    queryKey: ["/api/forge/projects", projectId, "structure"],
    enabled: !!projectId,
  });

  const sortedBeats = useMemo(() => {
    if (!beats) return [];
    return [...beats].sort((a, b) => a.chapterNumber - b.chapterNumber);
  }, [beats]);

  const maxChapter = sortedBeats.reduce((max, b) => Math.max(max, b.chapterNumber || 0), 0) || 1;

  const uniqueBeatTypes = useMemo(() => {
    const types = new Set<string>();
    sortedBeats.forEach(b => types.add(b.beatType));
    return Array.from(types);
  }, [sortedBeats]);

  return (
    <ForgeLayout projectId={projectId}>
      <div className="animate-in fade-in duration-300">
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-6" data-testid="text-structure-heading">Structure Beat Map</h1>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !beats || beats.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-structure">
            <GitBranch className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No structure beats detected.</p>
            <Link
              href={`/forge/project/${projectId}/analyze`}
              className="inline-flex items-center gap-2 rounded-sm border border-border text-primary hover:bg-primary/10 transition-colors text-sm font-medium h-9 px-4 no-underline"
              data-testid="link-run-structure-analyzer"
            >
              <Zap className="w-4 h-4" /> Run Structure Analyzer
            </Link>
          </div>
        ) : (
          <>
            <Card className="bookplate rounded-sm mb-6">
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6">
                  {uniqueBeatTypes.map(type => (
                    <div key={type} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${getBeatColor(type)}`} />
                      <span className="text-xs text-muted-foreground">{formatBeatType(type)}</span>
                    </div>
                  ))}
                </div>

                <div className="relative py-4">
                  <div className="h-1 bg-border rounded-full" />
                  {sortedBeats.map((beat: any) => {
                    const position = maxChapter > 1 ? ((beat.chapterNumber - 1) / (maxChapter - 1)) * 100 : 50;
                    return (
                      <div
                        key={beat.id}
                        className="absolute top-2.5 group"
                        style={{ left: `${Math.min(Math.max(position, 1), 99)}%`, transform: "translateX(-50%)" }}
                        data-testid={`beat-marker-${beat.id}`}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-full border-2 border-card cursor-pointer transition-transform hover:scale-150"
                          style={{ backgroundColor: getBeatDotColor(beat.beatType) }}
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                          <div className="bg-popover border border-border rounded-sm px-3 py-2 shadow-xl whitespace-nowrap">
                            <p className="text-xs font-semibold text-primary">{formatBeatType(beat.beatType)}</p>
                            <p className="text-[11px] text-muted-foreground">Chapter {beat.chapterNumber}</p>
                            {beat.notes && <p className="text-[10px] text-muted-foreground mt-1 max-w-48 whitespace-normal">{beat.notes}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between mt-3 text-[10px] text-muted-foreground">
                  <span>Ch. 1</span>
                  <span>Ch. {Math.round(maxChapter / 4)}</span>
                  <span>Ch. {Math.round(maxChapter / 2)}</span>
                  <span>Ch. {Math.round(maxChapter * 3 / 4)}</span>
                  <span>Ch. {maxChapter}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {sortedBeats.map((beat: any) => (
                <Card key={beat.id} className="bg-card border border-border rounded-sm" data-testid={`card-beat-${beat.id}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${getBeatColor(beat.beatType)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground" data-testid={`text-beat-type-${beat.id}`}>{formatBeatType(beat.beatType)}</span>
                        <Badge variant="outline" className="border-border text-muted-foreground text-xs shrink-0">Ch. {beat.chapterNumber}</Badge>
                        {beat.confidence && (
                          <Badge variant="outline" className="border-border text-muted-foreground text-xs shrink-0">{Math.round(beat.confidence * 100)}%</Badge>
                        )}
                      </div>
                      {beat.description && (
                        <p className="text-sm text-muted-foreground">{beat.description}</p>
                      )}
                      {beat.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{beat.notes}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </ForgeLayout>
  );
}
