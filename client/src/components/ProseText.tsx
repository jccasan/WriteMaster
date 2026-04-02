import { cn } from "@/lib/utils";

interface ProseTextProps {
  text: string;
  className?: string;
  paragraphClassName?: string;
  "data-testid"?: string;
}

export default function ProseText({
  text,
  className,
  paragraphClassName = "mb-3",
  "data-testid": testId,
}: ProseTextProps) {
  if (!text) return null;

  const normalized = text.replace(/\r\n?/g, "\n");
  const blocks = normalized.split(/\n\n+/);

  return (
    <div className={className} data-testid={testId}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold mt-6 mb-4">{trimmed.slice(2)}</h1>;
        if (trimmed.startsWith("## ")) return <h2 key={i} className="text-xl font-semibold mt-5 mb-3">{trimmed.slice(3)}</h2>;
        if (trimmed.startsWith("### ")) return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{trimmed.slice(4)}</h3>;
        if (trimmed.startsWith("---") || trimmed.startsWith("***")) return <hr key={i} className="my-4 border-border/40" />;

        const lines = trimmed.split("\n");
        return (
          <p key={i} className={cn("leading-relaxed", paragraphClassName)}>
            {lines.map((line, j) => (
              <span key={j}>{j > 0 && <br />}{line}</span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
