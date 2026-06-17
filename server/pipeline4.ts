/**
 * pipeline4.ts
 *
 * Pipeline 4 — Line Editing & AI-Isms Removal
 *
 * Takes a completed chapter (from Pipeline 3 or the standard writer) and runs
 * it through a targeted line-editing pass that catches what the chapter-writing
 * pipeline misses: micro-level AI tells, prose rhythm issues, and the specific
 * patterns that trained readers flag.
 *
 * Operates in chunks to stay within context limits and avoid rewriting
 * more than necessary. Uses the check-plan-rewrite pattern throughout.
 *
 * Steps:
 *   0   Init
 *   1   AI-isms scan — full chapter, produce flagged list       (cheap)
 *   2   Dialogue audit — naturalness + subtext check            (cheap)
 *   3   Pacing audit — sentence rhythm + variety check          (cheap)
 *   4   Consolidate findings into unified edit plan             (cheap)
 *   5   Line edit rewrite — implement plan, change nothing else (powerful)
 *   6   Verify — quick diff check that plan was applied         (cheap)
 */

import { callLLM } from "./llm";
import {
  AI_WRITING_RULES,
  ANTI_SLOP_FILTER,
  DEFAULT_DECISION_RULE,
} from "./writing-rules";
import { getSkill } from "./skillLoader";

export interface LineEditState {
  pipeline4_id: string;
  book_id: string;
  chapter_number: number;
  chapter_title: string;
  created_at: string;

  // Input
  original_text: string;
  style_guide: string;  // Optional — used to ensure edits align with author voice

  // Pipeline outputs
  ai_isms_scan: string;
  dialogue_audit: string;
  pacing_audit: string;
  addiction_loop_audit: string;
  edit_plan: string;
  edited_draft: string;
  verification: string;

  current_step: number;
}

const STEP_NAMES = [
  "Initialization",
  "AI-Isms Scan",
  "Dialogue Audit",
  "Pacing Audit",
  "Addiction Loop Audit",
  "Edit Plan Consolidation",
  "Line Edit Rewrite",
  "Verification",
];

export function getP4StepName(step: number): string {
  return STEP_NAMES[step] ?? "Unknown Step";
}

export function createEmptyLineEditState(
  pipeline4Id: string,
  bookId: string,
  chapterNumber: number,
  chapterTitle: string,
  originalText: string,
  styleGuide: string
): LineEditState {
  return {
    pipeline4_id: pipeline4Id,
    book_id: bookId,
    chapter_number: chapterNumber,
    chapter_title: chapterTitle,
    created_at: new Date().toISOString(),
    original_text: originalText,
    style_guide: styleGuide,
    ai_isms_scan: "",
    dialogue_audit: "",
    pacing_audit: "",
    addiction_loop_audit: "",
    edit_plan: "",
    edited_draft: "",
    verification: "",
    current_step: 0,
  };
}

