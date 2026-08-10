import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  BookOpen, Scissors, Anvil, FileText, BookMarked, ChevronDown, Globe,
  Library, Sparkles, Map, PenLine, Feather, Stamp, Heart, MessageSquare,
  Lamp, ScrollText, Tags,
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  hint?: string;
}

interface NavSection {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  /** Path prefixes that mark this section active */
  activePaths: string[];
}

// The library is organized the way a book gets made:
// Plan the story → Write the draft → Edit the manuscript → Publish the book.
const SECTIONS: NavSection[] = [
  {
    label: "Plan",
    icon: <Map className="w-3.5 h-3.5" />,
    activePaths: ["/pipeline", "/universe"],
    items: [
      { label: "Story Dossiers", path: "/pipeline", icon: <ScrollText className="w-4 h-4" />, hint: "Brain dump → full story dossier" },
      { label: "Universes & Series", path: "/universe", icon: <Globe className="w-4 h-4" />, hint: "Worlds, bibles, series planning" },
    ],
  },
  {
    label: "Write",
    icon: <Feather className="w-3.5 h-3.5" />,
    activePaths: ["/books", "/book/", "/chapter-writer", "/expand", "/romance"],
    items: [
      { label: "My Books", path: "/books", icon: <BookOpen className="w-4 h-4" />, hint: "The writing desk" },
      { label: "Chapter Writer", path: "/chapter-writer", icon: <PenLine className="w-4 h-4" />, hint: "One-off chapter from a prompt" },
      { label: "Expand a Book", path: "/expand", icon: <Sparkles className="w-4 h-4" />, hint: "Upload and grow a manuscript" },
      { label: "Romance Studio", path: "/romance", icon: <Heart className="w-4 h-4" />, hint: "KU-optimized romance pipeline" },
    ],
  },
  {
    label: "Edit",
    icon: <Scissors className="w-3.5 h-3.5" />,
    activePaths: ["/forge", "/chapter-analyzer", "/editor", "/style-extractor"],
    items: [
      { label: "Story Forge", path: "/forge", icon: <Anvil className="w-4 h-4" />, hint: "Full manuscript analysis studio" },
      { label: "Quick Feedback", path: "/forge/quick-feedback", icon: <MessageSquare className="w-4 h-4" />, hint: "Paste a passage, get notes" },
      { label: "Chapter Analyzer", path: "/chapter-analyzer", icon: <Scissors className="w-4 h-4" />, hint: "Extract & rework chapter elements" },
      { label: "Quick Passage Review", path: "/editor", icon: <FileText className="w-4 h-4" />, hint: "Paste a passage for one focused review" },
      { label: "Style Extractor", path: "/style-extractor", icon: <Sparkles className="w-4 h-4" />, hint: "Build a voice guide from samples" },
    ],
  },
  {
    label: "Publish",
    icon: <Stamp className="w-3.5 h-3.5" />,
    activePaths: ["/publishing"],
    items: [
      { label: "Publishing House", path: "/publishing", icon: <BookMarked className="w-4 h-4" />, hint: "All publishing tools" },
      { label: "Trope Research", path: "/publishing/trope-research", icon: <Tags className="w-4 h-4" />, hint: "What sells in your niche" },
      { label: "Blurb Generator", path: "/publishing/blurbs", icon: <ScrollText className="w-4 h-4" />, hint: "Back-cover copy, three ways" },
      { label: "Titles & Keywords", path: "/publishing/titles-keywords", icon: <Tags className="w-4 h-4" />, hint: "KDP titles, keywords, categories" },
    ],
  },
];

function NavDropdown({ section, location }: { section: NavSection; location: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isActive = section.activePaths.some(p => location.startsWith(p));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-medium transition-colors font-serif tracking-wide",
          isActive
            ? "text-brass bg-white/5"
            : "text-leather-foreground/75 hover:text-leather-foreground hover:bg-white/5"
        )}
      >
        {section.icon}
        {section.label}
        <ChevronDown className={cn("w-3 h-3 transition-transform opacity-60", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 bookplate rounded-sm py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="catalog-label text-[11px] px-4 pb-1.5">{section.label}</p>
          <div className="library-rule mx-3 mb-1.5" />
          {section.items.map(item => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-start gap-2.5 px-4 py-2 text-sm no-underline transition-colors",
                location === item.path || (item.path !== "/forge" && location.startsWith(item.path + "/")) ||
                (item.path === "/forge" && location.startsWith("/forge") && !location.startsWith("/forge/quick-feedback"))
                  ? "text-primary bg-primary/5"
                  : "text-foreground/80 hover:text-foreground hover:bg-accent/60"
              )}
            >
              <span className="text-brass mt-0.5 shrink-0">{item.icon}</span>
              <span className="min-w-0">
                <span className="font-medium block">{item.label}</span>
                {item.hint && <span className="text-xs text-muted-foreground block truncate">{item.hint}</span>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface LayoutProps {
  children: React.ReactNode;
  fullScreen?: boolean;
  /** Render children edge-to-edge (no centered container) — used by Forge pages with their own sidebar */
  fullBleed?: boolean;
}

export default function Layout({ children, fullScreen = false, fullBleed = false }: LayoutProps) {
  const [location] = useLocation();

  const isDesk = location.startsWith("/my-work");

  return (
    <div className={cn("bg-background text-foreground font-sans", fullScreen ? "h-screen flex flex-col" : "min-h-screen")}>
      <header className="leather-panel sticky top-0 z-50">
        <div className="container max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 no-underline group">
              <Lamp className="w-5 h-5 text-brass group-hover:opacity-80 transition-opacity" />
              <span className="font-serif font-semibold text-lg tracking-wide gilded hidden sm:inline">
                WriteMaster
              </span>
            </Link>

            <nav className="flex items-center gap-0.5">
              <Link
                href="/my-work"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-medium transition-colors no-underline font-serif tracking-wide",
                  isDesk
                    ? "text-brass bg-white/5"
                    : "text-leather-foreground/75 hover:text-leather-foreground hover:bg-white/5"
                )}
              >
                <Library className="w-3.5 h-3.5" />
                The Desk
              </Link>
              {SECTIONS.map(section => (
                <NavDropdown key={section.label} section={section} location={location} />
              ))}
            </nav>
          </div>
        </div>
      </header>

      {fullScreen ? (
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      ) : fullBleed ? (
        <>{children}</>
      ) : (
        <main className="container max-w-5xl mx-auto px-4 py-8 md:py-12">
          {children}
        </main>
      )}
    </div>
  );
}
