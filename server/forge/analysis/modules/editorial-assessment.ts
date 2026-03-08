import { callLLM } from "../../../llm";
import { extractJSON } from "../parse-json";

export interface EditorialAssessmentResult {
  overallImpression: string;
  strengths: string[];
  weaknesses: string[];
  majorEvents: string[];
  characterChanges: { character: string; change: string }[];
  plotThreadUpdates: { thread: string; status: string; notes: string }[];
  continuityNotes: string[];
  worldRuleNotes: string[];
  unresolvedQuestions: string[];
  issues: {
    type: string;
    severity: string;
    title: string;
    description: string;
    evidence: string[];
    suggestion: string;
  }[];
}

const SYSTEM = `You are a senior editorial assessor analyzing a chunk of a fiction manuscript. Your job is to provide a high-level editorial assessment: identify what's working, what isn't, and track story state changes. Favor evidence over vagueness. Diagnose rather than flatter. Separate strengths from weaknesses. Preserve author voice. Label uncertainty.`;

export async function runEditorialAssessment(
  chunkText: string,
  previousContext: string,
  genre: string,
  supportFiles: string
): Promise<EditorialAssessmentResult> {
  const prompt = `Analyze this manuscript chunk with editorial rigor.

GENRE: ${genre}

PREVIOUS CONTEXT (story so far):
${previousContext || "This is the beginning of the manuscript."}

SUPPORT FILES (outline/story bible):
${supportFiles || "None provided."}

MANUSCRIPT CHUNK:
---
${chunkText}
---

Return your analysis as JSON with this exact structure:
{
  "overallImpression": "2-3 sentence editorial assessment of this chunk",
  "strengths": ["specific strengths with evidence"],
  "weaknesses": ["specific weaknesses with evidence"],
  "majorEvents": ["key plot events that occurred"],
  "characterChanges": [{"character": "name", "change": "what changed for them"}],
  "plotThreadUpdates": [{"thread": "thread name", "status": "active|resolved|dormant|abandoned", "notes": "what happened"}],
  "continuityNotes": ["anything to track for continuity"],
  "worldRuleNotes": ["established world rules or setting details"],
  "unresolvedQuestions": ["questions raised but not yet answered"],
  "issues": [{"type": "issue_type", "severity": "minor|moderate|major|critical", "title": "brief title", "description": "detailed description", "evidence": ["quoted text or references"], "suggestion": "how to fix"}]
}

Issue types: plot_hole, weak_causality, pacing_drag, weak_stakes, unclear_motivation, continuity_error, unresolved_thread, exposition_overload, scene_redundancy, flat_arc, inconsistent_voice, prose_clarity, structural_weakness

Return ONLY valid JSON.`;

  const result = await callLLM(prompt, "powerful", SYSTEM, 8192);
  return extractJSON<EditorialAssessmentResult>(result, {
    overallImpression: "Analysis completed but response format was unexpected.",
    strengths: [], weaknesses: [], majorEvents: [],
    characterChanges: [], plotThreadUpdates: [], continuityNotes: [],
    worldRuleNotes: [], unresolvedQuestions: [], issues: [],
  });
}
