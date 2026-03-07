import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BookOpen, Scissors, Library, Sparkles, PenTool, Anvil } from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  matchPaths: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Pipeline",
    path: "/pipeline",
    icon: <Sparkles className="w-4 h-4" />,
    matchPaths: ["/pipeline"],
  },
  {
    label: "Chapter",
    path: "/chapter-writer",
    icon: <PenTool className="w-4 h-4" />,
    matchPaths: ["/chapter-writer"],
  },
  {
    label: "Analyzer",
    path: "/chapter-analyzer",
    icon: <Scissors className="w-4 h-4" />,
    matchPaths: ["/chapter-analyzer"],
  },
  {
    label: "Books",
    path: "/books",
    icon: <Library className="w-4 h-4" />,
    matchPaths: ["/books", "/book/"],
  },
  {
    label: "Forge",
    path: "/forge",
    icon: <Anvil className="w-4 h-4" />,
    matchPaths: ["/forge"],
  },
];

interface LayoutProps {
  children: React.ReactNode;
  fullScreen?: boolean;
}

export default function Layout({ children, fullScreen = false }: LayoutProps) {
  const [location, navigate] = useLocation();

  const isActive = (item: NavItem) =>
    item.matchPaths.some(p => location === p || location.startsWith(p + "/") || (p.endsWith("/") && location.startsWith(p)));

  return (
    <div className={cn("bg-background text-foreground font-sans", fullScreen ? "h-screen flex flex-col" : "min-h-screen")}>
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50" data-testid="nav-header">
        <div className="container max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/")}
              role="button"
              tabIndex={0}
              data-testid="nav-home"
            >
              <div className="w-7 h-7 bg-primary rounded-sm flex items-center justify-center text-primary-foreground font-serif font-bold text-lg leading-none">
                S
              </div>
              <span className="font-serif font-semibold text-lg tracking-tight hidden sm:inline">StoryDossier</span>
            </div>

            <nav className="flex items-center gap-1" data-testid="nav-links">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    isActive(item)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
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
