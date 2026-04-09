import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Layout from "@/components/Layout";
import ProseText from "@/components/ProseText";
import NarrativeSliders, { DEFAULT_SLIDERS, type NarrativeSliderValues } from "@/components/NarrativeSliders";
import { cn } from "@/lib/utils";
import {
  Loader2, ArrowLeft, Upload, FileText, Trash2, Send, BookOpen,
  ChevronDown, ChevronUp, Plus, Download, Copy, Check, Pencil, X,
  RefreshCw, Link2, Unlink, RotateCcw, Save, Eye, Edit3, BookMarked
} from "lucide-react";

interface BookDocument {
  id: string;
  name: string;
  type: string;
  added_at: string;
  length: number;
}

interface BookChapter {
  chapter_number: number;
  title: string;
  outline: string;
  content: string | null;
  summary: string | null;
  status: "outlined" | "writing" | "written";
}

interface Book {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  brain_dump: string;
  dossier: string;
  chapters: BookChapter[];
  documents?: BookDocument[];
  google_doc_id?: string;
}

const DOC_TYPES = [
  { value: "story_bible", label: "Story Bible" },
  { value: "character_sheet", label: "Character Sheet" },
  { value: "world_doc", label: "World Building" },
  { value: "outline", label: "Outline" },
  { value: "notes", label: "Notes" },
  { value: "other", label: "Other" },
];

async function safeError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.error || `Request failed (${res.status})`;
  } catch {
    const text = await res.text().catch(() => "");
    if (text.includes("upstream")) return "Request timed out — the server took too long. Try again.";
    return text || `Request failed (${res.status})`;
  }
}

