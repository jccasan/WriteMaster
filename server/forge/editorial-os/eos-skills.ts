/**
 * eos-skills.ts
 *
 * Loads Editorial Operating System skill and reference files from
 * config/editorial-os/ so FORGE analysis modules can use them as
 * system-prompt material.
 *
 *   getEosSkill("developmental-editor")     -> skills/developmental-editor/SKILL.md (frontmatter stripped)
 *   getEosReference("REVIEW_OUTPUT_STANDARD") -> shared/references/REVIEW_OUTPUT_STANDARD.md
 *   getEosDoc("MASTER_ORCHESTRATOR_PROMPT.md") -> top-level doc
 */

import { readFileSync, existsSync } from "fs";
import path from "path";

const EOS_ROOT = path.resolve("config", "editorial-os");

const cache = new Map<string, string>();

function stripFrontmatter(md: string): string {
  if (md.startsWith("---")) {
    const end = md.indexOf("\n---", 3);
    if (end !== -1) return md.slice(end + 4).trim();
  }
  return md.trim();
}

function loadFile(relPath: string): string {
  const cached = cache.get(relPath);
  if (cached !== undefined) return cached;

  const fullPath = path.join(EOS_ROOT, relPath);
  let content = "";
  if (existsSync(fullPath)) {
    content = stripFrontmatter(readFileSync(fullPath, "utf-8"));
  } else {
    console.warn(`[EOS] File not found: ${fullPath}`);
  }
  cache.set(relPath, content);
  return content;
}

export function getEosSkill(name: string): string {
  return loadFile(path.join("skills", name, "SKILL.md"));
}

export function getEosReference(name: string): string {
  return loadFile(path.join("shared", "references", `${name}.md`));
}

export function getEosDoc(fileName: string): string {
  return loadFile(fileName);
}

/**
 * Shared rules appended to every EOS-derived reviewer system prompt.
 * Condensed from the review-output standard and editorial constitution:
 * confidence language and the taste-vs-craft distinction that keeps
 * subjective notes from being presented as commands.
 */
export const EOS_SHARED_RULES = `
# Shared review rules

- Severity scale: critical, major, moderate, minor, note.
- Confidence scale: high (clear textual evidence or established expertise), medium (likely concern with some ambiguity), low (tentative, taste-based, or insufficient context).
- Classify each note as objective, plausibility-based, genre-based, or taste-based. A taste note is not a command.
- Cite evidence from the text. Never fabricate expertise, consensus, or textual evidence.
- Preserve authorial intent. Recommend the smallest effective revision.
- Mark uncertainty explicitly. When real-world precision matters, flag it for research rather than inventing detail.
`.trim();

/**
 * Build a reviewer system prompt from an EOS skill plus the shared rules.
 */
export function buildReviewerSystem(skillName: string, extra?: string): string {
  const skill = getEosSkill(skillName);
  const parts = [skill, EOS_SHARED_RULES];
  if (extra) parts.push(extra);
  return parts.filter(Boolean).join("\n\n");
}
