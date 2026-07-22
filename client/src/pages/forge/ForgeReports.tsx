import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Zap } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ForgeReports() {
  const [, params] = useRoute("/forge/project/:id/reports");
  const [, navigate] = useLocation();
  const projectId = params?.id || "";

  const { data: reports, isLoading } = useQuery<any[]>({
    queryKey: ["/api/forge/projects", projectId, "reports"],
    enabled: !!projectId,
  });

  return (
    <ForgeLayout projectId={projectId}>
      <div className="animate-in fade-in duration-300">
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-6" data-testid="text-reports-heading">Reports</h1>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !reports || reports.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-reports">
            <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No reports generated yet.</p>
            <Link
              href={`/forge/project/${projectId}/analyze`}
              className="inline-flex items-center gap-2 rounded-sm border border-border text-primary hover:bg-primary/10 transition-colors text-sm font-medium h-9 px-4 no-underline"
              data-testid="link-run-analysis"
            >
              <Zap className="w-4 h-4" /> Run Analysis
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report: any) => (
              <Card
                key={report.id}
                className="bookplate rounded-sm hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => navigate(`/forge/report/${report.id}`)}
                data-testid={`card-report-${report.id}`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-sm">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors" data-testid={`text-report-title-${report.id}`}>
                        {report.title || report.type}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="border-border text-primary text-xs">{report.type}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(report.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ForgeLayout>
  );
}