export default function BookStudio() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const bookId = params.id;

  const [book, setBook] = useState<Book | null>(null);
  const [documents, setDocuments] = useState<BookDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [sliders, setSliders] = useState<NarrativeSliderValues>({ ...DEFAULT_SLIDERS });
  const [writing, setWriting] = useState(false);
  const [docsExpanded, setDocsExpanded] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("story_bible");
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteName, setPasteName] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copied, setCopied] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const [googleDocUrl, setGoogleDocUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [googleDocLinked, setGoogleDocLinked] = useState(false);
  const [googleDocId, setGoogleDocId] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [rewriteMode, setRewriteMode] = useState(false);
  const [rewriteInstructions, setRewriteInstructions] = useState("");
  const [rewriting, setRewriting] = useState(false);

  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [variants, setVariants] = useState<{ lens: string; content: string }[] | null>(null);
  const [activeVariantTab, setActiveVariantTab] = useState(0);

  const [summarizingAll, setSummarizingAll] = useState(false);
  const [summarizeProgress, setSummarizeProgress] = useState("");

  const initialLoadDone = useRef(false);

  const fetchBook = useCallback(async () => {
    if (!bookId) return;
    try {
      const [bookRes, docsRes, gdocRes] = await Promise.all([
        fetch(`/api/books/${bookId}`),
        fetch(`/api/books/${bookId}/documents`),
        fetch(`/api/books/${bookId}/google-doc-status`),
      ]);
      if (!bookRes.ok) throw new Error("Book not found");
      const bookData = await bookRes.json();
      const docsData = docsRes.ok ? await docsRes.json() : [];
      const gdocData = gdocRes.ok ? await gdocRes.json() : { linked: false };
      setBook(bookData);
      setDocuments(docsData);
      setGoogleDocLinked(gdocData.linked);
      setGoogleDocId(gdocData.docId || null);
      if (!initialLoadDone.current && bookData.chapters.length > 0) {
        setActiveChapter(bookData.chapters.length - 1);
        initialLoadDone.current = true;
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, [bookId]);

  useEffect(() => { fetchBook(); }, [fetchBook]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bookId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", uploadType);
      const res = await fetch(`/api/books/${bookId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await safeError(res));
      await fetchBook();
    } catch (err: any) {
      setError(err.message);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePasteUpload = async () => {
    if (!pasteContent.trim() || !bookId) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/books/${bookId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: pasteContent,
          name: pasteName || "Pasted Document",
          type: uploadType,
        }),
      });
      if (!res.ok) throw new Error(await safeError(res));
      setPasteContent("");
      setPasteName("");
      setPasteMode(false);
      await fetchBook();
    } catch (err: any) {
      setError(err.message);
    }
    setUploading(false);
  };

  const deleteDoc = async (docId: string) => {
    if (!bookId) return;
    try {
      await fetch(`/api/books/${bookId}/documents/${docId}`, { method: "DELETE" });
      await fetchBook();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const writeChapter = async () => {
    if (!prompt.trim() || !bookId || writing) return;
    setWriting(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/write-from-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, sliders }),
      });
      if (!res.ok) throw new Error(await safeError(res));
      const data = await res.json();
      setBook(data.book);
      setDocuments(documents);
      setActiveChapter(data.book.chapters.length - 1);
      setPrompt("");
    } catch (err: any) {
      setError(err.message);
    }
    setWriting(false);
  };

  const saveTitle = async () => {
    if (!book || !bookId) return;
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleDraft }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBook(updated);
      }
    } catch {}
    setEditingTitle(false);
  };

  const copyChapter = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBook = () => {
    if (!book) return;
    const text = book.chapters
      .filter(c => c.content)
      .map(c => `# ${c.title}\n\n${c.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${book.title || "book"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importGoogleDoc = async () => {
    if (!googleDocUrl.trim() || !bookId) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/import-google-doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: googleDocUrl }),
      });
      if (!res.ok) throw new Error(await safeError(res));
      const data = await res.json();
      setBook(data.book);
      setGoogleDocLinked(true);
      setGoogleDocId(data.docId);
      setGoogleDocUrl("");
      setShowImportDialog(false);
      initialLoadDone.current = false;
      if (data.book.chapters.length > 0) {
        setActiveChapter(0);
        initialLoadDone.current = true;
      }
    } catch (err: any) {
      setError(err.message);
    }
    setImporting(false);
  };

  const syncToGoogleDoc = async () => {
    if (!bookId) return;
    if (!confirm("This will overwrite the Google Doc with all chapters from the app. Any edits made directly in Google Docs will be replaced. Continue?")) return;
    setSyncing(true);
    setError(null);
    setSyncSuccess(null);
    try {
      const res = await fetch(`/api/books/${bookId}/sync-to-google-doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await safeError(res));
      const data = await res.json();
      setSyncSuccess(`Synced ${data.chaptersWritten} chapters to Google Docs`);
      setTimeout(() => setSyncSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message);
    }
    setSyncing(false);
  };

  const refreshFromGoogleDoc = async () => {
    if (!bookId) return;
    if (!confirm("This will replace all chapter content with the latest version from Google Docs. Any unsaved local edits will be lost. Continue?")) return;
    setRefreshing(true);
    setError(null);
    setSyncSuccess(null);
    try {
      const res = await fetch(`/api/books/${bookId}/refresh-from-google-doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await safeError(res));
      const data = await res.json();
      setBook(data.book);
      setActiveChapter(0);
      setEditMode(false);
      setRewriteMode(false);
      setVariants(null);
      setSyncSuccess(`Refreshed ${data.chaptersRefreshed} chapters from Google Docs`);
      setTimeout(() => setSyncSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message);
    }
    setRefreshing(false);
  };

  const saveChapterEdit = async () => {
    if (!book || !bookId || activeChapter === null) return;
    const chapter = book.chapters[activeChapter];
    if (!chapter) return;
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/chapters/${chapter.chapter_number}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error(await safeError(res));
      await fetchBook();
      setEditMode(false);
    } catch (err: any) {
      setError(err.message);
    }
    setSavingEdit(false);
  };

  const rewriteChapter = async () => {
    if (!book || !bookId || activeChapter === null || !rewriteInstructions.trim()) return;
    const chapter = book.chapters[activeChapter];
    if (!chapter) return;
    setRewriting(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/rewrite-chapter/${chapter.chapter_number}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: rewriteInstructions, sliders }),
      });
      if (!res.ok) throw new Error(await safeError(res));
      const data = await res.json();
      setBook(data.book);
      setRewriteMode(false);
      setRewriteInstructions("");
    } catch (err: any) {
      setError(err.message);
    }
    setRewriting(false);
  };

  const generateVariants = async () => {
    if (!book || !bookId || activeChapter === null || !rewriteInstructions.trim()) return;
    const chapter = book.chapters[activeChapter];
    if (!chapter) return;
    setGeneratingVariants(true);
    setError(null);
    setVariants(null);
    try {
      const res = await fetch(`/api/books/${bookId}/rewrite-chapter-variants/${chapter.chapter_number}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: rewriteInstructions, sliders }),
      });
      if (!res.ok) throw new Error(await safeError(res));
      const data = await res.json();
      setVariants(data.variants);
      setActiveVariantTab(0);
    } catch (err: any) {
      setError(err.message);
    }
    setGeneratingVariants(false);
  };

  const selectVariant = async (variantContent: string) => {
    if (!book || !bookId || activeChapter === null) return;
    const chapter = book.chapters[activeChapter];
    if (!chapter) return;
    setRewriting(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/chapters/${chapter.chapter_number}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: variantContent }),
      });
      if (!res.ok) throw new Error(await safeError(res));
      const data = await res.json();
      setBook(data.book);
      setVariants(null);
      setRewriteMode(false);
      setRewriteInstructions("");
    } catch (err: any) {
      setError(err.message);
    }
    setRewriting(false);
  };

  const summarizeAll = async () => {
    if (!bookId || !book) return;
    const unsummarized = book.chapters.filter(c => c.content && !c.summary);
    if (unsummarized.length === 0) return;
    setSummarizingAll(true);
    setError(null);
    let completed = 0;
    let lastBook = book;
    for (const chapter of unsummarized) {
      completed++;
      setSummarizeProgress(`${completed}/${unsummarized.length} — Ch. ${chapter.chapter_number}`);
      try {
        const res = await fetch(`/api/books/${bookId}/summarize-chapter/${chapter.chapter_number}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const errMsg = await safeError(res);
          console.error(`Summarize ch ${chapter.chapter_number} failed: ${errMsg}`);
          continue;
        }
        const data = await res.json();
        lastBook = data.book;
        setBook(data.book);
      } catch (err: any) {
        console.error(`Summarize ch ${chapter.chapter_number} failed: ${err.message}`);
        continue;
      }
    }
    setBook(lastBook);
    setSummarizeProgress("");
    setSummarizingAll(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!book) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Book not found</p>
          <Button onClick={() => navigate("/books")} className="mt-4">Back to Books</Button>
        </div>
      </Layout>
    );
  }

  const currentChapter = activeChapter !== null ? book.chapters[activeChapter] : null;
  const writtenCount = book.chapters.filter(c => c.status === "written").length;
  const totalWords = book.chapters.reduce((sum, c) => sum + (c.content?.split(/\s+/).length || 0), 0);
  const unsummarizedCount = book.chapters.filter(c => c.content && !c.summary).length;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/books")} data-testid="button-back-books">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="h-8 w-64"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                data-testid="input-book-title"
              />
              <Button size="icon" variant="ghost" onClick={saveTitle}><Check className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setEditingTitle(false)}><X className="w-4 h-4" /></Button>
            </div>
          ) : (
            <h1
              className="text-lg font-bold cursor-pointer hover:text-primary transition-colors"
              onClick={() => { setEditingTitle(true); setTitleDraft(book.title); }}
              data-testid="text-book-title"
            >
              {book.title}
            </h1>
          )}
          <div className="flex-1" />

          {googleDocLinked && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-800" data-testid="badge-google-doc-linked">
                <Link2 className="w-3 h-3" />
                Google Docs linked
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshFromGoogleDoc}
                disabled={refreshing || syncing}
                className="h-8 text-xs"
                title="Pull latest content from Google Docs into the app"
                data-testid="button-refresh-from-google-doc"
              >
                {refreshing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                Pull from Doc
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={syncToGoogleDoc}
                disabled={syncing || refreshing || writtenCount === 0}
                className="h-8 text-xs"
                title="Push app chapters to Google Docs (overwrites the doc)"
                data-testid="button-sync-google-doc"
              >
                {syncing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                Push to Doc
              </Button>
            </div>
          )}

          {!googleDocLinked && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportDialog(!showImportDialog)}
              className="h-8 text-xs"
              data-testid="button-import-google-doc"
            >
              <Link2 className="w-3 h-3 mr-1" /> Import Google Doc
            </Button>
          )}

          {unsummarizedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={summarizeAll}
              disabled={summarizingAll}
              className="h-8 text-xs"
              data-testid="button-summarize-all"
            >
              {summarizingAll ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <BookOpen className="w-3 h-3 mr-1" />}
              {summarizingAll && summarizeProgress ? `Building ${summarizeProgress}` : `Build Memory (${unsummarizedCount})`}
            </Button>
          )}

          <span className="text-sm text-muted-foreground" data-testid="text-book-stats">
            {writtenCount} chapter{writtenCount !== 1 ? "s" : ""} · {totalWords.toLocaleString()} words
          </span>
          {(book.dossier && book.chapters.some(c => c.status === "written")) && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/publishing/blurbs/${bookId}`)}
                className="gap-1 h-8 text-xs text-muted-foreground hover:text-foreground"
                data-testid="button-publishing-blurbs"
              >
                <BookMarked className="w-3.5 h-3.5" /> Blurb
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/publishing/titles-keywords/${bookId}`)}
                className="gap-1 h-8 text-xs text-muted-foreground hover:text-foreground"
                data-testid="button-publishing-titles"
              >
                <BookMarked className="w-3.5 h-3.5" /> Title & Keywords
              </Button>
            </>
          )}
          {writtenCount > 0 && (
            <Button variant="outline" size="sm" onClick={downloadBook} data-testid="button-download-book">
              <Download className="w-3.5 h-3.5 mr-1" /> Export
            </Button>
          )}
        </div>

        {showImportDialog && (
          <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Import from Google Docs</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Paste the link to your Google Doc. The system will split it into chapters and build continuity memory for each one. You can then edit and rewrite chapters with full story context, and sync changes back to your doc.
              </p>
              <div className="flex gap-2">
                <Input
                  value={googleDocUrl}
                  onChange={(e) => setGoogleDocUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className="flex-1"
                  disabled={importing}
                  onKeyDown={(e) => e.key === "Enter" && importGoogleDoc()}
                  data-testid="input-google-doc-url"
                />
                <Button
                  onClick={importGoogleDoc}
                  disabled={importing || !googleDocUrl.trim()}
                  data-testid="button-confirm-import"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
                  {importing ? "Importing..." : "Import"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setShowImportDialog(false); setGoogleDocUrl(""); }}
                  data-testid="button-cancel-import"
                >
                  Cancel
                </Button>
              </div>
              {importing && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Reading your Google Doc and splitting into chapters...
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-72 border-r flex flex-col overflow-hidden shrink-0">
            <div className="border-b">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                onClick={() => setDocsExpanded(!docsExpanded)}
                data-testid="button-toggle-docs"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Reference Docs ({documents.length})
                </span>
                {docsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {docsExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs"
                      data-testid={`doc-item-${doc.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{doc.name}</div>
                        <div className="text-muted-foreground">{DOC_TYPES.find(t => t.value === doc.type)?.label || doc.type} · {(doc.length / 1000).toFixed(1)}k chars</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => deleteDoc(doc.id)}
                        data-testid={`button-delete-doc-${doc.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}

                  <div className="space-y-1.5">
                    <select
                      className="w-full text-xs border rounded-md px-2 py-1 bg-background"
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value)}
                      data-testid="select-doc-type"
                    >
                      {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>

                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-7"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        data-testid="button-upload-file"
                      >
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                        Upload
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-7"
                        onClick={() => setPasteMode(!pasteMode)}
                        data-testid="button-paste-doc"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Paste
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.docx"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>

                  {pasteMode && (
                    <div className="space-y-1.5 border rounded-md p-2">
                      <Input
                        placeholder="Document name"
                        value={pasteName}
                        onChange={(e) => setPasteName(e.target.value)}
                        className="h-7 text-xs"
                        data-testid="input-paste-name"
                      />
                      <Textarea
                        placeholder="Paste content here..."
                        value={pasteContent}
                        onChange={(e) => setPasteContent(e.target.value)}
                        className="text-xs min-h-[100px]"
                        data-testid="input-paste-content"
                      />
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={handlePasteUpload}
                        disabled={uploading || !pasteContent.trim()}
                        data-testid="button-save-paste"
                      >
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        Save Document
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-3 py-2 border-b">
              <div className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Chapters ({book.chapters.length})
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {book.chapters.map((ch, i) => (
                  <button
                    key={ch.chapter_number}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      activeChapter === i
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/50 text-muted-foreground"
                    )}
                    onClick={() => { setActiveChapter(i); setEditMode(false); setRewriteMode(false); setVariants(null); }}
                    data-testid={`button-chapter-${ch.chapter_number}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{ch.title}</span>
                      <div className="flex items-center gap-1">
                        {ch.summary && <BookOpen className="w-2.5 h-2.5 text-blue-400 shrink-0" title="Has memory" />}
                        {ch.status === "writing" && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                        {ch.status === "written" && <Check className="w-3 h-3 text-green-500 shrink-0" />}
                      </div>
                    </div>
                    {ch.outline && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{ch.outline.substring(0, 60)}...</div>
                    )}
                  </button>
                ))}
                {book.chapters.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4 px-2">
                    No chapters yet. Import a Google Doc or write your first chapter below.
                  </p>
                )}
              </div>
            </ScrollArea>
          </aside>

          <main className="flex-1 flex flex-col overflow-hidden">
            {currentChapter && currentChapter.content ? (
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto py-8 px-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold" data-testid="text-chapter-title">{currentChapter.title}</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {currentChapter.content.split(/\s+/).length.toLocaleString()} words
                      </span>
                      {!editMode && !rewriteMode && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditMode(true);
                              setEditContent(currentChapter.content || "");
                              setRewriteMode(false);
                            }}
                            title="Edit chapter"
                            data-testid="button-edit-chapter"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setRewriteMode(true);
                              setEditMode(false);
                            }}
                            title="AI Rewrite"
                            data-testid="button-rewrite-chapter"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyChapter(currentChapter.content!)}
                            data-testid="button-copy-chapter"
                          >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {rewriteMode && (
                    <div className="mb-6 border rounded-lg p-4 bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" data-testid="rewrite-panel">
                      <div className="flex items-center gap-2 mb-3">
                        <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">AI Rewrite</span>
                      </div>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                        Tell the AI how to rewrite this chapter. It has full memory of all other chapters and your reference docs for consistency.
                      </p>
                      <Textarea
                        value={rewriteInstructions}
                        onChange={(e) => setRewriteInstructions(e.target.value)}
                        placeholder="e.g., Make the dialogue more tense. Add more sensory details about the setting. Show Sarah's internal conflict more clearly. Change the ending so they don't resolve their argument yet."
                        className="min-h-[100px] mb-3 text-sm"
                        disabled={rewriting}
                        data-testid="input-rewrite-instructions"
                      />
                      <NarrativeSliders values={sliders} onChange={setSliders} />
                      <div className="flex gap-2 mt-3 flex-wrap">
                        <Button
                          onClick={rewriteChapter}
                          disabled={rewriting || generatingVariants || !rewriteInstructions.trim()}
                          data-testid="button-confirm-rewrite"
                        >
                          {rewriting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                              Rewriting...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Rewrite Chapter
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={generateVariants}
                          disabled={rewriting || generatingVariants || !rewriteInstructions.trim()}
                          data-testid="button-generate-variants"
                        >
                          {generatingVariants ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                              Generating 3 Variants...
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              Generate Variants
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => { setRewriteMode(false); setRewriteInstructions(""); setVariants(null); }}
                          disabled={rewriting || generatingVariants}
                        >
                          Cancel
                        </Button>
                      </div>
                      {(rewriting || generatingVariants) && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {generatingVariants
                            ? "Generating 3 variant rewrites in parallel... This may take a couple minutes."
                            : "Rewriting with full story context... This may take a minute."}
                        </p>
                      )}

                      {variants && variants.length > 0 && (
                        <div className="mt-4 border rounded-lg overflow-hidden" data-testid="variant-comparison">
                          <div className="flex border-b bg-muted/30">
                            {variants.map((v, i) => (
                              <button
                                key={i}
                                onClick={() => setActiveVariantTab(i)}
                                className={cn(
                                  "flex-1 px-3 py-2 text-xs font-medium transition-colors",
                                  activeVariantTab === i
                                    ? "bg-background text-foreground border-b-2 border-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                                data-testid={`tab-variant-${i}`}
                              >
                                {v.lens}
                              </button>
                            ))}
                          </div>
                          <div className="p-4">
                            <ProseText
                              text={variants[activeVariantTab].content}
                              className="prose prose-sm max-w-none dark:prose-invert mb-4"
                              data-testid={`text-variant-content-${activeVariantTab}`}
                            />
                            <div className="flex gap-2 pt-3 border-t">
                              <Button
                                size="sm"
                                onClick={() => selectVariant(variants[activeVariantTab].content)}
                                disabled={rewriting}
                                data-testid={`button-use-variant-${activeVariantTab}`}
                              >
                                {rewriting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                                Use This Version
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setVariants(null)}
                                data-testid="button-dismiss-variants"
                              >
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {editMode ? (
                    <div data-testid="edit-panel">
                      <div className="flex items-center gap-2 mb-3">
                        <Edit3 className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Editing Chapter</span>
                        <div className="flex-1" />
                        <Button
                          size="sm"
                          onClick={saveChapterEdit}
                          disabled={savingEdit}
                          data-testid="button-save-edit"
                        >
                          {savingEdit ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditMode(false)}
                          disabled={savingEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[500px] font-mono text-sm leading-relaxed"
                        data-testid="textarea-edit-chapter"
                      />
                    </div>
                  ) : (
                    <>
                      {currentChapter.outline && (
                        <div className="text-xs text-muted-foreground mb-4 p-3 rounded-md bg-muted/30 border">
                          <span className="font-medium">Prompt:</span> {currentChapter.outline}
                        </div>
                      )}
                      <ProseText
                        text={currentChapter.content}
                        className="prose prose-sm max-w-none dark:prose-invert"
                        data-testid="text-chapter-content"
                      />
                    </>
                  )}

                  {currentChapter.summary && !editMode && (
                    <details className="mt-8 border rounded-lg p-4">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground" data-testid="button-toggle-summary">
                        Continuity Summary
                      </summary>
                      <ProseText
                        text={currentChapter.summary}
                        className="mt-3 text-sm text-muted-foreground"
                        paragraphClassName="mb-2"
                        data-testid="text-chapter-summary"
                      />
                    </details>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  {book.chapters.length === 0 ? (
                    <>
                      <h2 className="text-lg font-semibold mb-2">Ready to Write</h2>
                      <p className="text-muted-foreground text-sm mb-4">
                        {documents.length === 0
                          ? "Import a Google Doc, upload reference docs, or describe your first chapter below."
                          : `You have ${documents.length} reference doc${documents.length > 1 ? "s" : ""} loaded. Describe what should happen in your first chapter below.`
                        }
                      </p>
                      {!googleDocLinked && (
                        <Button
                          variant="outline"
                          onClick={() => setShowImportDialog(true)}
                          className="mb-2"
                          data-testid="button-import-cta"
                        >
                          <Link2 className="w-4 h-4 mr-2" /> Import from Google Docs
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold mb-2">{currentChapter?.title || "Select a Chapter"}</h2>
                      <p className="text-muted-foreground text-sm">
                        {currentChapter?.status === "writing"
                          ? "Writing in progress..."
                          : "Select a chapter from the sidebar or write a new one."
                        }
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="border-t p-4 shrink-0">
              <div className="max-w-3xl mx-auto">
                {!rewriteMode && <NarrativeSliders values={sliders} onChange={setSliders} />}
                {writing && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-primary" data-testid="text-writing-status">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Writing chapter {book.chapters.length}... This may take a minute.
                  </div>
                )}
                {syncSuccess && (
                  <div className="mb-3 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md px-3 py-2 flex items-center gap-2" data-testid="text-sync-success">
                    <Check className="w-4 h-4 shrink-0" />
                    {syncSuccess}
                  </div>
                )}
                {error && (
                  <div className="mb-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2" data-testid="text-error">
                    {error}
                    <Button variant="ghost" size="sm" className="ml-2 h-5 text-xs" onClick={() => setError(null)}>Dismiss</Button>
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      book.chapters.length === 0
                        ? "Describe what happens in your first chapter..."
                        : `Describe what happens in Chapter ${book.chapters.length + 1}...`
                    }
                    className="resize-none min-h-[60px] max-h-[150px]"
                    disabled={writing}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        writeChapter();
                      }
                    }}
                    data-testid="input-chapter-prompt"
                  />
                  <Button
                    onClick={writeChapter}
                    disabled={writing || !prompt.trim()}
                    className="shrink-0 h-10"
                    data-testid="button-write-chapter"
                  >
                    {writing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {documents.length > 0 ? `${documents.length} reference doc${documents.length > 1 ? "s" : ""} · ` : ""}
                  {book.chapters.length > 0
                    ? `${book.chapters.length} previous chapter${book.chapters.length > 1 ? "s" : ""} in memory · `
                    : ""
                  }
                  Ctrl+Enter to send
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </Layout>
  );
}
