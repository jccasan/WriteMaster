/**
 * outlineRoutes.ts
 *
 * Server routes for the three-mode outlining module.
 * All modes ultimately produce a brain_dump string that feeds Pipeline 1.
 *
 * Routes:
 *   POST /api/outline/guided/start          — start a guided session
 *   POST /api/outline/guided/:id/answer     — submit an answer, get next question
 *   GET  /api/outline/guided/:id            — get session state
 *   POST /api/outline/guided/:id/synthesize — synthesize brain dump from Q&A, start pipeline
 *   POST /api/outline/braindump             — submit brain dump fields directly
 *   POST /api/outline/hybrid/synthesize     — synthesize from hybrid answers
 */

import { Router } from "express";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { callLLM } from "./llm";
import { storage } from "./storage";

const router = Router();
const SESSIONS_DIR = path.resolve("data/outline-sessions");

if (!existsSync(SESSIONS_DIR)) mkdir(SESSIONS_DIR, { recursive: true }).catch(() => {});

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContradictionFlag {
  id: string;
  description: string;
  earlier_statement: string;
  current_statement: string;
  question_numbers: [number, number];
  resolved: boolean;
}

interface GuidedMessage {
  role: "ai" | "user";
  content: string;
  question_number?: number;
  contradiction_flag?: ContradictionFlag;
}

interface GuidedSession {
  session_id: string;
  created_at: string;
  genre: string;
  phase: "questioning" | "synthesizing" | "complete" | "error";
  messages: GuidedMessage[];
  contradictions: ContradictionFlag[];
  question_count: number;
  max_questions: number;
  synthesized_brain_dump: string;
  project_id: string | null;
  universe_id: string | null;
  series_id: string | null;
  bible_context: string; // pre-seeded world context from universe bible
}

async function saveSession(session: GuidedSession) {
  await writeFile(
    path.join(SESSIONS_DIR, `${session.session_id}.json`),
    JSON.stringify(session, null, 2)
  );
}

