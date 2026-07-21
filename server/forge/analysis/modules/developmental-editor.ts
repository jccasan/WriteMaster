import { callLLM } from "../../../llm";
import { extractJSON } from "../parse-json";
import { buildReviewerSystem } from "../../editorial-os/eos-skills";

export interface DevEditResult {
  pacing: { rating: string; notes: string };
  stakes: { rating: string; notes: string };
  causality: { rating: string; notes: string };
  characterArcs: { character: string; arc: string; strength: string }[];
  sceneByScene: { sceneIndex: number; purpose: string; conflict: string; change: boolean; rating: string }[];
  thematicNotes: string[];
  issues: { type: string; severity: string; title: string; description: string; evidence: string[]; suggestion: string; confidence?: string; noteType?: string }[];
}

const SYSTEM = buildReviewerSystem("developmental-editor",
  `You are reviewing one chunk of a longer manuscript, with accumulated context from earlier chunks. Judge structure within this chunk while respecting what prior context establishes.`);

export async function runDevEdit(
  chunkText: string,
  previousContext: string,
  genre: string,
  supportFiles: string
): Promise<DevEditResult> {
  const prompt = `Perform a developmental edit on this manuscript chunk.

GENRE: ${genre}
PREVIOUS CONTEXT: ${previousContext || "Beginning of manuscript."}
SUPPORT FILES: ${supportFiles || "None."}

CHUNK:
---
${chunkText}
---

Return JSON:
{
  "pacing": {"rating": "strong|adequate|weak", "notes": "specific assessment"},
  "stakes": {"rating": "high|medium|low", "notes": "what's at stake and how effectively"},
  "causality": {"rating": "strong|adequate|weak", "notes": "cause-effect chain assessment"},
  "characterArcs": [{"character": "name", "arc": "what arc movement occurred", "strength": "strong|adequate|weak"}],
  "sceneByScene": [{"sceneIndex": 0, "purpose": "what scene accomplishes", "conflict": "what conflict drives it", "change": true, "rating": "essential|strong|useful_but_weak|underperforming|redundant"}],
  "thematicNotes": ["thematic observations"],
  "issues": [{"type": "structure|causality|stakes|arc|theme|climax|ending", "severity": "minor|moderate|major|critical", "title": "", "description": "", "evidence": [], "suggestion": "smallest effective revision", "confidence": "high|medium|low", "noteType": "objective|plausibility|genre|taste"}]
}

Return ONLY valid JSON.`;

  const result = await callLLM(prompt, "powerful", SYSTEM, 8192);
  return extractJSON<DevEditResult>(result, { pacing: { rating: "unknown", notes: "" }, stakes: { rating: "unknown", notes: "" }, causality: { rating: "unknown", notes: "" }, characterArcs: [], sceneByScene: [], thematicNotes: [], issues: [] });
}
