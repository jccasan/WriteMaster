import { callLLM } from "../../../llm";
import { extractJSON } from "../parse-json";

export interface DevEditResult {
  pacing: { rating: string; notes: string };
  stakes: { rating: string; notes: string };
  causality: { rating: string; notes: string };
  characterArcs: { character: string; arc: string; strength: string }[];
  sceneByScene: { sceneIndex: number; purpose: string; conflict: string; change: boolean; rating: string }[];
  thematicNotes: string[];
  issues: { type: string; severity: string; title: string; description: string; evidence: string[]; suggestion: string }[];
}

const SYSTEM = `You are a developmental editor specializing in fiction. Analyze narrative craft: pacing, stakes, causality, character arcs, scene construction. Every scene should do more than one job. Look for: conflict and forward motion in openings, causality over convenience, character lie vs truth/want vs need, theme and anti-theme pressure, structural turning points.`;

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
  "issues": [{"type": "issue_type", "severity": "minor|moderate|major|critical", "title": "", "description": "", "evidence": [], "suggestion": ""}]
}

Return ONLY valid JSON.`;

  const result = await callLLM(prompt, "powerful", SYSTEM, 8192);
  return extractJSON<DevEditResult>(result, { pacing: { rating: "unknown", notes: "" }, stakes: { rating: "unknown", notes: "" }, causality: { rating: "unknown", notes: "" }, characterArcs: [], sceneByScene: [], thematicNotes: [], issues: [] });
}
