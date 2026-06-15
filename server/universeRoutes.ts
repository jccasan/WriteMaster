/**
 * universeRoutes.ts
 *
 * All API routes for the Universe layer.
 * Registered in server/index.ts under /api/universe prefix.
 */

import { Router } from "express";
import multer from "multer";
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import {
  createUniverse, getUniverse, saveUniverse, listUniverses, deleteUniverse,
  createSeries, getSeries, saveSeries, getSeriesForUniverse, deleteSeries,
  getMenagerie, saveMenagerie, findCharacterInMenagerie,
  createPushSession, getPushSession, writePushSession, listPushSessionsForBook,
  assembleUniverseContext, getEffectiveBible,
} from "./universeStorage";
import { runPushGeneration, applyPushSession, checkSceneBriefAgainstBible, buildReviewItemsExport, extractCharactersFromText } from "./universePipeline";
import { storage } from "./storage";
import { extractText } from "./forge/parsing/manuscript-parser";

const router = Router();

// ── Bible file upload ─────────────────────────────────────────────────────────
const bibleUploadDir = path.resolve("data/bible-uploads");
fs.mkdir(bibleUploadDir, { recursive: true }).catch(() => {});

const bibleUpload = multer({
  dest: bibleUploadDir,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".docx", ".md", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only .pdf, .docx, .md, and .txt files are supported"));
  },
});

