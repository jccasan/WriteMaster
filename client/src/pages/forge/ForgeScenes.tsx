import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Film, Zap } from "lucide-react";

function ratingColor(rating: number | null | undefined): string {
  if (!rating) return "bg-gray-600 text-gray-200";
  if (rating >= 8) return "bg-green-600 text-white";
  if (rating >= 5) return "bg-amber-600 text-gray-950";
  return "bg-red-600 text-white";
}

export default function ForgeScenes() {
  const [, params] = useRoute("/forge/project/:id/scenes");
  const projectId = params?.id || "";

  const { data: scenes, isLoading } = useQuery<any[]>({
    queryKey: ["/api/forge/projects", projectId, "scenes"],
    enabled: !!projectId,
  });

  return (
    <ForgeLayout projectId={projectId}>
      <div className="animate-in fade-in duration-300">
        <h1 className="text-2xl font-bold text-amber-400 mb-6" data-testid="text-scenes-heading">Scene Analysis</h1>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : !scenes || scenes.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-scenes">
            <Film className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No scene analyses yet.</p>
            <Link
              href={`/forge/project/${projectId}/analyze`}
              className="inline-flex items-center gap-2 rounded-md border border-amber-900/30 text-amber-400 hover:bg-amber-600/20 transition-colors text-sm font-medium h-9 px-4 no-underline"
              data-testid="link-run-scene-scanner"
            >
              <Zap className="w-4 h-4" /> Run Scene Scanner
            </Link>
          </div>
        ) : (
          <Card className="bg-gray-900 border-amber-900/20 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-gray-400">Chapter</TableHead>
                  <TableHead className="text-gray-400">Scene</TableHead>
                  <TableHead className="text-gray-400">Purpose</TableHead>
                  <TableHead className="text-gray-400 hidden md:table-cell">Conflict</TableHead>
                  <TableHead className="text-gray-400 hidden lg:table-cell">Change</TableHead>
                  <TableHead className="text-gray-400">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenes.map((scene: any, idx: number) => (
                  <TableRow key={scene.id || idx} className="border-amber-900/10 hover:bg-gray-800/50" data-testid={`row-scene-${scene.id || idx}`}>
                    <TableCell className="text-gray-300 text-sm">
                      {scene.chapter?.number ?? scene.chapterId ?? "—"}
                    </TableCell>
                    <TableCell className="text-gray-300 text-sm" data-testid={`text-scene-index-${scene.id || idx}`}>
                      {scene.sceneIndex ?? idx + 1}
                    </TableCell>
                    <TableCell className="text-gray-100 text-sm max-w-xs">
                      {scene.purpose || "—"}
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm hidden md:table-cell max-w-xs truncate">
                      {scene.conflict || "—"}
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm hidden lg:table-cell">
                      {scene.changeOccurred !== undefined ? (
                        <Badge variant="outline" className={scene.changeOccurred ? "border-green-700 text-green-400" : "border-gray-700 text-gray-500"}>
                          {scene.changeOccurred ? "Yes" : "No"}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={ratingColor(scene.rating)} data-testid={`badge-rating-${scene.id || idx}`}>
                        {scene.rating ?? "—"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </ForgeLayout>
  );
}
