/**
 * skillLoader.ts
 *
 * Loads portable skill files from the /skills directory and makes them
 * injectable into prompts via {{SKILL_NAME}} tokens.
 *
 * Skill files live in:
 *   skills/                        root-level skills
 *   skills/checks/                 reusable check/critique prompts
 *   skills/genre-tropes/           per-genre trope packs (JSON)
 *
 * Usage:
 *   import { injectSkills, getSkill } from "./skillLoader";
 *
 *   const prompt = injectSkills(`
 *     Here are the rules: {{AI_ISMS}}
 *     Names to avoid: {{CHARACTER_NAME_BLACKLIST}}
 *   `);
 *
 *   // Or fetch a single skill:
 *   const hookRubric = getSkill("HOOK_RUBRIC");
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";

const SKILLS_DIR = path.resolve("skills");

// Registry: token name -> file content
const registry: Map<string, string> = new Map();

let loaded = false;

/**
 * Walk the skills directory and load all .md files.
 * Token name is derived from the file path:
 *   skills/ai-isms.md              -> AI_ISMS
 *   skills/hook-rubric.md          -> HOOK_RUBRIC
 *   skills/checks/logic-check.md   -> CHECKS_LOGIC_CHECK
 *   skills/checks/emotional-check.md -> CHECKS_EMOTIONAL_CHECK
 */
function loadAll(): void {
  if (loaded) return;
  if (!existsSync(SKILLS_DIR)) {
    console.warn("[SkillLoader] skills/ directory not found — skipping load");
    loaded = true;
    return;
  }

  walkDir(SKILLS_DIR, SKILLS_DIR);
  loaded = true;
  console.log(`[SkillLoader] Loaded ${registry.size} skills:`, Array.from(registry.keys()).join(", "));
}

function walkDir(base: string, current: string): void {
  const entries = readdirSync(current, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      walkDir(base, fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const token = pathToToken(base, fullPath);
      const content = readFileSync(fullPath, "utf-8").trim();
      registry.set(token, content);
    }
  }
}

/**
 * Convert a file path to an uppercase token name.
 * skills/ai-isms.md              -> AI_ISMS
 * skills/checks/logic-check.md   -> CHECKS_LOGIC_CHECK
 */
function pathToToken(base: string, filePath: string): string {
  const relative = path.relative(base, filePath);            // e.g. "checks/logic-check.md"
  const withoutExt = relative.replace(/\.md$/, "");          // "checks/logic-check"
  return withoutExt
    .replace(/[/\\]/g, "_")                                  // "checks_logic-check"
    .replace(/-/g, "_")                                      // "checks_logic_check"
    .toUpperCase();                                          // "CHECKS_LOGIC_CHECK"
}

/**
 * Get a single skill by token name.
 * Returns empty string if not found (non-fatal — logs a warning).
 */
export function getSkill(token: string): string {
  loadAll();
  const skill = registry.get(token);
  if (!skill) {
    console.warn(`[SkillLoader] Skill not found: ${token}`);
    return "";
  }
  return skill;
}

/**
 * Replace all {{TOKEN}} placeholders in a prompt string with the
 * corresponding skill file contents. Unknown tokens are left as-is
 * and a warning is logged.
 */
export function injectSkills(prompt: string): string {
  loadAll();
  return prompt.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, token) => {
    const skill = registry.get(token);
    if (!skill) {
      console.warn(`[SkillLoader] Unknown skill token in prompt: {{${token}}}`);
      return match; // leave placeholder intact so the bug is visible
    }
    return skill;
  });
}

/**
 * Return all loaded token names. Useful for debugging and admin routes.
 */
export function listSkills(): string[] {
  loadAll();
  return Array.from(registry.keys()).sort();
}

/**
 * Force reload all skills from disk (useful during development when
 * skill files change without a server restart).
 */
export function reloadSkills(): void {
  registry.clear();
  loaded = false;
  loadAll();
}
