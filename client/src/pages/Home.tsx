import { useState } from "react";
import StoryInit from "@/components/StoryInit";
import StoryPipeline from "@/components/StoryPipeline";
import StoryResult from "@/components/StoryResult";

export type ViewState = "init" | "pipeline" | "result";

export default function Home() {
  const [view, setView] = useState<ViewState>("init");
  const [brainDump, setBrainDump] = useState("");
  const [genre, setGenre] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);

  const handleStart = (dump: string, selectedGenre: string) => {
    setBrainDump(dump);
    setGenre(selectedGenre);
    setProjectId("mock-uuid-1234");
    setView("pipeline");
  };

  const handlePipelineComplete = () => {
    setView("result");
  };

  const handleReset = () => {
    setBrainDump("");
    setGenre("");
    setProjectId(null);
    setView("init");
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2" onClick={handleReset} role="button" tabIndex={0}>
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center text-primary-foreground font-serif font-bold text-xl leading-none">
              S
            </div>
            <h1 className="font-serif font-semibold text-xl tracking-tight">StoryDossier</h1>
          </div>
          {view !== "init" && (
            <button 
              onClick={handleReset}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-new-project"
            >
              New Project
            </button>
          )}
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 md:py-12">
        {view === "init" && <StoryInit onStart={handleStart} />}
        {view === "pipeline" && <StoryPipeline onComplete={handlePipelineComplete} genre={genre} />}
        {view === "result" && <StoryResult />}
      </main>
    </div>
  );
}
