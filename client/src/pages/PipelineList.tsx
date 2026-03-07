import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Clock, Sparkles, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";

interface ProjectSummary {
  id: string;
  created_at: string;
  genre: string;
  current_step: number;
  best_pitch: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatGenre(genre: string) {
  return genre.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function PipelineList() {
  const [, navigate] = useLocation();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const getProjectStatus = (p: ProjectSummary) => {
    if (p.current_step > 10) return { label: "Complete", color: "bg-green-500/10 text-green-700" };
    return { label: `Step ${p.current_step}/10`, color: "bg-primary/10 text-primary" };
  };

  const getProjectRoute = (p: ProjectSummary) => {
    if (p.current_step > 10) return `/pipeline/${p.id}/result`;
    return `/pipeline/${p.id}`;
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-4xl font-serif font-bold text-foreground mb-4" data-testid="text-pipeline-list-heading">
            Story Pipeline
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Transform raw ideas into structured Story Dossiers through an 11-step AI pipeline.
          </p>
        </div>

        <Button
          onClick={() => navigate("/pipeline/new")}
          size="lg"
          className="w-full h-14 text-base gap-2 mb-8"
          data-testid="button-new-pipeline"
        >
          <Plus className="w-5 h-5" />
          New Story Pipeline
        </Button>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No projects yet. Start a new pipeline to create your first Story Dossier.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Your Projects ({projects.length})
            </h3>
            {projects.map((project) => {
              const status = getProjectStatus(project);
              return (
                <Card
                  key={project.id}
                  className="border-border/60 hover:border-primary/30 transition-all cursor-pointer group"
                  onClick={() => navigate(getProjectRoute(project))}
                  data-testid={`card-project-${project.id}`}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-foreground truncate">
                          {project.best_pitch ? project.best_pitch.substring(0, 80) + (project.best_pitch.length > 80 ? "..." : "") : `Pipeline ${project.id.substring(0, 8)}`}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formatDate(project.created_at)}</span>
                        </div>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                          {formatGenre(project.genre)}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