export async function runP4Step(state: LineEditState): Promise<{
  updatedState: LineEditState;
  outputPreview: string;
}> {
  let outputPreview = "";
  const aiIsms = getSkill("AI_ISMS");
  const styleCheck = getSkill("CHECKS_STYLE_CHECK");

  switch (state.current_step) {

    // ── 0: INIT ──────────────────────────────────────────────────────────────
    case 0: {
      outputPreview = `Line edit pipeline initialized for Chapter ${state.chapter_number}: "${state.chapter_title}"`;
      state.current_step = 1;
      break;
    }

    // ── 1: AI-ISMS SCAN ───────────────────────────────────────────────────────
    case 1: {
      const result = await callLLM(
        `You are a line editor specializing in detecting AI-generated prose patterns. Scan the chapter below and produce a flagged list of every AI-tell instance found.

CHAPTER TEXT:
${state.original_text}

AI-ISMS DETECTION GUIDE:
${aiIsms}

Instructions:
- Work through the chapter systematically, paragraph by paragraph
- Flag every instance of a banned word, banned phrase, banned structural pattern, or anti-pattern
- For each flag: quote the exact problematic phrase, identify which category of AI-tell it is, and provide a specific replacement
- Do NOT flag the same pattern type more than 10 times — after 10 instances of the same issue, note "X additional instances of [pattern] found throughout — apply fix globally"
- Do NOT rewrite yet — produce the flagged list only

Output as: AI-ISMS FLAG LIST

Format each item as:
[N]. ORIGINAL: "[exact quote]"
     CATEGORY: [which pattern type from the guide]
     FIX: "[specific replacement or instruction]"`,
        "cheap",
        undefined,
        8192
      );
      state.ai_isms_scan = result.trim();
      state.current_step = 2;
      const flagCount = (result.match(/^\[\d+\]\./gm) ?? []).length;
      outputPreview = `AI-isms scan complete. ${flagCount} instances flagged.`;
      break;
    }

    // ── 2: DIALOGUE AUDIT ─────────────────────────────────────────────────────
    case 2: {
      const result = await callLLM(
        `You are a dialogue editor. Audit the dialogue in the chapter below for naturalness, subtext, and AI-tell patterns.

CHAPTER TEXT:
${state.original_text}

Scan every dialogue exchange and flag instances of:

1. ON-THE-NOSE DIALOGUE: Characters who say exactly what they mean when real people would be indirect, evasive, or say something else entirely
   Flag: the exact line | Fix: what a real person would more likely say in that situation

2. INTRODUCTION TELLS: Characters who introduce themselves with title/rank to people who already know them
   Flag: the exact line | Fix: rewrite without unnecessary self-identification

3. EXPOSITION DIALOGUE: Characters narrating plot or backstory to other characters who already know it (for the reader's benefit)
   Flag: the passage | Fix: suggest what they would actually talk about

4. UNIFORM REGISTER: Dialogue where all characters sound alike — same vocabulary level, same rhythm, same degree of directness
   Flag: the exchange | Fix: describe how these specific characters would differently phrase this

5. OVERUSED DIALOGUE TAGS: "said thoughtfully," "replied carefully," "answered with a sigh" — let action beats or voice carry tone
   Flag: the tag | Fix: the action beat or restructure

6. SPEECHES: Any character who delivers more than 4 consecutive sentences without interruption or reaction from another character in a scene with other people present
   Flag: the speech | Fix: break it up or justify why the character talks this long

If a category has no issues: "No [category] issues found."

Output as: DIALOGUE AUDIT REPORT`,
        "cheap",
        undefined,
        6144
      );
      state.dialogue_audit = result.trim();
      state.current_step = 3;
      outputPreview = result.substring(0, 200) + "...";
      break;
    }

    // ── 3: PACING AUDIT ───────────────────────────────────────────────────────
    case 3: {
      const result = await callLLM(
        `You are a prose rhythm editor. Audit the chapter below for sentence variety, pacing problems, and structural AI patterns.

CHAPTER TEXT:
${state.original_text}

Scan for:

1. SENTENCE MONOTONY: Three or more consecutive sentences with identical structure (all short, all long, all subject-verb-object, all starting with "She/He/They")
   Flag: the passage | Fix: suggest structural variation

2. PARAGRAPH RHYTHM BREAKS: Passages where all paragraphs are the same length, creating a flat reading experience
   Flag: the passage | Fix: suggest where to break, combine, or expand

3. ROBOTIC BALANCE: Repeated two-part sentences joined by "but," "and," or "yet" that create a hypnotic balance:
   "She was afraid, but she walked forward." x3 in a page
   Flag: the instances | Fix: vary the clause relationship

4. BEIGE PASSAGES: Technically competent paragraphs where nothing is specific, nothing is surprising, nothing could only come from this story
   Flag: the passage | Fix: identify the specific detail or tension that is missing

5. OVER-TRANSITIONS: "Meanwhile," "Across town," "Back at," "As this was happening" — used instead of cutting on sensory detail or action
   Flag: the transition | Fix: suggest cut point or sensory-led transition

6. FRICTIONLESS FILLER: Scenes or passages where characters walk through doors, sit down, pour coffee, exchange pleasantries — with no second job being done
   Flag: the passage | Fix: either cut or identify what character/tension work it could do

If a category has no issues: "No [category] issues found."

Output as: PACING AUDIT REPORT`,
        "cheap",
        undefined,
        6144
      );
      state.pacing_audit = result.trim();
      state.current_step = 4;
      outputPreview = result.substring(0, 200) + "...";
      break;
    }

    // ── 4: ADDICTION LOOP AUDIT ───────────────────────────────────────────────
    case 4: {
      const addictionLoop = getSkill("ADDICTION_LOOP_CHECK");
      const result = await callLLM(
        `You are a story structure editor specializing in reader engagement and narrative tension.
Evaluate this chapter against the four-step addiction loop framework.

${addictionLoop}

CHAPTER ${state.chapter_number}: "${state.chapter_title}"
${state.original_text}

Score each element (0-3) and identify specific fixes:

STAKES (0-3): [score]
- Established by word 200? [yes/no]
- Character identified? [yes/no]
- Specific risk named? [yes/no]
- Urgency present? [yes/no]
- Fix needed: [specific fix or "none"]

BIG QUESTION (0-3): [score]
- Loaded early enough? [yes/no]
- Specific enough for readers to predict? [yes/no]
- Quote the Big Question as it currently appears (or "MISSING"):
- Fix needed: [specific fix or "none"]

HEAD FAKE (0-3): [score]
- Does the chapter break the reader's prediction? [yes/no]
- Is the outcome logical in retrospect? [yes/no]
- What did readers predict vs. what happened:
- Fix needed: [specific fix or "none"]

RE-HOOK (0-3): [score]
- Does a new question open before this one closes? [yes/no]
- Is there a gap between loop close and next open? [yes/no]
- Quote the re-hook as it currently appears (or "MISSING"):
- Fix needed: [specific fix or "none"]

TOTAL: [X]/12

PRIORITY FIXES (only items scoring 0-1):
List specific, actionable changes to the existing prose that would improve each weak element.
Do NOT rewrite the chapter — flag and prescribe.`,
        "cheap",
        undefined,
        4096
      );
      state.addiction_loop_audit = result.trim();
      state.current_step = 5;
      const score = result.match(/TOTAL:\s*(\d+)\/12/)?.[1] ?? "?";
      outputPreview = `Addiction loop audit complete. Score: ${score}/12`;
      break;
    }

    // ── 5: CONSOLIDATED EDIT PLAN ─────────────────────────────────────────────
    case 5: {
      const styleSection = state.style_guide
        ? `PROSE STYLE GUIDE (ensure edits align with this voice):\n${state.style_guide}\n\n`
        : "";

      const result = await callLLM(
        `You are a senior editor. Consolidate the four audit reports below into a single unified Edit Plan, ordered by impact.

AI-ISMS FLAG LIST:
${state.ai_isms_scan}

DIALOGUE AUDIT REPORT:
${state.dialogue_audit}

PACING AUDIT REPORT:
${state.pacing_audit}

ADDICTION LOOP AUDIT:
${state.addiction_loop_audit}

${styleSection}

Instructions:
1. Merge all findings into a single numbered list
2. Remove duplicates (same phrase flagged by multiple audits — keep the most specific fix)
3. Order by impact: addiction loop structural issues first (highest reader impact), then AI-isms, then dialogue, then pacing
4. For global patterns (appearing 5+ times), write ONE combined fix instruction:
   "GLOBAL: Replace all instances of [pattern] with [specific fix approach]. Approximately N instances throughout."
5. For specific instances, keep the exact quote + fix format
6. Cap the total plan at 35 items — if there are more, combine related items

Output as: UNIFIED EDIT PLAN
Format: [N]. [GLOBAL/SPECIFIC]: [original] → [fix]`,
        "cheap",
        undefined,
        6144
      );
      state.edit_plan = result.trim();
      state.current_step = 6;
      const planCount = (result.match(/^\[\d+\]\./gm) ?? []).length;
      outputPreview = `Edit plan consolidated: ${planCount} items.`;
      break;
    }

    // ── 6: LINE EDIT REWRITE ──────────────────────────────────────────────────
    case 6: {
      const result = await callLLM(
        `You are a precise line editor. Implement the edit plan into the chapter. Change only what the plan specifies.

ORIGINAL CHAPTER:
${state.original_text}

UNIFIED EDIT PLAN:
${state.edit_plan}

Instructions:
- Implement every item in the edit plan
- For GLOBAL items: apply the fix throughout the entire chapter, not just at one location
- For SPECIFIC items: apply the fix at the flagged location only
- Do NOT change anything not covered by the edit plan
- Do NOT improve, expand, or restructure passages that weren't flagged
- Do NOT change plot, character beats, or scene structure
- Preserve the chapter title heading
- Reproduce the ENTIRE chapter with edits applied

${ANTI_SLOP_FILTER}

${DEFAULT_DECISION_RULE}

Output ONLY the edited chapter text.`,
        "powerful",
        undefined,
        16384
      );
      state.edited_draft = result.trim();
      state.current_step = 7;
      outputPreview = `Line edit complete (${result.length} chars, ~${Math.round(result.split(/\s+/).length)} words)`;
      break;
    }

    // ── 7: VERIFICATION ───────────────────────────────────────────────────────
    case 7: {
      const result = await callLLM(
        `You are a quality control editor. Verify that the line edit was applied correctly.

EDIT PLAN:
${state.edit_plan}

EDITED CHAPTER:
${state.edited_draft}

Check:
1. Were the top 5 items in the edit plan actually implemented? Quote the relevant section of the edited chapter for each.
2. Are there any remaining AI-isms from the plan that were missed?
3. Did the editor introduce any NEW issues not present in the original (new AI-tells, new awkward phrasing, structural changes not in the plan)?
4. Word count check: original was approximately ${Math.round(state.original_text.split(/\s+/).length)} words. Edited version should be within 10% of this. Is it?

Output as: VERIFICATION REPORT

If all checks pass: "VERIFICATION PASSED — edit applied correctly."
If issues found: list each specifically so the human can review.`,
        "cheap"
      );
      state.verification = result.trim();
      state.current_step = 8;
      const passed = result.includes("PASSED");
      outputPreview = passed
        ? "Verification passed. Line edit complete."
        : `Verification flagged issues — review needed. ${result.substring(0, 200)}...`;
      break;
    }

    default:
      throw new Error(`Pipeline 4 step ${state.current_step} is out of range. Pipeline is complete.`);
  }

  return { updatedState: state, outputPreview };
}
