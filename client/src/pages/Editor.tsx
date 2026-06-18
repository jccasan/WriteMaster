import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  FileText,
  Layers,
  MessageSquare,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Gauge,
  Zap,
  Copy,
  PenTool,
  Eye,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";

const MODULES = [
  {
    id: "editorial_assessment",
    label: "Editorial Assessment",
    description: "High-level editorial overview: strengths, weaknesses, story state tracking",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: "developmental_editor",
    label: "Developmental Edit",
    description: "Narrative craft: pacing, stakes, causality, character arcs, scene construction",
    icon: <Layers className="w-5 h-5" />,
  },
  {
    id: "copy_editor",
    label: "Copy Edit",
    description: "Prose clarity, voice consistency, dialogue, clichés, show-don't-tell",
    icon: <PenTool className="w-5 h-5" />,
  },
  {
    id: "proofreader",
    label: "Proofread",
    description: "Grammar, punctuation, and formatting errors",
    icon: <Search className="w-5 h-5" />,
  },
  {
    id: "beta_reader",
    label: "Beta Reader",
    description: "Simulated reader reaction: hooks, confusion points, emotional response",
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    id: "scene_scanner",
    label: "Scene Scanner",
    description: "Scene-by-scene breakdown: purpose, conflict, change, necessity rating",
    icon: <Eye className="w-5 h-5" />,
  },
  {
    id: "addiction_loop",
    label: "Addiction Loop Audit",
    description: "Scores each chapter 0-12: Stakes, Big Question, Head Fake, Re-hook. Flags weak elements with specific fixes.",
    icon: <Sparkles className="w-5 h-5" />,
  },
];

const BETA_PROFILES = [
  { id: "genre_enthusiast", label: "Genre Enthusiast" },
  { id: "casual_commercial", label: "Casual Reader" },
  { id: "emotion_first", label: "Emotion-First" },
  { id: "pacing_sensitive", label: "Pacing-Sensitive" },
  { id: "critical_craft", label: "Critical Craft" },
];

const GENRES = [
  "General Fiction", "Contemporary Thriller", "Mystery", "Romance",
  "Science Fiction", "Fantasy", "Horror", "Literary Fiction",
  "Historical Fiction", "Crime Fiction", "Young Adult",
];

function RatingBadge({ rating }: { rating: string }) {
  const colors: Record<string, string> = {
    strong: "bg-green-900/40 text-green-400 border-green-800/50",
    high: "bg-green-900/40 text-green-400 border-green-800/50",
    polished: "bg-green-900/40 text-green-400 border-green-800/50",
    consistent: "bg-green-900/40 text-green-400 border-green-800/50",
    essential: "bg-green-900/40 text-green-400 border-green-800/50",
    adequate: "bg-yellow-900/40 text-yellow-400 border-yellow-800/50",
    medium: "bg-yellow-900/40 text-yellow-400 border-yellow-800/50",
    mostly_consistent: "bg-yellow-900/40 text-yellow-400 border-yellow-800/50",
    useful_but_weak: "bg-yellow-900/40 text-yellow-400 border-yellow-800/50",
    weak: "bg-red-900/40 text-red-400 border-red-800/50",
    low: "bg-red-900/40 text-red-400 border-red-800/50",
    rough: "bg-red-900/40 text-red-400 border-red-800/50",
    needs_work: "bg-red-900/40 text-red-400 border-red-800/50",
    inconsistent: "bg-red-900/40 text-red-400 border-red-800/50",
    underperforming: "bg-red-900/40 text-red-400 border-red-800/50",
    redundant: "bg-red-900/40 text-red-400 border-red-800/50",
  };
  const clean = rating.toLowerCase().replace(/\s+/g, "_");
  return (
    <Badge variant="outline" className={cn("text-xs capitalize", colors[clean] || "border-gray-700 text-gray-400")}>
      {rating.replace(/_/g, " ")}
    </Badge>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    major: "bg-red-900/40 text-red-400 border-red-800/50",
    critical: "bg-red-900/40 text-red-400 border-red-800/50",
    moderate: "bg-yellow-900/40 text-yellow-400 border-yellow-800/50",
    minor: "bg-blue-900/40 text-blue-400 border-blue-800/50",
  };
  return (
    <Badge variant="outline" className={cn("text-xs capitalize", colors[severity] || "border-gray-700 text-gray-400")}>
      {severity}
    </Badge>
  );
}

