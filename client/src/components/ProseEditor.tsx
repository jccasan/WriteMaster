import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import Focus from "@tiptap/extension-focus";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Undo, Redo, Maximize2, Minimize2,
  Loader2, Check, Sparkles, Scissors, ArrowRight,
  WrapText, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ── Helpers ────────────────────────────────────────────────────────────────

function plainTextToHtml(text: string): string {
  if (!text) return "";
  if (text.trim().startsWith("<")) return text;
  return text
    .split(/\n\n+/)
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("# ")) return `<h1>${trimmed.slice(2)}</h1>`;
      if (trimmed.startsWith("## ")) return `<h2>${trimmed.slice(3)}</h2>`;
      if (trimmed.startsWith("### ")) return `<h3>${trimmed.slice(4)}</h3>`;
      if (trimmed === "---" || trimmed === "***") return "<hr>";
      const processed = trimmed
        .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br>");
      return `<p>${processed}</p>`;
    })
    .filter(Boolean)
    .join("");
}

function htmlToPlainText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  const blocks: string[] = [];
  div.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.trim();
      if (t) blocks.push(t);
      return;
    }
    const el = node as HTMLElement;
    const tag = el.tagName?.toLowerCase();
    if (tag === "h1") blocks.push(`# ${el.textContent}`);
    else if (tag === "h2") blocks.push(`## ${el.textContent}`);
    else if (tag === "h3") blocks.push(`### ${el.textContent}`);
    else if (tag === "hr") blocks.push("---");
    else if (tag === "p" || tag === "div") {
      let text = "";
      el.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) { text += child.textContent; return; }
        const ce = child as HTMLElement;
        const ct = ce.tagName?.toLowerCase();
        const content = ce.textContent || "";
        if (ct === "strong" && ce.querySelector("em")) text += `***${content}***`;
        else if (ct === "strong") text += `**${content}**`;
        else if (ct === "em") text += `*${content}*`;
        else if (ct === "br") text += "\n";
        else text += content;
      });
      blocks.push(text);
    } else {
      const t = el.textContent?.trim();
      if (t) blocks.push(t);
    }
  });
  return blocks.join("\n\n");
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function readingTime(words: number): string {
  const mins = Math.ceil(words / 250);
  return mins < 1 ? "<1 min" : `${mins} min`;
}

// ── AI Bubble Action ────────────────────────────────────────────────────────

type AiAction = "continue" | "rewrite" | "shorter" | "longer" | "line-edit";

