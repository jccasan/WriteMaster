import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import {
  LayoutDashboard, Upload, Zap, FileText, AlertTriangle,
  Users, GitBranch, Film, Search, BookOpen, ArrowLeft, MessageSquare, Bot
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

function getProjectNav(projectId: string): NavItem[] {
  const base = `/forge/project/${projectId}`;
  return [
    { label: "Overview", path: base, icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Upload", path: `${base}/upload`, icon: <Upload className="w-4 h-4" /> },
    { label: "Analyze", path: `${base}/analyze`, icon: <Zap className="w-4 h-4" /> },
    { label: "Reports", path: `${base}/reports`, icon: <FileText className="w-4 h-4" /> },
    { label: "Issues", path: `${base}/issues`, icon: <AlertTriangle className="w-4 h-4" /> },
    { label: "Characters", path: `${base}/characters`, icon: <Users className="w-4 h-4" /> },
    { label: "Structure", path: `${base}/structure`, icon: <GitBranch className="w-4 h-4" /> },
    { label: "Scenes", path: `${base}/scenes`, icon: <Film className="w-4 h-4" /> },
    { label: "Fact Check", path: `${base}/fact-check`, icon: <Search className="w-4 h-4" /> },
    { label: "Beta Readers", path: `${base}/beta-readers`, icon: <BookOpen className="w-4 h-4" /> },
    { label: "Chat with AI", path: `${base}/chat`, icon: <Bot className="w-4 h-4" /> },
  ];
}

interface ForgeLayoutProps {
  children: React.ReactNode;
  projectId?: string;
}

export default function ForgeLayout({ children, projectId }: ForgeLayoutProps) {
  const [location, navigate] = useLocation();

  const projectNav = projectId ? getProjectNav(projectId) : [];

  const isActive = (item: NavItem) =>
    location === item.path || (item.path !== `/forge/project/${projectId}` && location.startsWith(item.path));

  const isExactActive = (item: NavItem) => location === item.path;

  return (
    <Layout fullBleed>
      <div className="flex">
        {projectId && (
          <aside
            className="w-56 shrink-0 border-r border-border bg-card/60 min-h-[calc(100vh-3.5rem)] sticky top-14 self-start overflow-y-auto max-h-[calc(100vh-3.5rem)]"
            data-testid="forge-sidebar"
          >
            <div className="px-3 pt-3">
              <button
                onClick={() => navigate("/forge")}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                data-testid="forge-back-dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
                All Projects
              </button>
              <div className="library-rule mx-3 my-2" />
            </div>
            <nav className="p-3 pt-1 space-y-1">
              <p className="catalog-label text-[11px] px-3 pb-1">This Manuscript</p>
              {projectNav.map((item) => {
                const active = item.label === "Overview" ? isExactActive(item) : isActive(item);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    data-testid={`forge-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="px-3 pb-4">
              <div className="library-rule mx-3 mb-2" />
              <button
                onClick={() => navigate("/forge/quick-feedback")}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm transition-colors",
                  location === "/forge/quick-feedback"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                data-testid="forge-nav-quick-feedback"
              >
                <MessageSquare className="w-4 h-4" />
                Quick Feedback
              </button>
            </div>
          </aside>
        )}

        <main className={cn("flex-1 min-w-0 p-6 md:p-8", projectId ? "max-w-6xl" : "max-w-7xl mx-auto w-full")}>
          {children}
        </main>
      </div>
    </Layout>
  );
}
