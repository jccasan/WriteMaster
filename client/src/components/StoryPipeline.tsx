import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2, ArrowRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const PIPELINE_STEPS = [
  { id: 0, name: "Project Initialization", desc: "Setting up workspace" },
  { id: 1, name: "Subgenre Detection", desc: "Analyzing tropes and identifying specific niche" },
  { id: 2, name: "Pitch Generation", desc: "Brainstorming 5 high-concept hooks" },
  { id: 3, name: "Best Pitch Selection", desc: "Evaluating commercial viability" },
  { id: 4, name: "Pitch Extraction", desc: "Isolating the winning concept" },
  { id: 5, name: "Story Dossier Draft", desc: "Expanding world, characters, and plot beats" },
  { id: 6, name: "Emotional & Theme Check", desc: "Analyzing resonance and character arcs" },
  { id: 7, name: "Character Name Check", desc: "Replacing generic or AI-sounding names" },
  { id: 8, name: "Dossier Revision I", desc: "Implementing emotional and name improvements" },
  { id: 9, name: "Logic & Plausibility Check", desc: "Reviewing timeline, rules, and stakes" },
  { id: 10, name: "Final Polish", desc: "Applying logic fixes for final dossier" },
];

// Mock delays for visual effect
const MOCK_DELAYS = [800, 1200, 2500, 2000, 800, 3000, 2000, 1500, 2500, 2000, 2000];

interface StoryPipelineProps {
  onComplete: () => void;
  genre: string;
}

export default function StoryPipeline({ onComplete, genre }: StoryPipelineProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoRun, setAutoRun] = useState(false);

  const runNextStep = () => {
    if (currentStep >= PIPELINE_STEPS.length) {
      onComplete();
      return;
    }

    setIsProcessing(true);
    
    // Simulate processing time
    setTimeout(() => {
      setCurrentStep(prev => prev + 1);
      setIsProcessing(false);
    }, MOCK_DELAYS[currentStep] || 1000);
  };

  // Handle auto-run
  useEffect(() => {
    if (autoRun && !isProcessing && currentStep < PIPELINE_STEPS.length) {
      runNextStep();
    } else if (autoRun && currentStep >= PIPELINE_STEPS.length) {
      onComplete();
    }
  }, [autoRun, isProcessing, currentStep, onComplete]);

  const progressPercentage = Math.round((currentStep / PIPELINE_STEPS.length) * 100);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Main Process Area */}
        <div className="flex-1 w-full space-y-6">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="text-3xl font-serif font-bold text-foreground">Pipeline Execution</h2>
              <p className="text-muted-foreground mt-1">Refining {genre.replace('_', ' ')} concept</p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-light text-primary">{progressPercentage}%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
            <div 
              className="h-full bg-primary transition-all duration-700 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <Card className="border-border/60 shadow-md">
            <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Active Operation</span>
                {isProcessing && <span className="text-xs font-mono text-primary animate-pulse flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> PROCESSING</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px] overflow-y-auto p-4 flex flex-col gap-1 relative">
                {/* Visual fading gradient at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none z-10" />
                
                {PIPELINE_STEPS.map((step, index) => {
                  const isPast = index < currentStep;
                  const isCurrent = index === currentStep;
                  const isFuture = index > currentStep;

                  return (
                    <div 
                      key={step.id}
                      className={cn(
                        "flex items-start gap-4 p-3 rounded-md transition-all duration-300",
                        isCurrent && "bg-primary/5 border border-primary/20",
                        isPast && "opacity-70",
                        isFuture && "opacity-40"
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isPast ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : isCurrent ? (
                          isProcessing ? (
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                          ) : (
                            <Circle className="w-5 h-5 text-primary fill-primary/20" />
                          )
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={cn(
                          "font-medium",
                          isCurrent ? "text-primary" : "text-foreground"
                        )}>
                          Step {index}: {step.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">{step.desc}</p>
                        
                        {/* Mock output preview for completed steps */}
                        {isPast && index === 2 && (
                          <div className="mt-2 text-xs font-mono bg-muted/50 p-2 rounded text-muted-foreground line-clamp-2">
                            Pitch 1: A disgraced detective...
                            Pitch 2: The last surviving member...
                          </div>
                        )}
                        {isPast && index === 4 && (
                          <div className="mt-2 text-xs font-mono bg-muted/50 p-2 rounded text-muted-foreground line-clamp-2">
                            BEST PITCH: 3 - Strongest emotional hook...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            {!autoRun ? (
              <>
                <Button 
                  onClick={runNextStep} 
                  disabled={isProcessing || currentStep >= PIPELINE_STEPS.length}
                  className="flex-1"
                  variant="outline"
                  data-testid="button-step-next"
                >
                  {isProcessing ? "Processing..." : "Run Next Step manually"}
                </Button>
                <Button 
                  onClick={() => setAutoRun(true)} 
                  disabled={isProcessing || currentStep >= PIPELINE_STEPS.length}
                  className="flex-1 gap-2"
                  data-testid="button-auto-run"
                >
                  Auto-Run Pipeline <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => setAutoRun(false)} 
                variant="destructive"
                className="w-full"
                data-testid="button-pause-run"
              >
                Pause Pipeline
              </Button>
            )}
            
            {currentStep >= PIPELINE_STEPS.length && (
              <Button 
                onClick={onComplete}
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-view-dossier"
              >
                <FileText className="w-4 h-4" /> View Final Dossier
              </Button>
            )}
          </div>
        </div>

        {/* Side Panel Info */}
        <div className="w-full md:w-64 space-y-4 shrink-0">
          <Card className="bg-muted/30 border-none shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Model Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-foreground">GPT-4o (Complex)</span>
                  <span className="text-primary font-mono">4 tasks</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-2/5" />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-foreground">GPT-4o-Mini (Fast)</span>
                  <span className="text-accent-foreground font-mono">6 tasks</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent-foreground/50 w-3/5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}