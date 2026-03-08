import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Zap, FileText, AlertTriangle, Users, GitBranch, Film, Search, BookOpen, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ForgeProject() {
  const [, params] = useRoute("/forge/project/:id");
  const [, navigate] = useLocation();
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
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </ForgeLayout>
    );
  }

  if (!project) {
    return (
      <ForgeLayout projectId={projectId}>
        <div className="text-center py-16">
          <p className="text-gray-400" data-testid="text-project-not-found">Project not found</p>
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

  return (
    <ForgeLayout projectId={projectId}>
      <div className="animate-in fade-in duration-300">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-amber-400" data-testid="text-project-title">{project.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            {project.authorName && <span className="text-sm text-gray-400">{project.authorName}</span>}
            {project.genre && (
              <Badge variant="outline" className="border-amber-900/40 text-amber-400 text-xs">{project.genre}</Badge>
            )}
          </div>
          {project.description && <p className="text-gray-400 mt-2 text-sm">{project.description}</p>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Revisions", value: project.revisions?.length || 0, icon: <GitBranch className="w-4 h-4" /> },
            { label: "Chapters", value: chapters.length, icon: <FileText className="w-4 h-4" /> },
            { label: "Issues", value: counts.issues || 0, icon: <AlertTriangle className="w-4 h-4" /> },
            { label: "Reports", value: counts.reports || 0, icon: <BookOpen className="w-4 h-4" /> },
            { label: "Characters", value: counts.characters || 0, icon: <Users className="w-4 h-4" /> },
          ].map((stat) => (
            <Card key={stat.label} className="bg-gray-900 border-amber-900/20">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="text-amber-500">{stat.icon}</div>
                <div>
                  <p className="text-lg font-bold text-gray-100" data-testid={`stat-${stat.label.toLowerCase()}`}>{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <Button variant="outline" className="border-amber-900/30 text-amber-400 hover:bg-amber-600/20" onClick={() => navigate(`/forge/project/${projectId}/upload`)} data-testid="button-goto-upload">
            <Upload className="w-4 h-4 mr-2" /> Upload
          </Button>
          <Button variant="outline" className="border-amber-900/30 text-amber-400 hover:bg-amber-600/20" onClick={() => navigate(`/forge/project/${projectId}/analyze`)} data-testid="button-goto-analyze">
            <Zap className="w-4 h-4 mr-2" /> Analyze
          </Button>
          <Button variant="outline" className="border-amber-900/30 text-amber-400 hover:bg-amber-600/20" onClick={() => navigate(`/forge/project/${projectId}/reports`)} data-testid="button-goto-reports">
            <FileText className="w-4 h-4 mr-2" /> Reports
          </Button>
          <Button variant="outline" className="border-amber-900/30 text-amber-400 hover:bg-amber-600/20" onClick={() => navigate(`/forge/project/${projectId}/issues`)} data-testid="button-goto-issues">
            <AlertTriangle className="w-4 h-4 mr-2" /> Issues
          </Button>
          {latestRevision?.manuscriptFileId && (
            <Button variant="outline" className="border-amber-900/30 text-amber-400 hover:bg-amber-600/20" onClick={handleReparse} disabled={reparsing} data-testid="button-reparse">
              {reparsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Re-detect Chapters
            </Button>
          )}
        </div>

        <Tabs defaultValue="chapters" className="w-full">
          <TabsList className="bg-gray-900 border border-amber-900/20">
            <TabsTrigger value="chapters" className="data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400" data-testid="tab-chapters">
              Chapters ({chapters.length})
            </TabsTrigger>
            <TabsTrigger value="chunks" className="data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400" data-testid="tab-chunks">
              Chunks ({chunks.length})
            </TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400" data-testid="tab-files">
              Files ({project.fileAssets?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chapters">
            {chapters.length === 0 ? (
              <p className="text-gray-500 py-8 text-center" data-testid="empty-chapters">No chapters yet. Upload a manuscript to get started.</p>
            ) : (
              <div className="space-y-2 mt-4">
                {chapters.map((ch: any) => (
                  <Card key={ch.id} className="bg-gray-900 border-amber-900/15" data-testid={`card-chapter-${ch.number}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-100">Chapter {ch.number}</span>
                        {ch.title && <span className="text-gray-400 ml-2">— {ch.title}</span>}
                      </div>
                      <Badge variant="outline" className="border-gray-700 text-gray-400 text-xs">
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
              <p className="text-gray-500 py-8 text-center" data-testid="empty-chunks">No chunks created.</p>
            ) : (
              <div className="space-y-2 mt-4">
                {chunks.map((ck: any) => (
                  <Card key={ck.id} className="bg-gray-900 border-amber-900/15" data-testid={`card-chunk-${ck.chunkIndex}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <span className="font-medium text-gray-100">Chunk {ck.chunkIndex}</span>
                      <span className="text-sm text-gray-400">Chapters {ck.startChapter}–{ck.endChapter}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="files">
            {(!project.fileAssets || project.fileAssets.length === 0) ? (
              <p className="text-gray-500 py-8 text-center" data-testid="empty-files">No files uploaded.</p>
            ) : (
              <div className="space-y-2 mt-4">
                {project.fileAssets.map((f: any) => (
                  <Card key={f.id} className="bg-gray-900 border-amber-900/15" data-testid={`card-file-${f.id}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-100">{f.fileName}</span>
                        <Badge variant="outline" className="border-gray-700 text-gray-400 text-xs ml-2">{f.type}</Badge>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(f.createdAt).toLocaleDateString()}</span>
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
