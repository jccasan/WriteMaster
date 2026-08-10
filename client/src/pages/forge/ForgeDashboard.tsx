import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { queryClient } from "@/lib/queryClient";
import ForgeLayout from "@/components/forge/ForgeLayout";
import NewProjectDialog from "@/components/forge/NewProjectDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, ArrowRight, BookOpen, FileText, FolderOpen,
  GitBranch, Loader2, MessageSquare, Trash2, Upload, Users,
} from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function editorialLabel(status?: string) {
  if (status === "analyzing") return "Review running";
  if (status === "reviewed") return "Results ready";
  if (status === "failed") return "Review needs attention";
  if (status === "ready") return "Ready to review";
  return "Not reviewed";
}

export default function ForgeDashboard() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoOpenedBookRef = useRef<string | null>(null);
  const [openingBookId, setOpeningBookId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery<any[]>({
    queryKey: ["/api/forge/projects"],
  });
  const { data: books, isLoading: booksLoading } = useQuery<any[]>({
    queryKey: ["/api/books"],
  });

  const openBookForReview = useCallback(async (bookId: string, review?: "readers") => {
    setOpeningBookId(bookId);
    setFlowError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/editorial-project`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not prepare this manuscript for review");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/books"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/forge/projects"] }),
      ]);
      const analyzeUrl = data.analyzeUrl || `/forge/project/${data.projectId}/analyze`;
      navigate(review === "readers" ? `${analyzeUrl}?preset=readers` : analyzeUrl);
    } catch (err: any) {
      setFlowError(err.message);
      setOpeningBookId(null);
    }
  }, [navigate]);

  useEffect(() => {
    const requestedBookId = new URLSearchParams(search).get("bookId");
    const requestedReview = new URLSearchParams(search).get("review") === "readers" ? "readers" : undefined;
    if (!requestedBookId || autoOpenedBookRef.current === requestedBookId) return;
    autoOpenedBookRef.current = requestedBookId;
    void openBookForReview(requestedBookId, requestedReview);
  }, [search, openBookForReview]);

  const uploadDraft = async (file: File) => {
    setUploading(true);
    setFlowError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/books/upload-manuscript", { method: "POST", body: form });
      const uploadedBook = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadedBook.error || "Upload failed");
      await queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      if (uploadedBook.analyze_url) {
        navigate(uploadedBook.analyze_url);
      } else {
        await openBookForReview(uploadedBook.id);
      }
    } catch (err: any) {
      setFlowError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetch(`/api/forge/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/forge/projects"] }),
  });

  const handleDelete = (e: React.MouseEvent, project: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete "${project.title}"? This removes the project and all its analysis. This cannot be undone.`)) {
      deleteMutation.mutate(project.id);
    }
  };

  const totalIssues = projects?.reduce((sum: number, project: any) =>
    sum + (project.revisions?.reduce((revisionSum: number, revision: any) => revisionSum + (revision._count?.issues || 0), 0) || 0), 0) || 0;
  const totalReports = projects?.reduce((sum: number, project: any) =>
    sum + (project.revisions?.reduce((revisionSum: number, revision: any) => revisionSum + (revision._count?.reports || 0), 0) || 0), 0) || 0;

  return (
    <ForgeLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8">
          <p className="catalog-label text-xs mb-1">Wing III — Edit</p>
          <h1 className="text-3xl font-serif font-semibold text-foreground" data-testid="text-forge-heading">The Editor's Office</h1>
          <p className="text-muted-foreground mt-1">Bring one manuscript to developmental editors, line editors, proofreaders, and reader panels.</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.docx"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadDraft(file);
          }}
          data-testid="input-edit-upload"
        />

        <Card className="bookplate rounded-sm mb-8 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div>
                <p className="catalog-label text-[11px] mb-1">Start a review</p>
                <h2 className="text-xl font-serif font-semibold">What would you like to edit?</h2>
                <p className="text-sm text-muted-foreground mt-1">Upload a draft or choose a book already on your desk. You will select editing options next.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading || Boolean(openingBookId)} data-testid="button-upload-draft-for-edit">
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {uploading ? "Reading draft..." : "Upload a draft"}
                </Button>
                <Link
                  href="/editor"
                  className="inline-flex items-center gap-2 rounded-sm border border-border text-foreground/80 hover:text-primary hover:bg-accent transition-colors text-sm font-medium h-9 px-4 no-underline"
                  data-testid="link-passage-review"
                >
                  <MessageSquare className="w-4 h-4" /> Review a passage
                </Link>
              </div>
            </div>

            {flowError && <p className="text-sm text-destructive mb-4" data-testid="text-edit-flow-error">{flowError}</p>}

            {booksLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading your books...</div>
            ) : books && books.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {books.map((book: any) => (
                  <div
                    key={book.id}
                    className="rounded-sm border border-border bg-background/60 p-3 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    data-testid={`card-review-book-${book.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4 text-brass shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{book.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {book.chapters_written}/{book.chapter_count} chapters · {editorialLabel(book.editorial?.status)}
                        </p>
                      </div>
                      {openingBookId === book.id && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                    </div>
                    <div className="flex gap-2 mt-3 pl-7">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => void openBookForReview(book.id)}
                        disabled={Boolean(openingBookId) || book.chapters_written === 0}
                        data-testid={`button-review-book-${book.id}`}
                      >
                        Edit <ArrowRight className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => void openBookForReview(book.id, "readers")}
                        disabled={Boolean(openingBookId) || book.chapters_written === 0}
                        data-testid={`button-reader-panel-book-${book.id}`}
                      >
                        <Users className="w-3 h-3" /> Reader Panel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No existing books yet. Upload a draft to create one and continue to editing options.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
          <div>
            <p className="catalog-label text-[11px] mb-1">Editorial workspaces</p>
            <h2 className="text-xl font-serif font-semibold">Recent reviews</h2>
          </div>
          <NewProjectDialog onCreated={(project) => navigate(`/forge/project/${project.id}`)} />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-card border-border rounded-sm"><CardContent className="p-3 flex items-center gap-2"><FolderOpen className="w-4 h-4 text-primary" /><div><p className="font-bold">{projects?.length || 0}</p><p className="text-xs text-muted-foreground">Workspaces</p></div></CardContent></Card>
          <Card className="bg-card border-border rounded-sm"><CardContent className="p-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-brass" /><div><p className="font-bold">{totalIssues}</p><p className="text-xs text-muted-foreground">Issues</p></div></CardContent></Card>
          <Card className="bg-card border-border rounded-sm"><CardContent className="p-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /><div><p className="font-bold">{totalReports}</p><p className="text-xs text-muted-foreground">Reports</p></div></CardContent></Card>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-projects">
            <FolderOpen className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Your uploaded drafts and reviews will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project: any) => {
              const revisionCount = project.revisions?.length || 0;
              const issueCount = project.revisions?.reduce((sum: number, revision: any) => sum + (revision._count?.issues || 0), 0) || 0;
              return (
                <Link key={project.id} href={`/forge/project/${project.id}`} className="block no-underline" data-testid={`card-project-${project.id}`}>
                  <Card className="bookplate rounded-sm hover:border-primary/50 transition-all cursor-pointer group h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <h3 className="font-serif font-semibold truncate group-hover:text-primary">{project.title}</h3>
                        <div className="flex items-center gap-1 shrink-0">
                          {project.genre && <Badge variant="outline" className="text-xs">{project.genre}</Badge>}
                          <button onClick={(event) => handleDelete(event, project)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive" aria-label={`Delete ${project.title}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" /> {revisionCount} rev{revisionCount === 1 ? "" : "s"}</span>
                        <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {issueCount} issue{issueCount === 1 ? "" : "s"}</span>
                        <span className="ml-auto">{formatDate(project.updatedAt || project.createdAt)}</span>
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
