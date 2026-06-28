/**
 * editBookRoutes.ts
 *
 * POST /api/edit-book/line-edit   — clean a chapter with full prose rules
 * POST /api/edit-book/scan        — scan for AI-tells, return flagged list only
 * POST /api/edit-book/rewrite     — rewrite a selected passage
 */

import { Router } from "express";
import { callLLM } from "./llm";
import { PROSE_RULES, SCENE_RULES, DEFAULT_DECISION_RULE } from "./writing-rules";
import { getSkill } from "./skillLoader";

const router = Router();

// ─── LINE EDIT ────────────────────────────────────────────────────────────────
// Full chapter clean: apply prose rules, fix AI-tells, preserve the author's voice.

router.post("/line-edit", async (req, res) => {
  const { chapter_title, content, style_notes } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "content is required" });

  const aiIsms = getSkill("AI_ISMS") ?? "";

  const prompt = `You are a professional manuscript line editor. Your job is to clean the prose without rewriting the story.

CHAPTER: ${chapter_title ?? "Untitled"}

ORIGINAL TEXT:
${content}

${style_notes ? `AUTHOR'S STYLE NOTES:\n${style_notes}\n` : ""}

EDITING RULES:

${PROSE_RULES}

AI-ISMS TO FIX:
${aiIsms}

${SCENE_RULES}

${DEFAULT_DECISION_RULE}

EDITOR'S MANDATE:
- Fix prose-level issues (banned words, banned constructions, em dash overuse, labeled emotions, weak sentence endings)
- Do NOT change: plot events, dialogue content, character decisions, scene structure, or the author's distinctive voice
- Do NOT add scenes, beats, or content that wasn't there
- Do NOT remove scenes — only compress padding
- When in doubt about a passage: leave it as written
- Preserve chapter length within 10% of original

Return ONLY the edited chapter text. No editor notes, no commentary, no labels.`;

  try {
    const result = await callLLM(prompt, "powerful", undefined, 8192);
    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SCAN ─────────────────────────────────────────────────────────────────────
// Return a flagged list of issues without rewriting.

router.post("/scan", async (req, res) => {
  const { chapter_title, content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "content is required" });

  const aiIsms = getSkill("AI_ISMS") ?? "";

  const prompt = `You are a manuscript editor scanning for specific prose problems. Do not rewrite — only flag.

CHAPTER: ${chapter_title ?? "Untitled"}

TEXT TO SCAN:
${content}

WHAT TO FLAG:

BANNED WORDS: delve, pivotal, crucial, vibrant, tapestry, nestled, groundbreaking, profound, indelible, underscores, highlights, bolstered, garnered, foster, enhance, enduring, showcasing, exemplifies, encompassing, renowned

BANNED PHRASES: "a testament to", "serves as", "stands as", "marks a", "in the heart of", "setting the stage", "deeply rooted", "needless to say", "at the end of the day", "only time will tell", "resonate with", "little did they know"

BANNED CONSTRUCTIONS:
- "Not just X, but Y" / "Not only X, but also Y"
- Em dash used more than once per page
- Sentences beginning with "Suddenly"
- Participial phrases that editorialize ("...highlighting how much she had grown")
- Labeled emotions: "She felt angry", "He was nervous", "She realized she loved him"
- Three-item lists where two items make the point

AI-ISMS PATTERNS:
${aiIsms}

For each issue found:
[N]. LINE: "[exact quote]"
     ISSUE: [category — e.g. "banned word", "labeled emotion", "AI-ism: Stacked Compression"]
     FIX: [specific suggestion — one sentence]

After the list, add a summary line: "X issues found across Y categories."

If nothing is found, say: "No issues found."`;

  try {
    const result = await callLLM(prompt, "powerful");
    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REWRITE SELECTION ────────────────────────────────────────────────────────
// Rewrite a specific passage with instructions.

router.post("/rewrite", async (req, res) => {
  const { passage, instruction, chapter_context } = req.body;
  if (!passage?.trim()) return res.status(400).json({ error: "passage is required" });

  const prompt = `You are a prose editor rewriting a specific passage from a manuscript.

