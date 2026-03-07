import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  verified: "bg-green-600 text-white",
  disputed: "bg-orange-600 text-white",
  error: "bg-red-600 text-white",
  unverified: "bg-gray-600 text-gray-200",
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
        <h1 className="text-2xl font-bold text-amber-400 mb-6" data-testid="text-factcheck-heading">Fact Check Results</h1>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : !items || items.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-factcheck">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No fact check items yet. Run the Fact Checker analysis.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([type, groupItems]) => (
              <div key={type}>
                <h2 className="text-lg font-semibold text-gray-200 mb-3 capitalize" data-testid={`text-factcheck-group-${type}`}>
                  {type} ({groupItems.length})
                </h2>
                <div className="space-y-2">
                  {groupItems.map((item: any) => (
                    <Card key={item.id} className="bg-gray-900 border-amber-900/15" data-testid={`card-factcheck-${item.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-100 text-sm" data-testid={`text-factcheck-claim-${item.id}`}>
                            {item.claim || item.title || "Unnamed claim"}
                          </h3>
                          <Badge className={STATUS_COLORS[item.status] || "bg-gray-600"} data-testid={`badge-factcheck-status-${item.id}`}>
                            {item.status || "unverified"}
                          </Badge>
                        </div>
                        {item.explanation && (
                          <p className="text-gray-400 text-sm mb-2">{item.explanation}</p>
                        )}
                        {item.source && (
                          <p className="text-xs text-gray-500">Source: {item.source}</p>
                        )}
                        {item.chapter && (
                          <p className="text-xs text-gray-500 mt-1">Chapter {item.chapter.number}</p>
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
