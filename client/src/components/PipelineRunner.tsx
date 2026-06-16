import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Circle, Loader2, AlertCircle,
  ChevronDown, ChevronUp, Pause, Play, Sparkles
} from "lucide-react";
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
  children?: React.ReactNode;
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
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [isComplete, setIsComplete] = useState(isAlreadyComplete);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedPreviews, setExpandedPreviews] = useState<Set<number>>(new Set());
  const [currentStepName, setCurrentStepName] = useState(steps[initialStep]?.name ?? "");

  const pausedRef = useRef(false);
  const runningRef = useRef(false);

  const togglePreview = (step: number) => {
    setExpandedPreviews(prev => {
      const next = new Set(prev);
      next.has(step) ? next.delete(step) : next.add(step);
      return next;
    });
  };

  const runNextStep = useCallback(async () => {
    if (isProcessing || pausedRef.current) return;
    setIsProcessing(true);
    setError(null);
    try {
      const data = await runStepFn();
      setStepResults(prev => [...prev, {
        step: data.step_completed,
        name: data.step_name,
        preview: data.output_preview,
      }]);
      setCurrentStep(data.current_step);
      setCurrentStepName(steps[data.current_step]?.name ?? data.step_name);
      if (data.is_complete) {
        setIsComplete(true);
        runningRef.current = false;
      }
    } catch (err: any) {
      setError(err.message ?? "Step failed");
      runningRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, runStepFn, steps]);

  // Auto-chain: run next step as soon as current finishes
  useEffect(() => {
    if (!isProcessing && !isComplete && !error && runningRef.current && !pausedRef.current) {
      const t = setTimeout(runNextStep, 300);
      return () => clearTimeout(t);
    }
  }, [isProcessing, isComplete, error, runNextStep]);

  // Auto-start on mount
  useEffect(() => {
    if (!isAlreadyComplete && !runningRef.current) {
      runningRef.current = true;
      const t = setTimeout(runNextStep, 500);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePause = () => {
    pausedRef.current = true;
    setPaused(true);
  };

  const handleResume = () => {
    pausedRef.current = false;
    setPaused(false);
    runningRef.current = true;
    runNextStep();
  };

  const progress = isComplete ? 100 : Math.round((currentStep / steps.length) * 100);

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif font-bold">{title}</h2>
        {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
      </div>

      {/* Main progress card */}
      <div className={cn(
        "rounded-xl border p-6 space-y-4 transition-colors",
        isComplete ? "border-green-600/30 bg-green-600/5" :
        error ? "border-destructive/30 bg-destructive/5" :
        "border-primary/20 bg-primary/5"
      )}>
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {isComplete ? "Complete" : paused ? "Paused" : "Running..."}
            </span>
            <span className={cn(
              "font-mono font-bold text-lg",
              isComplete ? "text-green-600" : "text-primary"
            )}>
              {progress}%
            </span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-in-out",
                isComplete ? "bg-green-600" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current step name */}
        {!isComplete && !error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            ) : paused ? (
              <Pause className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
            )}
            <span>
              {isProcessing ? `Running: ${currentStepName}` :
               paused ? `Paused at: ${currentStepName}` :
               `Next: ${currentStepName}`}
            </span>
            <span className="text-xs text-muted-foreground/60 ml-auto">
              {currentStep}/{steps.length} steps
            </span>
          </div>
        )}

        {isComplete && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>All {steps.length} steps complete</span>
          </div>
        )}

        {/* Controls */}
        {isComplete ? (
          <Button
            onClick={onComplete}
            className="w-full bg-green-700 hover:bg-green-800 text-white gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {completeLabel}
          </Button>
        ) : error ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => { setError(null); handleResume(); }}
            >
              Retry
            </Button>
          </div>
        ) : paused ? (
          <Button onClick={handleResume} className="w-full gap-2">
            <Play className="w-4 h-4" /> Resume
          </Button>
        ) : (
          <Button onClick={handlePause} variant="outline" className="w-full gap-2">
            <Pause className="w-4 h-4" /> Pause
          </Button>
        )}
      </div>

      {/* Show/hide details toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <div className="flex-1 h-px bg-border/40" />
        {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>{showDetails ? "Hide" : "Show"} step details</span>
        {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <div className="flex-1 h-px bg-border/40" />
      </button>

      {/* Step details (collapsed by default) */}
      {showDetails && (
        <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {steps.map(step => {
            const isPast = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isFuture = step.id > currentStep;
            const result = stepResults.find(r => r.step === step.id);
            const isExpanded = expandedPreviews.has(step.id);

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-all",
                  isCurrent && "bg-primary/5 border border-primary/20",
                  isPast && "opacity-60",
                  isFuture && "opacity-30"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {isPast ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : isCurrent && isProcessing ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <Circle className={cn("w-4 h-4", isCurrent ? "text-primary fill-primary/20" : "text-muted-foreground")} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-medium", isCurrent ? "text-primary" : "text-foreground")}>
                      {step.name}
                    </span>
                    {step.model && (
                      <Badge variant="outline" className="text-xs h-4 px-1.5">
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
      )}

      {/* Sidebar */}
      {children && (
        <div className="space-y-4">{children}</div>
      )}
    </div>
  );
}
