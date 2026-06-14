import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Loader2, ArrowRight, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PipelineStepDef {
  id: number;
  name: string;
  desc: string;
  model?: "cheap" | "powerful";
}

interface StepResult {
  step: number;
  name: string;
  preview: string;
}

interface PipelineRunnerProps {
  title: string;
  subtitle?: string;
  steps: PipelineStepDef[];
  runStepFn: () => Promise<{ step_completed: number; step_name: string; output_preview: string; current_step: number; is_complete: boolean }>;
  initialStep?: number;
  isAlreadyComplete?: boolean;
  onComplete: () => void;
  completeLabel?: string;
  children?: React.ReactNode; // sidebar slot
}

export default function PipelineRunner({
  title,
  subtitle,
  steps,
  runStepFn,
  initialStep = 0,
  isAlreadyComplete = false,
  onComplete,
  completeLabel = "View Results",
  children,
}: PipelineRunnerProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [isComplete, setIsComplete] = useState(isAlreadyComplete);
  const [expandedPreviews, setExpandedPreviews] = useState<Set<number>>(new Set());
  const autoRunRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  const togglePreview = (step: number) => {
    setExpandedPreviews(prev => {
      const next = new Set(prev);
      next.has(step) ? next.delete(step) : next.add(step);
      return next;
    });
  };

  const runNextStep = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setError(null);
    try {
      const data = await runStepFn();
      setStepResults(prev => [...prev, { step: data.step_completed, name: data.step_name, preview: data.output_preview }]);
      setCurrentStep(data.current_step);
      if (data.is_complete) {
        setIsComplete(true);
        setAutoRun(false);
        autoRunRef.current = false;
      }
    } catch (err: any) {
      setError(err.message ?? "Step failed");
      setAutoRun(false);
      autoRunRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, runStepFn]);

  useEffect(() => { autoRunRef.current = autoRun; }, [autoRun]);

  useEffect(() => {
    if (autoRunRef.current && !isProcessing && !isComplete && !error) {
      const t = setTimeout(() => { if (autoRunRef.current) runNextStep(); }, 400);
      return () => clearTimeout(t);
    }
  }, [isProcessing, autoRun, isComplete, error, runNextStep]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [currentStep, stepResults]);

  const progress = Math.round((currentStep / steps.length) * 100);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex-1 w-full space-y-6">
          {/* Header */}
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-serif font-bold text-foreground">{title}</h2>
              {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            <span className="text-4xl font-light text-primary">{isComplete ? "100" : progress}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
            <div
              className="h-full bg-primary transition-all duration-700 ease-in-out"
              style={{ width: `${isComplete ? 100 : progress}%` }}
            />
          </div>

          {/* Step list */}
          <Card className="border-border/60 shadow-md">
            <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Pipeline Steps</span>
                {isProcessing && (
                  <span className="text-xs font-mono text-primary animate-pulse flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> PROCESSING
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div ref={listRef} className="h-[460px] overflow-y-auto p-4 flex flex-col gap-1 relative">
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none z-10" />
                {steps.map((step) => {
                  const isPast = step.id < currentStep;
                  const isCurrent = step.id === currentStep;
                  const isFuture = step.id > currentStep;
                  const result = stepResults.find(r => r.step === step.id);
                  const isExpanded = expandedPreviews.has(step.id);

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-start gap-4 p-3 rounded-md transition-all duration-300",
                        isCurrent && "bg-primary/5 border border-primary/20",
                        isPast && "opacity-75",
                        isFuture && "opacity-35"
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={cn("font-medium text-sm", isCurrent ? "text-primary" : "text-foreground")}>
                            {step.name}
                          </h4>
                          {step.model && (
                            <Badge variant="outline" className="text-xs h-4 px-1.5 font-normal">
                              {step.model === "powerful" ? "Sonnet" : "Haiku"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                        {result && (
                          <div className="mt-2">
                            <button
                              onClick={() => togglePreview(step.id)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {isExpanded ? "Hide output" : "Show output"}
                            </button>
                            {isExpanded && (
                              <div className="mt-1 text-xs font-mono bg-muted/50 p-2 rounded text-muted-foreground whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                                {result.preview}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <Button variant="outline" size="sm" onClick={() => { setError(null); runNextStep(); }} className="shrink-0">
                Retry
              </Button>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-4">
            {!isComplete ? (
              !autoRun ? (
                <>
                  <Button onClick={runNextStep} disabled={isProcessing} className="flex-1" variant="outline">
                    {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</> : "Run Next Step"}
                  </Button>
                  <Button
                    onClick={() => { setAutoRun(true); if (!isProcessing) runNextStep(); }}
                    disabled={isProcessing}
                    className="flex-1 gap-2"
                  >
                    Auto-Run All <ArrowRight className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button onClick={() => { setAutoRun(false); autoRunRef.current = false; }} variant="destructive" className="w-full">
                  Pause Pipeline
                </Button>
              )
            ) : (
              <Button onClick={onComplete} className="w-full gap-2 bg-green-700 hover:bg-green-800 text-white">
                {completeLabel}
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {children && (
          <div className="w-full md:w-64 shrink-0 space-y-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
