import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Zap } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  verified: "bg-green-100 text-green-800 border border-green-300",
  disputed: "bg-orange-100 text-orange-800 border border-orange-300",
  error: "bg-red-100 text-red-800 border border-red-300",
  unverified: "bg-muted text-muted-foreground border border-border",
};

export default function ForgeFactCheck() {
  const [, params] = useRoute("/forge/project/:id/fact-check");
  const projectId = params?.id || "";

  const { data: items, isLoading } = useQuery<any[]>({
    queryKey: ["/api/forge/projects", projectId, "fact-checks"],
    enabled: !!projectId,
  });

  const grouped: Record<string, any[]> = {};
  if (items) {
    for (const item of items) {
      const type = item.type || "other";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(item);
    }
  }

  return (
    <ForgeLayout projectId={projectId}>
      <div className="animate-in fade-in duration-300">
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-6" data-testid="text-factcheck-heading">Fact Check Results</h1>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !items || items.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-factcheck">
            <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No fact check items yet.</p>
            <Link
              href={`/forge/project/${projectId}/analyze`}
              className="inline-flex items-center gap-2 rounded-sm border border-border text-primary hover:bg-primary/10 transition-colors text-sm font-medium h-9 px-4 no-underline"
              data-testid="link-run-fact-checker"
            >
              <Zap className="w-4 h-4" /> Run Fact Checker
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([type, groupItems]) => (
              <div key={type}>
                <h2 className="text-lg font-serif font-semibold text-foreground mb-3 capitalize" data-testid={`text-factcheck-group-${type}`}>
                  {type} ({groupItems.length})
                </h2>
                <div className="space-y-2">
                  {groupItems.map((item: any) => (
                    <Card key={item.id} className="bg-card border border-border rounded-sm" data-testid={`card-factcheck-${item.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-foreground text-sm" data-testid={`text-factcheck-claim-${item.id}`}>
                            {item.claim || item.title || "Unnamed claim"}
                          </h3>
                          <Badge className={STATUS_COLORS[item.status] || STATUS_COLORS.unverified} data-testid={`badge-factcheck-status-${item.id}`}>
                            {item.status || "unverified"}
                          </Badge>
                        </div>
                        {item.explanation && (
                          <p className="text-muted-foreground text-sm mb-2">{item.explanation}</p>
                        )}
                        {item.source && (
                          <p className="text-xs text-muted-foreground">Source: {item.source}</p>
                        )}
                        {item.chapter && (
                          <p className="text-xs text-muted-foreground mt-1">Chapter {item.chapter.number}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ForgeLayout>
  );
}
