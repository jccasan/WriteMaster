/**
 * tropeSystem.ts
 *
 * Assembles a combined writing context from 1-3 trope selections.
 * Primary: sets the genre contract
 * Secondary: adds convention layer
 * Tertiary: shapes pacing and atmosphere only
 */

import { getTropeById, getTropeList, type Trope } from "./tropeLibrary";

export interface TropeSelection {
  primary: string;
  secondary?: string;
  tertiary?: string;
}

export interface TropeContext {
  label: string;           // e.g. "Supernatural Espionage Thriller"
  reader_expectations: string;
  structural_requirements: string;
  forbidden_violations: string;
  pacing_guidance: string;
  combination_notes: string;
}

export function assembleTropeContext(selection: TropeSelection): TropeContext | null {
  const primary = getTropeById(selection.primary);
  if (!primary) return null;

  const secondary = selection.secondary ? getTropeById(selection.secondary) : null;
  const tertiary = selection.tertiary ? getTropeById(selection.tertiary) : null;

  // Build label
  const parts = [primary.name];
  if (secondary) parts.push(secondary.name);
  if (tertiary) parts.push(tertiary.name);
  const label = parts.join(" / ");

  // Reader expectations: primary is non-negotiable, secondary adds core conventions, tertiary is light
  const expectations: string[] = [
    `=== PRIMARY GENRE CONTRACT: ${primary.name} ===`,
    `The following are non-negotiable reader expectations for this genre. Violating any of these breaks the reader's trust:`,
    ...primary.reader_expectations.map(e => `• ${e}`),
  ];

  if (secondary) {
    expectations.push(`\n=== SECONDARY CONVENTIONS: ${secondary.name} ===`);
    expectations.push(`These conventions must be present but may be subordinate to the primary genre:`);
    // Top 3 secondary expectations
    secondary.reader_expectations.slice(0, 3).forEach(e => expectations.push(`• ${e}`));
  }

  if (tertiary) {
    expectations.push(`\n=== TERTIARY ATMOSPHERE: ${tertiary.name} ===`);
    expectations.push(`${tertiary.as_tertiary}`);
  }

  // Structural requirements: primary beats + secondary required elements
  const structural: string[] = [
    `=== STRUCTURAL BEATS: ${primary.name} (Primary) ===`,
    ...primary.structural_beats.map(b => `• ${b}`),
    `\nREQUIRED ELEMENTS:`,
    ...primary.required_elements.map(e => `• ${e}`),
  ];

  if (secondary) {
    structural.push(`\n=== SECONDARY REQUIRED ELEMENTS: ${secondary.name} ===`);
    secondary.required_elements.slice(0, 2).forEach(e => structural.push(`• ${e}`));
  }

  // Forbidden violations: all three contribute (primary strictly, secondary/tertiary lightly)
  const forbidden: string[] = [
    `=== FORBIDDEN VIOLATIONS ===`,
    `These break the reader contract for this genre combination:`,
    `\n${primary.name} (Primary — strict):`,
    ...primary.forbidden_violations.map(v => `• ${v}`),
  ];

  if (secondary) {
    forbidden.push(`\n${secondary.name} (Secondary):`);
    secondary.forbidden_violations.slice(0, 2).forEach(v => forbidden.push(`• ${v}`));
  }

  // Pacing guidance
  const pacing: string[] = [
    `=== PACING GUIDANCE ===`,
    `${primary.name} (Primary): ${primary.pacing_note}`,
  ];
  if (secondary) pacing.push(`${secondary.name} (Secondary): ${secondary.pacing_note}`);
  if (tertiary) pacing.push(`${tertiary.name} (Tertiary): ${tertiary.pacing_note}`);

  // Combination notes: how these tropes interact
  const combo: string[] = [`=== COMBINATION NOTES ===`];
  combo.push(`How ${primary.name} governs as primary: ${primary.as_primary}`);
  if (secondary) combo.push(`How ${secondary.name} modifies as secondary: ${secondary.as_secondary}`);
  if (tertiary) combo.push(`How ${tertiary.name} functions as tertiary: ${tertiary.as_tertiary}`);

  return {
    label,
    reader_expectations: expectations.join("\n"),
    structural_requirements: structural.join("\n"),
    forbidden_violations: forbidden.join("\n"),
    pacing_guidance: pacing.join("\n"),
    combination_notes: combo.join("\n"),
  };
}

/**
 * Builds the full prompt injection block for a trope selection.
 * Used in: Pipeline 3 first draft, Pipeline 2 outlines, Pipeline 4 line edit.
 */
export function buildTropePromptBlock(selection: TropeSelection, mode: "full" | "outline" | "check" = "full"): string {
  const ctx = assembleTropeContext(selection);
  if (!ctx) return "";

  if (mode === "check") {
    // For line editing — just the forbidden violations and reader expectations
    return `TROPE CONVENTION CHECK (${ctx.label}):
${ctx.reader_expectations}

${ctx.forbidden_violations}`;
  }

  if (mode === "outline") {
    // For outlining — structural beats and reader expectations
    return `TROPE SYSTEM (${ctx.label}):
${ctx.reader_expectations}

${ctx.structural_requirements}

${ctx.pacing_guidance}

${ctx.combination_notes}`;
  }

  // Full mode — everything, for chapter writing
  return `TROPE SYSTEM (${ctx.label}):

READER EXPECTATIONS — these are the genre contract. Violating any of these breaks reader trust:
${ctx.reader_expectations}

${ctx.pacing_guidance}

${ctx.combination_notes}`;
}

export { getTropeList };
