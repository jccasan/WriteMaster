import { callLLM } from "../../../llm";
import { extractJSON } from "../parse-json";
import { prisma } from "../../db";
import { getEosSkill, EOS_SHARED_RULES } from "../../editorial-os/eos-skills";

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

/**
 * Reader-panel personas from the Editorial Operating System. Their persona
 * text is the full EOS skill definition, loaded from config/editorial-os/,
 * so each reader keeps its scoped mandate, workflow, and prohibitions.
 */
const EOS_PROFILES: Record<string, { name: string; skill: string; description: string }> = {
  commercial_thriller: {
    name: "Commercial Thriller Reader",
    skill: "commercial-thriller-reader",
    description: "Reads as the commercial thriller market: hook strength, momentum, genre promise, and whether the book competes on the bestseller shelf.",
  },
  pacing_suspense: {
    name: "Pacing & Suspense Reader",
    skill: "pacing-suspense-reader",
    description: "Tracks tension architecture: where suspense builds, sags, or breaks, and whether chapter turns compel continued reading.",
  },
  character_arc: {
    name: "Character Arc Reader",
    skill: "character-arc-reader",
    description: "Follows character goals, choices, and change; flags unearned decisions and arcs that stall or reverse without cause.",
  },
  dialogue_voice: {
    name: "Dialogue & Voice Reader",
    skill: "dialogue-voice-reader",
    description: "Listens for distinct character voices, subtext, and dialogue that carries story work rather than filler.",
  },
  emotional_impact: {
    name: "Emotional Impact Reader",
    skill: "emotional-impact-reader",
    description: "Reports what the text actually made a reader feel, where emotion lands, and where it is told rather than earned.",
  },
  skeptical_mainstream: {
    name: "Skeptical Mainstream Reader",
    skill: "skeptical-mainstream-reader",
    description: "A hard-to-please general reader outside the core genre audience; surfaces accessibility problems and abandonment risk.",
  },
  series_ending: {
    name: "Series & Ending Reader",
    skill: "series-ending-reader",
    description: "Judges ending payoff, promise fulfillment, thread resolution, and series setup without dangling-thread frustration.",
  },
};

function buildEosPersona(profile: { name: string; skill: string; description: string }): string {
  const skillText = getEosSkill(profile.skill);
  if (!skillText) return profile.description;
  return `You are the "${profile.name}" from an editorial reader panel. Your role is defined below — stay within its scope.\n\n${skillText}\n\n${EOS_SHARED_RULES}`;
}

function resolveProfile(profileKey: string): { name: string; persona: string } {
  const eos = EOS_PROFILES[profileKey];
  if (eos) return { name: eos.name, persona: buildEosPersona(eos) };
  return PROFILES[profileKey] || PROFILES.genre_enthusiast;
}

/**
 * Make sure every selectable profile (legacy + EOS) has a BetaReaderProfile
 * row, since responses are stored against DB profiles matched by name.
 */
export async function ensureBetaReaderProfiles(): Promise<void> {
  const wanted: { name: string; description: string }[] = [
    ...Object.values(PROFILES).map(p => ({ name: p.name, description: p.persona })),
    ...Object.values(EOS_PROFILES).map(p => ({ name: p.name, description: p.description })),
  ];
  for (const w of wanted) {
    const existing = await prisma.betaReaderProfile.findFirst({ where: { name: w.name } });
    if (!existing) {
      await prisma.betaReaderProfile.create({
        data: { name: w.name, description: w.description },
      });
    }
  }
}

export async function runBetaReader(
  chunkText: string,
  previousContext: string,
  genre: string,
  profileKey: string
): Promise<BetaReaderResult> {
  const profile = resolveProfile(profileKey);

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
  return extractJSON<BetaReaderResult>(result, {
    profileName: profile.name, hookedAt: "", attentionSaggedAt: "",
    confusionPoints: [], strongestMoments: [], leastCredibleMoments: [],
    favoriteCharacterReaction: "", wouldKeepReading: true, mightQuitAt: "",
    finalEmotionalReaction: "", recommendation: ""
  });
}

export function getProfileKeys(): string[] {
  return [...Object.keys(PROFILES), ...Object.keys(EOS_PROFILES)];
}

export function getLegacyProfileKeys(): string[] {
  return Object.keys(PROFILES);
}

export function getProfileCatalog(): { key: string; name: string; description: string; source: "legacy" | "eos" }[] {
  return [
    ...Object.entries(PROFILES).map(([key, p]) => ({
      key, name: p.name, description: p.persona, source: "legacy" as const,
    })),
    ...Object.entries(EOS_PROFILES).map(([key, p]) => ({
      key, name: p.name, description: p.description, source: "eos" as const,
    })),
  ];
}
