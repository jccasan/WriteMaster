import express from "express";
import { readFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";
import { storage } from "../storage";
import type { BookChapter, BookDocument } from "../storage";
import { callLLM } from "../llm";
import { prisma } from "../forge/db";
import { readGoogleDoc, writeGoogleDoc } from "../google-docs";
import {
  AUTHOR_VOICE_CONTRACT, AI_WRITING_RULES, SCENE_WRITING_RULES, STORY_ARCHITECTURE_RULES,
  CHAPTER_SUMMARY_TEMPLATE, ANTI_SLOP_FILTER,
  CONTEXT_ENGINEERING_RULES, DEFAULT_DECISION_RULE, LAYERED_GENERATION_WORKFLOW,
  READER_VALUE_TEST, RAW_MATERIAL_MINDSET
} from "../writing-rules";
import { buildPreviousSummariesContext, formatSlidersBlock, VARIANT_LENSES } from "./helpers";
import { startJob, getJob, requestPause } from "../jobs";

const router = express.Router();

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

  // ========== BOOK WRITER ROUTES ==========

  router.get("/api/books", async (_req, res) => {
    try {
      const books = await storage.listBooks();
      res.json(books);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/books", async (req, res) => {
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

  router.post("/api/books/from-project/:projectId", async (req, res) => {
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

  router.get("/api/books/:id", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      res.json(book);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put("/api/books/:id", async (req, res) => {
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

  router.delete("/api/books/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBook(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Book not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/books/:id/documents", bookUpload.single("file"), async (req: any, res) => {
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
          const result = await (mammoth.default as any).convertToMarkdown({ buffer });
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

  router.get("/api/books/:id/documents", async (req, res) => {
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

  router.delete("/api/books/:id/documents/:docId", async (req, res) => {
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

  router.post("/api/books/:id/import-google-doc", async (req, res) => {
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

  router.post("/api/books/:id/sync-to-google-doc", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const docId = book.google_doc_id;
      if (!docId) return res.status(400).json({ error: "No Google Doc linked. Import a doc first." });

      const fullText = book.chapters
        .filter(c => c.content)
        .map(c => `# ${c.title}\n\n${c.content}`)
        .join("\n\n---\n\n");

      await writeGoogleDoc(docId, fullText);

      console.log(`[Google Docs] Synced "${book.title}" back to doc ${docId}`);
      res.json({ success: true, docId, chaptersWritten: book.chapters.filter(c => c.content).length });
    } catch (err: any) {
      console.error("[Google Docs Sync Error]", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/books/:id/refresh-from-google-doc", async (req, res) => {
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

  router.get("/api/books/:id/google-doc-status", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      const docId = book.google_doc_id || null;
      res.json({ linked: !!docId, docId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/books/:id/rewrite-chapter/:chapterNum", async (req, res) => {
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

  router.put("/api/books/:id/chapters/:chapterNum", async (req, res) => {
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

  router.post("/api/books/:id/commit-chapter/:chapterNum", async (req, res) => {
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

  router.post("/api/books/:id/unlock-chapter/:chapterNum", async (req, res) => {
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

  router.post("/api/books/:id/analyze-chapter/:chapterNum", async (req, res) => {
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
        const { runBetaReader } = await import("../forge/analysis/modules/beta-reader");
        const profileKey = betaProfile || "genre_enthusiast";
        profile = profileKey;
        result = await runBetaReader(chapter.content, previousContext, genre, profileKey);
      } else if (analysisType === "editorial_assessment") {
        const { runEditorialAssessment } = await import("../forge/analysis/modules/editorial-assessment");
        result = await runEditorialAssessment(chapter.content, previousContext, genre, "");
      } else if (analysisType === "developmental_assessment") {
        const { runDevEdit } = await import("../forge/analysis/modules/developmental-editor");
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

  router.post("/api/books/:id/summarize-all", async (req, res) => {
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

  router.post("/api/books/:id/write-from-prompt", async (req, res) => {
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

  router.post("/api/books/:id/outline-chapter", async (req, res) => {
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

  router.post("/api/books/:id/write-chapter/:chapterNum", async (req, res) => {
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

  router.post("/api/books/:id/summarize-chapter/:chapterNum", async (req, res) => {
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

  router.put("/api/books/:id/chapters/:chapterNum", async (req, res) => {
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

  router.post("/api/books/:id/rewrite-chapter-variants/:chapterNum", async (req, res) => {
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

  // ── PANTSER: Fast chapter write ──────────────────────────────────────────────

  router.post("/api/books/:id/chapters/:chapterNum/write-fast", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });

      const { premise = "", tense = "past" } = req.body;

      // Build context from previous written chapters (last 3000 words)
      const prevChapters = book.chapters
        .filter(c => c.chapter_number < chapterNum && c.content)
        .sort((a, b) => a.chapter_number - b.chapter_number);
      const prevText = prevChapters.map(c => c.content ?? "").join("\n\n");
      const words = prevText.split(/\s+/);
      const recentContext = words.slice(-3000).join(" ");

      const prompt = `You are a skilled fiction author. Write Chapter ${chapterNum} of "${book.title}".

${recentContext ? `PREVIOUS CHAPTERS (context):\n${recentContext}\n` : ""}
${chapter.outline ? `CHAPTER OUTLINE:\n${chapter.outline}\n` : ""}
${premise ? `AUTHOR'S DIRECTION FOR THIS CHAPTER:\n${premise}\n` : ""}
${book.dossier ? `STORY DOSSIER:\n${book.dossier.substring(0, 2000)}\n` : ""}

Write Chapter ${chapterNum} as polished, publication-ready prose in ${tense} tense.
- Match the voice and style established in previous chapters
- Begin with the chapter title as a heading
- Target 2000-3000 words

ADDICTION LOOP — all four elements are required:
1. STAKES: Establish character + specific risk + urgency in the first 200 words
2. BIG QUESTION: Load a specific question readers can predict by page 2
3. HEAD FAKE: Break the reader's prediction in a way that makes retroactive sense
4. RE-HOOK: Open the next loop in the same beat as the chapter's resolution — no gap

The final paragraph must open a new question. The reader should be unable to stop.

Output ONLY the chapter prose.`;

      const result = await callLLM(prompt, "powerful", undefined, 8192);

      // Save to chapter
      chapter.content = result;
      chapter.status = "written";
      await storage.saveBook(book);

      // Trigger background world extraction (non-blocking)
      extractWorldInBackground(book.id, chapterNum, result).catch(console.error);

      res.json({ content: result, chapter_number: chapterNum });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── PANTSER: Autopilot (sequential fast writes) ───────────────────────────

  // Autopilot runs on the generic job registry (server/jobs.ts). The legacy
  // /api/autopilot/* endpoints are kept as thin adapters over it so existing
  // clients keep working; /api/jobs/:id serves the uniform shape.

  router.post("/api/books/:id/autopilot/start", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const { premise = "", tense = "past", chapter_count = 30, start_chapter = 1 } = req.body;

      // Ensure chapters exist up to chapter_count
      const existingCount = book.chapters.length;
      if (existingCount < chapter_count) {
        for (let i = existingCount + 1; i <= chapter_count; i++) {
          book.chapters.push({
            chapter_number: i,
            title: `Chapter ${i}`,
            outline: "",
            content: null,
            summary: null,
            status: "outlined",
          });
        }
        await storage.saveBook(book);
      }

      // Find first unwritten chapter at or after start_chapter
      const firstUnwritten = book.chapters
        .filter(c => !c.content && c.chapter_number >= start_chapter)
        .sort((a, b) => a.chapter_number - b.chapter_number)[0]?.chapter_number
        ?? start_chapter;

      const job = startJob("autopilot", { book_id: book.id }, async (handle) => {
        for (let cn = firstUnwritten; cn <= chapter_count; cn++) {
          if (handle.isPauseRequested()) {
            handle.markPaused();
            return;
          }
          handle.setProgress(cn, chapter_count, `Chapter ${cn}`);

          const freshBook = await storage.getBook(book.id);
          if (!freshBook) break;
          const chapter = freshBook.chapters.find(c => c.chapter_number === cn);
          if (!chapter || chapter.content) continue; // skip already written

          const prevText = freshBook.chapters
            .filter(c => c.chapter_number < cn && c.content)
            .sort((a, b) => a.chapter_number - b.chapter_number)
            .map(c => c.content ?? "").join("\n\n");
          const recentContext = prevText.split(/\s+/).slice(-3000).join(" ");

          const result = await callLLM(
            `You are a skilled fiction author writing "${freshBook.title}" chapter by chapter.

${recentContext ? `RECENT STORY (last 3000 words):\n${recentContext}\n` : ""}
${premise ? `STORY PREMISE:\n${premise}\n` : ""}
${chapter.outline ? `CHAPTER OUTLINE:\n${chapter.outline}\n` : ""}

Write Chapter ${cn} in ${tense} tense. 2000-3000 words. Match the established voice.
Begin with the chapter title as a heading. End on a compelling moment.
Output ONLY the chapter prose.`,
            "powerful", undefined, 8192
          );

          chapter.content = result;
          chapter.status = "written";
          await storage.saveBook(freshBook);
          extractWorldInBackground(freshBook.id, cn, result).catch(console.error);
        }
      });

      res.json({ job_id: job.id, starting_chapter: firstUnwritten });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Legacy adapters over the generic job registry
  router.post("/api/autopilot/:jobId/pause", async (req, res) => {
    const ok = requestPause(String(req.params.jobId));
    if (!ok) return res.status(404).json({ error: "Job not found" });
    res.json({ success: true });
  });

  router.get("/api/autopilot/:jobId/status", async (req, res) => {
    const job = getJob(String(req.params.jobId));
    if (!job) return res.status(404).json({ error: "Job not found" });
    // Legacy status shape expected by older clients
    res.json({
      status: job.status === "queued" ? "running" : job.status,
      book_id: job.meta.book_id,
      current_chapter: job.progress?.current ?? 0,
      total_chapters: job.progress?.total ?? 0,
      ...(job.error ? { error: job.error } : {}),
    });
  });

  // ── PANTSER: Background world extraction ──────────────────────────────────

  async function extractWorldInBackground(bookId: string, chapterNum: number, chapterText: string): Promise<void> {
    const book = await storage.getBook(bookId);
    if (!book) return;

    const raw = await callLLM(
      `Extract world-building information from this chapter of "${book.title}".

CHAPTER ${chapterNum}:
${chapterText}

Respond with ONLY a JSON object. No preamble, no markdown fences.
{
  "characters": [
    { "name": "Full name", "notes": "1-2 sentences about this character" }
  ],
  "world_facts": ["New fact about the world established in this chapter"],
  "open_threads": ["Unresolved question or thread introduced in this chapter"]
}

Only include:
- characters who are NAMED (not "the man" or "she")
- world facts that are NEW and specific to this story
- open threads that are explicitly unresolved at chapter end
If a category has nothing, return an empty array.`,
      "cheap"
    );

    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      const extracted = JSON.parse(clean);
      const world = book.discovered_world ?? {
        characters: [],
        world_facts: [],
        open_threads: [],
        last_extracted_chapter: 0,
        updated_at: new Date().toISOString(),
      };

      // Merge characters (deduplicate by name)
      for (const char of (extracted.characters ?? [])) {
        const existing = world.characters.find(c =>
          c.name.toLowerCase() === char.name.toLowerCase()
        );
        if (existing) {
          existing.notes = existing.notes + " " + char.notes;
          existing.last_seen_chapter = chapterNum;
        } else {
          world.characters.push({ ...char, first_chapter: chapterNum, last_seen_chapter: chapterNum });
        }
      }

      // Merge world facts and threads (simple append, deduplicate by similarity later)
      world.world_facts.push(...(extracted.world_facts ?? []));
      world.open_threads = extracted.open_threads ?? world.open_threads; // replace with latest
      world.last_extracted_chapter = chapterNum;
      world.updated_at = new Date().toISOString();

      book.discovered_world = world;
      await storage.saveBook(book);
    } catch {
      // Silent fail -- world extraction is non-blocking
    }
  }

  // ── PANTSER: Book creation with mode ─────────────────────────────────────

  // Upload a finished/partial manuscript and turn it into a book with chapters,
  // using Forge's chapter detection.
  router.post("/api/books/upload-manuscript", bookUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const { extractText } = await import("../forge/parsing/manuscript-parser");
      const { detectChapters, createSegments } = await import("../forge/parsing/chapter-detector");

      let text: string;
      try {
        text = await extractText(req.file.path, req.file.mimetype);
      } finally {
        await unlink(req.file.path).catch(() => {});
      }
      if (!text.trim()) return res.status(400).json({ error: "The file appears to be empty" });

      const title = (req.body?.title || "").trim()
        || req.file.originalname.replace(/\.(txt|md|docx)$/i, "");

      let detected = detectChapters(text);
      if (detected.length === 0) detected = createSegments(text, 6);

      const book = await storage.createBook(null, "", "", title);
      book.chapters = detected.map(ch => ({
        chapter_number: ch.number,
        title: ch.title || `Chapter ${ch.number}`,
        outline: "",
        content: ch.rawText,
        summary: null,
        status: "written" as const,
      }));
      await storage.saveBook(book);
      res.json({ id: book.id, title: book.title, chapter_count: book.chapters.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/books/pantser", async (req, res) => {
    try {
      const { title = "Untitled Book", premise = "" } = req.body;
      const book = await storage.createBook(null, premise, "", title);
      (book as any).mode = "pantser";

      // Create Chapter 1 automatically
      book.chapters = [{
        chapter_number: 1,
        title: "Chapter 1",
        outline: premise || "",
        content: null,
        summary: null,
        status: "outlined",
      }];
      await storage.saveBook(book);
      res.json(book);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get discovered world for a book
  router.get("/api/books/:id/discovered-world", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      res.json(book.discovered_world ?? { characters: [], world_facts: [], open_threads: [], last_extracted_chapter: 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reorder chapters
  router.put("/api/books/:id/chapters/reorder", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const { order } = req.body; // array of chapter_numbers in new order
      if (!Array.isArray(order)) return res.status(400).json({ error: "order must be an array" });

      // Rebuild chapters in new order, renumbering sequentially
      const reordered = order.map((num: number, idx: number) => {
        const chapter = book.chapters.find(c => c.chapter_number === num);
        if (!chapter) throw new Error(`Chapter ${num} not found`);
        return { ...chapter, chapter_number: idx + 1 };
      });

      book.chapters = reordered;
      await storage.saveBook(book);
      res.json(book);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

export default router;
