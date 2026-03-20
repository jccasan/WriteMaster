import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Layout from "@/components/Layout";
import NarrativeSliders, { DEFAULT_SLIDERS, type NarrativeSliderValues } from "@/components/NarrativeSliders";
import { cn } from "@/lib/utils";
import {
  Loader2, ArrowLeft, Upload, FileText, Trash2, Send, BookOpen,
  ChevronDown, ChevronUp, Plus, Download, Copy, Check, Pencil, X
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
}

const DOC_TYPES = [
  { value: "story_bible", label: "Story Bible" },
  { value: "character_sheet", label: "Character Sheet" },
  { value: "world_doc", label: "World Building" },
  { value: "outline", label: "Outline" },
  { value: "notes", label: "Notes" },
  { value: "other", label: "Other" },
];

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

  const initialLoadDone = useRef(false);

  const fetchBook = useCallback(async () => {
    if (!bookId) return;
    try {
      const [bookRes, docsRes] = await Promise.all([
        fetch(`/api/books/${bookId}`),
        fetch(`/api/books/${bookId}/documents`),
      ]);
      if (!bookRes.ok) throw new Error("Book not found");
      const bookData = await bookRes.json();
      const docsData = docsRes.ok ? await docsRes.json() : [];
      setBook(bookData);
      setDocuments(docsData);
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
      if (!res.ok) throw new Error((await res.json()).error);
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
      if (!res.ok) throw new Error((await res.json()).error);
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
      if (!res.ok) throw new Error((await res.json()).error);
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
          <span className="text-sm text-muted-foreground" data-testid="text-book-stats">
            {writtenCount} chapter{writtenCount !== 1 ? "s" : ""} · {totalWords.toLocaleString()} words
          </span>
          {writtenCount > 0 && (
            <Button variant="outline" size="sm" onClick={downloadBook} data-testid="button-download-book">
              <Download className="w-3.5 h-3.5 mr-1" /> Export
            </Button>
          )}
        </div>

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
                    onClick={() => setActiveChapter(i)}
                    data-testid={`button-chapter-${ch.chapter_number}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{ch.title}</span>
                      {ch.status === "writing" && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                      {ch.status === "written" && <Check className="w-3 h-3 text-green-500 shrink-0" />}
                    </div>
                    {ch.outline && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{ch.outline.substring(0, 60)}...</div>
                    )}
                  </button>
                ))}
                {book.chapters.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4 px-2">
                    No chapters yet. Upload your reference docs, then write your first chapter below.
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyChapter(currentChapter.content!)}
                        data-testid="button-copy-chapter"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-4 p-3 rounded-md bg-muted/30 border">
                    <span className="font-medium">Prompt:</span> {currentChapter.outline}
                  </div>
                  <div className="prose prose-sm max-w-none dark:prose-invert" data-testid="text-chapter-content">
                    {currentChapter.content.split("\n").map((line, i) => {
                      if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold mt-6 mb-4">{line.slice(2)}</h1>;
                      if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-semibold mt-5 mb-3">{line.slice(3)}</h2>;
                      if (line.startsWith("### ")) return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
                      if (line.trim() === "") return <div key={i} className="h-4" />;
                      return <p key={i} className="mb-3 leading-relaxed">{line}</p>;
                    })}
                  </div>
                  {currentChapter.summary && (
                    <details className="mt-8 border rounded-lg p-4">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground" data-testid="button-toggle-summary">
                        Continuity Summary
                      </summary>
                      <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-chapter-summary">
                        {currentChapter.summary}
                      </div>
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
                      <p className="text-muted-foreground text-sm">
                        {documents.length === 0
                          ? "Upload your story bible and reference docs in the sidebar, then describe what should happen in your first chapter."
                          : `You have ${documents.length} reference doc${documents.length > 1 ? "s" : ""} loaded. Describe what should happen in your first chapter below.`
                        }
                      </p>
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
                <NarrativeSliders values={sliders} onChange={setSliders} />
                {writing && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-primary" data-testid="text-writing-status">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Writing chapter {book.chapters.length}... This may take a minute.
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
