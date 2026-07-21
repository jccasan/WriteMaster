import { callLLM } from "../../../llm";
import { extractJSON } from "../parse-json";
import { buildReviewerSystem, getEosSkill } from "../../editorial-os/eos-skills";

/**
 * Subject-matter expert reviewers from the Editorial Operating System.
 * A router pass selects which domains apply to the manuscript so
 * irrelevant experts don't generate noise.
 */

export const SME_REVIEWERS: Record<string, { skill: string; label: string }> = {
  federal_procedure: { skill: "federal-procedure-reviewer", label: "Federal Procedure" },
  intelligence_tradecraft: { skill: "intelligence-tradecraft-reviewer", label: "Intelligence Tradecraft" },
  legal_realism: { skill: "legal-realism-reviewer", label: "Legal Realism" },
  medical_realism: { skill: "medical-realism-reviewer", label: "Medical Realism" },
  military_operations: { skill: "military-operations-reviewer", label: "Military Operations" },
  forensics_evidence: { skill: "forensics-evidence-reviewer", label: "Forensics & Evidence" },
  cybersecurity_technology: { skill: "cybersecurity-technology-reviewer", label: "Cybersecurity & Technology" },
};

export function getSmeReviewerKeys(): string[] {
  return Object.keys(SME_REVIEWERS);
}

export interface SmeRoutingResult {
  activeReviewers: string[];
  reasons: { reviewer: string; reason: string }[];
  researchTasks: string[];
}

export async function routeSmeReviewers(
  sampleText: string,
  genre: string,
  supportFiles: string
): Promise<SmeRoutingResult> {
  const system = buildReviewerSystem("subject-matter-review-router");
  const reviewerList = Object.entries(SME_REVIEWERS)
    .map(([key, r]) => `- ${key}: ${r.label}`)
    .join("\n");

  const prompt = `Decide which subject-matter reviewers should be activated for this manuscript.

AVAILABLE REVIEWERS:
${reviewerList}

GENRE: ${genre}
SUPPORT FILES: ${supportFiles ? supportFiles.slice(0, 4000) : "None."}

MANUSCRIPT SAMPLE:
---
${sampleText.slice(0, 40000)}
---

Activate only reviewers whose domain materially appears in the story AND where an error would be visible to readers. Do not activate an expert merely because their field is mentioned in passing.

Return JSON:
{
  "activeReviewers": ["reviewer keys from the list above"],
  "reasons": [{"reviewer": "key", "reason": "why activated or skipped"}],
  "researchTasks": ["questions that need real external research rather than simulated expertise"]
}

Return ONLY valid JSON.`;

  const result = await callLLM(prompt, "cheap", system, 2048);
  const parsed = extractJSON<SmeRoutingResult>(result, { activeReviewers: [], reasons: [], researchTasks: [] });
  parsed.activeReviewers = (parsed.activeReviewers || []).filter(k => SME_REVIEWERS[k]);
  return parsed;
}

export interface SmeReviewResult {
  domainFindings: { claim: string; assessment: string; confidence: number; status: string }[];
  researchFlags: string[];
  issues: { type: string; severity: string; title: string; description: string; evidence: string[]; suggestion: string; confidence?: string; noteType?: string }[];
}

export async function runSmeReview(
  reviewerKey: string,
  chunkText: string,
  previousContext: string,
  genre: string,
  supportFiles: string
): Promise<SmeReviewResult> {
  const reviewer = SME_REVIEWERS[reviewerKey];
  if (!reviewer || !getEosSkill(reviewer.skill)) {
    return { domainFindings: [], researchFlags: [], issues: [] };
  }

  const system = buildReviewerSystem(reviewer.skill,
    `You are reviewing one chunk of a longer manuscript. Only flag issues within your domain expertise. This is fiction: distinguish between errors that break plausibility for informed readers and acceptable dramatic license.`);

  const prompt = `Review this manuscript chunk for ${reviewer.label} plausibility and accuracy.

GENRE: ${genre}
PREVIOUS CONTEXT: ${previousContext || "Beginning of manuscript."}
SUPPORT FILES: ${supportFiles ? supportFiles.slice(0, 4000) : "None."}

CHUNK:
---
${chunkText}
---

Return JSON:
{
  "domainFindings": [{"claim": "what the text asserts or depicts", "assessment": "your expert assessment", "confidence": 0.8, "status": "verified|disputed|error"}],
  "researchFlags": ["claims needing real external research before publication"],
  "issues": [{"type": "realism_issue", "severity": "minor|moderate|major|critical", "title": "", "description": "", "evidence": ["quoted text"], "suggestion": "smallest effective revision", "confidence": "high|medium|low", "noteType": "objective|plausibility|genre|taste"}]
}

Return ONLY valid JSON.`;

  const result = await callLLM(prompt, "powerful", system, 6144);
  return extractJSON<SmeReviewResult>(result, { domainFindings: [], researchFlags: [], issues: [] });
}
