import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  MessageSquare,
  FileText,
  Layers,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  BookOpen,
  CheckCircle,
  XCircle,
  Star,
  Gauge,
  Zap,
  Link as LinkIcon,
  Anvil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";

interface BetaReader {
  profileName: string;
  profileDescription: string;
  hookedAt?: string;
  attentionSaggedAt?: string;
  confusionPoints?: string[];
  strongestMoments?: string[];
  leastCredibleMoments?: string[];
  favoriteCharacterReaction?: string;
  wouldKeepReading?: boolean;
  mightQuitAt?: string;
  finalEmotionalReaction?: string;
  recommendation?: string;
}

interface EditorialChunk {
  chunkIndex: number;
  startChapter: number;
  endChapter: number;
  overallImpression: string | null;
  strengths: string[];
  weaknesses: string[];
  continuityNotes: string[];
  unresolvedQuestions: string[];
  pacing: { rating: string; notes: string } | null;
  stakes: { rating: string; notes: string } | null;
  causality: { rating: string; notes: string } | null;
  characterArcs: { character: string; arc: string; strength: string }[];
  thematicNotes: string[];
}

interface IssueSummary {
  total: number;
  bySeverity: { major: number; moderate: number; minor: number };
  topIssues: { type: string; severity: string; title: string; description: string; suggestion: string }[];
}

interface Scene {
  chapterNumber: number;
  chapterTitle: string;
  sceneIndex: number;
  purpose: string;
  conflict: string;
  changeOccurred: boolean;
  valueRating: string;
}

interface ForgeProject {
  id: string;
  title: string;
  genre: string;
  updatedAt: string;
}

interface FeedbackData {
  projectTitle: string;
  noRevision?: boolean;
  betaReaders?: BetaReader[];
  editorialChunks?: EditorialChunk[];
  issues?: IssueSummary;
  scenes?: Scene[];
}

