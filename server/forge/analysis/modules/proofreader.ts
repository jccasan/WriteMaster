import { callLLM } from "../../../llm";

export interface ProofreadResult {
  grammarIssues: { text: string; issue: string; suggestion: string }[];
  punctuationIssues: { text: string; issue: string; suggestion: string }[];
  formattingNotes: string[];
  issues: { type: string; severity: string; title: string; description: string; evidence: string[]; suggestion: string }[];
}

const SYSTEM = `You are a fiction proofreader. Find grammar errors, punctuation issues, and formatting inconsistencies. Be precise—quote exact text and provide corrections. Do not suggest style changes; focus only on correctness.`;

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
  const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try { return JSON.parse(cleaned); }
  catch { return { grammarIssues: [], punctuationIssues: [], formattingNotes: [], issues: [] }; }
}
