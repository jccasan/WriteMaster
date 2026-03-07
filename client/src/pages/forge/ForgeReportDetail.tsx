import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";

function renderMarkdown(md: string): React.ReactNode[] {
  if (!md) return [];
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<br key={key++} />);
    } else if (trimmed.startsWith("### ")) {
      elements.push(<h3 key={key++} className="text-lg font-semibold text-amber-400 mt-6 mb-2">{trimmed.slice(4)}</h3>);
    } else if (trimmed.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-xl font-bold text-amber-300 mt-8 mb-3">{trimmed.slice(3)}</h2>);
    } else if (trimmed.startsWith("# ")) {
      elements.push(<h1 key={key++} className="text-2xl font-bold text-amber-200 mt-8 mb-4">{trimmed.slice(2)}</h1>);
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <li key={key++} className="text-gray-300 ml-4 list-disc">{trimmed.slice(2)}</li>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      elements.push(
        <li key={key++} className="text-gray-300 ml-4 list-decimal">{trimmed.replace(/^\d+\.\s/, "")}</li>
      );
    } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      elements.push(<p key={key++} className="text-gray-200 font-semibold my-1">{trimmed.slice(2, -2)}</p>);
    } else {
      elements.push(<p key={key++} className="text-gray-300 my-1 leading-relaxed">{trimmed}</p>);
    }
  }
  return elements;
}

export default function ForgeReportDetail() {
  const [, params] = useRoute("/forge/report/:reportId");
  const [, navigate] = useLocation();
  const reportId = params?.reportId || "";

  const { data: report, isLoading } = useQuery<any>({
    queryKey: ["/api/forge/reports", reportId],
    enabled: !!reportId,
  });

  if (isLoading) {
    return (
      <ForgeLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </ForgeLayout>
    );
  }

  if (!report) {
    return (
      <ForgeLayout>
        <p className="text-gray-400 text-center py-16" data-testid="text-report-not-found">Report not found</p>
      </ForgeLayout>
    );
  }

  return (
    <ForgeLayout>
      <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
        <Button
          variant="ghost"
          className="text-gray-400 hover:text-amber-400 mb-4"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card className="bg-gray-900 border-amber-900/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-amber-400" data-testid="text-report-title">{report.title || report.type}</CardTitle>
              <Badge variant="outline" className="border-amber-900/40 text-amber-400">{report.type}</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
              <span data-testid="text-report-date">{new Date(report.createdAt).toLocaleString()}</span>
              {report.issues && (
                <span data-testid="text-report-issue-count">{report.issues.length} issues</span>
              )}
            </div>
            {report.summaryOneLiner && (
              <p className="text-gray-400 mt-2 text-sm italic" data-testid="text-report-summary">{report.summaryOneLiner}</p>
            )}
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="prose-sm" data-testid="report-body">
              {renderMarkdown(report.bodyMarkdown || "")}
            </div>
          </CardContent>
        </Card>
      </div>
    </ForgeLayout>
  );
}
