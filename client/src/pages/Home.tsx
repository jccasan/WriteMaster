import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Scissors, Library, Loader2, ChevronRight, Clock, BookOpen, PenTool, Anvil } from "lucide-react";
import Layout from "@/components/Layout";

interface RecentItem {
  type: "project" | "session" | "book";
  id: string;
  label: string;
  detail: string;
  date: string;
  route: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function Home() {
  const [, navigate] = useLocation();
  const [counts, setCounts] = useState({ projects: 0, sessions: 0, books: 0 });
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then(r => r.json()).catch(() => []),
      fetch("/api/chapters").then(r => r.json()).catch(() => []),
      fetch("/api/books").then(r => r.json()).catch(() => []),
    ]).then(([projects, sessions, books]) => {
      setCounts({
        projects: projects.length,
        sessions: sessions.length,
        books: books.length,
      });

      const items: RecentItem[] = [];

      for (const p of projects.slice(0, 3)) {
        const isComplete = p.current_step > 10;
        items.push({
          type: "project",
          id: p.id,
          label: p.best_pitch ? p.best_pitch.substring(0, 60) + (p.best_pitch.length > 60 ? "..." : "") : `Pipeline ${p.id.substring(0, 8)}`,
          detail: isComplete ? "Complete" : `Step ${p.current_step}/10`,
          date: p.created_at,
          route: isComplete ? `/pipeline/${p.id}/result` : `/pipeline/${p.id}`,
        });
      }

      for (const s of sessions.slice(0, 3)) {
        items.push({
          type: "session",
          id: s.id,
          label: s.title || "Untitled Session",
          detail: s.has_rewrite ? "Has rewrite" : "Analysis only",
          date: s.updated_at,
          route: `/chapter-analyzer/${s.id}`,
        });
      }

      for (const b of books.slice(0, 3)) {
        items.push({
          type: "book",
          id: b.id,
          label: b.title,
          detail: `${b.chapters_written}/${b.chapter_count} chapters`,
          date: b.updated_at,
          route: `/book/${b.id}`,
        });
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentItems(items.slice(0, 5));
      setLoading(false);
    });
  }, []);

  const modules = [
    {
      title: "Story Pipeline",
      description: "Transform raw ideas into structured Story Dossiers through an 11-step AI pipeline.",
      icon: <Sparkles className="w-6 h-6" />,
      count: counts.projects,
      countLabel: "projects",
      route: "/pipeline",
      cta: "Start Pipeline",
      testId: "card-module-pipeline",
    },
    {
      title: "Chapter Writer",
      description: "Write a single polished chapter from a creative prompt — no pipeline or book needed.",
      icon: <PenTool className="w-6 h-6" />,
      count: 0,
      countLabel: "",
      route: "/chapter-writer",
      cta: "Write a Chapter",
      testId: "card-module-chapter-writer",
    },
    {
      title: "Chapter Analyzer",
      description: "Paste a chapter to extract structural elements, edit them, and generate AI rewrites.",
      icon: <Scissors className="w-6 h-6" />,
      count: counts.sessions,
      countLabel: "sessions",
      route: "/chapter-analyzer",
      cta: "Analyze Chapters",
      testId: "card-module-analyzer",
    },
    {
      title: "Book Writer",
      description: "Write full novels chapter by chapter with AI-assisted outlines, prose, and summaries.",
      icon: <Library className="w-6 h-6" />,
      count: counts.books,
      countLabel: "books",
      route: "/books",
      cta: "Write Books",
      testId: "card-module-books",
    },
    {
      title: "Story Forge",
      description: "Production-ready manuscript analysis studio with chunk-based AI analysis, editorial reports, and beta reader simulation.",
      icon: <Anvil className="w-6 h-6" />,
      count: 0,
      countLabel: "",
      route: "/forge",
      cta: "Open Forge",
      testId: "card-module-forge",
    },
  ];

  const typeIcon = (type: string) => {
    switch (type) {
      case "project": return <Sparkles className="w-3.5 h-3.5" />;
      case "session": return <Scissors className="w-3.5 h-3.5" />;
      case "book": return <BookOpen className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "project": return "Pipeline";
      case "session": return "Analysis";
      case "book": return "Book";
      default: return "";
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4" data-testid="text-dashboard-heading">
            StoryDossier
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your AI-powered writing workshop. Build story dossiers, analyze chapters, and write books.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {modules.map((mod) => (
                <Card
                  key={mod.title}
                  className="border-border/60 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group"
                  onClick={() => navigate(mod.route)}
                  data-testid={mod.testId}
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors text-primary">
                        {mod.icon}
                      </div>
                      {mod.count > 0 && mod.countLabel && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                          {mod.count} {mod.countLabel}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif font-semibold text-lg text-foreground mb-2">{mod.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 flex-1">{mod.description}</p>
                    <div className="text-sm font-medium text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      {mod.cta} <ChevronRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {recentItems.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Recent Activity
                </h2>
                <div className="space-y-1.5">
                  {recentItems.map((item) => (
                    <Card
                      key={`${item.type}-${item.id}`}
                      className="border-border/40 hover:border-primary/20 transition-all cursor-pointer group"
                      onClick={() => navigate(item.route)}
                      data-testid={`card-recent-${item.type}-${item.id}`}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="p-1.5 bg-muted rounded text-muted-foreground group-hover:text-primary transition-colors">
                          {typeIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{item.label}</span>
                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium shrink-0">
                              {typeLabel(item.type)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{item.detail}</span>
                            <span className="text-xs text-muted-foreground/60">·</span>
                            <div className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-muted-foreground/60" />
                              <span className="text-xs text-muted-foreground/60">{formatDate(item.date)}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
