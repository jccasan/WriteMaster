import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Zap } from "lucide-react";

export default function ForgeBetaReaders() {
  const [, params] = useRoute("/forge/project/:id/beta-readers");
  const projectId = params?.id || "";

  const { data: responses, isLoading } = useQuery<any[]>({
    queryKey: ["/api/forge/projects", projectId, "beta-readers"],
    enabled: !!projectId,
  });

  return (
    <ForgeLayout projectId={projectId}>
      <div className="animate-in fade-in duration-300">
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-6" data-testid="text-betareaders-heading">Beta Reader Responses</h1>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !responses || responses.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-betareaders">
            <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No beta reader responses yet.</p>
            <Link
              href={`/forge/project/${projectId}/analyze`}
              className="inline-flex items-center gap-2 rounded-sm border border-border text-primary hover:bg-primary/10 transition-colors text-sm font-medium h-9 px-4 no-underline"
              data-testid="link-run-beta-reader"
            >
              <Zap className="w-4 h-4" /> Run Beta Reader Analysis
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {responses.map((resp: any) => (
              <Card key={resp.id} className="bookplate rounded-sm" data-testid={`card-betareader-${resp.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-primary text-lg font-serif" data-testid={`text-betareader-profile-${resp.id}`}>
                      {resp.profile?.name || resp.profileKey || "Unknown Reader"}
                    </CardTitle>
                    {resp.profile?.archetype && (
                      <Badge variant="outline" className="border-border text-primary text-xs">
                        {resp.profile.archetype}
                      </Badge>
                    )}
                  </div>
                  {resp.profile?.description && (
                    <p className="text-sm text-muted-foreground mt-1">{resp.profile.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {resp.overallImpression && (
                    <div>
                      <p className="catalog-label text-[11px] mb-1">Overall Impression</p>
                      <p className="text-foreground/80 text-sm" data-testid={`text-impression-${resp.id}`}>{resp.overallImpression}</p>
                    </div>
                  )}
                  {resp.emotionalResponse && (
                    <div>
                      <p className="catalog-label text-[11px] mb-1">Emotional Response</p>
                      <p className="text-foreground/80 text-sm">{resp.emotionalResponse}</p>
                    </div>
                  )}
                  {resp.favoriteElements && (
                    <div>
                      <p className="catalog-label text-[11px] mb-1">Favorite Elements</p>
                      <p className="text-foreground/80 text-sm">{resp.favoriteElements}</p>
                    </div>
                  )}
                  {resp.confusingParts && (
                    <div>
                      <p className="catalog-label text-[11px] mb-1">Confusing Parts</p>
                      <p className="text-foreground/80 text-sm">{resp.confusingParts}</p>
                    </div>
                  )}
                  {resp.putdownMoments && (
                    <div>
                      <p className="catalog-label text-[11px] mb-1">Put-Down Moments</p>
                      <p className="text-foreground/80 text-sm">{resp.putdownMoments}</p>
                    </div>
                  )}
                  {resp.pacing && (
                    <div>
                      <p className="catalog-label text-[11px] mb-1">Pacing</p>
                      <p className="text-foreground/80 text-sm">{resp.pacing}</p>
                    </div>
                  )}
                  {resp.characterFeedback && (
                    <div>
                      <p className="catalog-label text-[11px] mb-1">Character Feedback</p>
                      <p className="text-foreground/80 text-sm">{resp.characterFeedback}</p>
                    </div>
                  )}
                  {resp.wouldRecommend !== undefined && (
                    <div>
                      <p className="catalog-label text-[11px] mb-1">Would Recommend</p>
                      <Badge variant="outline" className={resp.wouldRecommend ? "border-green-700 text-green-700" : "border-red-700 text-red-700"}>
                        {resp.wouldRecommend ? "Yes" : "No"}
                      </Badge>
                    </div>
                  )}
                  {resp.rawResponseJson && (
                    <details className="text-xs">
                      <summary className="text-muted-foreground cursor-pointer hover:text-foreground">Raw Response</summary>
                      <pre className="mt-2 bg-muted border border-border p-3 rounded-sm text-muted-foreground overflow-x-auto">
                        {typeof resp.rawResponseJson === "string" ? resp.rawResponseJson : JSON.stringify(resp.rawResponseJson, null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ForgeLayout>
  );
}
