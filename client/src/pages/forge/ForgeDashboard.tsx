import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import ForgeLayout from "@/components/forge/ForgeLayout";
import NewProjectDialog from "@/components/forge/NewProjectDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, AlertTriangle, GitBranch, FolderOpen, MessageSquare, Trash2 } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ForgeDashboard() {
  const [, navigate] = useLocation();

  const { data: projects, isLoading } = useQuery<any[]>({
    queryKey: ["/api/forge/projects"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetch(`/api/forge/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forge/projects"] });
    },
  });

  const handleDelete = (e: React.MouseEvent, project: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete "${project.title}"? This removes the project and all its analysis. This cannot be undone.`)) {
      deleteMutation.mutate(project.id);
    }
  };

  const totalProjects = projects?.length || 0;
  const totalIssues = projects?.reduce((sum: number, p: any) =>
    sum + (p.revisions?.reduce((s: number, r: any) => s + (r._count?.issues || 0), 0) || 0), 0) || 0;
  const totalReports = projects?.reduce((sum: number, p: any) =>
    sum + (p.revisions?.reduce((s: number, r: any) => s + (r._count?.reports || 0), 0) || 0), 0) || 0;

  return (
    <ForgeLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="catalog-label text-xs mb-1">Wing III — Edit</p>
            <h1 className="text-3xl font-serif font-semibold text-foreground" data-testid="text-forge-heading">The Editor's Office</h1>
            <p className="text-muted-foreground mt-1">Story Forge — manuscript analysis &amp; editorial intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/forge/quick-feedback"
              className="inline-flex items-center gap-1.5 rounded-sm border border-border text-foreground/80 hover:text-primary hover:bg-accent transition-colors text-sm font-medium h-9 px-4 no-underline"
              data-testid="link-quick-feedback"
            >
              <MessageSquare className="w-4 h-4" /> Quick Feedback
            </Link>
            <NewProjectDialog onCreated={(p) => navigate(`/forge/project/${p.id}`)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bookplate rounded-sm hover:border-primary/50 transition-all cursor-pointer" onClick={() => { const el = document.getElementById("project-list"); el?.scrollIntoView({ behavior: "smooth" }); }}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-sm">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-projects">{totalProjects}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
            </CardContent>
          </Card>
          {projects?.[0] ? (
            <Link href={`/forge/project/${projects[0].id}/issues`} className="block no-underline">
              <Card className="bookplate rounded-sm hover:border-primary/50 transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-brass/15 rounded-sm">
                    <AlertTriangle className="w-5 h-5 text-brass" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-issues">{totalIssues}</p>
                    <p className="text-xs text-muted-foreground">Total Issues</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card className="bookplate rounded-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-brass/15 rounded-sm">
                  <AlertTriangle className="w-5 h-5 text-brass" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-issues">{totalIssues}</p>
                  <p className="text-xs text-muted-foreground">Total Issues</p>
                </div>
              </CardContent>
            </Card>
          )}
          {projects?.[0] ? (
            <Link href={`/forge/project/${projects[0].id}/reports`} className="block no-underline">
              <Card className="bookplate rounded-sm hover:border-primary/50 transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-sm">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-reports">{totalReports}</p>
                    <p className="text-xs text-muted-foreground">Reports</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card className="bookplate rounded-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-sm">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground" data-testid="stat-reports">{totalReports}</p>
                  <p className="text-xs text-muted-foreground">Reports</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-projects">
            <FolderOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground/80 mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">Create your first project to start forging your manuscript.</p>
            <NewProjectDialog onCreated={(p) => navigate(`/forge/project/${p.id}`)} />
          </div>
        ) : (
          <div id="project-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project: any) => {
              const revCount = project.revisions?.length || 0;
              const issueCount = project.revisions?.reduce((s: number, r: any) => s + (r._count?.issues || 0), 0) || 0;
              return (
                <Link
                  key={project.id}
                  href={`/forge/project/${project.id}`}
                  className="block no-underline"
                  data-testid={`card-project-${project.id}`}
                >
                  <Card className="bookplate rounded-sm hover:border-primary/50 transition-all cursor-pointer group h-full relative">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-serif font-semibold text-foreground group-hover:text-primary transition-colors truncate" data-testid={`text-project-title-${project.id}`}>
                          {project.title}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {project.genre && (
                            <Badge variant="outline" className="border-border text-primary text-xs" data-testid={`badge-genre-${project.id}`}>
                              {project.genre}
                            </Badge>
                          )}
                          <button
                            onClick={(e) => handleDelete(e, project)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete project"
                            aria-label={`Delete ${project.title}`}
                            data-testid={`button-delete-project-${project.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </ForgeLayout>
  );
}
