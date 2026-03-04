import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ChapterAnalyzer from "@/pages/ChapterAnalyzer";
import Books from "@/pages/Books";
import BookWriter from "@/pages/BookWriter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chapter-analyzer" component={ChapterAnalyzer} />
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