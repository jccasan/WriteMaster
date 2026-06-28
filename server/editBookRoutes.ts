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

export default router;