async function loadSession(id: string): Promise<GuidedSession | null> {
  const p = path.join(SESSIONS_DIR, `${id}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(await readFile(p, "utf-8"));
}

// ─── GUIDED MODE ──────────────────────────────────────────────────────────────

const FIRST_QUESTION = "Let's build your story together. I'll ask you up to 50 questions — answer as much or as little as you like for each one.\n\nFirst: What's the core of your story? Give me the rough idea — character, situation, or just the feeling you're going for. Anything at all.";

router.post("/guided/start", async (req, res) => {
  try {
    const { genre = "fiction", universe_id = null, series_id = null } = req.body;

    // Load bible if universe provided
    let bibleContext = "";
    if (universe_id) {
      const { getEffectiveBible } = await import("./universeStorage");
      bibleContext = await getEffectiveBible(universe_id, series_id);
    }

    // Generate an appropriate first question
    let firstQuestion = FIRST_QUESTION;
    if (bibleContext) {
      firstQuestion = await callLLM(
        `You are a story development interviewer helping an author create a new book in an established universe.

UNIVERSE BIBLE (already known — do NOT ask about this):
${bibleContext.substring(0, 3000)}

Your job: Ask the author about the SPECIFIC STORY for this book, not the world (that's already established).
Focus on: the protagonist of THIS book, the central conflict, the stakes, the plot.

Write a warm opening message (2-3 sentences) acknowledging the established world, then ask the first specific story question.
Keep it conversational. Output only the message text.`,
        "cheap"
      );
    }

    const session: GuidedSession = {
      session_id: randomUUID(),
      created_at: new Date().toISOString(),
      genre,
      phase: "questioning",
      messages: [{ role: "ai", content: firstQuestion, question_number: 1 }],
      contradictions: [],
      question_count: 1,
      max_questions: 50,
      synthesized_brain_dump: "",
      project_id: null,
      universe_id,
      series_id,
      bible_context: bibleContext,
    };
    await saveSession(session);
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/guided/:id", async (req, res) => {
  const session = await loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

router.post("/guided/:id/answer", async (req, res) => {
  try {
    const session = await loadSession(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.phase !== "questioning") return res.status(400).json({ error: "Session not in questioning phase" });

    const { answer } = req.body;
    if (!answer?.trim()) return res.status(400).json({ error: "Answer is required" });

    // Add user answer to messages
    const userMessage: GuidedMessage = {
      role: "user",
      content: answer.trim(),
      question_number: session.question_count,
    };
    session.messages.push(userMessage);

    const isLastQuestion = session.question_count >= session.max_questions;

    // Build conversation history for the AI
    const history = session.messages
      .map(m => `${m.role === "ai" ? "INTERVIEWER" : "AUTHOR"}: ${m.content}`)
      .join("\n\n");

    // Run AI to get next question + contradiction check in parallel
    const [nextQuestionRaw, contradictionRaw] = await Promise.all([
      isLastQuestion ? Promise.resolve("__DONE__") : callLLM(
        `You are a skilled story development interviewer helping an author build their story.
Your job is to ask adaptive questions that draw out the story's potential.

GENRE: ${session.genre}
QUESTIONS ASKED SO FAR: ${session.question_count} of ${session.max_questions}
${session.bible_context ? `
UNIVERSE BIBLE (world already established — skip world-building questions entirely):
${session.bible_context.substring(0, 2000)}
Focus only on: protagonist, plot, character arcs, conflict, stakes specific to THIS book.
` : ""}
CONVERSATION SO FAR:
${history}

Ask the single most valuable next question based on what the author has shared.

Rules:
- Ask ONE question only
- Make it specific to what they've said — don't ask generic questions
- ${session.bible_context ? "Do NOT ask about world-building, magic systems, geography, or lore — that's already established in the bible above" : "Prioritize filling the most important gaps: protagonist's want/need, central conflict, stakes, world rules, ending"}
- If they've given rich answers, go deeper. If sparse, broaden to find what excites them.
- Keep it conversational — you're a curious collaborator, not a form
- Do NOT repeat questions already asked
- If you have enough to build a complete story (protagonist, conflict, world, stakes, rough ending), say exactly: READY_TO_SYNTHESIZE

Output ONLY the question text, or READY_TO_SYNTHESIZE. Nothing else.`,
        "powerful"
      ),
      callLLM(
        `You are checking for contradictions in an author's story development interview.

CONVERSATION SO FAR:
${history}

Does the author's most recent answer (the last AUTHOR line) contradict anything they said in a previous answer?

A contradiction is when they:
- State a fact that's inconsistent with an earlier stated fact
- Describe a character differently than they described them before
- Change a world rule or established detail
- Give incompatible timelines or sequences

If there IS a contradiction, respond with this exact JSON:
{"found": true, "description": "One sentence describing the contradiction", "earlier": "What they said before", "current": "What they just said"}

If there is NO contradiction, respond with:
{"found": false}

Respond with ONLY the JSON. No other text.`,
        "cheap"
      ),
    ]);

    // Process contradiction check
    let contradictionFlag: ContradictionFlag | undefined;
    try {
      const contradictionData = JSON.parse(contradictionRaw.replace(/```json|```/g, "").trim());
      if (contradictionData.found) {
        contradictionFlag = {
          id: randomUUID(),
          description: contradictionData.description,
          earlier_statement: contradictionData.earlier,
          current_statement: contradictionData.current,
          question_numbers: [session.question_count - 1, session.question_count] as [number, number],
          resolved: false,
        };
        session.contradictions.push(contradictionFlag);
      }
    } catch {}

    // Determine next state
    const shouldSynthesize = isLastQuestion ||
      nextQuestionRaw.trim() === "READY_TO_SYNTHESIZE" ||
      nextQuestionRaw.trim() === "__DONE__";

    if (shouldSynthesize) {
      // Add wrap-up message
      const wrapupMessage: GuidedMessage = {
        role: "ai",
        content: session.contradictions.filter(c => !c.resolved).length > 0
          ? `We've covered a lot of ground. Before I synthesize your story, there ${session.contradictions.filter(c => !c.resolved).length === 1 ? "is" : "are"} ${session.contradictions.filter(c => !c.resolved).length} thing${session.contradictions.filter(c => !c.resolved).length === 1 ? "" : "s"} to review in the conflict log on the right. You can resolve them now or proceed and fix them in the dossier.`
          : "I have everything I need. Click 'Build Dossier' to generate your Story Dossier from our conversation.",
      };
      session.messages.push(wrapupMessage);
      session.phase = "questioning"; // stays questioning until they click synthesize
    } else {
      // Add next question
      session.question_count++;
      const aiMessage: GuidedMessage = {
        role: "ai",
        content: nextQuestionRaw.trim(),
        question_number: session.question_count,
        contradiction_flag: contradictionFlag,
      };
      session.messages.push(aiMessage);
    }

    await saveSession(session);
    res.json({
      session,
      contradiction: contradictionFlag ?? null,
      ready_to_synthesize: shouldSynthesize,
    });
  } catch (err: any) {
    console.error("[Guided] Answer error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/guided/:id/resolve-contradiction/:contradictionId", async (req, res) => {
  try {
    const session = await loadSession(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    const c = session.contradictions.find(x => x.id === req.params.contradictionId);
    if (c) c.resolved = true;
    await saveSession(session);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/guided/:id/synthesize", async (req, res) => {
  try {
    const session = await loadSession(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    session.phase = "synthesizing";
    await saveSession(session);

    const history = session.messages
      .filter(m => m.role === "user")
      .map((m, i) => `Q${i + 1}: ${m.content}`)
      .join("\n\n");

    // Synthesize brain dump from Q&A
    const brainDump = await callLLM(
      `You are a story development editor. An author just completed a story development interview.
Synthesize their answers into a rich, detailed brain dump for a story pipeline.

GENRE: ${session.genre}
${session.bible_context ? `
UNIVERSE CONTEXT (established world — include relevant details in the brain dump):
${session.bible_context.substring(0, 2000)}
` : ""}
AUTHOR'S ANSWERS (in order):
${history}

Write a comprehensive brain dump that captures everything the author shared.
${session.bible_context ? "Weave in relevant universe context where it applies to this specific story." : ""}
Write it as if the author wrote it themselves — first person or third, whatever fits.
Include: characters, central conflict, world, themes, stakes, plot fragments, tone, ending hints.
Do NOT invent anything not mentioned. Do NOT fill in gaps with generic content.
Be specific — use the author's own details and language where possible.
Aim for 400-800 words.`,
      "powerful"
    );

    session.synthesized_brain_dump = brainDump;

    // Start Pipeline 1
    const project = await storage.createProject(brainDump, session.genre);
    session.project_id = project.project_id;
    session.phase = "complete";
    await saveSession(session);

    res.json({
      project_id: project.project_id,
      brain_dump: brainDump,
      universe_id: session.universe_id,
      series_id: session.series_id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BRAIN DUMP MODE ──────────────────────────────────────────────────────────

router.post("/braindump", async (req, res) => {
  try {
    const { title, genre, protagonist, central_conflict, world, freeform, outline_chapters } = req.body;

    if (!genre) return res.status(400).json({ error: "genre is required" });

    // Assemble brain dump from structured fields
    const parts: string[] = [];
    if (title) parts.push(`Title: ${title}`);
    if (protagonist) parts.push(`Protagonist: ${protagonist}`);
    if (central_conflict) parts.push(`Central Conflict: ${central_conflict}`);
    if (world) parts.push(`World / Setting: ${world}`);
    if (freeform) parts.push(freeform);
    if (outline_chapters?.length) {
      parts.push("\nChapter Outline:");
      outline_chapters.forEach((ch: { num: number; title: string; beats: string }, i: number) => {
        parts.push(`Chapter ${ch.num}: ${ch.title}${ch.beats ? ` — ${ch.beats}` : ""}`);
      });
    }

    const brainDump = parts.join("\n\n");
    if (!brainDump.trim()) return res.status(400).json({ error: "At least one field is required" });

    const project = await storage.createProject(brainDump, genre);
    res.json({ project_id: project.project_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Blank outline suggestion (Brain Dump mode "Suggest beats" button)
router.post("/braindump/suggest-beats", async (req, res) => {
  try {
    const { genre, protagonist, central_conflict, world, chapter_count = 32 } = req.body;

    const result = await callLLM(
      `You are a story structure expert. Based on this story concept, suggest chapter beats for a ${chapter_count}-chapter ${genre} novel.

${protagonist ? `Protagonist: ${protagonist}` : ""}
${central_conflict ? `Central Conflict: ${central_conflict}` : ""}
${world ? `World/Setting: ${world}` : ""}

For each chapter, provide a short beat (1 sentence max) that fits the genre's structure.
Respond with ONLY a JSON array of ${chapter_count} objects:
[{"num": 1, "title": "Chapter 1", "beats": "One sentence beat"}]`,
      "powerful"
    );

    const clean = result.replace(/```json|```/g, "").trim();
    res.json({ chapters: JSON.parse(clean) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── HYBRID MODE ──────────────────────────────────────────────────────────────

const HYBRID_QUESTIONS = [
  { id: "protagonist", label: "Who is your protagonist?", placeholder: "Name, what they want, what they're hiding from themselves..." },
  { id: "conflict", label: "What's the central conflict?", placeholder: "The main problem or opposition driving the story..." },
  { id: "world", label: "Where and when does this take place?", placeholder: "Setting, time period, any unusual world rules..." },
  { id: "stakes", label: "What happens if the protagonist fails?", placeholder: "Personal cost, world cost, or both..." },
  { id: "antagonist", label: "Who or what opposes the protagonist?", placeholder: "A person, a system, an inner demon..." },
  { id: "theme", label: "What is this story really about?", placeholder: "The deeper question or truth the story explores..." },
  { id: "tone", label: "What does this story feel like?", placeholder: "Comparable books/films, mood, pacing..." },
  { id: "ending", label: "How does it end? (rough is fine)", placeholder: "Even a vague sense — hero wins, bittersweet, open..." },
];

router.get("/hybrid/questions", async (_req, res) => {
  res.json({ questions: HYBRID_QUESTIONS });
});

router.post("/hybrid/expand", async (req, res) => {
  try {
    const { question_id, current_answer, all_answers } = req.body;
    const question = HYBRID_QUESTIONS.find(q => q.id === question_id);
    if (!question) return res.status(400).json({ error: "Unknown question" });

    const context = Object.entries(all_answers || {})
      .filter(([k, v]) => k !== question_id && v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const result = await callLLM(
      `You are a story development collaborator helping an author expand on one aspect of their story.

QUESTION: "${question.label}"
AUTHOR'S CURRENT ANSWER: "${current_answer}"

${context ? `OTHER STORY DETAILS:\n${context}` : ""}

Ask 2-3 follow-up questions that would help the author go deeper on this specific aspect.
Make the questions specific to what they've already said.
Format as a numbered list. Keep each question short.`,
      "cheap"
    );

    res.json({ follow_ups: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hybrid/synthesize", async (req, res) => {
  try {
    const { genre, answers, expanded_answers } = req.body;
    if (!genre) return res.status(400).json({ error: "genre is required" });

    const allAnswers = { ...answers, ...expanded_answers };
    const parts = HYBRID_QUESTIONS
      .filter(q => allAnswers[q.id])
      .map(q => `${q.label}\n${allAnswers[q.id]}`);

    if (parts.length === 0) return res.status(400).json({ error: "At least one answer is required" });

    const brainDump = await callLLM(
      `Synthesize these story development answers into a cohesive brain dump for a ${genre} novel.
Write it as connected prose, not a list. Be specific, use the author's own details.
400-600 words.

${parts.join("\n\n")}`,
      "powerful"
    );

    const project = await storage.createProject(brainDump, genre);
    res.json({ project_id: project.project_id, brain_dump: brainDump });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