// Extract text from a file without saving (used pre-creation on dashboard)
router.post("/extract-bible-text", bibleUpload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const text = await extractText(req.file.path, req.file.mimetype);
    await fs.unlink(req.file.path).catch(() => {});
    res.json({ text, word_count: text.split(/\s+/).filter(Boolean).length });
  } catch (err: any) {
    if (req.file) fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// Upload and save bible to an existing universe
router.post("/:id/bible/upload", bibleUpload.single("file"), async (req: any, res) => {
  try {
    const universe = await getUniverse(req.params.id);
    if (!universe) return res.status(404).json({ error: "Universe not found" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const text = await extractText(req.file.path, req.file.mimetype);
    await fs.unlink(req.file.path).catch(() => {});

    const { mode = "replace" } = req.body; // "replace" | "append"
    if (mode === "append" && universe.bible) {
      universe.bible = universe.bible + "\n\n---\n\n" + text;
    } else {
      universe.bible = text;
    }

    await saveUniverse(universe);
    res.json({ success: true, word_count: text.split(/\s+/).filter(Boolean).length, mode });
  } catch (err: any) {
    if (req.file) fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// ─── UNIVERSES ────────────────────────────────────────────────────────────────

router.get("/", async (_req, res) => {
  try {
    res.json(await listUniverses());
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { name, description = "", bible = "" } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });
    res.json(await createUniverse(name.trim(), description, bible));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const u = await getUniverse(req.params.id);
    if (!u) return res.status(404).json({ error: "Universe not found" });
    res.json(u);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const u = await getUniverse(req.params.id);
    if (!u) return res.status(404).json({ error: "Universe not found" });
    if (req.body.name !== undefined) u.name = req.body.name;
    if (req.body.description !== undefined) u.description = req.body.description;
    if (req.body.bible !== undefined) u.bible = req.body.bible;
    await saveUniverse(u);
    res.json(u);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await deleteUniverse(req.params.id);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── SERIES ──────────────────────────────────────────────────────────────────

router.get("/:universeId/series", async (req, res) => {
  try {
    res.json(await getSeriesForUniverse(req.params.universeId));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:universeId/series", async (req, res) => {
  try {
    const { name, description = "" } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });
    res.json(await createSeries(req.params.universeId, name.trim(), description));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/series/:id", async (req, res) => {
  try {
    const s = await getSeries(req.params.id);
    if (!s) return res.status(404).json({ error: "Series not found" });
    res.json(s);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/series/:id", async (req, res) => {
  try {
    const s = await getSeries(req.params.id);
    if (!s) return res.status(404).json({ error: "Series not found" });
    if (req.body.name !== undefined) s.name = req.body.name;
    if (req.body.description !== undefined) s.description = req.body.description;
    if (req.body.series_notes !== undefined) s.series_notes = req.body.series_notes;
    if (req.body.book_ids !== undefined) s.book_ids = req.body.book_ids; // reorder
    await saveSeries(s);
    res.json(s);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/series/:id", async (req, res) => {
  try {
    await deleteSeries(req.params.id);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Promote a series note to the universe bible
router.post("/series/:id/promote-note", async (req, res) => {
  try {
    const { note_text, note_label = "Promoted from series notes" } = req.body;
    if (!note_text) return res.status(400).json({ error: "note_text is required" });
    const series = await getSeries(req.params.id);
    if (!series) return res.status(404).json({ error: "Series not found" });
    const universe = await getUniverse(series.universe_id);
    if (!universe) return res.status(404).json({ error: "Universe not found" });
    universe.bible += `\n\n### ${note_label} (from series: ${series.name})\n${note_text}`;
    await saveUniverse(universe);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── BOOK ASSIGNMENT ─────────────────────────────────────────────────────────

// Assign a book to a universe (and optionally a series)
router.post("/:universeId/assign-book", async (req, res) => {
  try {
    const { book_id, series_id = null, series_order = null } = req.body;
    if (!book_id) return res.status(400).json({ error: "book_id is required" });

    const [book, universe] = await Promise.all([
      storage.getBook(book_id),
      getUniverse(req.params.universeId),
    ]);
    if (!book) return res.status(404).json({ error: "Book not found" });
    if (!universe) return res.status(404).json({ error: "Universe not found" });

    // Remove from any previous universe
    if ((book as any).universe_id && (book as any).universe_id !== req.params.universeId) {
      const oldUniverse = await getUniverse((book as any).universe_id);
      if (oldUniverse) {
        oldUniverse.standalone_book_ids = oldUniverse.standalone_book_ids.filter(id => id !== book_id);
        await saveUniverse(oldUniverse);
      }
    }
    // Remove from any previous series
    if ((book as any).series_id) {
      const oldSeries = await getSeries((book as any).series_id);
      if (oldSeries) {
        oldSeries.book_ids = oldSeries.book_ids.filter(id => id !== book_id);
        await saveSeries(oldSeries);
      }
    }

    // Set universe/series on book
    (book as any).universe_id = req.params.universeId;
    (book as any).series_id = series_id;
    (book as any).series_order = series_order;
    await storage.saveBook(book);

    // Add to series or standalone
    if (series_id) {
      const series = await getSeries(series_id);
      if (series && series.universe_id === req.params.universeId) {
        if (!series.book_ids.includes(book_id)) {
          if (series_order !== null) {
            series.book_ids.splice(series_order, 0, book_id);
          } else {
            series.book_ids.push(book_id);
          }
          await saveSeries(series);
        }
      }
    } else {
      if (!universe.standalone_book_ids.includes(book_id)) {
        universe.standalone_book_ids.push(book_id);
        await saveUniverse(universe);
      }
    }

    res.json({ success: true, book_id, universe_id: req.params.universeId, series_id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Unassign a book from its universe
router.post("/unassign-book/:bookId", async (req, res) => {
  try {
    const book = await storage.getBook(req.params.bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });
    const universeId = (book as any).universe_id;
    const seriesId = (book as any).series_id;
    if (universeId) {
      const universe = await getUniverse(universeId);
      if (universe) {
        universe.standalone_book_ids = universe.standalone_book_ids.filter(id => id !== book.id);
        await saveUniverse(universe);
      }
    }
    if (seriesId) {
      const series = await getSeries(seriesId);
      if (series) { series.book_ids = series.book_ids.filter(id => id !== book.id); await saveSeries(series); }
    }
    (book as any).universe_id = null;
    (book as any).series_id = null;
    (book as any).series_order = null;
    await storage.saveBook(book);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── MENAGERIE ────────────────────────────────────────────────────────────────

router.get("/:id/menagerie", async (req, res) => {
  try {
    res.json(await getMenagerie(req.params.id));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// In-memory job store for extraction results (simple, no persistence needed)
const extractionJobs = new Map<string, {
  status: "running" | "done" | "error";
  error?: string;
  source_label?: string;
  word_count?: number;
  characters?: any[];
  new_count?: number;
  update_count?: number;
}>();

// Step 1: Upload a story file — responds immediately with job_id, runs extraction in background
router.post("/:id/menagerie/extract", bibleUpload.single("file"), async (req: any, res) => {
  try {
    const universe = await getUniverse(req.params.id);
    if (!universe) return res.status(404).json({ error: "Universe not found" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { source_label = req.file.originalname.replace(/\.[^.]+$/, "") } = req.body;
    const universeId = req.params.id;
    const job_id = randomUUID();

    // Respond immediately
    extractionJobs.set(job_id, { status: "running" });
    res.json({ job_id, status: "running" });

    // Run in background
    (async () => {
      try {
        const text = await extractText(req.file.path, req.file.mimetype);
        await fs.unlink(req.file.path).catch(() => {});

        if (!text.trim()) throw new Error("File appears to be empty or unreadable");

        const extracted = await extractCharactersFromText(text, source_label);

        // Mark new vs existing
        const menagerie = await getMenagerie(universeId);
        for (const char of extracted) {
          const existing = findCharacterInMenagerie(menagerie, char.name);
          char.is_new = !existing;
          if (existing) char.existing_id = existing.id;
        }

        extractionJobs.set(job_id, {
          status: "done",
          source_label,
          word_count: text.split(/\s+/).filter(Boolean).length,
          characters: extracted,
          new_count: extracted.filter(c => c.is_new).length,
          update_count: extracted.filter(c => !c.is_new).length,
        });
      } catch (err: any) {
        fs.unlink(req.file?.path ?? "").catch(() => {});
        extractionJobs.set(job_id, { status: "error", error: err.message });
      }
    })();
  } catch (err: any) {
    if (req.file) fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// Poll extraction job status
router.get("/:id/menagerie/extract/:jobId", async (req, res) => {
  const job = extractionJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
  // Clean up completed jobs after they're fetched
  if (job.status === "done" || job.status === "error") {
    setTimeout(() => extractionJobs.delete(req.params.jobId), 60000);
  }
});

// Step 2: Apply selected extracted characters to the menagerie
router.post("/:id/menagerie/apply-extracted", async (req, res) => {
  try {
    const universe = await getUniverse(req.params.id);
    if (!universe) return res.status(404).json({ error: "Universe not found" });

    const { characters, source_label = "uploaded file", series_id = null, book_id = null, book_title = null } = req.body;
    if (!Array.isArray(characters) || characters.length === 0) {
      return res.status(400).json({ error: "No characters provided" });
    }

    const menagerie = await getMenagerie(req.params.id);
    const now = new Date().toISOString();
    let added = 0, updated = 0;

    for (const char of characters) {
      if (!char.accepted) continue; // user deselected this character

      const existing = findCharacterInMenagerie(menagerie, char.name);

      if (!existing) {
        // New character
        menagerie.characters.push({
          id: randomUUID(),
          name: char.name,
          aliases: char.aliases ?? [],
          current_status: char.status ?? "unknown",
          status_history: [{
            book_id: book_id ?? "manual-upload",
            book_title: book_title ?? source_label,
            status: char.status ?? "unknown",
            note: `Added via file upload from: ${source_label}`,
          }],
          appearances: book_id ? [{
            book_id,
            book_title: book_title ?? source_label,
            series_id,
            chapter_numbers: char.chapter_numbers ?? [],
            role_in_book: char.role ?? "unknown",
          }] : [],
          first_appeared_book_id: book_id ?? "manual-upload",
          first_appeared_book_title: book_title ?? source_label,
          accumulated_notes: char.notes ?? "",
          last_updated_by_book_id: book_id ?? "manual-upload",
          last_updated_at: now,
        });
        added++;
      } else {
        // Update existing
        existing.accumulated_notes += `\n\n[${source_label}]\n${char.notes}`;
        if (book_id && !existing.appearances.find(a => a.book_id === book_id)) {
          existing.appearances.push({
            book_id,
            book_title: book_title ?? source_label,
            series_id,
            chapter_numbers: char.chapter_numbers ?? [],
            role_in_book: char.role ?? "unknown",
          });
        }
        if (char.status && char.status !== "unknown" && char.status !== existing.current_status) {
          existing.current_status = char.status;
          existing.status_history.push({
            book_id: book_id ?? "manual-upload",
            book_title: book_title ?? source_label,
            status: char.status,
            note: `Updated via file upload from: ${source_label}`,
          });
        }
        existing.last_updated_by_book_id = book_id ?? "manual-upload";
        existing.last_updated_at = now;
        updated++;
      }
    }

    await saveMenagerie(menagerie);
    res.json({ success: true, added, updated, total: menagerie.characters.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Manual character edit (for fixing AI extraction errors)
router.put("/:universeId/menagerie/character/:characterId", async (req, res) => {
  try {
    const menagerie = await getMenagerie(req.params.universeId);
    const char = menagerie.characters.find(c => c.id === req.params.characterId);
    if (!char) return res.status(404).json({ error: "Character not found" });
    if (req.body.name !== undefined) char.name = req.body.name;
    if (req.body.aliases !== undefined) char.aliases = req.body.aliases;
    if (req.body.current_status !== undefined) char.current_status = req.body.current_status;
    if (req.body.accumulated_notes !== undefined) char.accumulated_notes = req.body.accumulated_notes;
    await saveMenagerie(menagerie);
    res.json(char);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── PUSH FLOW ────────────────────────────────────────────────────────────────

// Start a push session for a book
router.post("/:universeId/push/:bookId", async (req, res) => {
  try {
    const [book, universe] = await Promise.all([
      storage.getBook(req.params.bookId),
      getUniverse(req.params.universeId),
    ]);
    if (!book) return res.status(404).json({ error: "Book not found" });
    if (!universe) return res.status(404).json({ error: "Universe not found" });

    const seriesId = (book as any).series_id ?? null;

    // Assemble chapter summaries
    const summaryChapters = book.chapters
      .filter(c => c.summary)
      .sort((a, b) => a.chapter_number - b.chapter_number);
    if (summaryChapters.length === 0) {
      return res.status(400).json({ error: "No chapter summaries found. Summarize chapters first (use 'Summarize All' in the Book Writer)." });
    }
    const chapterSummaries = summaryChapters
      .map(c => `## Chapter ${c.chapter_number}: ${c.title}\n${c.summary}`)
      .join("\n\n");

    // Get effective bible
    const effectiveBible = await getEffectiveBible(req.params.universeId, seriesId);

    // Get previous book summaries from series
    let previousBookSummaries = "";
    if (seriesId) {
      const series = await getSeries(seriesId);
      if (series) {
        const prevIds = series.book_ids.filter(id => id !== book.id);
        const prevBooks = await Promise.all(prevIds.map(id => storage.getBook(id)));
        previousBookSummaries = prevBooks
          .filter(b => b && (b as any).book_summary)
          .map(b => `## ${b!.title}\n${(b as any).book_summary}`)
          .join("\n\n");
      }
    }

    const session = await createPushSession(req.params.universeId, seriesId, book.id, book.title);
    res.json({ push_session_id: session.push_session_id });

    // Run generation async (don't await — client polls)
    runPushGeneration(session, chapterSummaries, effectiveBible, previousBookSummaries)
      .then(async (updatedSession) => {
        // Mark which characters are new vs existing
        const menagerie = await getMenagerie(req.params.universeId);
        for (const char of updatedSession.extracted_characters) {
          const existing = findCharacterInMenagerie(menagerie, char.name);
          char.is_new = !existing;
          if (existing) char.existing_id = existing.id;
        }
        // Rebuild review items with correct new/existing flags
        updatedSession.review_items = buildReviewItemsExport(updatedSession);
        await writePushSession(updatedSession);
      })
      .catch(async (err) => {
        const s = await getPushSession(session.push_session_id);
        if (s) { s.phase = "error"; s.error = err.message; await writePushSession(s); }
      });

  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Poll push session status
router.get("/push-session/:sessionId", async (req, res) => {
  try {
    const session = await getPushSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Push session not found" });
    res.json(session);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Update a review item resolution
router.put("/push-session/:sessionId/resolve/:itemId", async (req, res) => {
  try {
    const { resolution, resolution_note = "" } = req.body;
    const session = await getPushSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    const item = session.review_items.find(i => i.id === req.params.itemId);
    if (!item) return res.status(404).json({ error: "Review item not found" });
    item.resolution = resolution;
    item.resolution_note = resolution_note;
    await writePushSession(session);
    res.json({ success: true, item });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Bulk resolve all pending items (accept all or reject all)
router.post("/push-session/:sessionId/bulk-resolve", async (req, res) => {
  try {
    const { resolution, types } = req.body; // types: optional filter by PushItemType[]
    const session = await getPushSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    for (const item of session.review_items) {
      if (item.resolution) continue; // don't override already-resolved
      if (types && !types.includes(item.type)) continue;
      item.resolution = resolution;
    }
    await writePushSession(session);
    res.json({ success: true, resolved: session.review_items.filter(i => i.resolution).length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Apply all resolved items
router.post("/push-session/:sessionId/apply", async (req, res) => {
  try {
    const session = await getPushSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.phase !== "review") return res.status(400).json({ error: "Session is not in review phase" });
    const pending = session.review_items.filter(i => !i.resolution).length;
    if (pending > 0) return res.status(400).json({ error: `${pending} items still pending resolution. Resolve all items before applying.` });

    const record = await applyPushSession(session);

    // Save book_summary to the book
    const summaryItem = session.review_items.find(i => i.type === "book_summary" && i.resolution === "accepted");
    if (summaryItem) {
      const book = await storage.getBook(session.book_id);
      if (book) { (book as any).book_summary = session.book_summary; await storage.saveBook(book); }
    }

    res.json({ success: true, record });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// List push sessions for a book
router.get("/book/:bookId/push-sessions", async (req, res) => {
  try {
    res.json(await listPushSessionsForBook(req.params.bookId));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── UNIVERSE CONTEXT FOR PIPELINE 1 ─────────────────────────────────────────

router.get("/:universeId/writing-context", async (req, res) => {
  try {
    const { series_id, exclude_book_id } = req.query as Record<string, string>;
    const ctx = await assembleUniverseContext(req.params.universeId, series_id ?? null, exclude_book_id);

    // Inject actual previous book summaries (assembleUniverseContext has a placeholder)
    if (series_id) {
      const series = await getSeries(series_id);
      if (series) {
        const prevIds = exclude_book_id
          ? series.book_ids.filter(id => id !== exclude_book_id)
          : series.book_ids;
        const prevBooks = await Promise.all(prevIds.map(id => storage.getBook(id)));
        ctx.previousSummaries = prevBooks
          .filter(b => b && (b as any).book_summary)
          .map(b => `## ${b!.title}\n${(b as any).book_summary}`)
          .join("\n\n") || "(No previous book summaries yet)";
      }
    }

    res.json(ctx);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── BIBLE COMPLIANCE CHECK ───────────────────────────────────────────────────

router.post("/:universeId/bible-check", async (req, res) => {
  try {
    const { scene_brief, series_id, chapter_num = 0 } = req.body;
    if (!scene_brief) return res.status(400).json({ error: "scene_brief is required" });
    const bible = await getEffectiveBible(req.params.universeId, series_id ?? null);
    const result = await checkSceneBriefAgainstBible(scene_brief, bible, chapter_num);
    res.json({ result });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
