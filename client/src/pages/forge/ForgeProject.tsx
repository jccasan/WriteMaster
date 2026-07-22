import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useState } from "react";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Zap, FileText, AlertTriangle, Users, GitBranch, BookOpen, RefreshCw, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ForgeProject() {
  const [, params] = useRoute("/forge/project/:id");
  const projectId = params?.id || "";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [reparsing, setReparsing] = useState(false);

  const { data: project, isLoading } = useQuery<any>({
    queryKey: ["/api/forge/projects", projectId],
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <ForgeLayout projectId={projectId}>
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </ForgeLayout>
    );
  }

  if (!project) {
    return (
      <ForgeLayout projectId={projectId}>
        <div className="text-center py-16">
          <p className="text-muted-foreground" data-testid="text-project-not-found">Project not found</p>
        </div>
      </ForgeLayout>
    );
  }

  const handleReparse = async () => {
    setReparsing(true);
    try {
      const res = await fetch(`/api/forge/projects/${projectId}/reparse`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Chapters re-detected", description: `Found ${data.chaptersDetected} chapters in ${data.chunksCreated} chunks` });
      queryClient.invalidateQueries({ queryKey: ["/api/forge/projects", projectId] });
    } catch (err: any) {
      toast({ title: "Re-parse failed", description: err.message, variant: "destructive" });
    } finally {
      setReparsing(false);
    }
  };

  const latestRevision = project.revisions?.[project.revisions.length - 1];
  const chapters = latestRevision?.chapters || [];
  const chunks = latestRevision?.chunks || [];
  const counts = latestRevision?._count || {};

  // "What's next" state, derived from the data this page already loads.
  const hasManuscript = chapters.length > 0 || chunks.length > 0;
  const hasResults = (counts.reports || 0) > 0 || (counts.issues || 0) > 0;
  const steps = [
    { n: 1, label: "Upload manuscript", href: `/forge/project/${projectId}/upload`, done: hasManuscript },
    { n: 2, label: "Run analysis", href: `/forge/project/${projectId}/analyze`, done: hasResults },
    { n: 3, label: "Read the results", href: `/forge/project/${projectId}/reports`, done: false },
  ];
  const currentStep = !hasManuscript ? 1 : !hasResults ? 2 : 3;

  return (
    <ForgeLayout projectId={projectId}>
      <div className="animate-in fade-in duration-300">
        <div className="mb-6">
          <p className="catalog-label text-xs mb-1">Manuscript on the Desk</p>
          <h1 className="text-2xl font-serif font-semibold text-foreground" data-testid="text-project-title">{project.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            {project.authorName && <span className="text-sm text-muted-foreground">{project.authorName}</span>}
            {project.genre && (
              <Badge variant="outline" className="border-border text-primary text-xs">{project.genre}</Badge>
            )}
          </div>
          {project.description && <p className="text-muted-foreground mt-2 text-sm">{project.description}</p>}
        </div>

        <div className="bookplate rounded-sm px-4 py-3 mb-6" data-testid="whats-next-strip">
          <p className="catalog-label text-[11px] mb-2">What's Next</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            {steps.map((step) => {
              const isCurrent = step.n === currentStep;
              const inner = (
                <span className="flex items-center gap-2 text-sm">
                  <span
                    className={
                      "flex items-center justify-center w-5 h-5 rounded-full border text-[11px] font-semibold shrink-0 " +
                      (step.done
                        ? "border-brass bg-brass/15 text-brass"
                        : isCurrent
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground")
                    }
                  >
                    {step.done ? <Check className="w-3 h-3" /> : step.n}
                  </span>
                  <span
                    className={
                      step.done
                        ? "text-muted-foreground"
                        : isCurrent
                          ? "text-primary font-medium underline underline-offset-2 decoration-primary/40"
                          : "text-muted-foreground"
                    }
                  >
                    {step.label}
                  </span>
                </span>
              );
              return isCurrent ? (
                <Link key={step.n} href={step.href} className="no-underline hover:opacity-80 transition-opacity" data-testid={`whats-next-step-${step.n}`}>
                  {inner}
                </Link>
              ) : (
                <span key={step.n} data-testid={`whats-next-step-${step.n}`}>{inner}</span>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Revisions", value: project.revisions?.length || 0, icon: <GitBranch className="w-4 h-4" />, href: null },
            { label: "Chapters", value: chapters.length, icon: <FileText className="w-4 h-4" />, href: null },
            { label: "Issues", value: counts.issues || 0, icon: <AlertTriangle className="w-4 h-4" />, href: `/forge/project/${projectId}/issues` },
            { label: "Reports", value: counts.reports || 0, icon: <BookOpen className="w-4 h-4" />, href: `/forge/project/${projectId}/reports` },
            { label: "Characters", value: counts.characters || 0, icon: <Users className="w-4 h-4" />, href: `/forge/project/${projectId}/characters` },
          ].map((stat) => {
            const content = (
              <Card className={`bg-card border border-border rounded-sm h-full ${stat.href ? "hover:border-primary/50 cursor-pointer" : ""} transition-all`}>
                <CardContent className="p-3 flex items-center gap-2">
                  <div className="text-brass">{stat.icon}</div>
                  <div>
                    <p className="text-lg font-bold text-foreground" data-testid={`stat-${stat.label.toLowerCase()}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
            return stat.href ? (
              <Link key={stat.label} href={stat.href} className="block no-underline" data-testid={`link-stat-${stat.label.toLowerCase()}`}>
                {content}
              </Link>
            ) : (
              <div key={stat.label}>{content}</div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: "Upload", icon: <Upload className="w-4 h-4" />, href: `/forge/project/${projectId}/upload` },
            { label: "Analyze", icon: <Zap className="w-4 h-4" />, href: `/forge/project/${projectId}/analyze` },
            { label: "Reports", icon: <FileText className="w-4 h-4" />, href: `/forge/project/${projectId}/reports` },
            { label: "Issues", icon: <AlertTriangle className="w-4 h-4" />, href: `/forge/project/${projectId}/issues` },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-border text-primary hover:bg-primary/10 transition-colors text-sm font-medium h-9 px-4 no-underline"
              data-testid={`button-goto-${item.label.toLowerCase()}`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
          {latestRevision?.manuscriptFileId && (
            <Button variant="outline" className="border-border text-primary hover:bg-primary/10 rounded-sm" onClick={handleReparse} disabled={reparsing} data-testid="button-reparse">
              {reparsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Re-detect Chapters
            </Button>
          )}
        </div>

        <Tabs defaultValue="chapters" className="w-full">
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger value="chapters" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary" data-testid="tab-chapters">
              Chapters ({chapters.length})
            </TabsTrigger>
            <TabsTrigger value="chunks" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary" data-testid="tab-chunks">
              Chunks ({chunks.length})
            </TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary" data-testid="tab-files">
              Files ({project.fileAssets?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chapters">
            {chapters.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center" data-testid="empty-chapters">No chapters yet. Upload a manuscript to get started.</p>
            ) : (
              <div className="space-y-2 mt-4">
                {chapters.map((ch: any) => (
                  <Card key={ch.id} className="bg-card border border-border rounded-sm" data-testid={`card-chapter-${ch.number}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-foreground">Chapter {ch.number}</span>
                        {ch.title && <span className="text-muted-foreground ml-2">— {ch.title}</span>}
                      </div>
                      <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                        {ch.wordCount?.toLocaleString() || 0} words
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="chunks">
            {chunks.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center" data-testid="empty-chunks">No chunks created.</p>
            ) : (
              <div className="space-y-2 mt-4">
                {chunks.map((ck: any) => (
                  <Card key={ck.id} className="bg-card border border-border rounded-sm" data-testid={`card-chunk-${ck.chunkIndex}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <span className="font-medium text-foreground">Chunk {ck.chunkIndex}</span>
                      <span className="text-sm text-muted-foreground">Chapters {ck.startChapter}–{ck.endChapter}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="files">
            {(!project.fileAssets || project.fileAssets.length === 0) ? (
              <p className="text-muted-foreground py-8 text-center" data-testid="empty-files">No files uploaded.</p>
            ) : (
              <div className="space-y-2 mt-4">
                {project.fileAssets.map((f: any) => (
                  <Card key={f.id} className="bg-card border border-border rounded-sm" data-testid={`card-file-${f.id}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-foreground">{f.fileName}</span>
                        <Badge variant="outline" className="border-border text-muted-foreground text-xs ml-2">{f.type}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleDateString()}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ForgeLayout>
  );
}
