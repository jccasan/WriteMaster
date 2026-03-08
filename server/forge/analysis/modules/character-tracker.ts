import { callLLM } from "../../../llm";
import { extractJSON } from "../parse-json";

export interface CharacterTrackResult {
  characters: {
    name: string;
    aliases: string[];
    description: string;
    traits: string[];
    goals: string[];
    motives: string[];
    relationships: { character: string; type: string; notes: string }[];
    injuries: { description: string; chapter: number; resolved: boolean }[];
    voiceNotes: string[];
    continuityNotes: string[];
  }[];
  characterInconsistencies: string[];
  issues: { type: string; severity: string; title: string; description: string; evidence: string[]; suggestion: string }[];
}

const SYSTEM = `You are a character continuity tracker for fiction manuscripts. Track every character's state changes: new traits revealed, relationship changes, physical injuries, emotional shifts, goals and motives. Watch for inconsistencies in character behavior, knowledge, or physical state. Flag characters who appear without introduction or disappear without explanation.`;

export async function runCharacterTrack(
  chunkText: string,
  previousContext: string,
  genre: string
): Promise<CharacterTrackResult> {
  const prompt = `Track all character appearances and state changes in this manuscript chunk.

GENRE: ${genre}
PREVIOUS CONTEXT: ${previousContext || "Beginning of manuscript."}

CHUNK:
---
${chunkText}
---

Return JSON:
{
  "characters": [{
    "name": "full name",
    "aliases": ["nicknames or references"],
    "description": "physical/personality description revealed here",
    "traits": ["character traits shown"],
    "goals": ["stated or implied goals"],
    "motives": ["driving motivations"],
    "relationships": [{"character": "other char name", "type": "ally|antagonist|love_interest|mentor|family|colleague", "notes": ""}],
    "injuries": [{"description": "physical injury", "chapter": 1, "resolved": false}],
    "voiceNotes": ["dialogue voice observations"],
    "continuityNotes": ["things to track for consistency"]
  }],
  "characterInconsistencies": ["any inconsistencies noticed with prior context"],
  "issues": [{"type": "character_inconsistency|flat_arc|unclear_motivation", "severity": "minor|moderate|major", "title": "", "description": "", "evidence": [], "suggestion": ""}]
}

Return ONLY valid JSON.`;

  const result = await callLLM(prompt, "powerful", SYSTEM, 8192);
  return extractJSON<CharacterTrackResult>(result, { characters: [], characterInconsistencies: [], issues: [] });
}
