import { cn } from "@/lib/utils";
import type { ChangeBlock } from "@/lib/diffChanges";

interface DiffViewProps {
  blocks: ChangeBlock[];
  accepted: Record<number, boolean>;
  onToggle: (id: number) => void;
}

/**
 * Renders the line-edited chapter as inline track-changes: original wording
 * struck through in red, the editor's rewrite underlined in green. Each
 * change block is clickable to flip between accepted (green wins) and
 * declined (red/original wins).
 */
export default function DiffView({ blocks, accepted, onToggle }: DiffViewProps) {
  return (
    <div className="text-sm whitespace-pre-wrap break-words leading-relaxed font-sans">
      {blocks.map(b => {
        if (b.type === "same") return <span key={b.id}>{b.text}</span>;

        const isAccepted = accepted[b.id] ?? true;
        return (
          <span
            key={b.id}
            onClick={() => onToggle(b.id)}
            title={isAccepted ? "Click to decline — keep original wording" : "Click to accept this edit"}
            className={cn(
              "cursor-pointer rounded-sm px-0.5 -mx-0.5 transition-colors",
              isAccepted ? "hover:bg-green-600/5" : "hover:bg-destructive/5"
            )}
          >
            {b.removed && (
              <span
                className={cn(
                  "line-through decoration-2",
                  isAccepted
                    ? "text-muted-foreground/40 decoration-muted-foreground/30"
                    : "text-destructive bg-destructive/10 decoration-destructive/60"
                )}
              >
                {b.removed}
              </span>
            )}
            {b.added && (
              <span
                className={cn(
                  "underline decoration-2 underline-offset-2",
                  isAccepted
                    ? "text-green-700 dark:text-green-400 bg-green-600/10 decoration-green-600/60"
                    : "text-muted-foreground/40 decoration-muted-foreground/30 line-through no-underline"
                )}
              >
                {b.added}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
