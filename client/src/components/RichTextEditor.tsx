import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Undo,
  Redo,
  Minus,
  Pilcrow,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content: string;
  onChange?: (html: string, plainText: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  maxHeight?: string;
  minHeight?: string;
  "data-testid"?: string;
}

function plainTextToHtml(text: string): string {
  if (!text) return "";
  if (text.trim().startsWith("<")) return text;

  return text
    .split(/\n\n+/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      if (trimmed.startsWith("### ")) {
        return `<h3>${trimmed.slice(4)}</h3>`;
      }
      if (trimmed.startsWith("## ")) {
        return `<h2>${trimmed.slice(3)}</h2>`;
      }
      if (trimmed.startsWith("# ")) {
        return `<h1>${trimmed.slice(2)}</h1>`;
      }
      if (trimmed.startsWith("---") || trimmed.startsWith("***")) {
        return "<hr>";
      }

      let processed = trimmed
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

  div.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) blocks.push(text);
      return;
    }

    const el = node as HTMLElement;
    const tag = el.tagName?.toLowerCase();

    if (tag === "h1") {
      blocks.push(`# ${el.textContent}`);
    } else if (tag === "h2") {
      blocks.push(`## ${el.textContent}`);
    } else if (tag === "h3") {
      blocks.push(`### ${el.textContent}`);
    } else if (tag === "hr") {
      blocks.push("---");
    } else if (tag === "ul" || tag === "ol") {
      const items = el.querySelectorAll("li");
      items.forEach((li, i) => {
        const prefix = tag === "ol" ? `${i + 1}. ` : "- ";
        blocks.push(`${prefix}${li.textContent}`);
      });
    } else if (tag === "p" || tag === "div") {
      let text = "";
      el.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          text += child.textContent;
        } else {
          const childEl = child as HTMLElement;
          const childTag = childEl.tagName?.toLowerCase();
          const content = childEl.textContent || "";

          if (childTag === "strong" && childEl.querySelector("em")) {
            text += `***${content}***`;
          } else if (childTag === "strong") {
            text += `**${content}**`;
          } else if (childTag === "em" && childEl.querySelector("strong")) {
            text += `***${content}***`;
          } else if (childTag === "em") {
            text += `*${content}*`;
          } else if (childTag === "br") {
            text += "\n";
          } else {
            text += content;
          }
        }
      });
      blocks.push(text);
    } else {
      const text = el.textContent?.trim();
      if (text) blocks.push(text);
    }
  });

  return blocks.join("\n\n");
}

function ToolbarButton({
  active,
  onClick,
  children,
  title,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-40 pointer-events-none"
      )}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  readOnly = false,
  placeholder = "Start writing...",
  className,
  maxHeight = "600px",
  minHeight = "200px",
  "data-testid": testId,
}: RichTextEditorProps) {
  const lastContentRef = useRef(content);
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: plainTextToHtml(content),
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (!onChange) return;
      isInternalUpdate.current = true;
      const html = editor.getHTML();
      const plain = htmlToPlainText(html);
      lastContentRef.current = plain;
      onChange(html, plain);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (content !== lastContentRef.current) {
      lastContentRef.current = content;
      const html = plainTextToHtml(content);
      editor.commands.setContent(html);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  if (!editor) return null;

  const iconSize = "w-4 h-4";

  return (
    <div
      className={cn(
        "border border-border/60 rounded-lg overflow-hidden bg-background",
        readOnly && "border-border/30",
        className
      )}
      data-testid={testId}
    >
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/40 bg-muted/30 flex-wrap">
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <Bold className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <Italic className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className={iconSize} />
          </ToolbarButton>

          <div className="w-px h-5 bg-border/50 mx-1" />

          <ToolbarButton
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <Heading3 className={iconSize} />
          </ToolbarButton>

          <div className="w-px h-5 bg-border/50 mx-1" />

          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrdered className={iconSize} />
          </ToolbarButton>

          <div className="w-px h-5 bg-border/50 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule"
          >
            <Minus className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            active={editor.isActive("paragraph")}
            title="Paragraph"
          >
            <Pilcrow className={iconSize} />
          </ToolbarButton>

          <div className="flex-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo className={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className={iconSize} />
          </ToolbarButton>
        </div>
      )}

      <div
        className="overflow-y-auto"
        style={{ maxHeight, minHeight: readOnly ? undefined : minHeight }}
      >
        <EditorContent
          editor={editor}
          className={cn(
            "prose prose-sm max-w-none px-4 py-3",
            "prose-headings:font-serif prose-headings:text-foreground",
            "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
            "prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:my-2",
            "prose-strong:text-foreground prose-em:text-foreground/80",
            "prose-li:text-foreground/90",
            "prose-hr:border-border/40",
            "[&_.tiptap]:outline-none [&_.tiptap]:min-h-[inherit]",
            readOnly && "prose-p:font-serif"
          )}
        />
      </div>
    </div>
  );
}
