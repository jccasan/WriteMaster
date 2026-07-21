import { prisma } from "../../db";
import { callLLM } from "../../../llm";
import { extractJSON } from "../parse-json";
import { buildReviewerSystem } from "../../editorial-os/eos-skills";

/**
 * Publishing-stage readers from the Editorial Operating System.
 * Unlike chunk-level modules these run once per analysis, evaluating the
 * opening of the manuscript plus the accumulated story context the way an
 * agent or acquisitions editor actually encounters a submission.
 */

export const PUBLISHING_READERS: Record<string, { skill: string; label: string }> = {
  literary_agent: { skill: "literary-agent-reader", label: "Literary Agent Reader" },
  acquisitions_editor: { skill: "acquisitions-editor-reader", label: "Acquisitions Editor Reader" },
  market_positioning: { skill: "market-positioning-reader", label: "Market Positioning Reader" },
  submission_package: { skill: "submission-package-auditor", label: "Submission Package Auditor" },
};

export function getPublishingReaderKeys(): string[] {
  return Object.keys(PUBLISHING_READERS);
}

export interface PublishingReviewResult {
  readingExperience: string;
  verdict: string;
  strengths: string[];
  concerns: string[];
  scorecard: { dimension: string; score: number; rationale: string }[];
  marketNotes: string[];
  researchFlags: string[];
  issues: { type: string; severity: string; title: string; description: string; evidence: string[]; suggestion: string; confidence?: string; noteType?: string }[];
}

const EMPTY_RESULT: PublishingReviewResult = {
  readingExperience: "", verdict: "", strengths: [], concerns: [],
  scorecard: [], marketNotes: [], researchFlags: [], issues: [],
};

export async function runPublishingReader(
  readerKey: string,
  openingText: string,
  storyContext: string,
  genre: string,
  projectMeta: { title: string; description: string }
): Promise<PublishingReviewResult> {
  const reader = PUBLISHING_READERS[readerKey];
  if (!reader) return { ...EMPTY_RESULT };

  const system = buildReviewerSystem(reader.skill,
    `You are evaluating a submission the way this role encounters it in the real market. Market and comparable-title claims are estimates that should be verified with current research at the time of use — say so where it matters.`);

  const prompt = `Evaluate this manuscript submission.

TITLE: ${projectMeta.title || "Untitled"}
GENRE: ${genre}
PROJECT DESCRIPTION: ${projectMeta.description || "None provided."}

STORY CONTEXT (accumulated from full-manuscript analysis — treat as a synopsis):
${storyContext ? storyContext.slice(0, 12000) : "None available."}

OPENING CHAPTERS:
---
${openingText.slice(0, 60000)}
---

Return JSON:
{
  "readingExperience": "what you felt while reading, before diagnosis",
  "verdict": "strong_as_written|works_with_minor_revision|works_but_needs_focused_revision|major_revision_needed|unable_to_assess",
  "strengths": ["specific strengths to protect"],
  "concerns": ["specific concerns from this role's perspective"],
  "scorecard": [{"dimension": "only dimensions within your mandate", "score": 7, "rationale": "one sentence"}],
  "marketNotes": ["positioning, comparable-title, or category observations"],
  "researchFlags": ["market claims that need current research to confirm"],
  "issues": [{"type": "market_readiness", "severity": "minor|moderate|major|critical", "title": "", "description": "", "evidence": [], "suggestion": "smallest effective revision", "confidence": "high|medium|low", "noteType": "objective|plausibility|genre|taste"}]
}

Return ONLY valid JSON.`;

  const result = await callLLM(prompt, "powerful", system, 6144);
  return extractJSON<PublishingReviewResult>(result, { ...EMPTY_RESULT });
}

export function renderPublishingReport(label: string, result: PublishingReviewResult): string {
  const parts: string[] = [`# ${label}\n`];

  if (result.verdict) parts.push(`**Verdict**: ${result.verdict.replace(/_/g, " ")}\n`);
  if (result.readingExperience) {
    parts.push("## Reading Experience\n");
    parts.push(result.readingExperience + "\n");
  }
  if (result.strengths.length > 0) {
    parts.push("## Strengths\n");
    for (const s of result.strengths) parts.push(`- ${s}`);
    parts.push("");
  }
  if (result.concerns.length > 0) {
    parts.push("## Concerns\n");
    for (const c of result.concerns) parts.push(`- ${c}`);
    parts.push("");
  }
  if (result.scorecard.length > 0) {
    parts.push("## Scorecard\n");
    parts.push("| Dimension | Score | Rationale |");
    parts.push("|-----------|-------|-----------|");
    for (const s of result.scorecard) parts.push(`| ${s.dimension} | ${s.score}/10 | ${s.rationale} |`);
    parts.push("");
  }
  if (result.marketNotes.length > 0) {
    parts.push("## Market Notes\n");
    for (const m of result.marketNotes) parts.push(`- ${m}`);
    parts.push("");
  }
  if (result.researchFlags.length > 0) {
    parts.push("## Needs Current Research\n");
    for (const r of result.researchFlags) parts.push(`- ${r}`);
    parts.push("");
  }

  return parts.join("\n");
}

export async function savePublishingReport(
  revisionVersionId: string,
  readerKey: string,
  result: PublishingReviewResult
): Promise<void> {
  const reader = PUBLISHING_READERS[readerKey];
  if (!reader) return;
  await prisma.editorialReport.create({
    data: {
      revisionVersionId,
      reportType: "publishing_report",
      title: reader.label,
      summary: result.verdict ? result.verdict.replace(/_/g, " ") : "",
      bodyMarkdown: renderPublishingReport(reader.label, result),
      metadataJson: JSON.stringify({ readerKey, verdict: result.verdict }),
    },
  });
}
