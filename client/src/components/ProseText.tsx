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
        if (trimmed.startsWith("---") || trimmed.startsWith("***")) return <hr key={i} className="my-4 border-border/40" />;

        const lines = trimmed.split("\n");
        const firstLine = lines[0];
        const isHeading = /^#{1,3} /.test(firstLine) && !lines[1];

        if (isHeading) {
          const level = firstLine.startsWith("### ") ? 3 : firstLine.startsWith("## ") ? 2 : 1;
          const headingText = firstLine.slice(level + 1);
          if (level === 1) return <h1 key={i} className="text-2xl font-bold mt-6 mb-4">{headingText}</h1>;
          if (level === 2) return <h2 key={i} className="text-xl font-semibold mt-5 mb-3">{headingText}</h2>;
          return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{headingText}</h3>;
        }

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
