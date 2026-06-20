/**
 * dimensionSystem.ts
 *
 * Assembles a combined writing context from a set of dimension selections
 * (one per dimension type, up to 6).
 *
 * Modes:
 *   "outline"  — Pipeline 2: functional definition + prose signature + failure modes
 *   "write"    — Pipeline 3: prose signature + AI defaults to avoid + active conflict warnings
 *   "edit"     — Pipeline 4: AI defaults to avoid + prose signature
 *   "full"     — all fields, for preview
 */

import { loadDimension, getDimensionType, DIMENSION_TYPES } from "./dimensionLoader";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export type DimensionSelections = Partial<Record<string, string>>;
// e.g. { "Moral Register": "moral-register-noir", "Pacing": "pacing-slow-burn", ... }

export type DimensionMode = "outline" | "write" | "edit" | "full";

interface ConflictEntry {
  fileA: string;
  fileB: string;
  winner: string;
  overrideCondition: string;
}

// Parse the conflict matrix for active conflicts between selected dimensions
let conflictMatrixCache: ConflictEntry[] | null = null;

function loadConflictMatrix(): ConflictEntry[] {
  if (conflictMatrixCache) return conflictMatrixCache;

  const matrixPath = join(process.cwd(), "skills", "dimensions", "CONFLICT_MATRIX.md");
  if (!existsSync(matrixPath)) return [];

  try {
    const raw = readFileSync(matrixPath, "utf-8");
    const entries: ConflictEntry[] = [];

    // Parse table rows: | fileA | fileB | winner | override |
    const rowPattern = /\|\s*([a-z][a-z-]+)\s*\|\s*([a-z][a-z-]+)\s*\|\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|/g;
    let match;
    while ((match = rowPattern.exec(raw)) !== null) {
      const fileA = match[1].trim();
      const fileB = match[2].trim();
      const winner = match[3].trim();
      const override = match[4].trim();
      // Skip header rows and non-file rows
      if (fileA.includes("File") || winner.includes("Default") || fileA === "file-id") continue;
      entries.push({ fileA, fileB, winner, overrideCondition: override });
    }

    conflictMatrixCache = entries;
    return entries;
  } catch {
    return [];
  }
}

/**
 * Find active conflicts between a set of selected dimension IDs.
 */
export function findActiveConflicts(selectedIds: string[]): ConflictEntry[] {
  const matrix = loadConflictMatrix();
  const idSet = new Set(selectedIds);

  return matrix.filter(entry => {
    // Both files must be selected, and neither should be "Mutually exclusive"
    return idSet.has(entry.fileA) && idSet.has(entry.fileB);
  });
}

/**
 * Build the dimension prompt block for a set of selections.
 */
