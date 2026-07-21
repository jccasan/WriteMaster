import { callLLM } from "../../../llm";
import { extractJSON } from "../parse-json";
import { buildReviewerSystem } from "../../editorial-os/eos-skills";

export interface FactCheckResult {
  internalConsistency: { claim: string; finding: string; confidence: number; status: string; chapter?: number }[];
  externalFacts: { claim: string; finding: string; confidence: number; status: string }[];
  timelineIssues: string[];
  issues: { type: string; severity: string; title: string; description: string; evidence: string[]; suggestion: string; confidence?: string; noteType?: string }[];
}

const SYSTEM = buildReviewerSystem("continuity-logic-auditor",
  `In addition to continuity and logic auditing, flag potentially incorrect external facts (historical, scientific, geographic). Clearly distinguish internal-consistency issues from external-fact issues. Rate numeric confidence 0-1 on fact items.`);

export async function runFactCheck(
  chunkText: string,
  previousContext: string,
  supportFiles: string
): Promise<FactCheckResult> {
  const prompt = `Fact-check this manuscript chunk for internal consistency and external accuracy.

PREVIOUS CONTEXT: ${previousContext || "Beginning of manuscript."}
SUPPORT FILES: ${supportFiles || "None."}

CHUNK:
---
${chunkText}
---

Return JSON:
{
  "internalConsistency": [{"claim": "what's stated", "finding": "whether it's consistent", "confidence": 0.9, "status": "verified|disputed|error", "chapter": 1}],
  "externalFacts": [{"claim": "", "finding": "", "confidence": 0.8, "status": "verified|disputed|error"}],
  "timelineIssues": ["any timeline problems"],
  "issues": [{"type": "continuity_error|realism_issue|factual_error|world_rule_conflict|knowledge_inconsistency", "severity": "minor|moderate|major|critical", "title": "", "description": "", "evidence": [], "suggestion": "smallest effective revision", "confidence": "high|medium|low", "noteType": "objective|plausibility|genre|taste"}]
}

Return ONLY valid JSON.`;

  const result = await callLLM(prompt, "powerful", SYSTEM, 6144);
  return extractJSON<FactCheckResult>(result, { internalConsistency: [], externalFacts: [], timelineIssues: [], issues: [] });
}
