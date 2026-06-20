/**
 * dimensionLoader.ts
 *
 * Parses the dimension library files from skills/dimensions/ and caches
 * the structured data for use by the dimension system.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

export interface DimensionFile {
  id: string;
  type: string;
  oneLineDefinition: string;
  functionalDefinition: string;
  readerPsychology: string;
  proseSignature: string;
  calibrationExamples: string;
  failureModes: string;
  aiDefaultsToAvoid: string;
  conflictWithOtherDimensions: string;
  combinationNotes: string;
  raw: string;
}

export interface DimensionSummary {
  id: string;
  type: string;
  oneLineDefinition: string;
}

const DIMENSIONS_DIR = join(process.cwd(), "skills", "dimensions");

// File IDs organized by type — mirrors the master list
export const DIMENSION_TYPES: Record<string, string[]> = {
  "Moral Register": [
    "moral-register-noir",
    "moral-register-clear-stakes",
    "moral-register-tragic",
    "moral-register-grey",
    "moral-register-nihilistic",
  ],
  "Pacing": [
    "pacing-thriller-escalation",
    "pacing-slow-burn",
    "pacing-procedural",
    "pacing-propulsive",
  ],
  "Supernatural Mechanic": [
    "supernatural-mechanic-absent",
    "supernatural-mechanic-atmospheric",
    "supernatural-mechanic-operative",
    "supernatural-mechanic-revelatory",
    "supernatural-mechanic-central",
  ],
  "Plot Engine": [
    "plot-engine-information",
    "plot-engine-survival",
    "plot-engine-pursuit",
    "plot-engine-revelation",
    "plot-engine-restoration",
    "plot-engine-escalation",
  ],
  "Protagonist Structure": [
    "protagonist-structure-operative",
    "protagonist-structure-investigator",
    "protagonist-structure-asset",
    "protagonist-structure-insider-turned-outsider",
    "protagonist-structure-outsider-turned-insider",
    "protagonist-structure-reluctant-inheritor",
  ],
  "Tone Register": [
    "tone-register-grounded-cynicism",
    "tone-register-mounting-dread",
    "tone-register-procedural-cold",
    "tone-register-morally-earnest",
    "tone-register-dark-wit",
  ],
};

// All 25 IDs in order
export const ALL_DIMENSION_IDS = Object.values(DIMENSION_TYPES).flat();

// Cache
const cache = new Map<string, DimensionFile>();
let summaryCache: DimensionSummary[] | null = null;

/**
 * Extract a named section from dimension markdown.
 * Sections begin with ## SECTION NAME and end at the next ## or EOF.
 */
function extractSection(markdown: string, sectionName: string): string {
  const pattern = new RegExp(
    `## ${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`,
    "i"
  );
  const match = markdown.match(pattern);
  return match ? match[1].trim() : "";
}

function parseDimensionFile(id: string, raw: string): DimensionFile {
  return {
    id: extractSection(raw, "FILE ID") || id,
    type: extractSection(raw, "DIMENSION TYPE"),
    oneLineDefinition: extractSection(raw, "ONE-LINE DEFINITION"),
    functionalDefinition: extractSection(raw, "FUNCTIONAL DEFINITION"),
    readerPsychology: extractSection(raw, "READER PSYCHOLOGY"),
    proseSignature: extractSection(raw, "PROSE SIGNATURE"),
    calibrationExamples: extractSection(raw, "CALIBRATION EXAMPLES"),
    failureModes: extractSection(raw, "FAILURE MODES"),
    aiDefaultsToAvoid: extractSection(raw, "AI WRITING DEFAULTS TO AVOID"),
    conflictWithOtherDimensions: extractSection(raw, "CONFLICT WITH OTHER DIMENSIONS"),
    combinationNotes: extractSection(raw, "COMBINATION NOTES"),
    raw,
  };
}

export function loadDimension(id: string): DimensionFile | null {
  if (cache.has(id)) return cache.get(id)!;

  const filePath = join(DIMENSIONS_DIR, `${id}.md`);
  if (!existsSync(filePath)) {
    console.warn(`[DimensionLoader] File not found: ${filePath}`);
    return null;
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = parseDimensionFile(id, raw);
    cache.set(id, parsed);
    return parsed;
  } catch (err) {
    console.error(`[DimensionLoader] Failed to load ${id}:`, err);
    return null;
  }
}

export function loadAllDimensions(): DimensionFile[] {
  return ALL_DIMENSION_IDS.map(id => loadDimension(id)).filter(Boolean) as DimensionFile[];
}

export function getDimensionSummaries(): DimensionSummary[] {
  if (summaryCache) return summaryCache;

  summaryCache = ALL_DIMENSION_IDS.map(id => {
    const dim = loadDimension(id);
    if (!dim) return null;
    return {
      id: dim.id,
      type: dim.type,
      oneLineDefinition: dim.oneLineDefinition,
    };
  }).filter(Boolean) as DimensionSummary[];

  return summaryCache;
}

export function getDimensionType(id: string): string | null {
  for (const [type, ids] of Object.entries(DIMENSION_TYPES)) {
    if (ids.includes(id)) return type;
  }
  return null;
}

/** Invalidate cache (useful in dev) */
export function clearDimensionCache() {
  cache.clear();
  summaryCache = null;
}
