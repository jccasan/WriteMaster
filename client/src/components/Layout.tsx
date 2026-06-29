import { useState } from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { BookOpen, Scissors, Anvil, FileText, BookMarked, ChevronDown, Globe, Library, Sparkles } from "lucide-react";

const TOOLS = [
  { label: "Chapter Analyzer", path: "/chapter-analyzer", icon: <Scissors className="w-3.5 h-3.5" /> },
  { label: "Editor", path: "/editor", icon: <FileText className="w-3.5 h-3.5" /> },
  { label: "Story Forge", path: "/forge", icon: <Anvil className="w-3.5 h-3.5" /> },
  { label: "Publishing", path: "/publishing", icon: <BookMarked className="w-3.5 h-3.5" /> },
  { label: "Style Extractor", path: "/style-extractor", icon: <Sparkles className="w-3.5 h-3.5" /> },
];

interface LayoutProps {
  children: React.ReactNode;
  fullScreen?: boolean;
}

export default function Layout({ children, fullScreen = false }: LayoutProps) {
  const [location] = useLocation();
  const [toolsOpen, setToolsOpen] = useState(false);

  const isMyWork = location.startsWith("/my-work") || location.startsWith("/books") || location.startsWith("/book/") || location.startsWith("/universe");
  const isTool = TOOLS.some(t => location.startsWith(t.path));

  return (
    <div className={cn("bg-background text-foreground font-sans", fullScreen ? "h-screen flex flex-col" : "min-h-screen")}>
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 no-underline">
              <div className="w-7 h-7 bg-primary rounded-sm flex items-center justify-center text-primary-foreground font-serif font-bold text-lg leading-none">
                W
              </div>
              <span className="font-serif font-semibold text-lg tracking-tight hidden sm:inline text-foreground">WriteMaster</span>
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors no-underline",
                  location === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                Home
              </Link>

              <Link
                href="/my-work"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors no-underline",
                  isMyWork ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                My Work
              </Link>

              {/* Tools dropdown */}
              <div className="relative">
                <button
                  onClick={() => setToolsOpen(!toolsOpen)}
                  onBlur={() => setTimeout(() => setToolsOpen(false), 150)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    isTool ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  Tools <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", toolsOpen && "rotate-180")} />
                </button>
                {toolsOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-background border border-border rounded-lg shadow-lg py-1 z-50">
                    {TOOLS.map(tool => (
                      <Link
                        key={tool.path}
                        href={tool.path}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-sm no-underline transition-colors",
                          location.startsWith(tool.path) ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        )}
                      >
                        {tool.icon}
                        {tool.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {fullScreen ? (
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      ) : (
        <main className="container max-w-5xl mx-auto px-4 py-8 md:py-12">
          {children}
        </main>
      )}
    </div>
  );
}