function IssueList({ issues }: { issues: any[] }) {
  if (!issues || issues.length === 0) return null;
  return (
    <div className="space-y-2 mt-4">
      <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium">Issues ({issues.length})</h4>
      {issues.map((issue: any, i: number) => (
        <div key={i} className="border border-gray-800 rounded-lg p-3" data-testid={`issue-${i}`}>
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={issue.severity} />
            <span className="text-gray-200 text-sm font-medium">{issue.title}</span>
            <Badge variant="outline" className="border-gray-700 text-gray-500 text-[10px] ml-auto">{issue.type}</Badge>
          </div>
          {issue.description && <p className="text-gray-400 text-sm mt-1">{issue.description}</p>}
          {issue.evidence && issue.evidence.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {issue.evidence.map((e: string, j: number) => (
                <p key={j} className="text-gray-500 text-xs italic border-l-2 border-gray-700 pl-2">"{e}"</p>
              ))}
            </div>
          )}
          {issue.suggestion && (
            <p className="text-amber-400/70 text-sm mt-1.5 flex items-start gap-1.5">
              <Zap className="w-3 h-3 mt-0.5 shrink-0" />
              {issue.suggestion}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function EditorialResult({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      {result.overallImpression && (
        <div className="bg-gray-800/50 border border-gray-800 rounded-lg p-4">
          <h4 className="text-amber-300 text-xs uppercase tracking-wider font-medium mb-2">Overall Impression</h4>
          <p className="text-gray-300 text-sm leading-relaxed">{result.overallImpression}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {result.strengths?.length > 0 && (
          <div>
            <h4 className="text-green-400 text-xs uppercase tracking-wider font-medium mb-1">Strengths</h4>
            <ul className="space-y-1">
              {result.strengths.map((s: string, i: number) => (
                <li key={i} className="text-gray-300 text-sm flex items-start gap-1.5">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.weaknesses?.length > 0 && (
          <div>
            <h4 className="text-red-400 text-xs uppercase tracking-wider font-medium mb-1">Weaknesses</h4>
            <ul className="space-y-1">
              {result.weaknesses.map((w: string, i: number) => (
                <li key={i} className="text-gray-300 text-sm flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {result.continuityNotes?.length > 0 && (
        <div>
          <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-1">Continuity Notes</h4>
          <ul className="space-y-0.5">{result.continuityNotes.map((n: string, i: number) => <li key={i} className="text-gray-400 text-sm">{n}</li>)}</ul>
        </div>
      )}
      {result.unresolvedQuestions?.length > 0 && (
        <div>
          <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-1">Unresolved Questions</h4>
          <ul className="space-y-0.5">{result.unresolvedQuestions.map((q: string, i: number) => <li key={i} className="text-gray-400 text-sm">{q}</li>)}</ul>
        </div>
      )}
      <IssueList issues={result.issues} />
    </div>
  );
}

function DevEditResult({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      {(result.pacing || result.stakes || result.causality) && (
        <div className="grid grid-cols-3 gap-3">
          {result.pacing && (
            <div className="border border-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1"><Gauge className="w-3 h-3 text-gray-500" /><span className="text-gray-500 text-xs">Pacing</span></div>
              <RatingBadge rating={result.pacing.rating} />
              {result.pacing.notes && <p className="text-gray-400 text-xs mt-1.5">{result.pacing.notes}</p>}
            </div>
          )}
          {result.stakes && (
            <div className="border border-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1"><Zap className="w-3 h-3 text-gray-500" /><span className="text-gray-500 text-xs">Stakes</span></div>
              <RatingBadge rating={result.stakes.rating} />
              {result.stakes.notes && <p className="text-gray-400 text-xs mt-1.5">{result.stakes.notes}</p>}
            </div>
          )}
          {result.causality && (
            <div className="border border-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1"><Sparkles className="w-3 h-3 text-gray-500" /><span className="text-gray-500 text-xs">Causality</span></div>
              <RatingBadge rating={result.causality.rating} />
              {result.causality.notes && <p className="text-gray-400 text-xs mt-1.5">{result.causality.notes}</p>}
            </div>
          )}
        </div>
      )}
      {result.characterArcs?.length > 0 && (
        <div>
          <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-2">Character Arcs</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {result.characterArcs.map((arc: any, i: number) => (
              <div key={i} className="border border-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-amber-300 text-sm font-medium">{arc.character}</span>
                  {arc.strength && <RatingBadge rating={arc.strength} />}
                </div>
                {arc.arc && <p className="text-gray-400 text-sm">{arc.arc}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {result.sceneByScene?.length > 0 && (
        <div>
          <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-2">Scene Breakdown</h4>
          <div className="space-y-2">
            {result.sceneByScene.map((s: any, i: number) => (
              <div key={i} className="border border-gray-800 rounded-lg p-3 flex items-start gap-3">
                <span className="text-amber-400/60 text-xs font-mono mt-0.5">S{s.sceneIndex + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-gray-200 text-sm font-medium">{s.purpose}</span>
                    <RatingBadge rating={s.rating} />
                  </div>
                  <p className="text-gray-500 text-xs">{s.conflict}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {s.change ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400/50" />}
                    <span className="text-gray-500 text-xs">{s.change ? "Change occurred" : "No change"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {result.thematicNotes?.length > 0 && (
        <div>
          <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-1">Thematic Notes</h4>
          {result.thematicNotes.map((n: string, i: number) => <p key={i} className="text-gray-400 text-sm italic">{n}</p>)}
        </div>
      )}
      <IssueList issues={result.issues} />
    </div>
  );
}

function CopyEditResult({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {result.proseQuality && (
          <div className="border border-gray-800 rounded-lg p-3">
            <span className="text-gray-500 text-xs">Prose Quality</span>
            <div className="mt-1"><RatingBadge rating={result.proseQuality.rating} /></div>
            {result.proseQuality.notes && <p className="text-gray-400 text-xs mt-1.5">{result.proseQuality.notes}</p>}
          </div>
        )}
        {result.voiceConsistency && (
          <div className="border border-gray-800 rounded-lg p-3">
            <span className="text-gray-500 text-xs">Voice Consistency</span>
            <div className="mt-1"><RatingBadge rating={result.voiceConsistency.rating} /></div>
            {result.voiceConsistency.notes && <p className="text-gray-400 text-xs mt-1.5">{result.voiceConsistency.notes}</p>}
          </div>
        )}
      </div>
      {result.dialogueNotes?.length > 0 && (
        <div>
          <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-1">Dialogue Notes</h4>
          <ul className="space-y-0.5">{result.dialogueNotes.map((n: string, i: number) => <li key={i} className="text-gray-300 text-sm">{n}</li>)}</ul>
        </div>
      )}
      {result.cliches?.length > 0 && (
        <div>
          <h4 className="text-red-400 text-xs uppercase tracking-wider font-medium mb-1">Clichés Found</h4>
          <ul className="space-y-0.5">{result.cliches.map((c: string, i: number) => <li key={i} className="text-gray-400 text-sm italic border-l-2 border-red-800/30 pl-2">{c}</li>)}</ul>
        </div>
      )}
      {result.showDontTell?.length > 0 && (
        <div>
          <h4 className="text-yellow-400 text-xs uppercase tracking-wider font-medium mb-1">Show Don't Tell</h4>
          <ul className="space-y-0.5">{result.showDontTell.map((s: string, i: number) => <li key={i} className="text-gray-400 text-sm italic border-l-2 border-yellow-800/30 pl-2">{s}</li>)}</ul>
        </div>
      )}
      <IssueList issues={result.issues} />
    </div>
  );
}

function ProofreadResult({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      {result.grammarIssues?.length > 0 && (
        <div>
          <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-2">Grammar ({result.grammarIssues.length})</h4>
          <div className="space-y-1.5">
            {result.grammarIssues.map((g: any, i: number) => (
              <div key={i} className="border border-gray-800 rounded-lg p-2.5 text-sm">
                <p className="text-red-300 italic">"{g.text}"</p>
                <p className="text-gray-400 text-xs mt-0.5">{g.issue}</p>
                <p className="text-green-400/80 text-xs mt-0.5">→ {g.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {result.punctuationIssues?.length > 0 && (
        <div>
          <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-2">Punctuation ({result.punctuationIssues.length})</h4>
          <div className="space-y-1.5">
            {result.punctuationIssues.map((p: any, i: number) => (
              <div key={i} className="border border-gray-800 rounded-lg p-2.5 text-sm">
                <p className="text-red-300 italic">"{p.text}"</p>
                <p className="text-gray-400 text-xs mt-0.5">{p.issue}</p>
                <p className="text-green-400/80 text-xs mt-0.5">→ {p.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {result.formattingNotes?.length > 0 && (
        <div>
          <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-1">Formatting Notes</h4>
          <ul className="space-y-0.5">{result.formattingNotes.map((n: string, i: number) => <li key={i} className="text-gray-400 text-sm">{n}</li>)}</ul>
        </div>
      )}
      <IssueList issues={result.issues} />
    </div>
  );
}

function BetaReaderResult({ result }: { result: any }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-amber-300 font-semibold text-sm">{result.profileName}</h4>
        {result.wouldKeepReading !== undefined && (
          <div className="flex items-center gap-1.5">
            {result.wouldKeepReading ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
            <span className={cn("text-xs font-medium", result.wouldKeepReading ? "text-green-400" : "text-red-400")}>
              {result.wouldKeepReading ? "Would keep reading" : "Might stop reading"}
            </span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {result.hookedAt && <div><span className="text-gray-500 text-xs uppercase tracking-wider">Hooked at</span><p className="text-gray-300 mt-0.5">{result.hookedAt}</p></div>}
        {result.attentionSaggedAt && <div><span className="text-gray-500 text-xs uppercase tracking-wider">Attention sagged</span><p className="text-gray-300 mt-0.5">{result.attentionSaggedAt}</p></div>}
        {result.favoriteCharacterReaction && <div className="md:col-span-2"><span className="text-gray-500 text-xs uppercase tracking-wider">Favorite character reaction</span><p className="text-gray-300 mt-0.5">{result.favoriteCharacterReaction}</p></div>}
        {result.strongestMoments?.length > 0 && (
          <div><span className="text-gray-500 text-xs uppercase tracking-wider">Strongest moments</span>
            <ul className="mt-1 space-y-0.5">{result.strongestMoments.map((m: string, j: number) => <li key={j} className="text-gray-300 flex items-start gap-1.5"><Star className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" /><span>{m}</span></li>)}</ul>
          </div>
        )}
        {result.confusionPoints?.length > 0 && (
          <div><span className="text-gray-500 text-xs uppercase tracking-wider">Confusion points</span>
            <ul className="mt-1 space-y-0.5">{result.confusionPoints.map((m: string, j: number) => <li key={j} className="text-gray-300 flex items-start gap-1.5"><AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" /><span>{m}</span></li>)}</ul>
          </div>
        )}
        {result.leastCredibleMoments?.length > 0 && (
          <div className="md:col-span-2"><span className="text-gray-500 text-xs uppercase tracking-wider">Least credible moments</span>
            <ul className="mt-1 space-y-0.5">{result.leastCredibleMoments.map((m: string, j: number) => <li key={j} className="text-red-300 flex items-start gap-1.5"><XCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" /><span>{m}</span></li>)}</ul>
          </div>
        )}
        {result.finalEmotionalReaction && <div className="md:col-span-2"><span className="text-gray-500 text-xs uppercase tracking-wider">Final emotional reaction</span><p className="text-gray-300 mt-0.5 italic">"{result.finalEmotionalReaction}"</p></div>}
        {result.recommendation && <div className="md:col-span-2"><span className="text-gray-500 text-xs uppercase tracking-wider">Recommendation</span><p className="text-gray-300 mt-0.5">{result.recommendation}</p></div>}
        {result.mightQuitAt && <div className="md:col-span-2"><span className="text-gray-500 text-xs uppercase tracking-wider">Might quit at</span><p className="text-red-300 mt-0.5">{result.mightQuitAt}</p></div>}
      </div>
    </div>
  );
}

function SceneScanResult({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      {result.scenes?.length > 0 && (
        <div>
          <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-2">Scenes ({result.scenes.length})</h4>
          <div className="space-y-2">
            {result.scenes.map((s: any, i: number) => (
              <div key={i} className="border border-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-400/60 text-xs font-mono">S{s.sceneIndex + 1}</span>
                  <span className="text-gray-200 text-sm font-medium flex-1">{s.purpose}</span>
                  <RatingBadge rating={s.necessityRating} />
                </div>
                <p className="text-gray-500 text-xs mb-1.5">{s.conflict}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-gray-600">Plot:</span> <span className="text-gray-400">{s.plotValue}</span></div>
                  <div><span className="text-gray-600">Character:</span> <span className="text-gray-400">{s.characterValue}</span></div>
                  <div><span className="text-gray-600">Theme:</span> <span className="text-gray-400">{s.thematicValue}</span></div>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  {s.changeOccurred ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400/50" />}
                  <span className="text-gray-500 text-xs">{s.changeOccurred ? "Change occurred" : "No change"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {result.redundantScenes?.length > 0 && (
        <div>
          <h4 className="text-red-400 text-xs uppercase tracking-wider font-medium mb-1">Potentially Redundant</h4>
          <ul className="space-y-0.5">{result.redundantScenes.map((r: string, i: number) => <li key={i} className="text-gray-400 text-sm">{r}</li>)}</ul>
        </div>
      )}
      <IssueList issues={result.issues} />
    </div>
  );
}

function AddictionLoopResult({ result }: { result: any }) {
  const scores = result.chapter_scores ?? [];
  const score = scores[0]?.score;
  if (!score) return <p className="text-sm text-muted-foreground">No results.</p>;

  const ELEMENT_LABELS: Record<string, string> = {
    stakes: "Stakes", big_question: "Big Question",
    head_fake: "Head Fake", re_hook: "Re-hook",
  };

  const ratingColor = {
    addictive: "text-green-600 bg-green-600/10 border-green-600/30",
    engaging: "text-primary bg-primary/10 border-primary/30",
    flat: "text-amber-600 bg-amber-600/10 border-amber-600/30",
    vending_machine: "text-destructive bg-destructive/10 border-destructive/30",
  }[score.rating as string] ?? "";

  return (
    <div className="space-y-6">
      {/* Overall score */}
      <div className={`border rounded-xl p-5 ${ratingColor}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg capitalize">{score.rating?.replace("_", " ")}</h3>
          <span className="text-3xl font-bold font-mono">{score.total}/12</span>
        </div>
        <div className="h-2 bg-black/10 rounded-full overflow-hidden">
          <div className="h-full bg-current rounded-full transition-all" style={{ width: `${(score.total / 12) * 100}%` }} />
        </div>
      </div>

      {/* Element breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {(["stakes", "big_question", "head_fake", "re_hook"] as const).map(key => (
          <div key={key} className="border border-border/60 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{ELEMENT_LABELS[key]}</span>
              <span className={`text-sm font-bold ${score[key] <= 1 ? "text-destructive" : score[key] === 3 ? "text-green-600" : "text-primary"}`}>
                {score[key]}/3
              </span>
            </div>
            <p className="text-xs text-foreground/80">{score[`${key}_notes`]}</p>
            {key === "big_question" && score.big_question_quote !== "MISSING" && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">"{score.big_question_quote}"</p>
            )}
            {key === "re_hook" && score.re_hook_quote !== "MISSING" && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">"{score.re_hook_quote}"</p>
            )}
          </div>
        ))}
      </div>

      {/* Priority fixes */}
      {score.priority_fixes?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">Priority Fixes</h4>
          <ol className="space-y-2">
            {score.priority_fixes.map((fix: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary font-mono shrink-0 mt-0.5">{i + 1}.</span>
                <span className="text-foreground/80">{fix}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function ResultRenderer({ moduleName, result }: { moduleName: string; result: any }) {
  switch (moduleName) {
    case "editorial_assessment": return <EditorialResult result={result} />;
    case "developmental_editor": return <DevEditResult result={result} />;
    case "copy_editor": return <CopyEditResult result={result} />;
    case "proofreader": return <ProofreadResult result={result} />;
    case "beta_reader": return <BetaReaderResult result={result} />;
    case "scene_scanner": return <SceneScanResult result={result} />;
    case "addiction_loop": return <AddictionLoopResult result={result} />;
    default: return <pre className="text-gray-300 text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>;
  }
}

export default function Editor() {
  const [text, setText] = useState("");
  const [selectedModule, setSelectedModule] = useState("editorial_assessment");
  const [genre, setGenre] = useState("General Fiction");
  const [context, setContext] = useState("");
  const [betaProfile, setBetaProfile] = useState("genre_enthusiast");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ module: string; result: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const analyze = async () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/editor/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          module: selectedModule,
          genre: genre.toLowerCase(),
          context: context || undefined,
          betaProfile: selectedModule === "beta_reader" ? betaProfile : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }
      setResult(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
    setAnalyzing(false);
  };

  const moduleLabel = MODULES.find(m => m.id === selectedModule)?.label || selectedModule;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto animate-in fade-in duration-300">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-editor-heading">Editor</h1>
          <p className="text-muted-foreground text-sm">Paste a chapter or passage and run any of the FORGE feedback modules to get instant AI analysis.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Your Text</label>
                <span className="text-xs text-muted-foreground">{wordCount.toLocaleString()} words</span>
              </div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your chapter, passage, or scene here..."
                className="min-h-[300px] font-serif text-sm leading-relaxed resize-y"
                data-testid="input-editor-text"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Genre</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  data-testid="select-genre"
                >
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {selectedModule === "beta_reader" && (
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Reader Profile</label>
                  <select
                    value={betaProfile}
                    onChange={(e) => setBetaProfile(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    data-testid="select-beta-profile"
                  >
                    {BETA_PROFILES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">&nbsp;</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowContext(!showContext)}
                  className="h-9 text-xs"
                  data-testid="button-toggle-context"
                >
                  {showContext ? "Hide" : "Add"} Context
                </Button>
              </div>
            </div>

            {showContext && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Previous Context (optional)</label>
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Briefly describe what happened before this passage (helps the AI understand continuity)..."
                  className="min-h-[80px] text-sm resize-y"
                  data-testid="input-context"
                />
              </div>
            )}

            <Button
              onClick={analyze}
              disabled={analyzing || !text.trim()}
              className="w-full gap-2"
              size="lg"
              data-testid="button-analyze"
            >
              {analyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with {moduleLabel}...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Run {moduleLabel}</>
              )}
            </Button>

            {error && (
              <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-4 text-red-300 text-sm" data-testid="text-error">
                {error}
              </div>
            )}

            {result && (
              <Card className="border-border/60" data-testid="result-panel">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-primary">{MODULES.find(m => m.id === result.module)?.icon}</span>
                    <h3 className="font-semibold text-foreground">{MODULES.find(m => m.id === result.module)?.label} Results</h3>
                  </div>
                  <ResultRenderer moduleName={result.module} result={result.result} />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground block mb-1">Feedback Module</label>
            {MODULES.map((mod) => (
              <button
                key={mod.id}
                onClick={() => setSelectedModule(mod.id)}
                disabled={analyzing}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-start gap-3",
                  selectedModule === mod.id
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/40 hover:border-border/80 hover:bg-muted/30"
                )}
                data-testid={`button-module-${mod.id}`}
              >
                <span className={cn("mt-0.5 shrink-0", selectedModule === mod.id ? "text-primary" : "text-muted-foreground")}>
                  {mod.icon}
                </span>
                <div>
                  <div className={cn("text-sm font-medium", selectedModule === mod.id ? "text-foreground" : "text-foreground/80")}>
                    {mod.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{mod.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
