/**
 * editBookRoutes.ts
 */

import { Router } from "express";
import { callLLM } from "./llm";
import { PROSE_RULES, SCENE_RULES, DEFAULT_DECISION_RULE } from "./writing-rules";
import { getSkill } from "./skillLoader";

const router = Router();

// ─── LINE EDIT ────────────────────────────────────────────────────────────────

router.post("/line-edit", async (req, res) => {
  const { chapter_title, content, style_notes } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "content is required" });
  const aiIsms = getSkill("AI_ISMS") ?? "";

  const prompt = `You are a professional manuscript line editor. Clean the prose without rewriting the story.

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
- Participial phrases that editorialize
- Labeled emotions: "She felt angry", "He was nervous", "She realized she loved him"
- Three-item lists where two items make the point

AI-ISMS PATTERNS:
${aiIsms}

For each issue found:
[N]. LINE: "[exact quote from the text — copy it verbatim]"
     ISSUE: [category]
     FIX: [specific one-sentence suggestion]

After the list: "X issues found across Y categories."
If nothing is found: "No issues found."`;

  try {
    const result = await callLLM(prompt, "powerful");
    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REWRITE ─────────────────────────────────────────────────────────────────

router.post("/rewrite", async (req, res) => {
  const { passage, instruction, chapter_context, style_guide } = req.body;
  if (!passage?.trim()) return res.status(400).json({ error: "passage is required" });

  const prompt = `You are a prose editor rewriting a specific passage from a manuscript.

PASSAGE TO REWRITE:
${passage}

${chapter_context ? `SURROUNDING CONTEXT (do not rewrite this, just use it to match voice and continuity):\n${chapter_context}\n` : ""}

${instruction ? `SPECIFIC INSTRUCTION:\n${instruction}\n` : "Improve the prose quality while preserving the author's voice."}

${style_guide ? `AUTHOR'S VOICE (this is the highest priority — match this precisely):\n${style_guide}\n` : ""}

PROSE RULES (apply after voice guide):
${PROSE_RULES}

${DEFAULT_DECISION_RULE}

- The author's voice guide above overrides generic prose rules where they conflict
- Match the rhythm, sentence length, internal monologue style, and register of the author's voice guide
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

// ─── WRITE IN VOICE ──────────────────────────────────────────────────────────
// Generate new prose at a specific position in the manuscript.
// Not a rewrite — creates content that doesn't exist yet.

router.post("/write-in-voice", async (req, res) => {
  const { instruction, before_context, after_context, style_guide, approximate_length, chapter_title } = req.body;
  if (!instruction?.trim()) return res.status(400).json({ error: "instruction is required" });

  const prompt = `You are a ghostwriter writing new prose in the author's established voice.

CHAPTER: ${chapter_title ?? "Untitled"}

YOUR TASK:
${instruction}

${before_context ? `WHAT COMES IMMEDIATELY BEFORE (match tone, register, and momentum):\n${before_context}\n` : ""}

${after_context ? `WHAT COMES IMMEDIATELY AFTER (new content must lead naturally into this):\n${after_context}\n` : ""}

${style_guide ? `AUTHOR'S VOICE (match this exactly — this is the most important instruction):\n${style_guide}\n` : ""}

PROSE RULES:
${PROSE_RULES}

${DEFAULT_DECISION_RULE}

TARGET LENGTH: ${approximate_length ?? "150–300 words"}

RULES:
- Write in the author's voice as defined above. Match their sentence rhythm, paragraph length, internal monologue style, and register exactly.
- The new content must feel continuous with the surrounding text — same POV, same tension level, same character voice.
- Do not summarize. Write scene-level prose.
- Return ONLY the new prose. No labels, no commentary, no explanations.`;

  try {
    const result = await callLLM(prompt, "powerful", undefined, 4096);
    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CONTINUITY CHECK ─────────────────────────────────────────────────────────
// Three parallel focused passes. Each gets undivided attention on its category.
// Results combined and numbered sequentially.

function buildManuscriptText(chapters: { title: string; content: string }[]): string {
  return chapters.map(ch => `=== ${ch.title} ===\n\n${ch.content}`).join("\n\n");
}

const ISSUE_FORMAT = `For each issue found, use EXACTLY this format with no markdown:
[N]. CATEGORY: [category name]
     CHAPTER: [chapter title, copied exactly from the manuscript headers]
     PROBLEM: [one specific sentence. If quoting text, use straight quotes like "quoted text"]
     FIX: [one concrete action — what to add, remove, or change]

Number sequentially starting from [START_N]. Only flag genuine problems. Do not pad.`;

router.post("/continuity", async (req, res) => {
  const { chapters } = req.body as { chapters: { title: string; content: string }[] };
  if (!chapters?.length) return res.status(400).json({ error: "chapters array required" });

  const fullText = buildManuscriptText(chapters);
  const aiIsms = getSkill("AI_ISMS") ?? "";

  // Pass 1: Character and Plot
  const pass1 = callLLM(`You are a developmental editor checking CHARACTER CONSISTENCY and PLOT LOGIC only.

MANUSCRIPT:
${fullText}

CHARACTER CONSISTENCY — check every named character across all chapters:
- Physical descriptions that contradict each other
- Behavior that contradicts established character without explanation
- A character knowing something before they could have learned it
- Inconsistent name spelling
- Relationship dynamics that contradict earlier scenes

PLOT LOGIC — check cause and effect:
- Any event that requires ignoring established facts
- Problems solved too easily given the stated stakes
- Revelations with no prior setup
- Setups (objects, promises, threats) that go nowhere
- Character decisions that contradict their stated goals without explanation

${ISSUE_FORMAT.replace("[START_N]", "1")}

If no issues found in a category, write "No [category] issues found." and move on.`, "powerful", undefined, 4096);

  // Pass 2: Timeline, Continuity, Information Gaps
  const pass2 = callLLM(`You are a developmental editor checking TIMELINE, CONTINUITY, and INFORMATION GAPS only.

MANUSCRIPT:
${fullText}

TIMELINE AND CONTINUITY:
- Time references that contradict ("next morning" vs "three days later" for the same gap)
- Objects that appear without being introduced, or disappear without explanation
- Characters in locations they could not logistically reach
- Physical states not tracked (injuries ignored, exhaustion not carried forward)
- Events that occur before they have been set up

INFORMATION GAPS:
- Narrator or character knows something before they could know it
- Critical backstory assumed but never established on the page
- Information withheld in a way that feels manipulative rather than purposeful

${ISSUE_FORMAT.replace("[START_N]", "1")}

If no issues found in a category, write "No [category] issues found." and move on.`, "powerful", undefined, 4096);

  // Pass 3: Prose and Weak Passages
  const pass3 = callLLM(`You are a line editor checking PROSE QUALITY and WEAK PASSAGES only.

MANUSCRIPT:
${fullText}

PROSE RULES:
${PROSE_RULES}

AI-ISMS TO CATCH:
${aiIsms}

CHECK FOR:
- Show-don't-tell violations at consequential moments (major emotional beats, the climax, key reveals)
- Chapter endings that resolve rather than hook forward
- Dialogue that explains what the reader already knows
- Pacing collapses: events that needed a scene are summarized; scenes that needed cutting are extended
- The 3 weakest prose passages in the full manuscript (be specific about which and why)

${ISSUE_FORMAT.replace("[START_N]", "1")}`, "powerful", undefined, 4096);

  try {
    const [r1, r2, r3] = await Promise.all([pass1, pass2, pass3]);

    // Renumber sequentially across all three passes
    let counter = 1;
    const renumber = (text: string): string => {
      return text.replace(/^\[\d+\]\./gm, () => `[${counter++}].`);
    };

    const combined = [
      "=== CHARACTER & PLOT ===\n" + renumber(r1),
      "=== TIMELINE & INFORMATION ===\n" + renumber(r2),
      "=== PROSE ===\n" + renumber(r3),
    ].join("\n\n");

    res.json({ result: combined });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