PASSAGE TO REWRITE:
${passage}

${chapter_context ? `SURROUNDING CONTEXT (do not rewrite this, just use it to match voice and continuity):\n${chapter_context}\n` : ""}

${instruction ? `SPECIFIC INSTRUCTION:\n${instruction}\n` : "Improve the prose quality — fix AI-tells, sharpen the language, make it sound more human and specific."}

RULES:
${PROSE_RULES}

${DEFAULT_DECISION_RULE}

- Match the voice and register of the surrounding context
- Keep the same plot events and character beats
- Do not add new story content unless the instruction specifically requests it
- Return ONLY the rewritten passage — no commentary, no labels`;

  try {
    const result = await callLLM(prompt, "powerful", undefined, 4096);
    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CONTINUITY CHECK ─────────────────────────────────────────────────────────
// Full-manuscript analysis: character consistency, plot logic, timeline,
// setting, knowledge gaps, and weak passages. Runs on the full text.

router.post("/continuity", async (req, res) => {
  const { chapters } = req.body as { chapters: { title: string; content: string }[] };
  if (!chapters?.length) return res.status(400).json({ error: "chapters array required" });

  const fullText = chapters
    .map(ch => `=== ${ch.title} ===\n\n${ch.content}`)
    .join("\n\n");

  const aiIsms = getSkill("AI_ISMS") ?? "";

  const prompt = `You are a developmental and line editor reviewing a complete manuscript before publication. Your job is to find every problem that would make a reader stop trusting the story.

FULL MANUSCRIPT:
${fullText}

Run these checks in order. For every issue found, output it in the format below. Be specific — quote the exact passage, name the chapter, state what the problem is and what the fix is. Do not pad the list with minor style preferences. Only flag things that genuinely damage the reading experience.

═══ CHECK 1: CHARACTER CONSISTENCY ═══
Track every named character across all chapters:
- Do descriptions contradict? (eye color changes, height inconsistent, etc.)
- Does behavior contradict established character? (coward suddenly brave with no arc, etc.)
- Does a character's knowledge contradict when they learned something?
- Are names spelled consistently?
- Do relationships between characters stay consistent?

═══ CHECK 2: PLOT LOGIC ═══
- Does any event require the reader to ignore established facts?
- Is any problem solved too easily given the established stakes?
- Does any revelation come from nowhere with no setup?
- Does any setup go nowhere (Chekhov's gun violations)?
- Are cause and effect sequences logical?
- Does any character make a decision that contradicts their stated goals or beliefs without explanation?

═══ CHECK 3: TIMELINE & CONTINUITY ═══
- Are time references consistent? (events that happen "the next morning" vs. "three days later")
- Do objects appear or disappear without explanation?
- Are locations consistent? (characters who couldn't logistically be somewhere)
- Does something happen before it's been set up?
- Are physical injuries, exhaustion, or resource depletion tracked consistently?

═══ CHECK 4: INFORMATION GAPS ═══
- Does the narrator or a character know something they shouldn't know yet?
- Is any information withheld from the reader in a way that feels manipulative rather than purposeful?
- Is any critical piece of backstory assumed but never established?

═══ CHECK 5: WEAK PASSAGES ═══
Using these craft standards:
${PROSE_RULES}

AI-ISMS:
${aiIsms}

Flag:
- Scenes that violate show-don't-tell at a consequential moment (major emotional beats, reveals, climax)
- Chapter endings that close on resolution rather than an open circuit
- Passages with 3+ banned constructions in close proximity
- Any section where the pacing collapses (events that needed a scene get a summary; scenes that needed compression are drawn out)
- The weakest 2-3 passages in the manuscript overall (prose quality, not preference)

═══ OUTPUT FORMAT ═══
For each issue:
[N]. CATEGORY: Character / Plot / Timeline / Information / Prose
     CHAPTER: [chapter title]
     PROBLEM: [one specific sentence describing what's wrong, with a direct quote where relevant]
     FIX: [one concrete suggestion]

End with:
SUMMARY: X issues found. [One sentence on the most critical problem to address first.]`;

  try {
    const result = await callLLM(prompt, "powerful", undefined, 8192);
    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
