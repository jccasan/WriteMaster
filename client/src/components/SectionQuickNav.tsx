import { useState, useEffect, useCallback, useMemo } from "react";
import { List } from "lucide-react";

interface NavHeading {
  id: string;
  text: string;
  level: number;
}

function makeId(text: string): string {
  return "nav-" + text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function extractHeadings(markdown: string): NavHeading[] {
  if (!markdown) return [];
  const lines = markdown.split("\n");
  const headings: NavHeading[] = [];
  const seen: Record<string, number> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, "").trim();
      const base = makeId(text);
      const count = (seen[base] || 0) + 1;
      seen[base] = count;
      const id = count > 1 ? `${base}-${count}` : base;
      headings.push({ id, text, level });
    }
  }
  return headings;
}

export function headingIdTracker() {
  const seen: Record<string, number> = {};
  return (text: string): string => {
    const clean = text.replace(/\*\*/g, "").trim();
    const base = makeId(clean);
    const count = (seen[base] || 0) + 1;
    seen[base] = count;
    return count > 1 ? `${base}-${count}` : base;
  };
}

interface SectionQuickNavProps {
  markdown: string;
  className?: string;
}

export default function SectionQuickNav({ markdown, className = "" }: SectionQuickNavProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [collapsed, setCollapsed] = useState(false);
  const headings = useMemo(() => extractHeadings(markdown), [markdown]);

  const handleScroll = useCallback(() => {
    const ids = headings.map((h) => h.id);
    let current = "";
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) {
          current = id;
        }
      }
    }
    setActiveId(current);
  }, [headings]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (headings.length < 2) return null;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className={`${className}`} data-testid="section-quick-nav">
      <div className="sticky top-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-amber-400 mb-3 transition-colors w-full"
          data-testid="button-toggle-nav"
        >
          <List className="w-3.5 h-3.5" />
          <span>Sections</span>
          <span className="ml-auto text-[10px] text-gray-600">{collapsed ? "▶" : "▼"}</span>
        </button>

        {!collapsed && (
          <nav className="space-y-0.5 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin" data-testid="nav-section-list">
            {headings.map((h) => (
              <button
                key={h.id}
                onClick={() => scrollTo(h.id)}
                className={`block w-full text-left text-sm py-1 transition-colors truncate ${
                  h.level === 1 ? "pl-0 font-semibold" : h.level === 2 ? "pl-3" : "pl-6 text-xs"
                } ${
                  activeId === h.id
                    ? "text-amber-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
                title={h.text}
                data-testid={`nav-item-${h.id}`}
              >
                {h.text}
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
