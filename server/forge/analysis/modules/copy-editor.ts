import { callLLM } from "../../../llm";
import { extractJSON } from "../parse-json";

export interface CopyEditResult {
  proseQuality: { rating: string; notes: string };
  voiceConsistency: { rating: string; notes: string };
  dialogueNotes: string[];
  cliches: string[];
  showDontTell: string[];
  issues: { type: string; severity: string; title: string; description: string; evidence: string[]; suggestion: string }[];
}

const SYSTEM = `You are a meticulous copy editor for fiction. Focus on prose clarity, voice consistency, dialogue authenticity, cliché detection, and show-don't-tell violations. Preserve the author's voice—flag problems without rewriting the entire style. Be specific with evidence.`;

export async function runCopyEdit(
  chunkText: string,
  previousContext: string,
  genre: string
): Promise<CopyEditResult> {
  const prompt = `Copy-edit this manuscript chunk. Focus on prose-level craft.

GENRE: ${genre}
PREVIOUS CONTEXT: ${previousContext || "Beginning of manuscript."}

CHUNK:
---
${chunkText}
---

Return JSON:
{
  "proseQuality": {"rating": "polished|adequate|rough|needs_work", "notes": ""},
  "voiceConsistency": {"rating": "consistent|mostly_consistent|inconsistent", "notes": ""},
  "dialogueNotes": ["observations about dialogue quality"],
  "cliches": ["identified clichés with quotes"],
  "showDontTell": ["tell-don't-show instances with quotes"],
  "issues": [{"type": "prose_clarity|inconsistent_voice", "severity": "minor|moderate|major", "title": "", "description": "", "evidence": ["quoted text"], "suggestion": ""}]
}

Return ONLY valid JSON.`;

  const result = await callLLM(prompt, "powerful", SYSTEM, 6144);
  return extractJSON<CopyEditResult>(result, { proseQuality: { rating: "unknown", notes: "" }, voiceConsistency: { rating: "unknown", notes: "" }, dialogueNotes: [], cliches: [], showDontTell: [], issues: [] });
}
