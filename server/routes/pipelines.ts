import express from "express";
import { storage } from "../storage";
import { runP2Step, getP2StepName, createEmptyP2State } from "../pipeline2";
import { runP3Step, getP3StepName, createEmptyP3State } from "../pipeline3";
import { runP4Step, getP4StepName, createEmptyLineEditState, isP4Complete } from "../pipeline4";
import { buildPreviousSummariesContext } from "./helpers";

const router = express.Router();

  // ── PIPELINE 2: Dossier → Character Sheet + World-Building + Outline ────────

  router.post("/api/books/:id/pipeline2/start", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      if (!book.dossier) return res.status(400).json({ error: "Book has no dossier. Complete Pipeline 1 first." });

      const { target_chapters = 30, genre = "" } = req.body;

      // Resolve genre: use provided value, fall back to source project genre, then "fiction"
      let resolvedGenre = genre;
      if (!resolvedGenre && book.source_project_id) {
        const sourceProject = await storage.getProject(book.source_project_id);
        if (sourceProject) resolvedGenre = sourceProject.genre;
      }
      if (!resolvedGenre) resolvedGenre = "fiction";

      const { randomUUID } = await import("crypto");
      const p2Id = randomUUID();
      const state = createEmptyP2State(
        p2Id,
        book.id,
        book.dossier,
        book.brain_dump,
        resolvedGenre,
        target_chapters
      );
      await storage.saveP2State(state);
      res.json({ pipeline2_id: p2Id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/pipeline2/:p2Id/run-step", async (req, res) => {
    try {
      const state = await storage.getP2State(req.params.p2Id);
      if (!state) return res.status(404).json({ error: "Pipeline 2 session not found" });
      if (state.current_step >= 10) {
        return res.json({ step_completed: state.current_step, step_name: "Complete", is_complete: true });
      }

      const stepName = getP2StepName(state.current_step);
      const { updatedState, outputPreview } = await runP2Step(state);
      await storage.saveP2State(updatedState);

      res.json({
        step_completed: state.current_step,
        step_name: stepName,
        output_preview: outputPreview,
        current_step: updatedState.current_step,
        is_complete: updatedState.current_step >= 10,
      });
    } catch (err: any) {
      console.error("[Pipeline2 Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/pipeline2/:p2Id/state", async (req, res) => {
    try {
      const state = await storage.getP2State(req.params.p2Id);
      if (!state) return res.status(404).json({ error: "Pipeline 2 session not found" });
      res.json(state);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Apply completed P2 documents back to the book as BookDocuments
  router.post("/api/pipeline2/:p2Id/apply-to-book", async (req, res) => {
    try {
      const state = await storage.getP2State(req.params.p2Id);
      if (!state) return res.status(404).json({ error: "Pipeline 2 session not found" });
      if (state.current_step < 10) return res.status(400).json({ error: "Pipeline 2 not yet complete" });

      const book = await storage.getBook(state.book_id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const { randomUUID } = await import("crypto");
      const now = new Date().toISOString();
      if (!book.documents) book.documents = [];

      // Remove any existing P2 docs so re-running replaces cleanly
      book.documents = book.documents.filter(
        (d) => !["character_sheet", "world_doc", "outline"].includes(d.type)
      );

      book.documents.push(
        { id: randomUUID(), name: "Character Sheet", content: state.character_sheet_final, type: "character_sheet", added_at: now },
        { id: randomUUID(), name: "World-Building", content: state.world_building_final, type: "world_doc", added_at: now },
        { id: randomUUID(), name: "Chapter Outline", content: state.outline_final, type: "outline", added_at: now }
      );

      await storage.saveBook(book);
      res.json({ success: true, book_id: book.id, documents_applied: 3 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/books/:id/pipeline2", async (req, res) => {
    try {
      const sessions = await storage.listP2States(req.params.id);
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── PIPELINE 3 v2: Advanced Chapter Writing ──────────────────────────────────

  router.post("/api/books/:id/write-chapter-v2/:chapterNum/start", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });

      const { tense = "past", author_notes = "" } = req.body;

      // ── Resolve source documents ──
      // Use P2 documents when available, fall back to book.dossier
      const docs = book.documents ?? [];
      const charDoc = docs.find(d => d.type === "character_sheet");
      const worldDoc = docs.find(d => d.type === "world_doc");
      const outlineDoc = docs.find(d => d.type === "outline");
      const styleDoc = docs.find(d => d.name === "Prose Style Guide" || d.name === "Style Guide");

      const characterSheet = charDoc?.content ?? book.dossier;
      const worldBuilding = worldDoc?.content ?? book.dossier;
      const fullOutline = outlineDoc?.content ?? buildPreviousSummariesContext(book.chapters, 9999);
      const styleGuide = styleDoc?.content ?? "";

      // ── Build context windows ──
      const writtenChapters = book.chapters
        .filter(c => c.chapter_number < chapterNum && c.content)
        .sort((a, b) => a.chapter_number - b.chapter_number);

      // Last 2,000 words from previous chapters
      const allPriorText = writtenChapters.map(c => c.content ?? "").join("\n\n");
      const words = allPriorText.split(/\s+/);
      const previousContext = words.slice(-2000).join(" ");

      // Last 20,000 words for chrono check B
      const longContext = words.slice(-20000).join(" ");

      const { randomUUID } = await import("crypto");
      const p3Id = randomUUID();
      const state = createEmptyP3State(
        p3Id,
        book.id,
        chapterNum,
        chapter.title,
        chapter.outline ?? "",
        fullOutline,
        characterSheet,
        worldBuilding,
        styleGuide,
        previousContext,
        longContext,
        tense,
        author_notes,
        chapter.sliders ?? null,
        (book as any).universe_id ?? null,
        (book as any).series_id ?? null
      );
      await storage.saveP3State(state);
      res.json({ pipeline3_id: p3Id, chapter_number: chapterNum });
    } catch (err: any) {
      console.error("[Pipeline3 Start Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/pipeline3/:p3Id/run-step", async (req, res) => {
    try {
      const state = await storage.getP3State(req.params.p3Id);
      if (!state) return res.status(404).json({ error: "Pipeline 3 session not found" });
      if (state.current_step >= 14) {
        return res.json({ step_completed: state.current_step, step_name: "Complete", is_complete: true });
      }

      const stepName = getP3StepName(state.current_step);
      const { updatedState, outputPreview } = await runP3Step(state);
      await storage.saveP3State(updatedState);

      res.json({
        step_completed: state.current_step,
        step_name: stepName,
        output_preview: outputPreview,
        current_step: updatedState.current_step,
        is_complete: updatedState.current_step >= 14,
      });
    } catch (err: any) {
      console.error("[Pipeline3 Step Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/pipeline3/:p3Id/state", async (req, res) => {
    try {
      const state = await storage.getP3State(req.params.p3Id);
      if (!state) return res.status(404).json({ error: "Pipeline 3 session not found" });
      res.json(state);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Apply the completed Pipeline 3 final draft back to the book chapter
  router.post("/api/pipeline3/:p3Id/apply-to-book", async (req, res) => {
    try {
      const state = await storage.getP3State(req.params.p3Id);
      if (!state) return res.status(404).json({ error: "Pipeline 3 session not found" });
      if (state.current_step < 14) return res.status(400).json({ error: "Pipeline 3 not yet complete" });
      if (!state.final_draft) return res.status(400).json({ error: "Pipeline 3 has no final draft" });

      const book = await storage.getBook(state.book_id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapter = book.chapters.find(c => c.chapter_number === state.chapter_number);
      if (!chapter) return res.status(404).json({ error: `Chapter ${state.chapter_number} not found in book` });

      chapter.content = state.final_draft;
      chapter.status = "written";
      await storage.saveBook(book);

      res.json({ success: true, book_id: book.id, chapter_number: state.chapter_number });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/books/:id/pipeline3", async (req, res) => {
    try {
      const sessions = await storage.listP3States(req.params.id);
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── PIPELINE 4: Line Editing ─────────────────────────────────────────────────

  router.post("/api/books/:id/line-edit/:chapterNum/start", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      if (!chapter.content) return res.status(400).json({ error: "Chapter has no written content to edit" });

      const docs = book.documents ?? [];
      const styleDoc = docs.find(d => d.name === "Prose Style Guide" || d.name === "Style Guide");
      const styleGuide = styleDoc?.content ?? "";

      const { randomUUID } = await import("crypto");
      const p4Id = randomUUID();
      const state = createEmptyLineEditState(
        p4Id,
        book.id,
        chapterNum,
        chapter.title,
        chapter.content,
        styleGuide
      );
      await storage.saveP4State(state);
      res.json({ pipeline4_id: p4Id, chapter_number: chapterNum });
    } catch (err: any) {
      console.error("[LineEdit Start Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/pipeline4/:p4Id/run-step", async (req, res) => {
    try {
      const state = await storage.getP4State(req.params.p4Id);
      if (!state) return res.status(404).json({ error: "Pipeline 4 session not found" });
      if (isP4Complete(state)) {
        return res.json({ step_completed: state.current_step, step_name: "Complete", is_complete: true });
      }

      const stepName = getP4StepName(state.current_step);
      const { updatedState, outputPreview } = await runP4Step(state);
      await storage.saveP4State(updatedState);

      res.json({
        step_completed: state.current_step,
        step_name: stepName,
        output_preview: outputPreview,
        current_step: updatedState.current_step,
        is_complete: isP4Complete(updatedState),
      });
    } catch (err: any) {
      console.error("[Pipeline4 Step Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/pipeline4/:p4Id/state", async (req, res) => {
    try {
      const state = await storage.getP4State(req.params.p4Id);
      if (!state) return res.status(404).json({ error: "Pipeline 4 session not found" });
      res.json(state);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Apply the line-edited draft back to the book chapter
  router.post("/api/pipeline4/:p4Id/apply-to-book", async (req, res) => {
    try {
      const state = await storage.getP4State(req.params.p4Id);
      if (!state) return res.status(404).json({ error: "Pipeline 4 session not found" });
      if (!isP4Complete(state)) return res.status(400).json({ error: "Pipeline 4 not yet complete" });
      if (!state.edited_draft) return res.status(400).json({ error: "Pipeline 4 has no edited draft" });

      const book = await storage.getBook(state.book_id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapter = book.chapters.find(c => c.chapter_number === state.chapter_number);
      if (!chapter) return res.status(404).json({ error: `Chapter ${state.chapter_number} not found` });

      // Optional override: the line-edit review UI lets the author decline
      // individual flagged edits, so the text applied may differ from the
      // pipeline's full rewrite (state.edited_draft).
      const override = typeof req.body?.content === "string" ? req.body.content.trim() : "";
      chapter.content = override || state.edited_draft;
      await storage.saveBook(book);

      res.json({
        success: true,
        book_id: book.id,
        chapter_number: state.chapter_number,
        verification_passed: state.verification.includes("PASSED"),
        verification_summary: state.verification.substring(0, 300),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/books/:id/pipeline4", async (req, res) => {
    try {
      const sessions = await storage.listP4States(req.params.id);
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

export default router;
