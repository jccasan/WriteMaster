import { callLLM } from "../../../llm";

export interface BetaReaderResult {
  profileName: string;
  hookedAt: string;
  attentionSaggedAt: string;
  confusionPoints: string[];
  strongestMoments: string[];
  leastCredibleMoments: string[];
  favoriteCharacterReaction: string;
  wouldKeepReading: boolean;
  mightQuitAt: string;
  finalEmotionalReaction: string;
  recommendation: string;
}

const PROFILES: Record<string, { name: string; persona: string }> = {
  genre_enthusiast: {
    name: "Genre Enthusiast",
    persona: "You are an avid reader of this genre who reads 3-4 books per month in the category. You know tropes well and appreciate both adherence to and subversion of genre conventions. You're forgiving of prose imperfections if the story grips you."
  },
  casual_commercial: {
    name: "Casual Commercial Reader",
    persona: "You read bestsellers and popular fiction. You want a page-turner that's easy to follow. You lose patience with slow starts, confusing timelines, or too many characters. Accessibility matters most."
  },
  emotion_first: {
    name: "Emotion-First Reader",
    persona: "You read for emotional connection. Character depth and authentic feeling matter more than plot cleverness. You notice when emotions feel forced or when characters behave inconsistently for plot convenience."
  },
  pacing_sensitive: {
    name: "Pacing-Sensitive Reader",
    persona: "You have a keen sense of narrative rhythm. You notice when chapters drag, when action is too compressed, when transitions are clumsy. You put books down when the pacing fails, regardless of other qualities."
  },
  critical_craft: {
    name: "Critical Craft Reader",
    persona: "You're a writing workshop participant who reads with craft awareness. You notice POV violations, prose weaknesses, structural issues, and thematic inconsistencies. You appreciate ambition but demand execution."
  }
};

export async function runBetaReader(
  chunkText: string,
  previousContext: string,
  genre: string,
  profileKey: string
): Promise<BetaReaderResult> {
  const profile = PROFILES[profileKey] || PROFILES.genre_enthusiast;
  
  const prompt = `Read this manuscript chunk as a beta reader and give your honest reaction.

GENRE: ${genre}
PREVIOUS CONTEXT: ${previousContext || "Beginning of manuscript."}

CHUNK:
---
${chunkText}
---

Return JSON:
{
  "profileName": "${profile.name}",
  "hookedAt": "where/when you got hooked (or didn't)",
  "attentionSaggedAt": "where attention dropped",
  "confusionPoints": ["moments of confusion"],
  "strongestMoments": ["most compelling moments"],
  "leastCredibleMoments": ["moments that broke believability"],
  "favoriteCharacterReaction": "which character moment resonated most",
  "wouldKeepReading": true,
  "mightQuitAt": "where you might stop reading",
  "finalEmotionalReaction": "how you felt at the end of this section",
  "recommendation": "1-2 sentence recommendation"
}

Return ONLY valid JSON.`;

  const result = await callLLM(prompt, "cheap", profile.persona, 4096);
  const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try { return JSON.parse(cleaned); }
  catch {
    return {
      profileName: profile.name, hookedAt: "", attentionSaggedAt: "",
      confusionPoints: [], strongestMoments: [], leastCredibleMoments: [],
      favoriteCharacterReaction: "", wouldKeepReading: true, mightQuitAt: "",
      finalEmotionalReaction: "Parse failed", recommendation: ""
    };
  }
}

export function getProfileKeys(): string[] {
  return Object.keys(PROFILES);
}
