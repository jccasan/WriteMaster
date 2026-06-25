/**
 * expandRoutes.ts
 *
 * Chapter Expander feature.
 *
 * POST /api/expand/upload         — upload a book file, returns detected chapters
 * POST /api/expand/session/start  — start an expansion session for a chapter
 * POST /api/expand/session/:id/answer  — submit an answer, get next question
 * POST /api/expand/session/:id/write   — generate the expansion
 * GET  /api/expand/session/:id         — get session state
 * DELETE /api/expand/session/:id       — clean up
 */

import { Router } from "express";
import multer from "multer";
import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { callLLM } from "./llm";
import { PROSE_RULES, SCENE_RULES, CONTEXT_RULES, DEFAULT_DECISION_RULE } from "./writing-rules";
import { getSkill } from "./skillLoader";

const router = Router();

const EXPAND_DIR = path.resolve("data/expand-sessions");
const UPLOAD_DIR = path.resolve("data/expand-uploads");

// Ensure dirs exist
[EXPAND_DIR, UPLOAD_DIR].forEach(dir => {
  if (!existsSync(dir)) mkdir(dir, { recursive: true }).catch(() => {});
});

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface DetectedChapter {
  index: number;
  title: string;
  content: string;
  word_count: number;
  start_line: number;
}

interface ExpandAnswer {
  question: string;
  answer: string;
}

interface ExpandSession {
  session_id: string;
  created_at: string;
  chapter_title: string;
  chapter_content: string;
  answers: ExpandAnswer[];
  current_question_index: number;
  phase: "interviewing" | "writing" | "complete";
  result?: string;
  integration_mode?: "integrate" | "prepend" | "append" | "replace";
}

// ─── CHAPTER DETECTION ───────────────────────────────────────────────────────

