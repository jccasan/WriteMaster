/**
 * tropeRoutes.ts — Trope system API
 *
 * GET  /api/tropes              — list all tropes (id, name, category, description)
 * GET  /api/tropes/:id          — get single trope detail
 * GET  /api/books/:id/tropes    — get trope selection for a book
 * PUT  /api/books/:id/tropes    — save trope selection for a book
 * POST /api/tropes/preview      — preview the assembled context for a selection
 */

import { Router } from "express";
import { getTropeList, getTropeById } from "./tropeLibrary";
import { assembleTropeContext, buildTropePromptBlock, type TropeSelection } from "./tropeSystem";
import { storage } from "../storage";

const router = Router();

// List all tropes
router.get("/", (_req, res) => {
  res.json(getTropeList());
});

// Get single trope
router.get("/:id", (req, res) => {
  const trope = getTropeById(req.params.id);
  if (!trope) return res.status(404).json({ error: "Trope not found" });
  res.json(trope);
});

// Get trope selection for a book
router.get("/book/:bookId", async (req, res) => {
  try {
    const book = await storage.getBook(req.params.bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });
    const selection = (book as any).tropes as TropeSelection | undefined;
    res.json(selection ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Save trope selection for a book
router.put("/book/:bookId", async (req, res) => {
  try {
    const book = await storage.getBook(req.params.bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });

    const { primary, secondary, tertiary } = req.body;
    if (!primary) return res.status(400).json({ error: "primary trope is required" });

    const selection: TropeSelection = { primary, secondary, tertiary };

    // Validate all trope IDs
    if (!getTropeById(primary)) return res.status(400).json({ error: `Unknown trope: ${primary}` });
    if (secondary && !getTropeById(secondary)) return res.status(400).json({ error: `Unknown trope: ${secondary}` });
    if (tertiary && !getTropeById(tertiary)) return res.status(400).json({ error: `Unknown trope: ${tertiary}` });

    (book as any).tropes = selection;
    await storage.saveBook(book);

    const ctx = assembleTropeContext(selection);
    res.json({ selection, label: ctx?.label ?? primary, context: ctx });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Remove trope selection
router.delete("/book/:bookId", async (req, res) => {
  try {
    const book = await storage.getBook(req.params.bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });
    delete (book as any).tropes;
    await storage.saveBook(book);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Preview assembled context for a selection
router.post("/preview", (req, res) => {
  const { primary, secondary, tertiary } = req.body;
  if (!primary) return res.status(400).json({ error: "primary is required" });

  const selection: TropeSelection = { primary, secondary, tertiary };
  const ctx = assembleTropeContext(selection);
  if (!ctx) return res.status(400).json({ error: "Could not assemble context — check trope IDs" });
  res.json(ctx);
});

export default router;