interface AiResult {
  action: AiAction;
  result: string;
  loading: boolean;
  error?: string;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface ProseEditorProps {
  content: string;
  readOnly?: boolean;
  placeholder?: string;
  onSave?: (plainText: string) => Promise<void> | void;
  onAiAction?: (action: AiAction, selectedText: string, context: string) => Promise<string>;
  className?: string;
  wordCountGoal?: number;
  chapterTitle?: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ProseEditor({
  content,
  readOnly = false,
  placeholder = "Start writing...",
  onSave,
  onAiAction,
  className,
  wordCountGoal,
  chapterTitle,
}: ProseEditorProps) {
  const [focusMode, setFocusMode] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
  const [sessionWords, setSessionWords] = useState(0);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const initialWordCount = useRef(wordCount(content));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef(content);
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Typography,
      CharacterCount,
      Highlight.configure({ multicolor: false }),
      Focus.configure({ className: "has-focus", mode: "all" }),
      Placeholder.configure({ placeholder }),
    ],
    content: plainTextToHtml(content),
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (!onSave) return;
      const html = editor.getHTML();
      const plain = htmlToPlainText(html);
      const words = wordCount(plain);
      setSessionWords(Math.max(0, words - initialWordCount.current));
      setSaveState("unsaved");
      isInternalUpdate.current = true;

      // Debounced autosave — 2 seconds after last keystroke
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (plain === lastSavedContent.current) { setSaveState("saved"); return; }
        setSaveState("saving");
        try {
          await onSave(plain);
          lastSavedContent.current = plain;
          setSaveState("saved");
        } catch {
          setSaveState("unsaved");
        }
      }, 2000);
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) { isInternalUpdate.current = false; return; }
    if (content !== lastSavedContent.current) {
      lastSavedContent.current = content;
      editor.commands.setContent(plainTextToHtml(content));
      initialWordCount.current = wordCount(content);
    }
  }, [content, editor]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [readOnly, editor]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const runAiAction = useCallback(async (action: AiAction) => {
    if (!editor || !onAiAction) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    if (!selectedText && action !== "continue") return;
    const fullText = htmlToPlainText(editor.getHTML());
    const context = fullText.substring(Math.max(0, fullText.lastIndexOf(selectedText) - 500), fullText.lastIndexOf(selectedText) + selectedText.length + 200);

    setAiResult({ action, result: "", loading: true });
    setShowAiPanel(true);
    try {
      const result = await onAiAction(action, selectedText, context);
      setAiResult({ action, result, loading: false });
    } catch (err: any) {
      setAiResult({ action, result: "", loading: false, error: err.message });
    }
  }, [editor, onAiAction]);

  const applyAiResult = useCallback(() => {
    if (!editor || !aiResult?.result) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, aiResult.result).run();
    } else {
      editor.chain().focus().insertContent(aiResult.result).run();
    }
    setShowAiPanel(false);
    setAiResult(null);
  }, [editor, aiResult]);

  if (!editor) return null;

  const words = editor.storage.characterCount?.words?.() ?? 0;
  const goalPct = wordCountGoal ? Math.min(100, Math.round((words / wordCountGoal) * 100)) : null;

  const AI_ACTIONS: { action: AiAction; label: string; icon: React.ReactNode }[] = [
    { action: "continue", label: "Continue writing", icon: <ArrowRight className="w-3 h-3" /> },
    { action: "rewrite", label: "Rewrite selection", icon: <WrapText className="w-3 h-3" /> },
    { action: "shorter", label: "Make shorter", icon: <Scissors className="w-3 h-3" /> },
    { action: "longer", label: "Expand", icon: <ChevronDown className="w-3 h-3" /> },
  ];

  return (
    <div className={cn(
      "flex flex-col",
      focusMode && "fixed inset-0 z-50 bg-background",
      className
    )}>
      {/* Toolbar */}
      <div className={cn(
        "flex items-center gap-1 px-3 py-1.5 border-b border-border/40 bg-muted/20",
        focusMode && "opacity-20 hover:opacity-100 transition-opacity"
      )}>
        {/* Format buttons */}
        {!readOnly && (
          <>
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn("p-1.5 rounded text-sm transition-colors", editor.isActive("bold") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn("p-1.5 rounded text-sm transition-colors", editor.isActive("italic") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().insertContent("—").run()}
              className="p-1.5 rounded text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-serif"
              title="Em dash (—)"
            >
              —
            </button>
            <div className="w-px h-4 bg-border/50 mx-1" />
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-1.5 rounded text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30"
              title="Undo"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-1.5 rounded text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30"
              title="Redo"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        <div className="flex-1" />

        {/* Save state */}
        {!readOnly && onSave && (
          <span className={cn("text-xs flex items-center gap-1 mr-2", {
            "text-muted-foreground": saveState === "saved",
            "text-primary": saveState === "saving",
            "text-amber-500": saveState === "unsaved",
          })}>
            {saveState === "saving" && <Loader2 className="w-3 h-3 animate-spin" />}
            {saveState === "saved" && <Check className="w-3 h-3" />}
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Unsaved"}
          </span>
        )}

        {/* Focus mode toggle */}
        <button
          onClick={() => setFocusMode(!focusMode)}
          className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={focusMode ? "Exit focus mode" : "Focus mode"}
        >
          {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Editor area */}
      <div className={cn("flex flex-1 overflow-hidden", focusMode && "flex-col")}>
        <div className={cn(
          "flex-1 overflow-y-auto",
          focusMode ? "max-w-2xl mx-auto w-full py-16 px-8" : ""
        )}>
          {/* Bubble menu - appears on text selection */}
          {editor && !readOnly && onAiAction && (
            <BubbleMenu
              editor={editor}
              className="flex items-center gap-1 bg-background border border-border rounded-lg shadow-lg p-1"
            >
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn("p-1.5 rounded text-xs transition-colors", editor.isActive("bold") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted")}
              >
                <Bold className="w-3 h-3" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn("p-1.5 rounded text-xs transition-colors", editor.isActive("italic") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted")}
              >
                <Italic className="w-3 h-3" />
              </button>
              <div className="w-px h-4 bg-border/50 mx-0.5" />
              {AI_ACTIONS.map(a => (
                <button
                  key={a.action}
                  onClick={() => runAiAction(a.action)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  title={a.label}
                >
                  {a.icon}
                  <span className="hidden sm:inline">{a.label}</span>
                </button>
              ))}
              <button
                onClick={() => runAiAction("continue")}
                className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-primary hover:bg-primary/10 transition-colors font-medium"
              >
                <Sparkles className="w-3 h-3" />
                AI
              </button>
            </BubbleMenu>
          )}

          <EditorContent
            editor={editor}
            className={cn(
              "prose prose-base max-w-none",
              "prose-p:font-serif prose-p:text-foreground/90 prose-p:leading-[1.85] prose-p:my-3 prose-p:text-lg",
              "prose-h1:font-serif prose-h1:text-2xl prose-h1:text-foreground prose-h1:font-bold",
              "prose-h2:font-serif prose-h2:text-xl prose-h2:text-foreground",
              "prose-h3:font-serif prose-h3:text-lg prose-h3:text-foreground",
              "prose-strong:text-foreground prose-em:text-foreground/80",
              "prose-hr:border-border/40",
              "[&_.tiptap]:outline-none [&_.tiptap]:min-h-[400px]",
              "[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
              "[&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground/50",
              "[&_.tiptap_p.is-editor-empty:first-child::before]:float-left",
              "[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none",
              "[&_.tiptap_p.is-editor-empty:first-child::before]:h-0",
              focusMode ? "px-0" : "px-4 py-4"
            )}
          />
        </div>

        {/* AI result panel */}
        {showAiPanel && aiResult && (
          <div className={cn(
            "border-l border-border/40 bg-muted/10 flex flex-col",
            focusMode ? "w-full border-l-0 border-t max-h-64" : "w-72 shrink-0"
          )}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
              <span className="text-xs font-medium capitalize text-primary">{aiResult.action}</span>
              <button onClick={() => { setShowAiPanel(false); setAiResult(null); }} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {aiResult.loading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </div>
              ) : aiResult.error ? (
                <p className="text-sm text-destructive">{aiResult.error}</p>
              ) : (
                <p className="text-sm font-serif leading-relaxed text-foreground/90 whitespace-pre-wrap">{aiResult.result}</p>
              )}
            </div>
            {!aiResult.loading && !aiResult.error && aiResult.result && (
              <div className="p-3 border-t border-border/40 flex gap-2">
                <Button size="sm" onClick={applyAiResult} className="flex-1 text-xs h-7">
                  Insert
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowAiPanel(false); setAiResult(null); }} className="text-xs h-7">
                  Discard
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer — word count + stats */}
      <div className={cn(
        "flex items-center gap-4 px-4 py-2 border-t border-border/40 text-xs text-muted-foreground bg-muted/10",
        focusMode && "opacity-20 hover:opacity-100 transition-opacity"
      )}>
        <span className="font-medium text-foreground/70">{words.toLocaleString()} words</span>
        <span>{readingTime(words)} read</span>
        {sessionWords > 0 && <span className="text-primary">+{sessionWords} this session</span>}
        {wordCountGoal && goalPct !== null && (
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", goalPct >= 100 ? "bg-green-600" : "bg-primary")}
                style={{ width: `${goalPct}%` }}
              />
            </div>
            <span>{goalPct}% of {wordCountGoal.toLocaleString()} goal</span>
          </div>
        )}
      </div>
    </div>
  );
}