function detectChapters(text: string): DetectedChapter[] {
  const lines = text.split("\n");

  // Patterns that signal a chapter heading
  const chapterPattern = /^(chapter\s+\d+|chapter\s+[ivxlcdm]+|part\s+\d+|part\s+[ivxlcdm]+|#{1,3}\s+.{1,80}|[A-Z][A-Z\s]{2,50}$)/i;
  const numberedHeading = /^(\d+\.|[IVXLCDM]+\.)\s+.{1,80}$/;

  const chapterStarts: { line: number; title: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (chapterPattern.test(line) || numberedHeading.test(line)) {
      // Avoid false positives: must be short and either alone or preceded/followed by blank lines
      const prevBlank = i === 0 || !lines[i - 1]?.trim();
      const nextBlank = i === lines.length - 1 || !lines[i + 1]?.trim();
      if (line.length < 120 && (prevBlank || nextBlank)) {
        chapterStarts.push({ line: i, title: line.replace(/^#+\s*/, "") });
      }
    }
  }

  if (chapterStarts.length === 0) {
    // No chapters detected — treat entire text as one
    return [{
      index: 0,
      title: "Full Document",
      content: text.trim(),
      word_count: text.split(/\s+/).filter(Boolean).length,
      start_line: 0,
    }];
  }

  // Build chapters from detected starts
  const chapters: DetectedChapter[] = [];
  for (let i = 0; i < chapterStarts.length; i++) {
    const start = chapterStarts[i].line;
    const end = i + 1 < chapterStarts.length ? chapterStarts[i + 1].line : lines.length;
    const content = lines.slice(start + 1, end).join("\n").trim();
    const words = content.split(/\s+/).filter(Boolean).length;
    chapters.push({
      index: i,
      title: chapterStarts[i].title,
      content,
      word_count: words,
      start_line: start,
    });
  }

  return chapters;
}

async function extractText(filePath: string, mimetype: string, originalName: string): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".txt" || ext === ".md") {
    return readFile(filePath, "utf-8");
  }

  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const buffer = await readFile(filePath);
    const result = await mammoth.default.extractRawText({ buffer });
    return result.value;
  }

  if (ext === ".pdf") {
    // Use pdf-parse if available, else fall back to text extraction
    try {
      const pdfParse = await import("pdf-parse" as any);
      const buffer = await readFile(filePath);
      const data = await pdfParse.default(buffer);
      return data.text;
    } catch {
      throw new Error("PDF parsing unavailable. Please upload a .txt or .docx file.");
    }
  }

  throw new Error(`Unsupported file type: ${ext}. Upload .txt, .docx, or .pdf`);
}

// ─── INTERVIEW QUESTIONS ──────────────────────────────────────────────────────

const INTERVIEW_QUESTIONS = [
  "What do you want to add or change about this chapter? Be as specific as you like — a scene, a moment, a revelation, a piece of dialogue.",
  "What's currently working in this chapter that you want to keep? (Or type 'nothing specific' if you want a full rewrite.)",
  "How long should the result be? Give me a rough word count or range — e.g. '1,500 words' or '800–1,200 words'.",
  "What's the tone and mood of this chapter? (e.g. tense and quiet, darkly funny, emotionally raw, fast-paced action)",
  "Is there a specific scene, beat, or moment you need included that isn't there yet?",
  "Who is the POV character, and what are they feeling or trying to do at this point in the story?",
  "What happened just before this chapter that the reader needs to feel the weight of?",
  "What must happen by the end of this chapter for the story to continue — what changes, and for whom?",
  "Is there any specific dialogue, image, or detail you want the AI to include or avoid?",
  "Anything else I should know — subplots active, character relationships at stake, thematic threads to carry?",
];

// ─── SESSION HELPERS ──────────────────────────────────────────────────────────

async function saveSession(session: ExpandSession) {
  await writeFile(
    path.join(EXPAND_DIR, `${session.session_id}.json`),
    JSON.stringify(session, null, 2)
  );
}

async function loadSession(id: string): Promise<ExpandSession | null> {
  const p = path.join(EXPAND_DIR, `${id}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(await readFile(p, "utf-8"));
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// Upload and detect chapters
router.post("/upload", upload.single("file"), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const text = await extractText(req.file.path, req.file.mimetype, req.file.originalname);
    const chapters = detectChapters(text);

    // Clean up the upload
    await unlink(req.file.path).catch(() => {});

    res.json({
      chapters: chapters.map(c => ({
        index: c.index,
        title: c.title,
        word_count: c.word_count,
        preview: c.content.slice(0, 200) + (c.content.length > 200 ? "..." : ""),
      })),
      // Store full chapter content for session creation (send back, client holds it temporarily)
      chapter_contents: chapters.map(c => c.content),
      total_chapters: chapters.length,
    });
  } catch (err: any) {
    await unlink(req.file.path).catch(() => {});
    res.status(400).json({ error: err.message });
  }
});

// Start an expansion session for a selected chapter
router.post("/session/start", async (req, res) => {
  const { chapter_title, chapter_content } = req.body;
  if (!chapter_content) return res.status(400).json({ error: "chapter_content is required" });

  const session: ExpandSession = {
    session_id: randomUUID(),
    created_at: new Date().toISOString(),
    chapter_title: chapter_title ?? "Chapter",
    chapter_content,
    answers: [],
    current_question_index: 0,
    phase: "interviewing",
  };

  await saveSession(session);

  res.json({
    session_id: session.session_id,
    question: INTERVIEW_QUESTIONS[0],
    question_number: 1,
    total_questions: INTERVIEW_QUESTIONS.length,
  });
});

// Get session state
router.get("/session/:id", async (req, res) => {
  const session = await loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json({
    session_id: session.session_id,
    chapter_title: session.chapter_title,
    phase: session.phase,
    current_question_index: session.current_question_index,
    total_questions: INTERVIEW_QUESTIONS.length,
    answers: session.answers,
    result: session.result ?? null,
  });
});

// Submit an answer and get the next question
router.post("/session/:id/answer", async (req, res) => {
  const session = await loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.phase !== "interviewing") return res.status(400).json({ error: "Session not in interview phase" });

  const { answer } = req.body;
  if (!answer?.trim()) return res.status(400).json({ error: "answer is required" });

  session.answers.push({
    question: INTERVIEW_QUESTIONS[session.current_question_index],
    answer: answer.trim(),
  });
  session.current_question_index++;

  const isComplete = session.current_question_index >= INTERVIEW_QUESTIONS.length;

  await saveSession(session);

  if (isComplete) {
    res.json({
      done: true,
      question: null,
      question_number: INTERVIEW_QUESTIONS.length,
      total_questions: INTERVIEW_QUESTIONS.length,
    });
  } else {
    res.json({
      done: false,
      question: INTERVIEW_QUESTIONS[session.current_question_index],
      question_number: session.current_question_index + 1,
      total_questions: INTERVIEW_QUESTIONS.length,
    });
  }
});

// Skip a question
router.post("/session/:id/skip", async (req, res) => {
  const session = await loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.phase !== "interviewing") return res.status(400).json({ error: "Session not in interview phase" });

  session.answers.push({
    question: INTERVIEW_QUESTIONS[session.current_question_index],
    answer: "(skipped)",
  });
  session.current_question_index++;

  const isComplete = session.current_question_index >= INTERVIEW_QUESTIONS.length;
  await saveSession(session);

  if (isComplete) {
    res.json({ done: true, question: null, question_number: INTERVIEW_QUESTIONS.length, total_questions: INTERVIEW_QUESTIONS.length });
  } else {
    res.json({
      done: false,
      question: INTERVIEW_QUESTIONS[session.current_question_index],
      question_number: session.current_question_index + 1,
      total_questions: INTERVIEW_QUESTIONS.length,
    });
  }
});

// Generate the expansion
router.post("/session/:id/write", async (req, res) => {
  const session = await loadSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const { integration_mode } = req.body as {
    integration_mode: "integrate" | "prepend" | "append" | "replace";
  };

  if (!integration_mode) return res.status(400).json({ error: "integration_mode is required" });

  session.phase = "writing";
  session.integration_mode = integration_mode;
  await saveSession(session);

  // Build the Q&A summary
  const interviewSummary = session.answers
    .filter(a => a.answer !== "(skipped)")
    .map(a => `Q: ${a.question}\nA: ${a.answer}`)
    .join("\n\n");

  const modeInstructions: Record<string, string> = {
    integrate: `Rewrite the chapter, weaving the new material seamlessly into the existing content. Preserve what is working, expand what is thin, and produce a single unified chapter that reads as if it was always one piece.`,
    prepend: `Write a new section that comes BEFORE the existing chapter content. End your section at the exact point where the existing chapter begins, so the two flow naturally together. Output your new section only — do not reproduce the existing chapter.`,
    append: `Write a new section that comes AFTER the existing chapter content. Begin at the exact point where the existing chapter ends, continuing naturally from where it left off. Output your new section only — do not reproduce the existing chapter.`,
    replace: `Write a completely new version of this chapter. Use the interview answers as your brief. You are not constrained by the existing text — write the best possible version of this chapter from scratch.`,
  };

  const prompt = `You are a skilled fiction editor and writer. You are helping an author expand or revise a chapter of their novel.

CHAPTER TITLE: ${session.chapter_title}

EXISTING CHAPTER CONTENT:
${session.chapter_content}

---

AUTHOR INTERVIEW — what the author wants:
${interviewSummary}

---

TASK: ${modeInstructions[integration_mode]}

${CONTEXT_RULES}

${PROSE_RULES}

${SCENE_RULES}

AI-ISMS TO AVOID IN THIS PIECE:
${getSkill("AI_ISMS") || ""}

${DEFAULT_DECISION_RULE}

ADDITIONAL REQUIREMENTS:
- Match the voice and style of the existing chapter where content is being preserved
- Every scene must do at least two things simultaneously (plot + character, action + revelation, etc.)
- Every page must earn its space

Output only the prose. No author notes, no labels, no preamble.`;

  try {
    const result = await callLLM(prompt, "powerful", undefined, 8192);
    session.result = result;
    session.phase = "complete";
    await saveSession(session);
    res.json({ result, integration_mode });
  } catch (err: any) {
    session.phase = "interviewing"; // allow retry
    await saveSession(session);
    res.status(500).json({ error: err.message });
  }
});

// Delete session
router.delete("/session/:id", async (req, res) => {
  const p = path.join(EXPAND_DIR, `${req.params.id}.json`);
  if (existsSync(p)) await unlink(p).catch(() => {});
  res.json({ success: true });
});

export default router;
