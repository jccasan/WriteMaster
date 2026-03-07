import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-600 text-white",
  major: "bg-orange-600 text-white",
  moderate: "bg-yellow-600 text-gray-950",
  minor: "bg-gray-600 text-gray-200",
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
        <h1 className="text-2xl font-bold text-amber-400 mb-6" data-testid="text-issues-heading">Issues</h1>

        <div className="flex items-center gap-3 mb-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44 bg-gray-800 border-gray-700 text-gray-100" data-testid="select-filter-type">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-gray-100">All Types</SelectItem>
              {types.map((t: string) => (
                <SelectItem key={t} value={t} className="text-gray-100">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-44 bg-gray-800 border-gray-700 text-gray-100" data-testid="select-filter-severity">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-gray-100">All Severities</SelectItem>
              {severities.map((s: string) => (
                <SelectItem key={s} value={s} className="text-gray-100">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {issues && (
            <span className="text-sm text-gray-500 ml-auto" data-testid="text-issue-count">
              {filtered.length} of {issues.length} issues
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-issues">
            <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No issues found.</p>
          </div>
        ) : (
          <Card className="bg-gray-900 border-amber-900/20 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-gray-400">Severity</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Title</TableHead>
                  <TableHead className="text-gray-400 hidden md:table-cell">Description</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((issue: any) => (
                  <TableRow key={issue.id} className="border-amber-900/10 hover:bg-gray-800/50" data-testid={`row-issue-${issue.id}`}>
                    <TableCell>
                      <Badge className={SEVERITY_COLORS[issue.severity] || "bg-gray-600"} data-testid={`badge-severity-${issue.id}`}>
                        {issue.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300 text-sm">{issue.type}</TableCell>
                    <TableCell className="text-gray-100 font-medium text-sm" data-testid={`text-issue-title-${issue.id}`}>
                      {issue.title}
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm hidden md:table-cell max-w-xs truncate">
                      {issue.description?.slice(0, 100)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={issue.status || "open"}
                        onValueChange={(status) => updateStatusMutation.mutate({ issueId: issue.id, status })}
                      >
                        <SelectTrigger className="w-28 bg-gray-800 border-gray-700 text-gray-200 text-xs h-7" data-testid={`select-status-${issue.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s} className="text-gray-100 text-xs">{s}</SelectItem>
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
