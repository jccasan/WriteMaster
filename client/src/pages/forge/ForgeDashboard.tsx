import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ForgeLayout from "@/components/forge/ForgeLayout";
import NewProjectDialog from "@/components/forge/NewProjectDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, AlertTriangle, GitBranch, FolderOpen } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ForgeDashboard() {
  const [, navigate] = useLocation();

  const { data: projects, isLoading } = useQuery<any[]>({
    queryKey: ["/api/forge/projects"],
  });

  const totalProjects = projects?.length || 0;
  const totalIssues = projects?.reduce((sum: number, p: any) =>
    sum + (p.revisions?.reduce((s: number, r: any) => s + (r._count?.issues || 0), 0) || 0), 0) || 0;
  const totalReports = projects?.reduce((sum: number, p: any) =>
    sum + (p.revisions?.reduce((s: number, r: any) => s + (r._count?.reports || 0), 0) || 0), 0) || 0;

  return (
    <ForgeLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-400" data-testid="text-forge-heading">STORY FORGE</h1>
            <p className="text-gray-400 mt-1">Manuscript analysis & editorial intelligence</p>
          </div>
          <NewProjectDialog onCreated={(p) => navigate(`/forge/project/${p.id}`)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-900 border-amber-900/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-600/20 rounded-lg">
                <FolderOpen className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-100" data-testid="stat-projects">{totalProjects}</p>
                <p className="text-xs text-gray-400">Projects</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-amber-900/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-600/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-100" data-testid="stat-issues">{totalIssues}</p>
                <p className="text-xs text-gray-400">Total Issues</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-amber-900/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-600/20 rounded-lg">
                <BookOpen className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-100" data-testid="stat-reports">{totalReports}</p>
                <p className="text-xs text-gray-400">Reports</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-projects">
            <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-6">Create your first project to start forging your manuscript.</p>
            <NewProjectDialog onCreated={(p) => navigate(`/forge/project/${p.id}`)} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project: any) => {
              const revCount = project.revisions?.length || 0;
              const issueCount = project.revisions?.reduce((s: number, r: any) => s + (r._count?.issues || 0), 0) || 0;
              return (
                <Card
                  key={project.id}
                  className="bg-gray-900 border-amber-900/20 hover:border-amber-600/40 transition-all cursor-pointer group"
                  onClick={() => navigate(`/forge/project/${project.id}`)}
                  data-testid={`card-project-${project.id}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-100 group-hover:text-amber-400 transition-colors truncate" data-testid={`text-project-title-${project.id}`}>
                        {project.title}
                      </h3>
                      {project.genre && (
                        <Badge variant="outline" className="border-amber-900/40 text-amber-400 text-xs shrink-0 ml-2" data-testid={`badge-genre-${project.id}`}>
                          {project.genre}
                        </Badge>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{project.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        {revCount} rev{revCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {issueCount} issue{issueCount !== 1 ? "s" : ""}
                      </span>
                      <span className="ml-auto">{formatDate(project.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ForgeLayout>
  );
}
