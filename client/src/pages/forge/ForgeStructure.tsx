import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitBranch } from "lucide-react";

const BEAT_COLORS: Record<string, string> = {
  inciting_incident: "bg-red-600",
  first_plot_point: "bg-orange-600",
  midpoint: "bg-amber-600",
  second_plot_point: "bg-yellow-600",
  climax: "bg-red-500",
  resolution: "bg-green-600",
  pinch_point: "bg-purple-600",
  dark_moment: "bg-gray-700",
  hook: "bg-blue-600",
  setup: "bg-cyan-600",
};

function getBeatColor(beatType: string): string {
  const key = beatType.toLowerCase().replace(/\s+/g, "_");
  return BEAT_COLORS[key] || "bg-amber-600";
}

export default function ForgeStructure() {
  const [, params] = useRoute("/forge/project/:id/structure");
  const projectId = params?.id || "";

  const { data: beats, isLoading } = useQuery<any[]>({
    queryKey: ["/api/forge/projects", projectId, "structure"],
    enabled: !!projectId,
  });

  const maxChapter = beats?.reduce((max: number, b: any) => Math.max(max, b.chapterNumber || 0), 0) || 1;

  return (
    <ForgeLayout projectId={projectId}>
      <div className="animate-in fade-in duration-300">
        <h1 className="text-2xl font-bold text-amber-400 mb-6" data-testid="text-structure-heading">Structure Beat Map</h1>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : !beats || beats.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-structure">
            <GitBranch className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No structure beats detected. Run the Structure Analyzer.</p>
          </div>
        ) : (
          <>
            <Card className="bg-gray-900 border-amber-900/20 mb-6 overflow-hidden">
              <CardContent className="p-6">
                <div className="relative">
                  <div className="h-2 bg-gray-800 rounded-full mb-8" />
                  {beats.map((beat: any, i: number) => {
                    const position = maxChapter > 1 ? ((beat.chapterNumber - 1) / (maxChapter - 1)) * 100 : 50;
                    return (
                      <div
                        key={beat.id}
                        className="absolute top-0"
                        style={{ left: `${Math.min(Math.max(position, 2), 98)}%`, transform: "translateX(-50%)" }}
                        data-testid={`beat-marker-${beat.id}`}
                      >
                        <div className={`w-4 h-4 rounded-full ${getBeatColor(beat.beatType)} border-2 border-gray-900 -mt-1`} />
                        <div className="mt-3 whitespace-nowrap text-center">
                          <p className="text-xs font-medium text-gray-300">{beat.beatType}</p>
                          <p className="text-[10px] text-gray-500">Ch. {beat.chapterNumber}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="h-20" />
              </CardContent>
            </Card>

            <div className="space-y-2">
              {beats.map((beat: any) => (
                <Card key={beat.id} className="bg-gray-900 border-amber-900/15" data-testid={`card-beat-${beat.id}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${getBeatColor(beat.beatType)}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-100" data-testid={`text-beat-type-${beat.id}`}>{beat.beatType}</span>
                        <Badge variant="outline" className="border-gray-700 text-gray-400 text-xs">Ch. {beat.chapterNumber}</Badge>
                      </div>
                      {beat.description && (
                        <p className="text-sm text-gray-400">{beat.description}</p>
                      )}
                      {beat.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">{beat.notes}</p>
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
