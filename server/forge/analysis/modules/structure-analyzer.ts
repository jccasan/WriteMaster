import { callLLM } from "../../../llm";
import { extractJSON } from "../parse-json";

export interface StructureResult {
  beats: { beatType: string; chapterNumber: number | null; confidence: number; notes: string }[];
  structuralAssessment: string;
  proportionNotes: string;
  issues: { type: string; severity: string; title: string; description: string; evidence: string[]; suggestion: string }[];
}

const SYSTEM = `You are a story structure analyst. Identify narrative structure beats (opening setup, inciting incident, first turn, midpoint, second turn, climax, denouement). Assess proportion and pacing of structural elements. Reference established frameworks (three-act, Save the Cat, etc.) but don't force formula—diagnose what the author is actually doing.`;

export async function runStructureAnalysis(
  chunkText: string,
  previousContext: string,
  genre: string,
  totalChapters: number,
  currentChapterRange: string
): Promise<StructureResult> {
  const prompt = `Analyze the narrative structure in this manuscript chunk.

GENRE: ${genre}
TOTAL CHAPTERS: ${totalChapters}
THIS CHUNK COVERS: ${currentChapterRange}
PREVIOUS CONTEXT: ${previousContext || "Beginning of manuscript."}

CHUNK:
---
${chunkText}
---

Return JSON:
{
  "beats": [{"beatType": "opening_setup|inciting_incident|first_turn|midpoint|second_turn|climax|denouement", "chapterNumber": 1, "confidence": 0.8, "notes": "why this beat is identified here"}],
  "structuralAssessment": "overall assessment of structure in this section",
  "proportionNotes": "notes on pacing and proportion",
  "issues": [{"type": "structural_weakness|pacing_drag", "severity": "minor|moderate|major", "title": "", "description": "", "evidence": [], "suggestion": ""}]
}

Return ONLY valid JSON.`;

  const result = await callLLM(prompt, "powerful", SYSTEM, 4096);
  return extractJSON<StructureResult>(result, { beats: [], structuralAssessment: "", proportionNotes: "", issues: [] });
}
