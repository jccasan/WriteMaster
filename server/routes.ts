import type { Express } from "express";
import { createServer, type Server } from "http";
import { readFile, writeFile, readdir, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import multer from "multer";
import { storage } from "./storage";
import type { BookChapter, BookDocument, NarrativeSliders } from "./storage";
import { runStep, getStepName } from "./pipeline";
import { callLLM } from "./llm";
import { prisma } from "./forge/db";
import { readGoogleDoc, writeGoogleDoc, extractDocId } from "./google-docs";
import {
  AUTHOR_VOICE_CONTRACT, AI_WRITING_RULES, SCENE_WRITING_RULES, STORY_ARCHITECTURE_RULES,
  CHAPTER_SUMMARY_TEMPLATE, NARRATIVE_SLIDER_RULES, ANTI_SLOP_FILTER,
  CONTEXT_ENGINEERING_RULES, DEFAULT_DECISION_RULE, LAYERED_GENERATION_WORKFLOW,
  READER_VALUE_TEST, RAW_MATERIAL_MINDSET
} from "./writing-rules";

const DRAFTS_DIR = path.resolve("data/chapter-drafts");
if (!existsSync(DRAFTS_DIR)) mkdir(DRAFTS_DIR, { recursive: true }).catch(() => {});

const BOOK_UPLOADS_DIR = path.resolve("data/book-uploads");
if (!existsSync(BOOK_UPLOADS_DIR)) mkdir(BOOK_UPLOADS_DIR, { recursive: true }).catch(() => {});
const bookUpload = multer({
  dest: BOOK_UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = [".txt", ".md", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only .txt, .md, and .docx files are supported"));
  },
});

const SAFE_ID = /^[a-zA-Z0-9_-]{1,64}$/;

interface ChapterDraft {
  id: string;
  title: string;
  prompt: string;
  genre: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/genres", async (_req, res) => {
    try {
      const genres = await storage.getGenres();
      res.json(genres);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/projects", async (_req, res) => {
    try {
      const projects = await storage.listProjects();
      res.json(projects);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/project/start", async (req, res) => {
    try {
      const { brain_dump, genre } = req.body;
      if (!brain_dump || !genre) {
        return res.status(400).json({ error: "brain_dump and genre are required" });
      }
      const state = await storage.createProject(brain_dump, genre);
      res.json({ project_id: state.project_id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/project/:projectId/run-step", async (req, res) => {
    try {
      const { projectId } = req.params;
      const state = await storage.getProject(projectId);
      if (!state) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (state.current_step > 10) {
        return res.json({
          step_completed: state.current_step,
          step_name: "Pipeline Complete",
          output_preview: "All steps complete.",
          is_complete: true,
        });
      }

      const stepName = getStepName(state.current_step);
      const { updatedState, outputPreview } = await runStep(state);
      await storage.saveProject(updatedState);

      res.json({
        step_completed: state.current_step,
        step_name: stepName,
        output_preview: outputPreview,
        current_step: updatedState.current_step,
        is_complete: updatedState.current_step > 10,
      });
    } catch (err: any) {
      console.error("[Pipeline Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/project/:projectId/state", async (req, res) => {
    try {
      const { projectId } = req.params;
      const state = await storage.getProject(projectId);
      if (!state) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(state);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/project/:projectId/final", async (req, res) => {
    try {
      const { projectId } = req.params;
      const state = await storage.getProject(projectId);
      if (!state) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (state.current_step <= 10) {
        return res.status(400).json({ error: "Pipeline not yet complete" });
      }
      res.json({
        best_pitch: state.best_pitch,
        dossier_final: state.dossier_final,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/project/:projectId/dossier", async (req, res) => {
    try {
      const { projectId } = req.params;
      const state = await storage.getProject(projectId);
      if (!state) {
        return res.status(404).json({ error: "Project not found" });
      }
      const { dossier } = req.body;
      if (typeof dossier !== "string" || !dossier.trim()) {
        return res.status(400).json({ error: "Dossier text is required" });
      }
      state.dossier_final = dossier;
      await storage.saveProject(state);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/chapters", async (_req, res) => {
    try {
      const sessions = await storage.listChapterSessions();
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/chapters/:id", async (req, res) => {
    try {
      const session = await storage.getChapterSession(req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chapters", async (req, res) => {
    try {
      const { id, title, chapter_text, elements, rewritten_chapter } = req.body;
      if (!id || !chapter_text) {
        return res.status(400).json({ error: "id and chapter_text are required" });
      }
      const now = new Date().toISOString();
      const existing = await storage.getChapterSession(id);
      const session = {
        id,
        title: title || chapter_text.substring(0, 60).replace(/\n/g, " ").trim() + "...",
        created_at: existing?.created_at || now,
        updated_at: now,
        chapter_text,
        elements: elements || [],
        rewritten_chapter: rewritten_chapter || null,
      };
      await storage.saveChapterSession(session);
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/chapters/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteChapterSession(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Session not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chapter/extract", async (req, res) => {
    try {
      const { chapter_text } = req.body;
      if (!chapter_text || !chapter_text.trim()) {
        return res.status(400).json({ error: "chapter_text is required" });
      }

      const result = await callLLM(
        `You are an expert fiction editor and story structure analyst. Analyze the following chapter and extract its key structural elements.

CHAPTER TEXT:
${chapter_text}

Extract the following elements. For each element, provide a concise but specific description based on what actually happens in the chapter. If an element is not present or not applicable, write "N/A".

You MUST respond in valid JSON format with this exact structure:
{
  "elements": [
    {"key": "focus_character", "label": "Focus Character", "value": "..."},
    {"key": "character_beginning_state", "label": "Character Beginning State", "value": "..."},
    {"key": "character_end_state", "label": "Character End State", "value": "..."},
    {"key": "emotional_arc", "label": "Emotional Arc", "value": "..."},
    {"key": "chapter_goal", "label": "Chapter Goal", "value": "..."},
    {"key": "central_problem", "label": "Central Problem", "value": "..."},
    {"key": "solution", "label": "Solution (if any)", "value": "..."},
    {"key": "new_problem", "label": "New Problem Introduced", "value": "..."},
    {"key": "key_conflict", "label": "Key Conflict", "value": "..."},
    {"key": "stakes", "label": "Stakes", "value": "..."},
    {"key": "setting", "label": "Setting / Location", "value": "..."},
    {"key": "tone", "label": "Tone / Atmosphere", "value": "..."},
    {"key": "key_revelation", "label": "Key Revelation or Discovery", "value": "..."},
    {"key": "relationship_shift", "label": "Relationship Shift", "value": "..."},
    {"key": "ends_on", "label": "Ends On (Action/Decision/Cliffhanger)", "value": "..."},
    {"key": "thematic_thread", "label": "Thematic Thread", "value": "..."},
    {"key": "foreshadowing", "label": "Foreshadowing", "value": "..."},
    {"key": "pacing_notes", "label": "Pacing Notes", "value": "..."}
  ]
}

When analyzing, also note if the chapter contains any AI writing "tells" — unnatural dialogue, manufactured drama, melodramatic cliches, or over-explaining. If so, flag these in the relevant element values so the user can address them.

Respond with ONLY the JSON, no other text.`,
        "powerful"
      );

      let parsed;
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      }

      if (!parsed.elements || !Array.isArray(parsed.elements)) {
        return res.status(500).json({ error: "AI returned an unexpected format. Please try again." });
      }

      const validElements = parsed.elements.filter(
        (e: any) => e && typeof e.key === "string" && typeof e.label === "string" && typeof e.value === "string"
      );

      if (validElements.length === 0) {
        return res.status(500).json({ error: "No valid elements extracted. Please try again." });
      }

      res.json({ elements: validElements });
    } catch (err: any) {
      console.error("[Chapter Extract Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chapter/rewrite", async (req, res) => {
    try {
      const { chapter_text, elements, sliders } = req.body;
      if (!chapter_text || !elements || !Array.isArray(elements)) {
        return res.status(400).json({ error: "chapter_text and elements array are required" });
      }

      const elementsList = elements
        .map((e: { label: string; value: string }) => `- **${e.label}**: ${e.value}`)
        .join("\n");

      const slidersBlock = formatSlidersBlock(sliders);

      const result = await callLLM(
        `You are a master fiction writer and editor. Your task is to rewrite the chapter below so that it faithfully incorporates ALL of the structural elements provided.

${CONTEXT_ENGINEERING_RULES}

ORIGINAL CHAPTER:
${chapter_text}

STRUCTURAL ELEMENTS TO INCORPORATE:
${elementsList}
${slidersBlock}

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

${SCENE_WRITING_RULES}

${DEFAULT_DECISION_RULE}

${LAYERED_GENERATION_WORKFLOW}

${READER_VALUE_TEST}

${RAW_MATERIAL_MINDSET}

INSTRUCTIONS:
- Rewrite the entire chapter so it naturally embodies every element listed above
- Maintain the original voice, style, and point of view unless an element specifically changes it
- If an element contradicts the original, the element takes priority
- PRESERVE ORIGINAL DETAILS: The original chapter text is the authoritative source for specific world details, setting descriptions, character traits, and established facts. If the original says a road is "well-maintained" or a location is a "major trade corridor," those details MUST appear in the rewrite unless an element explicitly overrides them. Do not invent replacements for details the author already established.
- Apply scene engineering: ensure every scene has Goal → Conflict → Outcome with a clear value shift
- Apply the double-up rule: each scene should serve at least two narrative functions
- End the chapter on an open circuit — leave an unresolved question or tension
- Preserve the original's best qualities — strong prose, vivid imagery, good dialogue
- Do NOT add meta-commentary or notes — output ONLY the rewritten chapter text
- Match approximately the same length as the original (within 20%)
- Make the transitions between elements feel organic, not forced

SELF-EDIT PASS (apply before outputting):
- Remove lines that explain what behavior already shows
- Break any accidental sentence pattern symmetry
- Confirm action clarity in physical sequences

${ANTI_SLOP_FILTER}

Output the rewritten chapter text only, no preamble or commentary.`,
        "powerful",
        undefined,
        16384
      );

      if (!result || !result.trim()) {
        return res.status(500).json({ error: "AI returned an empty rewrite. Please try again." });
      }

      res.json({ rewritten_chapter: result });
    } catch (err: any) {
      console.error("[Chapter Rewrite Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ========== BOOK WRITER ROUTES ==========

  app.get("/api/books", async (_req, res) => {
    try {
      const books = await storage.listBooks();
      res.json(books);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books", async (req, res) => {
    try {
      const { source_project_id, brain_dump, dossier, title } = req.body;

      const book = await storage.createBook(
        source_project_id || null,
        brain_dump || "",
        dossier || "",
        title || "Untitled Book"
      );
      res.json(book);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/from-project/:projectId", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (!project.dossier_final) return res.status(400).json({ error: "Project pipeline not complete" });

      const book = await storage.createBook(
        project.project_id,
        project.brain_dump,
        project.dossier_final,
        req.body.title || "Untitled Book"
      );
      res.json(book);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/books/:id", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      res.json(book);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/books/:id", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      if (req.body.title !== undefined) book.title = req.body.title;
      if (req.body.dossier !== undefined) book.dossier = req.body.dossier;
      if (req.body.brain_dump !== undefined) book.brain_dump = req.body.brain_dump;
      if (req.body.forge_project_id !== undefined) {
        if (req.body.forge_project_id !== null) {
          const forgeProject = await prisma.project.findUnique({ where: { id: req.body.forge_project_id } });
          if (!forgeProject) return res.status(400).json({ error: "FORGE project not found" });
        }
        book.forge_project_id = req.body.forge_project_id;
      }

      await storage.saveBook(book);
      res.json(book);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/books/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBook(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Book not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/:id/documents", bookUpload.single("file"), async (req: any, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      let content = "";
      let name = "Untitled Document";
      const docType = (req.body.type || "other") as BookDocument["type"];

      if (req.file) {
        name = req.file.originalname || "Uploaded File";
        const filePath = req.file.path;
        const buffer = await readFile(filePath);

        if (name.endsWith(".docx")) {
          const mammoth = await import("mammoth");
          const result = await mammoth.default.convertToMarkdown({ buffer });
          content = result.value;
        } else {
          content = buffer.toString("utf-8");
        }

        await unlink(filePath).catch(() => {});
      } else if (req.body.content) {
        content = req.body.content;
        name = req.body.name || "Pasted Document";
      } else {
        return res.status(400).json({ error: "Either a file upload or content text is required" });
      }

      if (!book.documents) book.documents = [];

      const doc: BookDocument = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        content,
        type: docType,
        added_at: new Date().toISOString(),
      };

      book.documents.push(doc);
      await storage.saveBook(book);
      res.json({ document: { id: doc.id, name: doc.name, type: doc.type, added_at: doc.added_at, length: doc.content.length }, book_id: book.id });
    } catch (err: any) {
      console.error("[Document Upload Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/books/:id/documents", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      const docs = (book.documents || []).map(d => ({
        id: d.id, name: d.name, type: d.type, added_at: d.added_at, length: d.content.length,
      }));
      res.json(docs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/books/:id/documents/:docId", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      if (!book.documents) return res.status(404).json({ error: "Document not found" });
      const idx = book.documents.findIndex(d => d.id === req.params.docId);
      if (idx === -1) return res.status(404).json({ error: "Document not found" });
      book.documents.splice(idx, 1);
      await storage.saveBook(book);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/:id/import-google-doc", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "Google Doc URL is required" });

      const { title, text, docId } = await readGoogleDoc(url);

      const lines = text.split("\n");
      const chapters: { title: string; content: string }[] = [];
      let currentTitle = "";
      let currentLines: string[] = [];

      for (const line of lines) {
        if (/^#\s+/.test(line)) {
          if (currentLines.length > 0) {
            const body = currentLines.join("\n").trim();
            if (body) {
              chapters.push({
                title: currentTitle || `Chapter ${chapters.length + 1}`,
                content: body,
              });
            }
          }
          currentTitle = line.replace(/^#\s+/, "").trim().substring(0, 100);
          currentLines = [];
        } else {
          currentLines.push(line);
        }
      }

      if (currentLines.length > 0) {
        const body = currentLines.join("\n").trim();
        if (body) {
          chapters.push({
            title: currentTitle || `Chapter ${chapters.length + 1}`,
            content: body,
          });
        }
      }

      if (chapters.length === 0) {
        chapters.push({ title: "Chapter 1", content: text });
      }

      book.google_doc_id = docId;
      book.title = book.title === "Untitled Book" ? title : book.title;
      book.chapters = chapters.map((ch, i) => ({
        chapter_number: i + 1,
        title: ch.title,
        outline: "",
        content: ch.content,
        summary: null,
        status: "written" as const,
      }));
      await storage.saveBook(book);

      console.log(`[Google Docs] Imported "${title}" (${docId}) — ${chapters.length} chapters`);
      res.json({ book, chaptersImported: chapters.length, docId });
    } catch (err: any) {
      console.error("[Google Docs Import Error]", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/:id/sync-to-google-doc", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const docId = book.google_doc_id;
      if (!docId) return res.status(400).json({ error: "No Google Doc linked. Import a doc first." });

      const rawText = book.chapters
        .filter(c => c.content)
        .map(c => `# ${c.title}\n\n${c.content}`)
        .join("\n\n---\n\n");

      const fullText = rawText
        .replace(/\n{3,}/g, "\n<<SCENE_BREAK>>\n")
        .replace(/\n\n/g, "\n")
        .replace(/<<SCENE_BREAK>>/g, "\n");

      await writeGoogleDoc(docId, fullText);

      console.log(`[Google Docs] Synced "${book.title}" back to doc ${docId}`);
      res.json({ success: true, docId, chaptersWritten: book.chapters.filter(c => c.content).length });
    } catch (err: any) {
      console.error("[Google Docs Sync Error]", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/:id/refresh-from-google-doc", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const docId = book.google_doc_id;
      if (!docId) return res.status(400).json({ error: "No Google Doc linked. Import a doc first." });

      const { text, title } = await readGoogleDoc(docId);

      const lines = text.split("\n");
      const chapters: { title: string; content: string }[] = [];
      let currentTitle = "";
      let currentLines: string[] = [];

      for (const line of lines) {
        if (/^#\s+/.test(line)) {
          if (currentLines.length > 0) {
            const body = currentLines.join("\n").trim();
            if (body) {
              chapters.push({
                title: currentTitle || `Chapter ${chapters.length + 1}`,
                content: body,
              });
            }
          }
          currentTitle = line.replace(/^#\s+/, "").trim().substring(0, 100);
          currentLines = [];
        } else {
          currentLines.push(line);
        }
      }

      if (currentLines.length > 0) {
        const body = currentLines.join("\n").trim();
        if (body) {
          chapters.push({
            title: currentTitle || `Chapter ${chapters.length + 1}`,
            content: body,
          });
        }
      }

      if (chapters.length === 0) {
        chapters.push({ title: "Chapter 1", content: text });
      }

      book.chapters = chapters.map((ch, i) => {
        const existing = book.chapters.find(c => c.chapter_number === i + 1);
        return {
          chapter_number: i + 1,
          title: ch.title,
          outline: existing?.outline || "",
          content: ch.content,
          summary: null,
          status: "written" as const,
        };
      });
      await storage.saveBook(book);

      console.log(`[Google Docs] Refreshed "${title}" (${docId}) — ${chapters.length} chapters`);
      res.json({ book, chaptersRefreshed: chapters.length });
    } catch (err: any) {
      console.error("[Google Docs Refresh Error]", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/books/:id/google-doc-status", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      const docId = book.google_doc_id || null;
      res.json({ linked: !!docId, docId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/:id/rewrite-chapter/:chapterNum", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      if (!chapter.content) return res.status(400).json({ error: "Chapter has no content to rewrite" });

      const { instructions, sliders } = req.body;
      if (!instructions) return res.status(400).json({ error: "Rewrite instructions are required" });

      const previousSummaries = buildPreviousSummariesContext(book.chapters, chapterNum);
      const slidersBlock = sliders ? formatSlidersBlock(sliders) : "";

      let docsContext = "";
      if (book.documents && book.documents.length > 0) {
        docsContext = "\n\nREFERENCE DOCUMENTS:\n" + book.documents.map(d =>
          `--- ${d.name} (${d.type.replace(/_/g, " ")}) ---\n${d.content}`
        ).join("\n\n");
      }

      let dossierContext = "";
      if (book.dossier) {
        dossierContext = `\n\nSTORY DOSSIER:\n${book.dossier}`;
      }

      const laterSummaries = book.chapters
        .filter(c => c.chapter_number > chapterNum && c.summary)
        .sort((a, b) => a.chapter_number - b.chapter_number)
        .slice(0, 3)
        .map(c => `### Chapter ${c.chapter_number}: ${c.title}\n${c.summary}`)
        .join("\n\n");

      const result = await callLLM(
        `You are a skilled novelist rewriting a chapter of a book. Rewrite Chapter ${chapterNum} based on the author's instructions while maintaining continuity with the rest of the book.

${CONTEXT_ENGINEERING_RULES}
${dossierContext}
${docsContext}

PREVIOUS CHAPTER SUMMARIES (what happened before this chapter):
${previousSummaries}

${laterSummaries ? `LATER CHAPTER SUMMARIES (what happens after — maintain consistency):\n${laterSummaries}\n` : ""}

CURRENT CHAPTER ${chapterNum} TEXT (the chapter to rewrite):
${chapter.content}
${slidersBlock}

AUTHOR'S REWRITE INSTRUCTIONS:
${instructions}

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

${SCENE_WRITING_RULES}

${DEFAULT_DECISION_RULE}

${LAYERED_GENERATION_WORKFLOW}

${READER_VALUE_TEST}

${RAW_MATERIAL_MINDSET}

INSTRUCTIONS:
- Rewrite the chapter following the author's instructions
- Preserve the essential story beats unless the instructions say otherwise
- Maintain continuity with previous AND later chapters
- Use reference documents for character/world consistency
- The rewritten chapter should be similar length to the original (2000-4000 words)
- Start with the chapter title as a heading
- Write immersive, engaging fiction

SELF-EDIT PASS:
- Remove lines that explain what behavior already shows
- Replace abstract lines with concrete action or sensation
- Break accidental sentence pattern symmetry
- Confirm action clarity in physical sequences

${ANTI_SLOP_FILTER}

Output only the rewritten chapter text.`,
        "powerful",
        undefined,
        16384
      );

      if (!result || !result.trim()) {
        return res.status(500).json({ error: "AI returned empty rewrite. Please try again." });
      }

      const titleMatch = result.match(/^#\s*(?:Chapter\s*\d+[:\s]*)?(.+)/m);
      if (titleMatch) chapter.title = titleMatch[1].trim();
      chapter.content = result;
      chapter.status = "written";
      await storage.saveBook(book);

      try {
        const summaryResult = await callLLM(
          `You are a story continuity editor. Read the chapter below and produce a structured continuity snapshot.

CHAPTER ${chapterNum}: ${chapter.title}
${result}

${CHAPTER_SUMMARY_TEMPLATE}

CRITICAL: Be specific and factual. Track every detail that could create a continuity error if forgotten.`,
          "powerful"
        );
        chapter.summary = summaryResult;
        await storage.saveBook(book);
      } catch (sumErr: any) {
        console.error("[Rewrite summary failed]", sumErr.message);
      }

      const freshBook = await storage.getBook(req.params.id);
      res.json({ chapter, book: freshBook || book });
    } catch (err: any) {
      console.error("[Rewrite Chapter Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/books/:id/chapters/:chapterNum", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });

      const { content, title, summary, sliders } = req.body;

      if (chapter.status === "committed" && (content !== undefined || summary !== undefined)) {
        return res.status(409).json({ error: "Chapter is committed and locked. Unlock it before editing content or summary." });
      }

      if (content !== undefined) {
        chapter.content = content;
        chapter.summary = null;
        chapter.status = "written";
      }
      if (title !== undefined) chapter.title = title;
      if (summary !== undefined) chapter.summary = summary;
      if (sliders !== undefined) chapter.sliders = sliders;
      if (content === undefined && summary === undefined && chapter.status !== "committed") {
        chapter.status = "written";
      }
      await storage.saveBook(book);

      const freshBook = await storage.getBook(req.params.id);
      res.json({ chapter, book: freshBook || book });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/:id/commit-chapter/:chapterNum", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      if (!chapter.content) return res.status(400).json({ error: "Chapter has no content to commit" });
      if (chapter.status !== "written") return res.status(400).json({ error: "Only written chapters can be committed" });

      const summaryResult = await callLLM(
        `You are a story continuity editor. Read the chapter below and produce a structured continuity snapshot.

CHAPTER ${chapterNum}: ${chapter.title}
${chapter.content}

${CHAPTER_SUMMARY_TEMPLATE}

CRITICAL: Be specific and factual. Track every detail that could create a continuity error if forgotten.`,
        "powerful"
      );
      chapter.summary = summaryResult;
      chapter.status = "committed";
      await storage.saveBook(book);

      const freshBook = await storage.getBook(req.params.id);
      res.json({ chapter, book: freshBook || book });
    } catch (err: any) {
      console.error("[Commit Chapter Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/:id/unlock-chapter/:chapterNum", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      if (chapter.status !== "committed") return res.status(400).json({ error: "Chapter is not committed" });

      chapter.status = "written";
      await storage.saveBook(book);

      const freshBook = await storage.getBook(req.params.id);
      res.json({ chapter, book: freshBook || book });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/:id/analyze-chapter/:chapterNum", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      if (!chapter.content) return res.status(400).json({ error: "Chapter has no content to analyze" });
      if (chapter.status !== "committed") return res.status(400).json({ error: "Only committed chapters can be analyzed" });

      const { analysisType, betaProfile } = req.body;
      if (!analysisType) return res.status(400).json({ error: "analysisType is required" });

      const previousContext = book.chapters
        .filter(c => c.chapter_number < chapterNum && c.summary)
        .sort((a, b) => a.chapter_number - b.chapter_number)
        .map(c => `Chapter ${c.chapter_number}: ${c.title}\n${c.summary}`)
        .join("\n\n");

      const genre = "general fiction";
      let result: any;
      let profile: string | undefined;

      if (analysisType === "beta_reader") {
        const { runBetaReader } = await import("./forge/analysis/modules/beta-reader");
        const profileKey = betaProfile || "genre_enthusiast";
        profile = profileKey;
        result = await runBetaReader(chapter.content, previousContext, genre, profileKey);
      } else if (analysisType === "editorial_assessment") {
        const { runEditorialAssessment } = await import("./forge/analysis/modules/editorial-assessment");
        result = await runEditorialAssessment(chapter.content, previousContext, genre, "");
      } else if (analysisType === "developmental_assessment") {
        const { runDevEdit } = await import("./forge/analysis/modules/developmental-editor");
        result = await runDevEdit(chapter.content, previousContext, genre, "");
      } else {
        return res.status(400).json({ error: `Unknown analysisType: ${analysisType}` });
      }

      if (!chapter.analyses) chapter.analyses = [];
      const existingIdx = chapter.analyses.findIndex(
        a => a.type === analysisType && (analysisType !== "beta_reader" || a.profile === profile)
      );
      const analysisEntry = {
        type: analysisType as "beta_reader" | "editorial_assessment" | "developmental_assessment",
        profile,
        result,
        ran_at: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        chapter.analyses[existingIdx] = analysisEntry;
      } else {
        chapter.analyses.push(analysisEntry);
      }
      await storage.saveBook(book);

      const freshBook = await storage.getBook(req.params.id);
      res.json({ chapter, book: freshBook || book, analysisResult: result });
    } catch (err: any) {
      console.error("[Analyze Chapter Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/:id/summarize-all", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const unsummarized = book.chapters.filter(c => c.content && !c.summary);
      if (unsummarized.length === 0) return res.json({ summarized: 0, book });

      for (const chapter of unsummarized) {
        try {
          const summaryResult = await callLLM(
            `You are a story continuity editor. Read the chapter below and produce a structured continuity snapshot.

CHAPTER ${chapter.chapter_number}: ${chapter.title}
${chapter.content}

${CHAPTER_SUMMARY_TEMPLATE}

CRITICAL: Be specific and factual. Reference character names and concrete details. Track every detail that could create a continuity error.`,
            "powerful"
          );
          chapter.summary = summaryResult;
          await storage.saveBook(book);
        } catch (sumErr: any) {
          console.error(`[Summarize chapter ${chapter.chapter_number} failed]`, sumErr.message);
        }
      }

      const freshBook = await storage.getBook(req.params.id);
      res.json({ summarized: unsummarized.length, book: freshBook || book });
    } catch (err: any) {
      console.error("[Summarize All Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/:id/write-from-prompt", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const { prompt, genre, sliders } = req.body;
      if (!prompt) return res.status(400).json({ error: "prompt is required" });

      const nextNum = book.chapters.length + 1;
      const previousSummaries = buildPreviousSummariesContext(book.chapters, nextNum);
      const slidersBlock = sliders ? formatSlidersBlock(sliders) : "";

      let docsContext = "";
      if (book.documents && book.documents.length > 0) {
        docsContext = "\n\nREFERENCE DOCUMENTS:\n" + book.documents.map(d =>
          `--- ${d.name} (${d.type.replace(/_/g, " ")}) ---\n${d.content}`
        ).join("\n\n");
      }

      let dossierContext = "";
      if (book.dossier) {
        dossierContext = `\n\nSTORY DOSSIER:\n${book.dossier}`;
      }

      const fullPrompt = `You are a skilled novelist writing the next chapter of a book. Write Chapter ${nextNum} based on the author's prompt and all available context.

${CONTEXT_ENGINEERING_RULES}
${dossierContext}
${docsContext}

PREVIOUS CHAPTER SUMMARIES (what has happened so far):
${previousSummaries}
${slidersBlock}

AUTHOR'S PROMPT FOR THIS CHAPTER:
${prompt}

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

${SCENE_WRITING_RULES}

${DEFAULT_DECISION_RULE}

${LAYERED_GENERATION_WORKFLOW}

${READER_VALUE_TEST}

${RAW_MATERIAL_MINDSET}

INSTRUCTIONS:
- Write the full chapter as polished prose, ready for a reader
- The author's prompt describes what they want to happen — interpret it creatively and expand it into a full chapter
- Use the reference documents (story bible, character sheets, etc.) for consistency with established lore, characters, and world details
- Maintain continuity with everything in previous chapter summaries
- Apply scene engineering: every scene must have Goal → Conflict → Outcome with a value shift
- Include concrete sensory details across multiple senses
- The chapter should be 2000-4000 words
- Start with a chapter title as a heading (# Chapter ${nextNum}: [Title])
- Write immersive, engaging fiction — not a summary or treatment
- Do NOT include author notes, meta-commentary, or section labels within the prose

SELF-EDIT PASS (apply before outputting):
- Remove lines that explain what behavior already shows
- Replace at least one abstract "meaning" line with concrete action or sensation
- Break any accidental sentence pattern symmetry
- Confirm action clarity in physical sequences

${ANTI_SLOP_FILTER}

Output only the chapter text.`;

      const newChapter: BookChapter = {
        chapter_number: nextNum,
        title: `Chapter ${nextNum}`,
        outline: prompt,
        content: null,
        summary: null,
        status: "writing",
      };
      if (sliders) newChapter.sliders = sliders;
      book.chapters.push(newChapter);
      await storage.saveBook(book);

      const result = await callLLM(fullPrompt, "powerful", undefined, 16384);

      if (!result || !result.trim()) {
        newChapter.status = "outlined";
        newChapter.content = null;
        await storage.saveBook(book);
        return res.status(500).json({ error: "AI returned empty chapter. Please try again." });
      }

      const titleMatch = result.match(/^#\s*(?:Chapter\s*\d+[:\s]*)?(.+)/m);
      if (titleMatch) newChapter.title = titleMatch[1].trim();
      newChapter.content = result;
      newChapter.status = "written";
      await storage.saveBook(book);

      try {
        const summaryResult = await callLLM(
          `You are a story continuity editor. Read the chapter below and produce a structured continuity snapshot that will be used as context for writing subsequent chapters.

CHAPTER ${nextNum}: ${newChapter.title}
${result}

${CHAPTER_SUMMARY_TEMPLATE}

CRITICAL: Be specific and factual. Reference character names and concrete details. This snapshot will be the ONLY context the next chapter's AI has about this chapter. Track every detail that could create a continuity error if forgotten.`,
          "powerful"
        );

        newChapter.summary = summaryResult;
        await storage.saveBook(book);
      } catch (sumErr: any) {
        console.error("[Summary generation failed, chapter saved without summary]", sumErr.message);
      }

      const freshBook = await storage.getBook(req.params.id);
      res.json({ chapter: newChapter, book: freshBook || book });
    } catch (err: any) {
      console.error("[Write From Prompt Error]", err);
      const book = await storage.getBook(req.params.id);
      if (book) {
        const lastChapter = book.chapters[book.chapters.length - 1];
        if (lastChapter && lastChapter.status === "writing") {
          lastChapter.status = "outlined";
          await storage.saveBook(book);
        }
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/editor/analyze", async (req, res) => {
    try {
      const { text, module: moduleName, genre, context, betaProfile } = req.body;
      if (!text || !moduleName) {
        return res.status(400).json({ error: "text and module are required" });
      }
      const g = genre || "general fiction";
      const ctx = context || "";

      let result: any;

      switch (moduleName) {
        case "editorial_assessment": {
          const { runEditorialAssessment } = await import("./forge/analysis/modules/editorial-assessment");
          result = await runEditorialAssessment(text, ctx, g, "");
          break;
        }
        case "developmental_editor": {
          const { runDevEdit } = await import("./forge/analysis/modules/developmental-editor");
          result = await runDevEdit(text, ctx, g, "");
          break;
        }
        case "copy_editor": {
          const { runCopyEdit } = await import("./forge/analysis/modules/copy-editor");
          result = await runCopyEdit(text, ctx, g);
          break;
        }
        case "proofreader": {
          const { runProofread } = await import("./forge/analysis/modules/proofreader");
          result = await runProofread(text);
          break;
        }
        case "beta_reader": {
          const { runBetaReader } = await import("./forge/analysis/modules/beta-reader");
          result = await runBetaReader(text, ctx, g, betaProfile || "genre_enthusiast");
          break;
        }
        case "scene_scanner": {
          const { runSceneScan } = await import("./forge/analysis/modules/scene-scanner");
          result = await runSceneScan(text, ctx, g, [1]);
          break;
        }
        default:
          return res.status(400).json({ error: `Unknown module: ${moduleName}` });
      }

      res.json({ module: moduleName, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  function buildPreviousSummariesContext(chapters: BookChapter[], upToChapter: number): string {
    const relevant = chapters
      .filter(c => c.chapter_number < upToChapter && c.summary)
      .sort((a, b) => a.chapter_number - b.chapter_number);

    if (relevant.length === 0) {
      return "No previous chapters yet — this is the first chapter.";
    }

    const RECENT_FULL_COUNT = 5;

    if (relevant.length <= RECENT_FULL_COUNT) {
      return relevant
        .map(c => `### Chapter ${c.chapter_number}: ${c.title}\n${c.summary}`)
        .join("\n\n");
    }

    const older = relevant.slice(0, relevant.length - RECENT_FULL_COUNT);
    const recent = relevant.slice(relevant.length - RECENT_FULL_COUNT);

    const compressedOlder = older.map(c => {
      const plotMatch = c.summary!.match(/\*\*Plot Summary:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      const changedMatch = c.summary!.match(/\*\*What Changed:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      const threadsMatch = c.summary!.match(/\*\*Open Threads:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      const continuityMatch = c.summary!.match(/\*\*Continuity Tracking:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      const parts = [`### Chapter ${c.chapter_number}: ${c.title} (compressed)`];
      if (plotMatch) parts.push(plotMatch[0].trim());
      if (changedMatch) parts.push(changedMatch[0].trim());
      if (threadsMatch) parts.push(threadsMatch[0].trim());
      if (continuityMatch) parts.push(continuityMatch[0].trim());
      if (parts.length === 1) parts.push(c.summary!.substring(0, 500) + "...");
      return parts.join("\n");
    }).join("\n\n");

    const fullRecent = recent
      .map(c => `### Chapter ${c.chapter_number}: ${c.title}\n${c.summary}`)
      .join("\n\n");

    return `[EARLIER CHAPTERS — compressed for context efficiency]\n\n${compressedOlder}\n\n[RECENT CHAPTERS — full detail]\n\n${fullRecent}`;
  }

  function formatSlidersBlock(sliders?: NarrativeSliders | null): string {
    if (!sliders) return "";
    return `
[NARRATIVE_SLIDERS] — Apply these dynamic values to character behavior in this scene:
- tension: ${sliders.tension}/10
- intimacy: ${sliders.intimacy}/10
- violence_risk: ${sliders.violence_risk}/10
- wonder: ${sliders.wonder}/10
- dread: ${sliders.dread}/10
- trust: ${sliders.trust} (range -10 to +10)
- stress: ${sliders.stress} (range -10 to +10)
- control: ${sliders.control} (range -10 to +10)
- hope: ${sliders.hope} (range -10 to +10)

${NARRATIVE_SLIDER_RULES}`;
  }

  app.post("/api/books/:id/outline-chapter", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const lastChapter = book.chapters[book.chapters.length - 1];
      if (lastChapter && (lastChapter.status !== "committed")) {
        return res.status(400).json({
          error: `Chapter ${lastChapter.chapter_number} must be committed before generating the next chapter outline.`
        });
      }

      const nextNum = book.chapters.length + 1;
      const previousSummaries = buildPreviousSummariesContext(book.chapters, nextNum);

      const result = await callLLM(
        `You are a master story architect working on a novel. Generate a detailed chapter outline for Chapter ${nextNum}.

STORY DOSSIER (characters, world, themes, plot beats):
${book.dossier}

AUTHOR'S ORIGINAL VISION:
${book.brain_dump}

PREVIOUS CHAPTER SUMMARIES:
${previousSummaries}

${STORY_ARCHITECTURE_RULES}

${CONTEXT_ENGINEERING_RULES}

${DEFAULT_DECISION_RULE}

INSTRUCTIONS:
- This novel targets 32 chapters total. Chapter ${nextNum} of 32 — pace the story accordingly
- Based on the dossier's plot beats, determine what should happen at this point in a 32-chapter arc
- Structure guidance: Chapters 1-3 setup/hook, 4-8 rising action, 9-10 first pinch point, 11-16 midpoint build, 17-18 midpoint reversal, 19-24 escalation, 25-26 second pinch point, 27-30 climax sequence, 31-32 resolution/denouement
- Consider where the story is right now based on previous chapter summaries
- Apply the character arc engine: what stage of the protagonist's Lie→Truth journey is this chapter? Are they still in the grip of the Lie, getting a glimpse of the Truth, or being tested?
- Each scene in the outline must have a clear Goal, Conflict, and Outcome (value shift)
- Apply the double-up rule: each scene should serve at least two functions (plot + character, action + theme, etc.)
- Include 1-2 mundane frictions that ground the chapter in physical reality
- The chapter must end on an open circuit — an unresolved question or tension that propels the reader forward
- Check continuity: reference character locations, injuries, knowledge states, and active threats from previous chapter summaries
- Be specific — name characters, reference established world details, connect to ongoing threads
- Keep the outline to 300-500 words
- Include a suggested chapter title

Format as:
**Chapter Title:** [title]

**Chapter Goal:** [what this chapter accomplishes in the larger story]

**Arc Position:** [where we are in the protagonist's Lie→Truth journey and the overall plot structure]

**Key Scenes:**
1. [scene description — include Goal/Conflict/Outcome]
2. [scene description — include Goal/Conflict/Outcome]
...

**Emotional Beat:** [the emotional journey of this chapter]

**Mundane Frictions:** [1-2 physical-world complications that affect the action]

**Ends With:** [the open circuit — what unresolved question pulls the reader to the next chapter]`,
        "powerful"
      );

      const titleMatch = result.match(/\*\*Chapter Title:\*\*\s*(.+)/);
      const chapterTitle = titleMatch ? titleMatch[1].trim() : `Chapter ${nextNum}`;

      const newChapter: BookChapter = {
        chapter_number: nextNum,
        title: chapterTitle,
        outline: result,
        content: null,
        summary: null,
        status: "outlined",
        sliders: {
          tension: 5, intimacy: 3, violence_risk: 3, wonder: 3, dread: 3,
          trust: 0, stress: 0, control: 0, hope: 0,
        },
      };

      book.chapters.push(newChapter);
      await storage.saveBook(book);

      res.json({ chapter: newChapter, book });
    } catch (err: any) {
      console.error("[Outline Chapter Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/:id/write-chapter/:chapterNum", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      if (!chapter.outline) return res.status(400).json({ error: "Chapter has no outline" });

      chapter.status = "writing";
      await storage.saveBook(book);

      const previousSummaries = buildPreviousSummariesContext(book.chapters, chapterNum);
      const slidersBlock = formatSlidersBlock(chapter.sliders);

      const result = await callLLM(
        `You are a skilled novelist writing a chapter of a book. Write Chapter ${chapterNum} based on the outline and context below.

${CONTEXT_ENGINEERING_RULES}

STORY DOSSIER (characters, world, themes, plot beats):
${book.dossier}

AUTHOR'S ORIGINAL VISION:
${book.brain_dump}

PREVIOUS CHAPTER SUMMARIES (what has happened so far):
${previousSummaries}

CHAPTER ${chapterNum} OUTLINE:
${chapter.outline}
${slidersBlock}

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

${SCENE_WRITING_RULES}

${DEFAULT_DECISION_RULE}

${LAYERED_GENERATION_WORKFLOW}

${READER_VALUE_TEST}

${RAW_MATERIAL_MINDSET}

INSTRUCTIONS:
- Write the full chapter as polished prose, ready for a reader
- Follow the outline's scenes and emotional beats faithfully
- Apply scene engineering: every scene must have Goal → Conflict → Outcome with a value shift
- Apply the double-up rule: each scene serves at least two functions simultaneously
- Begin scenes late, end them early — enter close to the conflict, exit before full resolution
- End the chapter on an open circuit (Zeigarnik effect) — leave the reader with an unresolved question
- Include concrete sensory details across multiple senses (sound, smell, texture, temperature), not just sight
- Use mundane frictions from the outline to ground action in physical reality
- Maintain continuity with everything in previous chapter summaries — check character locations, injuries, knowledge states, relationships, and active threats
- Use the character voices, world details, and tone established in the dossier
- The chapter should be 2000-4000 words
- Start with the chapter title as a heading
- Write immersive, engaging fiction — not a summary or treatment
- Do NOT include author notes, meta-commentary, or section labels within the prose

SELF-EDIT PASS (apply before outputting):
- Remove lines that explain what behavior already shows
- Replace at least one abstract "meaning" line with concrete action or sensation
- Break any accidental sentence pattern symmetry (three sentences with the same structure)
- Confirm action clarity in physical sequences: hands, objects, positions, cause-and-effect

${ANTI_SLOP_FILTER}

Output only the chapter text.`,
        "powerful",
        undefined,
        16384
      );

      if (!result || !result.trim()) {
        chapter.status = "outlined";
        await storage.saveBook(book);
        return res.status(500).json({ error: "AI returned empty chapter. Please try again." });
      }

      chapter.content = result;
      chapter.status = "written";
      await storage.saveBook(book);

      res.json({ chapter, book });
    } catch (err: any) {
      console.error("[Write Chapter Error]", err);
      const book = await storage.getBook(req.params.id);
      if (book) {
        const chapter = book.chapters.find(c => c.chapter_number === parseInt(req.params.chapterNum));
        if (chapter && chapter.status === "writing") {
          chapter.status = "outlined";
          await storage.saveBook(book);
        }
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/:id/summarize-chapter/:chapterNum", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      if (!chapter.content) return res.status(400).json({ error: "Chapter has no content to summarize" });

      const result = await callLLM(
        `You are a story continuity editor. Read the chapter below and produce a structured continuity snapshot that will be used as context for writing subsequent chapters.

CHAPTER ${chapterNum}: ${chapter.title}
${chapter.content}

${CHAPTER_SUMMARY_TEMPLATE}

CRITICAL: Be specific and factual. Reference character names and concrete details. This snapshot will be the ONLY context the next chapter's AI has about this chapter. Track every detail that could create a continuity error if forgotten — who knows what, who is where, what is damaged/lost/gained, what promises were made, what threats are active. The Continuity Tracking section is especially important for preventing contradictions in later chapters.`,
        "cheap"
      );

      chapter.summary = result;
      await storage.saveBook(book);

      res.json({ chapter, book });
    } catch (err: any) {
      console.error("[Summarize Chapter Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/books/:id/chapters/:chapterNum", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });

      if (req.body.title !== undefined) chapter.title = req.body.title;
      if (req.body.outline !== undefined) chapter.outline = req.body.outline;
      if (req.body.content !== undefined) {
        chapter.content = req.body.content;
        if (req.body.content) {
          chapter.status = "written";
        } else {
          chapter.status = "outlined";
          chapter.summary = null;
        }
      }
      if (req.body.summary !== undefined) chapter.summary = req.body.summary;
      if (req.body.sliders !== undefined) chapter.sliders = req.body.sliders;

      await storage.saveBook(book);
      res.json({ chapter, book });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chapter/write-standalone", async (req, res) => {
    try {
      const { prompt, genre, sliders } = req.body;
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const slidersBlock = formatSlidersBlock(sliders);
      const genreHint = genre ? `\nGENRE CONTEXT: ${genre}\n` : "";

      const result = await callLLM(
        `You are a skilled novelist writing a standalone chapter from the author's creative prompt.

${CONTEXT_ENGINEERING_RULES}

AUTHOR'S CREATIVE PROMPT:
${prompt}
${genreHint}
${slidersBlock}

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

${SCENE_WRITING_RULES}

${DEFAULT_DECISION_RULE}

${LAYERED_GENERATION_WORKFLOW}

${READER_VALUE_TEST}

${RAW_MATERIAL_MINDSET}

INSTRUCTIONS:
- Write a complete, polished chapter (2000-4000 words) based on the author's prompt
- Extract characters, setting, conflict, and tone from whatever the author has given you — whether that's a detailed outline or just a raw idea
- Structure the chapter with proper scene engineering: Goal → Conflict → Outcome with value shifts
- Apply the double-up rule: each scene serves at least two functions simultaneously
- Begin scenes late, end them early — enter close to the conflict, exit before full resolution
- End the chapter on an open circuit (Zeigarnik effect) — leave the reader with an unresolved question
- Include concrete sensory details across multiple senses (sound, smell, texture, temperature), not just sight
- Write immersive, engaging fiction — not a summary or treatment
- Start with a chapter title as a heading
- Do NOT include author notes, meta-commentary, or section labels within the prose

SELF-EDIT PASS (apply before outputting):
- Remove lines that explain what behavior already shows
- Replace at least one abstract "meaning" line with concrete action or sensation
- Break any accidental sentence pattern symmetry
- Confirm action clarity in physical sequences

${ANTI_SLOP_FILTER}

Output only the chapter text.`,
        "powerful",
        undefined,
        16384
      );

      if (!result || !result.trim()) {
        return res.status(500).json({ error: "AI returned empty chapter. Please try again." });
      }

      res.json({ content: result });
    } catch (err: any) {
      console.error("[Standalone Chapter Write Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  const VARIANT_LENSES = [
    { name: "Tighter Pacing", instruction: "CREATIVE LENS — TIGHTER PACING: Compress transitions, shorten dialogue exchanges, increase the pace of reveals and complications. Every paragraph must earn its space. Cut breathing room in favor of momentum. The reader should feel pulled through the chapter." },
    { name: "More Atmospheric", instruction: "CREATIVE LENS — MORE ATMOSPHERIC: Lean into environmental texture, sensory layering, and mood. Let the setting become a character. Expand quiet moments with physical detail that creates dread, wonder, or unease. The reader should feel the world pressing in." },
    { name: "Stronger Dialogue Focus", instruction: "CREATIVE LENS — STRONGER DIALOGUE FOCUS: Let conversation drive the scene. Reduce narration between dialogue beats. Make characters reveal themselves through what they say, dodge, interrupt, and refuse to say. Subtext carries the weight. The chapter should feel like eavesdropping." },
  ];

  app.post("/api/books/:id/rewrite-chapter-variants/:chapterNum", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      if (!chapter.content) return res.status(400).json({ error: "Chapter has no content to rewrite" });

      const { instructions, sliders } = req.body;
      if (!instructions) return res.status(400).json({ error: "Rewrite instructions are required" });

      const previousSummaries = buildPreviousSummariesContext(book.chapters, chapterNum);
      const slidersBlock = sliders ? formatSlidersBlock(sliders) : "";

      let docsContext = "";
      if (book.documents && book.documents.length > 0) {
        docsContext = "\n\nREFERENCE DOCUMENTS:\n" + book.documents.map(d =>
          `--- ${d.name} (${d.type.replace(/_/g, " ")}) ---\n${d.content}`
        ).join("\n\n");
      }

      let dossierContext = "";
      if (book.dossier) {
        dossierContext = `\n\nSTORY DOSSIER:\n${book.dossier}`;
      }

      const laterSummaries = book.chapters
        .filter(c => c.chapter_number > chapterNum && c.summary)
        .sort((a, b) => a.chapter_number - b.chapter_number)
        .slice(0, 3)
        .map(c => `### Chapter ${c.chapter_number}: ${c.title}\n${c.summary}`)
        .join("\n\n");

      const variantPromises = VARIANT_LENSES.map(lens =>
        callLLM(
          `You are a skilled novelist rewriting a chapter of a book. Rewrite Chapter ${chapterNum} based on the author's instructions while maintaining continuity with the rest of the book.

${lens.instruction}

${CONTEXT_ENGINEERING_RULES}
${dossierContext}
${docsContext}

PREVIOUS CHAPTER SUMMARIES (what happened before this chapter):
${previousSummaries}

${laterSummaries ? `LATER CHAPTER SUMMARIES (what happens after — maintain consistency):\n${laterSummaries}\n` : ""}

CURRENT CHAPTER ${chapterNum} TEXT (the chapter to rewrite):
${chapter.content}
${slidersBlock}

AUTHOR'S REWRITE INSTRUCTIONS:
${instructions}

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

${SCENE_WRITING_RULES}

${DEFAULT_DECISION_RULE}

${LAYERED_GENERATION_WORKFLOW}

${READER_VALUE_TEST}

${RAW_MATERIAL_MINDSET}

INSTRUCTIONS:
- Rewrite the chapter following the author's instructions AND the creative lens above
- The creative lens should noticeably shape the output — this variant should feel different from other approaches
- Preserve the essential story beats unless the instructions say otherwise
- Maintain continuity with previous AND later chapters
- Use reference documents for character/world consistency
- The rewritten chapter should be similar length to the original (2000-4000 words)
- Start with the chapter title as a heading
- Write immersive, engaging fiction

SELF-EDIT PASS:
- Remove lines that explain what behavior already shows
- Replace abstract lines with concrete action or sensation
- Break accidental sentence pattern symmetry
- Confirm action clarity in physical sequences

${ANTI_SLOP_FILTER}

Output only the rewritten chapter text.`,
          "powerful",
          undefined,
          16384
        ).then(result => ({
          lens: lens.name,
          content: result?.trim() || "",
        })).catch(err => ({
          lens: lens.name,
          content: "",
          error: err.message,
        }))
      );

      const variants = await Promise.all(variantPromises);
      const successfulVariants = variants.filter(v => v.content);

      if (successfulVariants.length === 0) {
        return res.status(500).json({ error: "All variant generations failed. Please try again." });
      }

      res.json({ variants: successfulVariants });
    } catch (err: any) {
      console.error("[Chapter Variant Rewrite Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chapter/write-standalone-variants", async (req, res) => {
    try {
      const { prompt, genre, sliders } = req.body;
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const slidersBlock = formatSlidersBlock(sliders);
      const genreHint = genre ? `\nGENRE CONTEXT: ${genre}\n` : "";

      const variantPromises = VARIANT_LENSES.map(lens =>
        callLLM(
          `You are a skilled novelist writing a standalone chapter from the author's creative prompt.

${lens.instruction}

${CONTEXT_ENGINEERING_RULES}

AUTHOR'S CREATIVE PROMPT:
${prompt}
${genreHint}
${slidersBlock}

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

${SCENE_WRITING_RULES}

${DEFAULT_DECISION_RULE}

${LAYERED_GENERATION_WORKFLOW}

${READER_VALUE_TEST}

${RAW_MATERIAL_MINDSET}

INSTRUCTIONS:
- Write a complete, polished chapter (2000-4000 words) based on the author's prompt AND the creative lens above
- The creative lens should noticeably shape the output — this variant should feel different from other approaches
- Extract characters, setting, conflict, and tone from whatever the author has given you
- Structure the chapter with proper scene engineering: Goal → Conflict → Outcome with value shifts
- Apply the double-up rule: each scene serves at least two functions simultaneously
- Begin scenes late, end them early
- End the chapter on an open circuit
- Include concrete sensory details across multiple senses
- Write immersive, engaging fiction
- Start with a chapter title as a heading
- Do NOT include author notes, meta-commentary, or section labels within the prose

SELF-EDIT PASS (apply before outputting):
- Remove lines that explain what behavior already shows
- Replace at least one abstract "meaning" line with concrete action or sensation
- Break any accidental sentence pattern symmetry
- Confirm action clarity in physical sequences

${ANTI_SLOP_FILTER}

Output only the chapter text.`,
          "powerful",
          undefined,
          16384
        ).then(result => ({
          lens: lens.name,
          content: result?.trim() || "",
        })).catch(err => ({
          lens: lens.name,
          content: "",
          error: err.message,
        }))
      );

      const variants = await Promise.all(variantPromises);
      const successfulVariants = variants.filter(v => v.content);

      if (successfulVariants.length === 0) {
        return res.status(500).json({ error: "All variant generations failed. Please try again." });
      }

      res.json({ variants: successfulVariants });
    } catch (err: any) {
      console.error("[Standalone Variant Write Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/chapter-drafts", async (_req, res) => {
    try {
      if (!existsSync(DRAFTS_DIR)) { res.json([]); return; }
      const files = await readdir(DRAFTS_DIR);
      const drafts: ChapterDraft[] = [];
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const raw = await readFile(path.join(DRAFTS_DIR, file), "utf-8");
          drafts.push(JSON.parse(raw));
        } catch { continue; }
      }
      drafts.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      res.json(drafts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/chapter-drafts/:id", async (req, res) => {
    try {
      const id = req.params.id;
      if (!SAFE_ID.test(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
      const fp = path.join(DRAFTS_DIR, `${id}.json`);
      if (!existsSync(fp)) { res.status(404).json({ error: "Not found" }); return; }
      const raw = await readFile(fp, "utf-8");
      res.json(JSON.parse(raw));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chapter-drafts", async (req, res) => {
    try {
      const { id, prompt, genre, content } = req.body;
      const now = new Date().toISOString();
      const draftId = (id && SAFE_ID.test(id)) ? id : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const titleLine = (prompt || "").split("\n")[0].slice(0, 80) || "Untitled Chapter";
      const existing = existsSync(path.join(DRAFTS_DIR, `${draftId}.json`));
      const draft: ChapterDraft = {
        id: draftId,
        title: titleLine,
        prompt: prompt || "",
        genre: genre || "",
        content: content || "",
        created_at: existing ? (JSON.parse(await readFile(path.join(DRAFTS_DIR, `${draftId}.json`), "utf-8")).created_at || now) : now,
        updated_at: now,
      };
      await writeFile(path.join(DRAFTS_DIR, `${draftId}.json`), JSON.stringify(draft, null, 2));
      res.json(draft);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/chapter-drafts/:id", async (req, res) => {
    try {
      const id = req.params.id;
      if (!SAFE_ID.test(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
      const fp = path.join(DRAFTS_DIR, `${id}.json`);
      if (!existsSync(fp)) { res.status(404).json({ error: "Not found" }); return; }
      await unlink(fp);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== PUBLISHING TOOLS ROUTES ==========

  app.post("/api/publishing/trope-research", async (req, res) => {
    try {
      const { niche } = req.body;
      if (!niche || !niche.trim()) {
        return res.status(400).json({ error: "niche is required" });
      }

      const prompt = `You are an expert KDP publishing strategist with deep knowledge of romance and fiction subgenres, reader expectations, and Amazon marketplace dynamics.

A writer is building a series in this niche/subgenre: "${niche.trim()}"

Analyze this niche and provide comprehensive trope research following proven KDP publishing strategy. Return ONLY valid JSON with this exact structure:

{
  "niche": "the cleaned niche name",
  "recurring_tropes": [
    {
      "name": "Trope Name",
      "description": "Why readers expect this trope in this niche and how to execute it well",
      "series_frequency": "use in every book / use in 80% of books / use occasionally"
    }
  ],
  "unique_tropes": [
    {
      "name": "Trope Name",
      "description": "A fresher twist or less-saturated variation that differentiates your books",
      "combination_potential": "Works best paired with: X and Y tropes"
    }
  ],
  "trending_combinations": [
    {
      "combo": "Trope A + Trope B",
      "why": "Why this combination is resonating with readers right now",
      "title_example": "Example title that signals these tropes"
    }
  ],
  "series_branding": {
    "consistency_advice": "How to build brand consistency across a series using these tropes",
    "reader_promise": "What readers should always get from your books — your unbreakable promise",
    "differentiation": "How to vary book to book while staying on-brand",
    "title_pattern": "Suggested title pattern or formula for the series"
  },
  "kdp_notes": "Specific notes about Amazon reader behavior, search terms, and category positioning for this niche"
}

RULES:
- Provide exactly 4-6 recurring tropes (what readers expect in EVERY book)
- Provide exactly 2-4 unique tropes (fresher options that differentiate)
- Provide exactly 3-5 trending combinations
- All advice should be specific to the exact niche provided, not generic
- Think about what sells on Amazon specifically — reader intent, search behavior, category placement
- Respond with ONLY the JSON, no other text`;

      const result = await callLLM(prompt, "powerful");

      let parsed;
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      }

      if (!Array.isArray(parsed.recurring_tropes) || !Array.isArray(parsed.unique_tropes) ||
          !Array.isArray(parsed.trending_combinations) || !parsed.series_branding) {
        return res.status(500).json({ error: "AI returned unexpected format. Please try again." });
      }
      if (parsed.recurring_tropes.length < 4) {
        return res.status(500).json({ error: `AI returned only ${parsed.recurring_tropes.length} recurring tropes (need at least 4). Please try again.` });
      }
      if (parsed.unique_tropes.length < 2) {
        return res.status(500).json({ error: `AI returned only ${parsed.unique_tropes.length} unique tropes (need at least 2). Please try again.` });
      }
      if (parsed.trending_combinations.length < 2) {
        return res.status(500).json({ error: `AI returned only ${parsed.trending_combinations.length} trending combinations (need at least 2). Please try again.` });
      }
      parsed.recurring_tropes = parsed.recurring_tropes.slice(0, 6);
      parsed.unique_tropes = parsed.unique_tropes.slice(0, 4);
      parsed.trending_combinations = parsed.trending_combinations.slice(0, 5);

      res.json(parsed);
    } catch (err: any) {
      console.error("[Trope Research Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/publishing/blurb/:bookId", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.bookId);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const writtenChapters = book.chapters.filter(c => c.summary || c.content);
      if (!book.dossier && writtenChapters.length === 0) {
        return res.status(400).json({ error: "This book needs a dossier or at least one written chapter before generating blurbs." });
      }

      const chapterContext = writtenChapters
        .slice(0, 8)
        .map(c => `Chapter ${c.chapter_number} - ${c.title}: ${c.summary || (c.content || "").substring(0, 300)}`)
        .join("\n\n");

      const prompt = `You are an expert KDP copywriter who specializes in writing Amazon book blurbs that convert browsers into buyers.

BOOK INFORMATION:
Title: ${book.title}
${book.dossier ? `Story Dossier:\n${book.dossier.substring(0, 3000)}` : ""}
${chapterContext ? `\nChapter Summaries:\n${chapterContext}` : ""}

Generate 3 distinct blurb variants for this book following KDP best practices. Return ONLY valid JSON:

{
  "blurbs": [
    {
      "label": "Hook-First",
      "text": "The full blurb text...",
      "strategy": "Brief note on the approach taken"
    },
    {
      "label": "Character-Led",
      "text": "The full blurb text...",
      "strategy": "Brief note on the approach taken"
    },
    {
      "label": "Tension-Forward",
      "text": "The full blurb text...",
      "strategy": "Brief note on the approach taken"
    }
  ]
}

RULES FOR EVERY BLURB:
1. First line is a HOOK — a single punchy sentence that grabs attention immediately
2. Introduce the main character(s) with their stakes, not their biography
3. Show the central conflict and tension — what stands between them and what they want
4. Weave in trope signals that readers search for (e.g., "enemies to lovers," "forced proximity," "second chance")
5. End on a cliffhanger that compels the purchase — leave the reader NEEDING to know what happens
6. Each blurb should be 150-250 words
7. NO spoilers — reveal conflict, not resolution
8. Use present tense for the blurb text
9. Make the emotional stakes crystal clear — readers buy emotion, not plot
10. Respond with ONLY the JSON, no preamble`;

      const result = await callLLM(prompt, "powerful");

      let parsed;
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      }

      if (!parsed.blurbs || !Array.isArray(parsed.blurbs)) {
        return res.status(500).json({ error: "AI returned unexpected format. Please try again." });
      }
      if (parsed.blurbs.length < 2) {
        return res.status(500).json({ error: `AI returned only ${parsed.blurbs.length} blurb variant(s) (need at least 2). Please try again.` });
      }
      parsed.blurbs = parsed.blurbs.slice(0, 3);

      res.json(parsed);
    } catch (err: any) {
      console.error("[Blurb Generator Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/publishing/titles-keywords/:bookId", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.bookId);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const hasContent = book.dossier || book.chapters.some(c => c.status === "written" || c.summary);
      if (!hasContent) {
        return res.status(400).json({ error: "This book needs a dossier or at least one written/summarized chapter before generating titles and keywords." });
      }

      const chapterContext = book.chapters
        .filter(c => c.summary)
        .slice(0, 5)
        .map(c => `Ch. ${c.chapter_number} (${c.title}): ${c.summary}`)
        .join("\n");

      const prompt = `You are an expert KDP publishing strategist who specializes in titles and Amazon keyword optimization.

BOOK INFORMATION:
Current Title: ${book.title}
${book.dossier ? `Story Dossier:\n${book.dossier.substring(0, 2500)}` : ""}
${chapterContext ? `\nChapter Context:\n${chapterContext}` : ""}

Generate title options and keyword strategy for this book. Return ONLY valid JSON:

{
  "titles": [
    {
      "title": "Main Title",
      "subtitle": "A Subtitle That Signals Tropes",
      "tropes_embedded": ["trope 1", "trope 2"],
      "reasoning": "Why this title works for this book and its readers"
    }
  ],
  "keywords": [
    {
      "phrase": "long-tail keyword phrase",
      "intent": "What reader is searching for with this phrase",
      "competition": "low / medium / high"
    }
  ],
  "categories": [
    {
      "path": "Kindle Store > Books > Romance > ...",
      "reasoning": "Why this category fits and how to rank in it"
    }
  ],
  "keyword_strategy": "Overall strategy note explaining how to use these keywords together"
}

TITLE RULES (generate 7-10 options):
- Each title must embed 2-3 tropes readers search for — be explicit and specific
- Subtitle should amplify the trope signals (e.g., "A Small Town Second Chance Romance")
- Examples of strong trope-forward titles: "The Enemy's Heir," "Second Chance at Sunrise," "Forced to Love the Billionaire"
- Avoid vague literary titles — readers on Amazon search for tropes, not metaphors
- Include some series-ready titles (e.g., "Silver Creek Falls Book 1")

KEYWORD RULES (generate exactly 7):
- Each keyword must be a multi-word phrase, NOT a single word
- Think like a reader: what exact phrase would someone type to find this book?
- Mix: subgenre phrases, trope combinations, character type phrases, emotional experience phrases
- Examples: "enemies to lovers small town romance," "billionaire forced proximity novel," "dark romance mafia enemies"
- Avoid: single words, publisher names, other author names, misleading terms

CATEGORY RULES (recommend exactly 2):
- Be specific to Amazon's actual category tree
- Choose categories where you can rank, not just ones that fit

Respond with ONLY the JSON, no preamble.`;

      const result = await callLLM(prompt, "powerful");

      let parsed;
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      }

      if (!Array.isArray(parsed.titles) || !Array.isArray(parsed.keywords) || !Array.isArray(parsed.categories)) {
        return res.status(500).json({ error: "AI returned unexpected format. Please try again." });
      }
      if (parsed.titles.length < 5) {
        return res.status(500).json({ error: `AI returned only ${parsed.titles.length} title option(s) (need at least 5). Please try again.` });
      }
      if (parsed.keywords.length < 7) {
        return res.status(500).json({ error: `AI returned only ${parsed.keywords.length} keywords (need 7). Please try again.` });
      }
      if (parsed.categories.length < 2) {
        return res.status(500).json({ error: `AI returned only ${parsed.categories.length} category recommendation(s) (need 2). Please try again.` });
      }
      parsed.titles = parsed.titles.slice(0, 10);
      parsed.keywords = parsed.keywords.slice(0, 7);
      parsed.categories = parsed.categories.slice(0, 2);

      res.json(parsed);
    } catch (err: any) {
      console.error("[Titles & Keywords Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
