import { prisma } from "../db";
import { callLLM } from "../../llm";
import { extractJSON } from "./parse-json";
import { buildReviewerSystem } from "../editorial-os/eos-skills";

/**
 * Revision verification (Editorial Operating System).
 *
 * Instead of generating a fresh generalized critique, compare a revised
 * draft against the previous draft's issue ledger and determine, issue by
 * issue, whether each one is fixed, partially fixed, displaced, unchanged,
 * worsened, or intentionally declined. History is preserved: old issue rows
 * keep their wording and receive a verification status; unresolved issues
 * are carried forward onto the new revision's ledger.
 */

const VERIFICATION_STATUSES = [
  "fixed", "partially_fixed", "displaced", "unchanged", "worsened", "intentionally_declined",
] as const;

interface VerificationVerdict {
  issueId: string;
  status: string;
  evidence: string;
  residualConcern: string;
  sideEffects: { type: string; severity: string; title: string; description: string; evidence: string[]; suggestion: string }[];
  nextAction: string;
}

interface IssueRecord {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  evidenceJson: string;
  suggestion: string;
  introducedAtChapter: number | null;
}

export async function runRevisionVerification(
  prevRevisionId: string,
  newRevisionId: string,
  onProgress: (msg: string) => void,
  shouldCancel?: () => boolean
): Promise<void> {
  const prevIssues: IssueRecord[] = await prisma.issue.findMany({
    where: { revisionVersionId: prevRevisionId, NOT: { status: "dismissed" } },
  });
  if (prevIssues.length === 0) {
    onProgress("No prior issues to verify.");
    return;
  }

  const newChunks = await prisma.chunk.findMany({
    where: { revisionVersionId: newRevisionId },
    orderBy: { chunkIndex: "asc" },
  });
  if (newChunks.length === 0) throw new Error("New revision has no parsed chunks.");

  // Group prior issues by the new-revision chunk covering their chapter.
  // Chapter numbering can shift between drafts; this is a best-effort match
  // and the verifier prompt is told the text may have moved.
  const groups = new Map<string, IssueRecord[]>();
  for (const issue of prevIssues) {
    const chapter = issue.introducedAtChapter ?? newChunks[0].startChapter;
    const chunk =
      newChunks.find(c => chapter >= c.startChapter && chapter <= c.endChapter)
      || newChunks[newChunks.length - 1];
    const list = groups.get(chunk.id) || [];
    list.push(issue);
    groups.set(chunk.id, list);
  }

  onProgress(`Verifying ${prevIssues.length} prior issues across ${groups.size} sections...`);

  const system = buildReviewerSystem("revision-verifier",
    `Chapter numbering may have shifted between drafts — search the revised text for the relevant passage before judging. Do not mark an issue fixed merely because text changed; evaluate the intended reader effect.`);

  const allVerdicts: VerificationVerdict[] = [];
  let processed = 0;

  for (const [chunkId, issues] of Array.from(groups.entries())) {
    if (shouldCancel?.()) {
      onProgress("Verification cancelled before completion — no ledger changes were applied.");
      return;
    }
    const chunk = newChunks.find(c => c.id === chunkId)!;
    processed++;
    onProgress(`Verifying section ${processed}/${groups.size} (chapters ${chunk.startChapter}-${chunk.endChapter}, ${issues.length} issues)...`);

    const issueList = issues.map(i => ({
      issueId: i.id,
      type: i.type,
      severity: i.severity,
      title: i.title,
      description: i.description,
      evidence: safeParse(i.evidenceJson, []),
      suggestion: i.suggestion,
      chapter: i.introducedAtChapter,
    }));

    const prompt = `Verify whether each prior editorial issue is resolved in the revised draft.

PRIOR ISSUES (from the previous draft's ledger):
${JSON.stringify(issueList, null, 2)}

REVISED TEXT (chapters ${chunk.startChapter}-${chunk.endChapter} of the new draft):
---
${chunk.rawCombinedText.slice(0, 60000)}
---

For every prior issue, return a verdict. Statuses:
- fixed: the underlying problem is resolved for the reader
- partially_fixed: improved but residual concern remains
- displaced: the problem moved elsewhere or changed form
- unchanged: the passage still has the problem
- worsened: the revision made it worse
- intentionally_declined: the text clearly shows a deliberate author choice to keep it

Return JSON:
{
  "verdicts": [{
    "issueId": "id from the list above",
    "status": "fixed|partially_fixed|displaced|unchanged|worsened|intentionally_declined",
    "evidence": "quoted revised text supporting the verdict",
    "residualConcern": "remaining risk, empty if none",
    "sideEffects": [{"type": "revision_side_effect", "severity": "minor|moderate|major|critical", "title": "", "description": "new problem directly caused by the fix", "evidence": [], "suggestion": ""}],
    "nextAction": "what to do next, empty if nothing"
  }]
}

Return ONLY valid JSON. Include every issueId exactly once.`;

    try {
      const result = await callLLM(prompt, "powerful", system, 8192);
      const parsed = extractJSON<{ verdicts: VerificationVerdict[] }>(result, { verdicts: [] });
      const byId = new Map(parsed.verdicts.map(v => [v.issueId, v]));
      for (const issue of issues) {
        const verdict = byId.get(issue.id);
        allVerdicts.push(verdict && VERIFICATION_STATUSES.includes(verdict.status as any)
          ? { ...verdict, issueId: issue.id }
          : { issueId: issue.id, status: "unchanged", evidence: "", residualConcern: "Verifier did not return a verdict for this issue.", sideEffects: [], nextAction: "Re-check manually." });
      }
    } catch (err: any) {
      onProgress(`ERROR verifying section ${processed}: ${err.message}`);
      for (const issue of issues) {
        allVerdicts.push({ issueId: issue.id, status: "unchanged", evidence: "", residualConcern: `Verification failed: ${err.message}`, sideEffects: [], nextAction: "Re-run verification." });
      }
    }
  }

  onProgress("Updating issue ledger...");

  const issueById = new Map(prevIssues.map(i => [i.id, i]));
  let carried = 0;
  let sideEffectCount = 0;

  for (const verdict of allVerdicts) {
    const issue = issueById.get(verdict.issueId);
    if (!issue) continue;

    await prisma.issue.update({
      where: { id: issue.id },
      data: { status: verdict.status },
    });

    if (verdict.status !== "fixed" && verdict.status !== "intentionally_declined") {
      carried++;
      const note = [`_Carried from previous draft — verification: ${verdict.status}_`];
      if (verdict.residualConcern) note.push(`_Residual concern: ${verdict.residualConcern}_`);
      await prisma.issue.create({
        data: {
          revisionVersionId: newRevisionId,
          type: issue.type,
          severity: issue.severity,
          title: issue.title,
          description: `${issue.description}\n\n${note.join("\n")}`.trim(),
          evidenceJson: issue.evidenceJson,
          suggestion: verdict.nextAction || issue.suggestion,
          status: "active",
          introducedAtChapter: issue.introducedAtChapter,
        },
      });
    }

    for (const side of verdict.sideEffects || []) {
      sideEffectCount++;
      await prisma.issue.create({
        data: {
          revisionVersionId: newRevisionId,
          type: side.type || "revision_side_effect",
          severity: side.severity || "moderate",
          title: side.title,
          description: `${side.description}\n\n_New issue caused by revising: "${issue.title}"_`.trim(),
          evidenceJson: JSON.stringify(side.evidence || []),
          suggestion: side.suggestion || "",
          status: "active",
          introducedAtChapter: issue.introducedAtChapter,
        },
      });
    }
  }

  const counts: Record<string, number> = {};
  for (const v of allVerdicts) counts[v.status] = (counts[v.status] || 0) + 1;

  await prisma.editorialReport.create({
    data: {
      revisionVersionId: newRevisionId,
      reportType: "revision_verification",
      title: "Revision Verification Report",
      summary: `${counts["fixed"] || 0}/${allVerdicts.length} issues fixed · ${carried} carried forward · ${sideEffectCount} new side effects`,
      bodyMarkdown: renderVerificationReport(allVerdicts, issueById, counts, carried, sideEffectCount),
      metadataJson: JSON.stringify({ prevRevisionId, counts, carried, sideEffectCount }),
    },
  });

  onProgress(`Verification complete: ${counts["fixed"] || 0} fixed, ${counts["partially_fixed"] || 0} partially fixed, ${counts["unchanged"] || 0} unchanged, ${counts["displaced"] || 0} displaced, ${counts["worsened"] || 0} worsened, ${counts["intentionally_declined"] || 0} declined.`);
}

