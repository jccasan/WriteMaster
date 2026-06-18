/**
 * addiction-loop-analyzer.ts
 *
 * FORGE analysis module: scores each chapter against the four-step
 * dopamine prediction loop (Stakes → Big Question → Head Fake → Re-hook)
 * and produces prioritized fixes.
 */

import { callLLM } from "../../../llm";
import { getSkill } from "../../../skillLoader";

export interface AddictionLoopScore {
  stakes: number;       // 0-3
  big_question: number; // 0-3
  head_fake: number;    // 0-3
  re_hook: number;      // 0-3
  total: number;        // 0-12
  rating: "addictive" | "engaging" | "flat" | "vending_machine";
  stakes_notes: string;
  big_question_notes: string;
  head_fake_notes: string;
  re_hook_notes: string;
  priority_fixes: string[];
  big_question_quote: string;
  re_hook_quote: string;
}

export interface AddictionLoopResult {
  chapter_scores: Array<{
    chapter_number: number;
    title: string;
    score: AddictionLoopScore;
  }>;
  book_average: number;
  weakest_element: "stakes" | "big_question" | "head_fake" | "re_hook";
  strongest_element: "stakes" | "big_question" | "head_fake" | "re_hook";
  pattern_notes: string;
  top_fixes: string[];
}

function getRating(total: number): AddictionLoopScore["rating"] {
  if (total >= 10) return "addictive";
  if (total >= 7) return "engaging";
  if (total >= 4) return "flat";
  return "vending_machine";
}

export async function runAddictionLoopAnalysis(
  chapters: Array<{ chapter_number: number; title: string; content: string }>,
  maxChapters = 10
): Promise<AddictionLoopResult> {
  const skill = getSkill("ADDICTION_LOOP_CHECK");
  const chapterScores: AddictionLoopResult["chapter_scores"] = [];

  // Score each chapter (cap at maxChapters for cost)
  const toAnalyze = chapters.slice(0, maxChapters);

  for (const chapter of toAnalyze) {
    const raw = await callLLM(
      `You are a story structure analyst specializing in reader engagement.
Score this chapter against the four-step addiction loop framework.

${skill}

CHAPTER ${chapter.chapter_number}: "${chapter.title}"
---
${chapter.content.substring(0, 6000)}
---

Respond with ONLY a JSON object. No preamble, no markdown fences.

{
  "stakes": <0-3>,
  "stakes_notes": "<one sentence on what works or is missing>",
  "big_question": <0-3>,
  "big_question_notes": "<one sentence>",
  "big_question_quote": "<the actual Big Question as it appears in text, or MISSING>",
  "head_fake": <0-3>,
  "head_fake_notes": "<one sentence>",
  "re_hook": <0-3>,
  "re_hook_notes": "<one sentence>",
  "re_hook_quote": "<the re-hook as it appears at the end of the chapter, or MISSING>",
  "priority_fixes": ["<fix 1 — only include if element scored 0-1>", "<fix 2>"]
}`,
      "cheap"
    );

    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const total = (parsed.stakes ?? 0) + (parsed.big_question ?? 0) +
                    (parsed.head_fake ?? 0) + (parsed.re_hook ?? 0);

      chapterScores.push({
        chapter_number: chapter.chapter_number,
        title: chapter.title,
        score: {
          stakes: parsed.stakes ?? 0,
          big_question: parsed.big_question ?? 0,
          head_fake: parsed.head_fake ?? 0,
          re_hook: parsed.re_hook ?? 0,
          total,
          rating: getRating(total),
          stakes_notes: parsed.stakes_notes ?? "",
          big_question_notes: parsed.big_question_notes ?? "",
          head_fake_notes: parsed.head_fake_notes ?? "",
          re_hook_notes: parsed.re_hook_notes ?? "",
          priority_fixes: parsed.priority_fixes ?? [],
          big_question_quote: parsed.big_question_quote ?? "MISSING",
          re_hook_quote: parsed.re_hook_quote ?? "MISSING",
        },
      });
    } catch {
      // Skip failed parses
    }
  }

  if (chapterScores.length === 0) {
    return {
      chapter_scores: [],
      book_average: 0,
      weakest_element: "stakes",
      strongest_element: "stakes",
      pattern_notes: "Could not analyze chapters.",
      top_fixes: [],
    };
  }

  // Aggregate
  const avg = (key: keyof Pick<AddictionLoopScore, "stakes" | "big_question" | "head_fake" | "re_hook">) =>
    chapterScores.reduce((s, c) => s + c.score[key], 0) / chapterScores.length;

  const elements = {
    stakes: avg("stakes"),
    big_question: avg("big_question"),
    head_fake: avg("head_fake"),
    re_hook: avg("re_hook"),
  };

  const weakest = Object.entries(elements).sort((a, b) => a[1] - b[1])[0][0] as AddictionLoopResult["weakest_element"];
  const strongest = Object.entries(elements).sort((a, b) => b[1] - a[1])[0][0] as AddictionLoopResult["strongest_element"];
  const bookAverage = Object.values(elements).reduce((s, v) => s + v, 0);

  // Collect top fixes across all chapters
  const allFixes = chapterScores.flatMap(c => c.score.priority_fixes);
  const top_fixes = Array.from(new Set(allFixes)).slice(0, 8);

  // Pattern analysis
  const lowChapters = chapterScores.filter(c => c.score.total <= 4).map(c => c.chapter_number);
  const missingReHooks = chapterScores.filter(c => c.score.re_hook_quote === "MISSING").length;

  const pattern_notes = [
    lowChapters.length > 0 ? `Chapters ${lowChapters.join(", ")} score below 5/12 — high dropout risk.` : null,
    missingReHooks > 0 ? `${missingReHooks} chapter${missingReHooks > 1 ? "s" : ""} missing re-hooks — readers have natural stopping points.` : null,
    elements.head_fake < 1.5 ? "Head fakes are consistently weak — chapters are resolving too predictably." : null,
    elements.re_hook < 1.5 ? "Re-hooks are consistently weak — readers aren't being pulled to the next chapter." : null,
    elements.big_question < 1.5 ? "Big Questions are missing or loaded too late — readers aren't in prediction mode." : null,
  ].filter(Boolean).join(" ") || "Addiction loop patterns are generally solid.";

  return { chapter_scores: chapterScores, book_average: bookAverage, weakest_element: weakest, strongest_element: strongest, pattern_notes, top_fixes };
}
