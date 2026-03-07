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