function RatingBadge({ rating }: { rating: string }) {
  const colors: Record<string, string> = {
    strong: "bg-green-900/40 text-green-400 border-green-800/50",
    high: "bg-green-900/40 text-green-400 border-green-800/50",
    adequate: "bg-yellow-900/40 text-yellow-400 border-yellow-800/50",
    medium: "bg-yellow-900/40 text-yellow-400 border-yellow-800/50",
    weak: "bg-red-900/40 text-red-400 border-red-800/50",
    low: "bg-red-900/40 text-red-400 border-red-800/50",
  };
  return (
    <Badge variant="outline" className={cn("text-xs capitalize", colors[rating.toLowerCase()] || "border-gray-700 text-gray-400")}>
      {rating}
    </Badge>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    major: "bg-red-900/40 text-red-400 border-red-800/50",
    moderate: "bg-yellow-900/40 text-yellow-400 border-yellow-800/50",
    minor: "bg-blue-900/40 text-blue-400 border-blue-800/50",
  };
  return (
    <Badge variant="outline" className={cn("text-xs capitalize", colors[severity] || "border-gray-700 text-gray-400")}>
      {severity}
    </Badge>
  );
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  count,
  children,
  testId,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
  testId: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-amber-900/20 rounded-lg bg-gray-900/50 overflow-hidden" data-testid={testId}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-800/50 transition-colors"
        data-testid={`${testId}-toggle`}
      >
        <span className="text-amber-500">{icon}</span>
        <span className="text-amber-400 font-semibold text-base flex-1">{title}</span>
        {count !== undefined && (
          <Badge variant="outline" className="border-amber-900/30 text-amber-400/70 text-xs">{count}</Badge>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function ProjectPicker({ onSelect }: { onSelect: (id: string) => void }) {
  const [projects, setProjects] = useState<ForgeProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/editor/projects")
      .then((r) => r.json())
      .then((data) => { setProjects(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-16" data-testid="empty-no-projects">
        <Anvil className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">No FORGE projects found. Create a project and run analysis first.</p>
        <Link
          href="/forge"
          className="inline-flex items-center gap-2 rounded-md border border-amber-900/30 text-amber-400 hover:bg-amber-600/20 transition-colors text-sm font-medium h-9 px-4 no-underline"
          data-testid="link-go-to-forge"
        >
          Go to FORGE
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="project-picker">
      {projects.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className="w-full text-left px-4 py-3 rounded-lg border border-gray-800 hover:border-amber-900/40 hover:bg-gray-800/50 transition-colors flex items-center gap-3"
          data-testid={`button-select-project-${p.id}`}
        >
          <Anvil className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-gray-200 font-medium text-sm truncate">{p.title}</div>
            <div className="flex items-center gap-2 mt-0.5">
              {p.genre && <span className="text-gray-500 text-xs">{p.genre}</span>}
              <span className="text-gray-600 text-xs">{formatDate(p.updatedAt)}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      ))}
    </div>
  );
}

export default function Editor() {
  const [, navigate] = useLocation();
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FeedbackData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = useCallback(async (pid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/editor/feedback/${pid}`);
      if (!res.ok) throw new Error("Failed to load feedback");
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (projectId) fetchFeedback(projectId);
  }, [projectId, fetchFeedback]);

  if (!projectId) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-amber-400 mb-2" data-testid="text-editor-heading">Editor</h1>
            <p className="text-gray-400 text-sm">Select a FORGE project to view consolidated editorial feedback — beta readers, editorial assessment, and developmental analysis.</p>
          </div>
          <ProjectPicker onSelect={(id) => navigate(`/editor/${id}`)} />
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/editor")}
            className="text-sm font-medium text-gray-400 hover:text-amber-400 transition-colors flex items-center gap-1"
            data-testid="button-back-editor"
          >
            <ArrowLeft className="w-4 h-4" /> All Projects
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-400 mb-2" data-testid="text-editor-heading">
            {data?.projectTitle || "Editor"}
          </h1>
          <p className="text-gray-400 text-sm">Consolidated feedback from FORGE manuscript analysis — beta readers, editorial assessment, and developmental analysis.</p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-4 mb-6 text-red-300 text-sm" data-testid="text-error">
            {error}
          </div>
        )}

        {data && data.noRevision && (
          <div className="text-center py-16" data-testid="empty-no-revision">
            <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">This project has no analysis data yet.</p>
            <Link
              href="/forge"
              className="inline-flex items-center gap-2 rounded-md border border-amber-900/30 text-amber-400 hover:bg-amber-600/20 transition-colors text-sm font-medium h-9 px-4 no-underline"
              data-testid="link-go-to-forge"
            >
              Open FORGE to run analysis
            </Link>
          </div>
        )}

        {data && !data.noRevision && (
          <div className="space-y-4">

            <CollapsibleSection
              title="Beta Reader Panel"
              icon={<MessageSquare className="w-5 h-5" />}
              count={data.betaReaders?.length}
              defaultOpen={true}
              testId="section-beta-readers"
            >
              {!data.betaReaders || data.betaReaders.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No beta reader feedback available. Run the beta reader analysis in FORGE.</p>
              ) : (
                <div className="space-y-3">
                  {data.betaReaders.map((br, i) => (
                    <Card key={i} className="bg-gray-800/50 border-gray-800" data-testid={`card-beta-reader-${i}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-amber-300 font-semibold text-sm">{br.profileName}</h4>
                            {br.profileDescription && (
                              <p className="text-gray-500 text-xs mt-0.5">{br.profileDescription}</p>
                            )}
                          </div>
                          {br.wouldKeepReading !== undefined && (
                            <div className="flex items-center gap-1.5">
                              {br.wouldKeepReading ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                              <span className={cn("text-xs font-medium", br.wouldKeepReading ? "text-green-400" : "text-red-400")}>
                                {br.wouldKeepReading ? "Would keep reading" : "Might stop reading"}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {br.hookedAt && (
                            <div>
                              <span className="text-gray-500 text-xs uppercase tracking-wider">Hooked at</span>
                              <p className="text-gray-300 mt-0.5">{br.hookedAt}</p>
                            </div>
                          )}
                          {br.attentionSaggedAt && (
                            <div>
                              <span className="text-gray-500 text-xs uppercase tracking-wider">Attention sagged</span>
                              <p className="text-gray-300 mt-0.5">{br.attentionSaggedAt}</p>
                            </div>
                          )}
                          {br.favoriteCharacterReaction && (
                            <div className="md:col-span-2">
                              <span className="text-gray-500 text-xs uppercase tracking-wider">Favorite character reaction</span>
                              <p className="text-gray-300 mt-0.5">{br.favoriteCharacterReaction}</p>
                            </div>
                          )}
                          {br.strongestMoments && br.strongestMoments.length > 0 && (
                            <div>
                              <span className="text-gray-500 text-xs uppercase tracking-wider">Strongest moments</span>
                              <ul className="mt-1 space-y-0.5">
                                {br.strongestMoments.map((m, j) => (
                                  <li key={j} className="text-gray-300 flex items-start gap-1.5">
                                    <Star className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                    <span>{m}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {br.confusionPoints && br.confusionPoints.length > 0 && (
                            <div>
                              <span className="text-gray-500 text-xs uppercase tracking-wider">Confusion points</span>
                              <ul className="mt-1 space-y-0.5">
                                {br.confusionPoints.map((m, j) => (
                                  <li key={j} className="text-gray-300 flex items-start gap-1.5">
                                    <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
                                    <span>{m}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {br.leastCredibleMoments && br.leastCredibleMoments.length > 0 && (
                            <div className="md:col-span-2">
                              <span className="text-gray-500 text-xs uppercase tracking-wider">Least credible moments</span>
                              <ul className="mt-1 space-y-0.5">
                                {br.leastCredibleMoments.map((m, j) => (
                                  <li key={j} className="text-red-300 flex items-start gap-1.5">
                                    <XCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                                    <span>{m}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {br.finalEmotionalReaction && (
                            <div className="md:col-span-2">
                              <span className="text-gray-500 text-xs uppercase tracking-wider">Final emotional reaction</span>
                              <p className="text-gray-300 mt-0.5 italic">"{br.finalEmotionalReaction}"</p>
                            </div>
                          )}
                          {br.recommendation && (
                            <div className="md:col-span-2">
                              <span className="text-gray-500 text-xs uppercase tracking-wider">Recommendation</span>
                              <p className="text-gray-300 mt-0.5">{br.recommendation}</p>
                            </div>
                          )}
                          {br.mightQuitAt && (
                            <div className="md:col-span-2">
                              <span className="text-gray-500 text-xs uppercase tracking-wider">Might quit at</span>
                              <p className="text-red-300 mt-0.5">{br.mightQuitAt}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Editorial Assessment"
              icon={<FileText className="w-5 h-5" />}
              count={data.editorialChunks?.length}
              defaultOpen={false}
              testId="section-editorial"
            >
              {!data.editorialChunks || data.editorialChunks.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No editorial assessment data available. Run the editorial assessment analysis in FORGE.</p>
              ) : (
                <div className="space-y-4">
                  {data.issues && data.issues.total > 0 && (
                    <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-800">
                      <span className="text-gray-400 text-sm font-medium">Issues Found:</span>
                      <div className="flex items-center gap-3">
                        {data.issues.bySeverity.major > 0 && (
                          <span className="text-red-400 text-sm font-medium">{data.issues.bySeverity.major} major</span>
                        )}
                        {data.issues.bySeverity.moderate > 0 && (
                          <span className="text-yellow-400 text-sm font-medium">{data.issues.bySeverity.moderate} moderate</span>
                        )}
                        {data.issues.bySeverity.minor > 0 && (
                          <span className="text-blue-400 text-sm font-medium">{data.issues.bySeverity.minor} minor</span>
                        )}
                      </div>
                      <span className="text-gray-500 text-xs ml-auto">{data.issues.total} total</span>
                    </div>
                  )}

                  {data.editorialChunks.map((chunk, i) => (
                    <div key={i} className="border border-gray-800 rounded-lg p-4" data-testid={`editorial-chunk-${i}`}>
                      <h4 className="text-amber-300 font-medium text-sm mb-3">
                        Chapters {chunk.startChapter}–{chunk.endChapter}
                      </h4>

                      {chunk.overallImpression && (
                        <p className="text-gray-300 text-sm mb-3 leading-relaxed">{chunk.overallImpression}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {chunk.strengths.length > 0 && (
                          <div>
                            <span className="text-green-400 text-xs uppercase tracking-wider font-medium">Strengths</span>
                            <ul className="mt-1 space-y-1">
                              {chunk.strengths.map((s, j) => (
                                <li key={j} className="text-gray-300 text-sm flex items-start gap-1.5">
                                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {chunk.weaknesses.length > 0 && (
                          <div>
                            <span className="text-red-400 text-xs uppercase tracking-wider font-medium">Weaknesses</span>
                            <ul className="mt-1 space-y-1">
                              {chunk.weaknesses.map((w, j) => (
                                <li key={j} className="text-gray-300 text-sm flex items-start gap-1.5">
                                  <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                                  <span>{w}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {chunk.continuityNotes.length > 0 && (
                          <div>
                            <span className="text-gray-500 text-xs uppercase tracking-wider font-medium">Continuity Notes</span>
                            <ul className="mt-1 space-y-1">
                              {chunk.continuityNotes.map((n, j) => (
                                <li key={j} className="text-gray-400 text-sm">{n}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {chunk.unresolvedQuestions.length > 0 && (
                          <div>
                            <span className="text-gray-500 text-xs uppercase tracking-wider font-medium">Unresolved Questions</span>
                            <ul className="mt-1 space-y-1">
                              {chunk.unresolvedQuestions.map((q, j) => (
                                <li key={j} className="text-gray-400 text-sm">{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {chunk.thematicNotes.length > 0 && (
                        <div className="mt-3">
                          <span className="text-gray-500 text-xs uppercase tracking-wider font-medium">Thematic Notes</span>
                          <div className="mt-1 space-y-1">
                            {chunk.thematicNotes.map((n, j) => (
                              <p key={j} className="text-gray-400 text-sm italic">{n}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {data.issues && data.issues.topIssues.length > 0 && (
                    <div>
                      <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-2">Top Issues</h4>
                      <div className="space-y-2">
                        {data.issues.topIssues.map((issue, i) => (
                          <div key={i} className="border border-gray-800 rounded-lg p-3" data-testid={`issue-${i}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <SeverityBadge severity={issue.severity} />
                              <span className="text-gray-200 text-sm font-medium">{issue.title}</span>
                              <Badge variant="outline" className="border-gray-700 text-gray-500 text-[10px] ml-auto">{issue.type}</Badge>
                            </div>
                            {issue.description && <p className="text-gray-400 text-sm mt-1">{issue.description}</p>}
                            {issue.suggestion && (
                              <p className="text-amber-400/70 text-sm mt-1.5 flex items-start gap-1.5">
                                <Zap className="w-3 h-3 mt-0.5 shrink-0" />
                                {issue.suggestion}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Developmental Assessment"
              icon={<Layers className="w-5 h-5" />}
              defaultOpen={false}
              testId="section-developmental"
            >
              {!data.editorialChunks || data.editorialChunks.every(c => !c.pacing && !c.stakes && !c.causality && c.characterArcs.length === 0) ? (
                <p className="text-gray-500 text-sm py-4">No developmental assessment data available. Run the developmental editor analysis in FORGE.</p>
              ) : (
                <div className="space-y-4">
                  {data.editorialChunks.some(c => c.pacing || c.stakes || c.causality) && (
                    <div>
                      <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-2">Craft Ratings by Section</h4>
                      <div className="space-y-2">
                        {data.editorialChunks.filter(c => c.pacing || c.stakes || c.causality).map((chunk, i) => (
                          <div key={i} className="border border-gray-800 rounded-lg p-3" data-testid={`craft-chunk-${i}`}>
                            <div className="text-amber-300 text-xs font-medium mb-2">Ch. {chunk.startChapter}–{chunk.endChapter}</div>
                            <div className="grid grid-cols-3 gap-3">
                              {chunk.pacing && (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <Gauge className="w-3 h-3 text-gray-500" />
                                    <span className="text-gray-500 text-xs">Pacing</span>
                                  </div>
                                  <RatingBadge rating={chunk.pacing.rating} />
                                  {chunk.pacing.notes && <p className="text-gray-400 text-xs mt-1">{chunk.pacing.notes}</p>}
                                </div>
                              )}
                              {chunk.stakes && (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <Zap className="w-3 h-3 text-gray-500" />
                                    <span className="text-gray-500 text-xs">Stakes</span>
                                  </div>
                                  <RatingBadge rating={chunk.stakes.rating} />
                                  {chunk.stakes.notes && <p className="text-gray-400 text-xs mt-1">{chunk.stakes.notes}</p>}
                                </div>
                              )}
                              {chunk.causality && (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <LinkIcon className="w-3 h-3 text-gray-500" />
                                    <span className="text-gray-500 text-xs">Causality</span>
                                  </div>
                                  <RatingBadge rating={chunk.causality.rating} />
                                  {chunk.causality.notes && <p className="text-gray-400 text-xs mt-1">{chunk.causality.notes}</p>}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.editorialChunks.some(c => c.characterArcs.length > 0) && (
                    <div>
                      <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-2">Character Arcs</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {data.editorialChunks.flatMap((chunk) =>
                          chunk.characterArcs.map((arc, j) => (
                            <div key={`${chunk.chunkIndex}-${j}`} className="border border-gray-800 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-amber-300 text-sm font-medium">{arc.character}</span>
                                {arc.strength && <RatingBadge rating={arc.strength} />}
                              </div>
                              {arc.arc && <p className="text-gray-400 text-sm">{arc.arc}</p>}
                              <span className="text-gray-600 text-[10px]">Ch. {chunk.startChapter}–{chunk.endChapter}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {data.scenes && data.scenes.length > 0 && (
                    <div>
                      <h4 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-2">
                        Scene Analysis ({data.scenes.length} scenes)
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-800">
                              <th className="text-left text-gray-500 text-xs py-2 pr-3">Chapter</th>
                              <th className="text-left text-gray-500 text-xs py-2 pr-3">Scene</th>
                              <th className="text-left text-gray-500 text-xs py-2 pr-3">Purpose</th>
                              <th className="text-left text-gray-500 text-xs py-2 pr-3">Conflict</th>
                              <th className="text-left text-gray-500 text-xs py-2 pr-3">Change</th>
                              <th className="text-left text-gray-500 text-xs py-2">Rating</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.scenes.slice(0, 30).map((scene, i) => (
                              <tr key={i} className="border-b border-gray-800/50" data-testid={`scene-row-${i}`}>
                                <td className="py-2 pr-3 text-amber-300/80 text-xs whitespace-nowrap">
                                  {scene.chapterNumber}. {scene.chapterTitle}
                                </td>
                                <td className="py-2 pr-3 text-gray-400 text-xs">{scene.sceneIndex + 1}</td>
                                <td className="py-2 pr-3 text-gray-300 text-xs max-w-[200px] truncate">{scene.purpose}</td>
                                <td className="py-2 pr-3 text-gray-400 text-xs max-w-[150px] truncate">{scene.conflict}</td>
                                <td className="py-2 pr-3">
                                  {scene.changeOccurred ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-red-400/50" />
                                  )}
                                </td>
                                <td className="py-2">
                                  <RatingBadge rating={scene.valueRating} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {data.scenes.length > 30 && (
                          <p className="text-gray-500 text-xs mt-2">Showing first 30 of {data.scenes.length} scenes</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CollapsibleSection>
          </div>
        )}
      </div>
    </Layout>
  );
}
