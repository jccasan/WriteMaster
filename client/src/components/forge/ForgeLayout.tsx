import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Anvil, LayoutDashboard, Upload, Zap, FileText, AlertTriangle,
  Users, GitBranch, Film, Search, BookOpen, ArrowLeft, MessageSquare, Home
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
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-amber-900/30 bg-gray-950/95 backdrop-blur sticky top-0 z-50" data-testid="forge-nav-header">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/forge")}
              role="button"
              tabIndex={0}
              data-testid="forge-nav-home"
            >
              <div className="w-8 h-8 bg-amber-600 rounded flex items-center justify-center">
                <Anvil className="w-5 h-5 text-gray-950" />
              </div>
              <span className="font-bold text-lg tracking-tight text-amber-500 hidden sm:inline">STORY FORGE</span>
            </div>

            {projectId && (
              <button
                onClick={() => navigate("/forge")}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-amber-400 transition-colors"
                data-testid="forge-back-dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </button>
            )}
            <button
              onClick={() => navigate("/forge/quick-feedback")}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                location === "/forge/quick-feedback"
                  ? "text-amber-400"
                  : "text-gray-400 hover:text-amber-400"
              }`}
              data-testid="forge-nav-quick-feedback"
            >
              <MessageSquare className="w-4 h-4" />
              Quick Feedback
            </button>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-amber-400 transition-colors"
            data-testid="forge-nav-home"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">StoryDossier</span>
          </button>
        </div>
      </header>

      <div className="flex">
        {projectId && (
          <aside className="w-56 border-r border-amber-900/20 bg-gray-950 min-h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto" data-testid="forge-sidebar">
            <nav className="p-3 space-y-1">
              {projectNav.map((item) => {
                const active = item.label === "Overview" ? isExactActive(item) : isActive(item);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-amber-600/20 text-amber-400"
                        : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                    )}
                    data-testid={`forge-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        <main className={cn("flex-1 p-6 md:p-8", projectId ? "max-w-6xl" : "max-w-7xl mx-auto")}>
          {children}
        </main>
      </div>
    </div>
  );
}
