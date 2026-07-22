import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border border-red-300",
  major: "bg-orange-100 text-orange-800 border border-orange-300",
  moderate: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  minor: "bg-muted text-muted-foreground border border-border",
};

const STATUS_OPTIONS = ["open", "accepted", "rejected", "fixed"];

export default function ForgeIssues() {
  const [, params] = useRoute("/forge/project/:id/issues");
  const projectId = params?.id || "";

  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");

  const { data: issues, isLoading } = useQuery<any[]>({
    queryKey: ["/api/forge/projects", projectId, "issues"],
    enabled: !!projectId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ issueId, status }: { issueId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/forge/issues/${issueId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forge/projects", projectId, "issues"] });
    },
  });

  const types = issues ? Array.from(new Set(issues.map((i: any) => i.type))) : [];
  const severities = issues ? Array.from(new Set(issues.map((i: any) => i.severity))) : [];

  const filtered = issues?.filter((issue: any) => {
    if (filterType !== "all" && issue.type !== filterType) return false;
    if (filterSeverity !== "all" && issue.severity !== filterSeverity) return false;
    return true;
  }) || [];

  return (
    <ForgeLayout projectId={projectId}>
      <div className="animate-in fade-in duration-300">
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-6" data-testid="text-issues-heading">Issues</h1>

        <div className="flex items-center gap-3 mb-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44 bg-card" data-testid="select-filter-type">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {types.map((t: string) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-44 bg-card" data-testid="select-filter-severity">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {severities.map((s: string) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {issues && (
            <span className="text-sm text-muted-foreground ml-auto" data-testid="text-issue-count">
              {filtered.length} of {issues.length} issues
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-issues">
            <AlertTriangle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">No issues found.</p>
          </div>
        ) : (
          <Card className="bg-card border border-border rounded-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Severity</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Title</TableHead>
                  <TableHead className="text-muted-foreground hidden md:table-cell">Description</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((issue: any) => (
                  <TableRow key={issue.id} className="border-border hover:bg-accent/50" data-testid={`row-issue-${issue.id}`}>
                    <TableCell>
                      <Badge className={SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.minor} data-testid={`badge-severity-${issue.id}`}>
                        {issue.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground/80 text-sm">{issue.type}</TableCell>
                    <TableCell className="text-foreground font-medium text-sm" data-testid={`text-issue-title-${issue.id}`}>
                      {issue.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell max-w-xs truncate">
                      {issue.description?.slice(0, 100)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={issue.status || "open"}
                        onValueChange={(status) => updateStatusMutation.mutate({ issueId: issue.id, status })}
                      >
                        <SelectTrigger className="w-28 bg-background text-xs h-7" data-testid={`select-status-${issue.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
