import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Film, Zap } from "lucide-react";

function ratingColor(rating: number | null | undefined): string {
  if (!rating) return "bg-muted text-muted-foreground border border-border";
  if (rating >= 8) return "bg-green-100 text-green-800 border border-green-300";
  if (rating >= 5) return "bg-yellow-100 text-yellow-800 border border-yellow-300";
  return "bg-red-100 text-red-800 border border-red-300";
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
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-6" data-testid="text-scenes-heading">Scene Analysis</h1>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !scenes || scenes.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-scenes">
            <Film className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No scene analyses yet.</p>
            <Link
              href={`/forge/project/${projectId}/analyze`}
              className="inline-flex items-center gap-2 rounded-sm border border-border text-primary hover:bg-primary/10 transition-colors text-sm font-medium h-9 px-4 no-underline"
              data-testid="link-run-scene-scanner"
            >
              <Zap className="w-4 h-4" /> Run Scene Scanner
            </Link>
          </div>
        ) : (
          <Card className="bg-card border border-border rounded-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Chapter</TableHead>
                  <TableHead className="text-muted-foreground">Scene</TableHead>
                  <TableHead className="text-muted-foreground">Purpose</TableHead>
                  <TableHead className="text-muted-foreground hidden md:table-cell">Conflict</TableHead>
                  <TableHead className="text-muted-foreground hidden lg:table-cell">Change</TableHead>
                  <TableHead className="text-muted-foreground">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenes.map((scene: any, idx: number) => (
                  <TableRow key={scene.id || idx} className="border-border hover:bg-accent/50" data-testid={`row-scene-${scene.id || idx}`}>
                    <TableCell className="text-foreground/80 text-sm">
                      {scene.chapter?.number ?? scene.chapterId ?? "—"}
                    </TableCell>
                    <TableCell className="text-foreground/80 text-sm" data-testid={`text-scene-index-${scene.id || idx}`}>
                      {scene.sceneIndex ?? idx + 1}
                    </TableCell>
                    <TableCell className="text-foreground text-sm max-w-xs">
                      {scene.purpose || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell max-w-xs truncate">
                      {scene.conflict || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {scene.changeOccurred !== undefined ? (
                        <Badge variant="outline" className={scene.changeOccurred ? "border-green-700 text-green-700" : "border-border text-muted-foreground"}>
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
