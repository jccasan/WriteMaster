import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, Bot, BookOpen, FileText, Film, GitBranch,
  Loader2, Search, Users, Zap,
} from "lucide-react";

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

  const resultViews = [
    { label: "Issues", hint: "Prioritized findings", path: "issues", icon: AlertTriangle },
    { label: "Reader Panel", hint: "Beta-reader responses", path: "beta-readers", icon: BookOpen },
    { label: "Characters", hint: "Arcs and continuity", path: "characters", icon: Users },
    { label: "Structure", hint: "Story beat map", path: "structure", icon: GitBranch },
    { label: "Scenes", hint: "Purpose and conflict", path: "scenes", icon: Film },
    { label: "Fact Check", hint: "Claims and continuity", path: "fact-check", icon: Search },
    { label: "Ask the Editor", hint: "Discuss these results", path: "chat", icon: Bot },
  ];

  return (
    <ForgeLayout projectId={projectId}>
      <div className="animate-in fade-in duration-300">
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-1" data-testid="text-reports-heading">Results</h1>
        <p className="text-sm text-muted-foreground mb-5">Start with the editorial reports, then explore findings by category.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6" data-testid="result-view-links">
          {resultViews.map((view) => {
            const Icon = view.icon;
            return (
              <Link
                key={view.path}
                href={`/forge/project/${projectId}/${view.path}`}
                className="rounded-sm border border-border bg-card p-3 no-underline hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Icon className="w-4 h-4 text-brass mb-2" />
                <p className="text-sm font-medium text-foreground">{view.label}</p>
                <p className="text-xs text-muted-foreground">{view.hint}</p>
              </Link>
            );
          })}
        </div>

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
                        {report.title || report.reportType || report.type}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="border-border text-primary text-xs">{report.reportType || report.type}</Badge>
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
