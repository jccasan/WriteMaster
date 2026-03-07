import { callLLM } from "../../../llm";

export interface SceneScanResult {
  scenes: {
    chapterNumber: number;
    sceneIndex: number;
    purpose: string;
    conflict: string;
    changeOccurred: boolean;
    plotValue: string;
    characterValue: string;
    thematicValue: string;
    necessityRating: string;
    issueFlagsJson: string[];
  }[];
  redundantScenes: string[];
  issues: { type: string; severity: string; title: string; description: string; evidence: string[]; suggestion: string }[];
}

const SYSTEM = `You are a scene-level analyst for fiction manuscripts. Every scene should do more than one job. Evaluate each scene for: purpose (what it accomplishes), conflict (what drives it), change (does something shift by scene end), and necessity (would the story suffer without it). Rate necessity honestly—some scenes may be underperforming or redundant.`;

export async function runSceneScan(
  chunkText: string,
  previousContext: string,
  genre: string,
  chapterNumbers: number[]
): Promise<SceneScanResult> {
  const prompt = `Analyze every scene in this manuscript chunk for purpose, conflict, change, and necessity.

GENRE: ${genre}
CHAPTERS IN THIS CHUNK: ${chapterNumbers.join(", ")}
PREVIOUS CONTEXT: ${previousContext || "Beginning of manuscript."}

CHUNK:
---
${chunkText}
---

Return JSON:
{
  "scenes": [{
    "chapterNumber": 1,
    "sceneIndex": 0,
    "purpose": "what this scene accomplishes",
    "conflict": "what conflict drives it",
    "changeOccurred": true,
    "plotValue": "how it advances plot",
    "characterValue": "how it develops character",
    "thematicValue": "how it serves theme",
    "necessityRating": "essential|strong|useful_but_weak|underperforming|redundant",
    "issueFlagsJson": ["any scene-level issues"]
  }],
  "redundantScenes": ["descriptions of scenes that may not be necessary"],
  "issues": [{"type": "scene_redundancy|pacing_drag", "severity": "minor|moderate|major", "title": "", "description": "", "evidence": [], "suggestion": ""}]
}

Return ONLY valid JSON.`;

  const result = await callLLM(prompt, "powerful", SYSTEM, 6144);
  const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try { return JSON.parse(cleaned); }
  catch { return { scenes: [], redundantScenes: [], issues: [] }; }
}
