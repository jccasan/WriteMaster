import { callLLM } from "../../../llm";
import { extractJSON } from "../parse-json";
import { buildReviewerSystem } from "../../editorial-os/eos-skills";

export interface ProofreadResult {
  grammarIssues: { text: string; issue: string; suggestion: string }[];
  punctuationIssues: { text: string; issue: string; suggestion: string }[];
  formattingNotes: string[];
  issues: { type: string; severity: string; title: string; description: string; evidence: string[]; suggestion: string }[];
}

const SYSTEM = buildReviewerSystem("novel-copy-editor",
  `You are proofreading one chunk of a longer manuscript. Quote exact text and provide corrections. Do not suggest style changes; focus on mechanical correctness and consistency.`);

export async function runProofread(chunkText: string): Promise<ProofreadResult> {
  const prompt = `Proofread this manuscript chunk for grammar, punctuation, and formatting errors.

CHUNK:
---
${chunkText}
---

Return JSON:
{
  "grammarIssues": [{"text": "quoted problematic text", "issue": "what's wrong", "suggestion": "correction"}],
  "punctuationIssues": [{"text": "quoted text", "issue": "", "suggestion": ""}],
  "formattingNotes": ["formatting observations"],
  "issues": [{"type": "grammar|punctuation|formatting", "severity": "minor|moderate", "title": "", "description": "", "evidence": [""], "suggestion": ""}]
}

Return ONLY valid JSON.`;

  const result = await callLLM(prompt, "cheap", SYSTEM, 4096);
  return extractJSON<ProofreadResult>(result, { grammarIssues: [], punctuationIssues: [], formattingNotes: [], issues: [] });
}