export function buildDimensionPromptBlock(
  selections: DimensionSelections,
  mode: DimensionMode = "write"
): string {
  const selectedIds = Object.values(selections).filter(Boolean) as string[];
  if (selectedIds.length === 0) return "";

  const dims = selectedIds
    .map(id => loadDimension(id))
    .filter(Boolean);

  if (dims.length === 0) return "";

  const activeConflicts = findActiveConflicts(selectedIds);
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════");
  lines.push("STORY BLUEPRINT — DIMENSION SPECIFICATIONS");
  lines.push("═══════════════════════════════════════");
  lines.push("");
  lines.push(`Active dimensions: ${dims.map(d => d!.oneLineDefinition.split("—")[0].trim()).join(" · ")}`);
  lines.push("");

  if (mode === "write" || mode === "full") {
    // PROSE SIGNATURES — most important for chapter writing
    lines.push("── PROSE SIGNATURES ─────────────────────");
    lines.push("These are not suggestions. They are the craft behaviors this story requires:");
    lines.push("");
    for (const dim of dims) {
      if (!dim) continue;
      lines.push(`${dim.type.toUpperCase()} [${dim.id}]:`);
      lines.push(dim.proseSignature);
      lines.push("");
    }

    // AI DEFAULTS TO AVOID
    lines.push("── AI WRITING DEFAULTS TO AVOID ─────────");
    lines.push("The following patterns are specifically wrong for this story's dimension profile:");
    lines.push("");
    for (const dim of dims) {
      if (!dim) continue;
      lines.push(`${dim.type} (${dim.id}):`);
      lines.push(dim.aiDefaultsToAvoid);
      lines.push("");
    }
  }

  if (mode === "outline" || mode === "full") {
    // FUNCTIONAL DEFINITIONS for outlining
    lines.push("── HOW THESE DIMENSIONS SHAPE THE STORY ─");
    lines.push("");
    for (const dim of dims) {
      if (!dim) continue;
      lines.push(`${dim.type.toUpperCase()} — ${dim.oneLineDefinition}`);
      lines.push("");
      // First paragraph of functional definition only (for brevity in outlines)
      const firstPara = dim.functionalDefinition.split("\n\n")[0];
      lines.push(firstPara);
      lines.push("");
    }

    // FAILURE MODES for outline awareness
    lines.push("── FAILURE MODES TO AVOID IN CHAPTER OUTLINES ─");
    for (const dim of dims) {
      if (!dim) continue;
      lines.push(`\n${dim.id}:`);
      lines.push(dim.failureModes);
    }
    lines.push("");
  }

  if (mode === "edit" || mode === "full") {
    // AI DEFAULTS for line editing
    lines.push("── DIMENSION-SPECIFIC LINE EDIT CHECKLIST ─");
    for (const dim of dims) {
      if (!dim) continue;
      lines.push(`\n${dim.type} [${dim.id}]:`);
      lines.push(dim.aiDefaultsToAvoid);
    }
    lines.push("");
  }

  // ACTIVE CONFLICTS — always shown when conflicts exist
  if (activeConflicts.length > 0) {
    lines.push("── ACTIVE DIMENSION CONFLICTS ────────────");
    lines.push("These dimension pairs conflict in this story profile. Default winner applies unless override condition is met:");
    lines.push("");
    for (const conflict of activeConflicts) {
      const isMutuallyExclusive =
        conflict.winner.toLowerCase().includes("mutually exclusive") ||
        conflict.overrideCondition.toLowerCase().includes("none");
      if (isMutuallyExclusive) {
        lines.push(`⚠ INCOMPATIBLE: ${conflict.fileA} + ${conflict.fileB} — ${conflict.winner}`);
      } else {
        lines.push(`▸ ${conflict.fileA} vs ${conflict.fileB}`);
        lines.push(`  Default winner: ${conflict.winner}`);
        lines.push(`  Override: ${conflict.overrideCondition}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Get the full assembled context for preview (returns structured object).
 */
export function assembleDimensionContext(selections: DimensionSelections) {
  const selectedIds = Object.values(selections).filter(Boolean) as string[];
  const dims = selectedIds.map(id => loadDimension(id)).filter(Boolean);
  const activeConflicts = findActiveConflicts(selectedIds);

  return {
    selections,
    selectedCount: dims.length,
    dimensions: dims.map(d => ({
      id: d!.id,
      type: d!.type,
      oneLineDefinition: d!.oneLineDefinition,
      proseSignature: d!.proseSignature,
      aiDefaultsToAvoid: d!.aiDefaultsToAvoid,
      failureModes: d!.failureModes,
    })),
    activeConflicts,
    hasIncompatiblePairs: activeConflicts.some(
      c => c.winner.toLowerCase().includes("mutually exclusive") ||
           c.overrideCondition.toLowerCase().includes("none")
    ),
  };
}

/** Normalize selections: ensure each value belongs to the correct type */
export function validateSelections(selections: DimensionSelections): {
  valid: boolean;
  errors: string[];
  normalized: DimensionSelections;
} {
  const errors: string[] = [];
  const normalized: DimensionSelections = {};

  for (const [type, id] of Object.entries(selections)) {
    if (!id) continue;
    const expectedType = getDimensionType(id);
    if (!expectedType) {
      errors.push(`Unknown dimension ID: ${id}`);
      continue;
    }
    if (expectedType !== type) {
      errors.push(`${id} belongs to "${expectedType}", not "${type}"`);
      continue;
    }
    normalized[type] = id;
  }

  return { valid: errors.length === 0, errors, normalized };
}