function renderVerificationReport(
  verdicts: VerificationVerdict[],
  issueById: Map<string, IssueRecord>,
  counts: Record<string, number>,
  carried: number,
  sideEffectCount: number
): string {
  const parts: string[] = ["# Revision Verification Report\n"];

  parts.push("## Draft-Level Progress\n");
  parts.push("| Status | Count |");
  parts.push("|--------|-------|");
  for (const status of VERIFICATION_STATUSES) {
    parts.push(`| ${status.replace(/_/g, " ")} | ${counts[status] || 0} |`);
  }
  parts.push(`| **Total verified** | **${verdicts.length}** |`);
  parts.push(`\n**Carried forward to new ledger**: ${carried}`);
  parts.push(`**New side-effect issues**: ${sideEffectCount}\n`);

  parts.push("## Resolution Table\n");
  const order = ["worsened", "unchanged", "displaced", "partially_fixed", "intentionally_declined", "fixed"];
  const sorted = [...verdicts].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  for (const v of sorted) {
    const issue = issueById.get(v.issueId);
    if (!issue) continue;
    parts.push(`### [${v.status.replace(/_/g, " ").toUpperCase()}] ${issue.title}`);
    parts.push(`**Severity**: ${issue.severity} · **Type**: ${issue.type}${issue.introducedAtChapter ? ` · **Chapter**: ${issue.introducedAtChapter}` : ""}`);
    if (v.evidence) parts.push(`**Evidence**:\n> ${v.evidence}`);
    if (v.residualConcern) parts.push(`**Residual concern**: ${v.residualConcern}`);
    if (v.sideEffects?.length > 0) {
      parts.push(`**Side effects**:`);
      for (const s of v.sideEffects) parts.push(`- ${s.title}: ${s.description}`);
    }
    if (v.nextAction) parts.push(`**Next action**: ${v.nextAction}`);
    parts.push("");
  }

  return parts.join("\n");
}

function safeParse(json: string, fallback: any): any {
  try { return JSON.parse(json); }
  catch { return fallback; }
}
