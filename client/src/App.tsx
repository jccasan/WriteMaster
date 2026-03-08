import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import PipelineNew from "@/pages/PipelineNew";
import PipelineView from "@/pages/PipelineView";
import PipelineResult from "@/pages/PipelineResult";
import PipelineList from "@/pages/PipelineList";
import ChapterAnalyzer from "@/pages/ChapterAnalyzer";
import Books from "@/pages/Books";
import BookWriter from "@/pages/BookWriter";
import ChapterWriter from "@/pages/ChapterWriter";
import ForgeDashboard from "@/pages/forge/ForgeDashboard";
import ForgeProject from "@/pages/forge/ForgeProject";
import ForgeUpload from "@/pages/forge/ForgeUpload";
import ForgeAnalysis from "@/pages/forge/ForgeAnalysis";
import ForgeReports from "@/pages/forge/ForgeReports";
import ForgeReportDetail from "@/pages/forge/ForgeReportDetail";
import ForgeIssues from "@/pages/forge/ForgeIssues";
import ForgeCharacters from "@/pages/forge/ForgeCharacters";
import ForgeStructure from "@/pages/forge/ForgeStructure";
import ForgeScenes from "@/pages/forge/ForgeScenes";
import ForgeFactCheck from "@/pages/forge/ForgeFactCheck";
import ForgeBetaReaders from "@/pages/forge/ForgeBetaReaders";
import ForgeQuickFeedback from "@/pages/forge/ForgeQuickFeedback";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pipeline" component={PipelineList} />
      <Route path="/pipeline/new" component={PipelineNew} />
      <Route path="/pipeline/:id/result" component={PipelineResult} />
      <Route path="/pipeline/:id" component={PipelineView} />
      <Route path="/chapter-writer" component={ChapterWriter} />
      <Route path="/chapter-analyzer" component={ChapterAnalyzer} />
      <Route path="/chapter-analyzer/:id" component={ChapterAnalyzer} />
      <Route path="/books" component={Books} />
      <Route path="/book/:id" component={BookWriter} />
      <Route path="/forge" component={ForgeDashboard} />
      <Route path="/forge/project/:id" component={ForgeProject} />
      <Route path="/forge/project/:id/upload" component={ForgeUpload} />
      <Route path="/forge/project/:id/analyze" component={ForgeAnalysis} />
      <Route path="/forge/project/:id/reports" component={ForgeReports} />
      <Route path="/forge/report/:reportId" component={ForgeReportDetail} />
      <Route path="/forge/project/:id/issues" component={ForgeIssues} />
      <Route path="/forge/project/:id/characters" component={ForgeCharacters} />
      <Route path="/forge/project/:id/structure" component={ForgeStructure} />
      <Route path="/forge/project/:id/scenes" component={ForgeScenes} />
      <Route path="/forge/project/:id/fact-check" component={ForgeFactCheck} />
      <Route path="/forge/project/:id/beta-readers" component={ForgeBetaReaders} />
      <Route path="/forge/quick-feedback" component={ForgeQuickFeedback} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
