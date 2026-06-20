/**
 * dimensionRoutes.ts
 *
 * GET  /api/dimensions                  — list all dimensions (id, type, one-line definition)
 * GET  /api/dimensions/types            — list types with their IDs
 * GET  /api/dimensions/:id              — full dimension detail
 * GET  /api/books/:bookId/dimensions    — get book's dimension selections
 * PUT  /api/books/:bookId/dimensions    — save dimension selections
 * DELETE /api/books/:bookId/dimensions  — clear selections
 * POST /api/dimensions/preview          — preview assembled context for selections
 * POST /api/dimensions/conflicts        — get active conflicts for selections
 */

import { Router } from "express";
import {
  getDimensionSummaries,
  loadDimension,
  DIMENSION_TYPES,
  clearDimensionCache,
} from "./dimensionLoader";
import {
  assembleDimensionContext,
  validateSelections,
  findActiveConflicts,
  type DimensionSelections,
} from "./dimensionSystem";
import { storage } from "../storage";

const router = Router();

// List all dimensions
router.get("/", (_req, res) => {
  try {
    const summaries = getDimensionSummaries();
    res.json({ dimensions: summaries, total: summaries.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List types with their dimension IDs and one-line definitions
router.get("/types", (_req, res) => {
  try {
    const summaries = getDimensionSummaries();
    const byType: Record<string, { id: string; oneLineDefinition: string }[]> = {};

    for (const [type, ids] of Object.entries(DIMENSION_TYPES)) {
      byType[type] = ids.map(id => {
        const s = summaries.find(s => s.id === id);
        return { id, oneLineDefinition: s?.oneLineDefinition ?? "" };
      });
    }

    res.json({ types: byType, typeOrder: Object.keys(DIMENSION_TYPES) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single dimension detail
router.get("/:id", (req, res) => {
  const { id } = req.params;
  // Prevent matching /types or /book routes
  if (id === "types" || id === "preview" || id === "conflicts") {
    return res.status(404).json({ error: "Not a dimension ID" });
  }
  const dim = loadDimension(id);
  if (!dim) return res.status(404).json({ error: `Dimension not found: ${id}` });
  res.json(dim);
});

// Get book's dimension selections
router.get("/book/:bookId", async (req, res) => {
  try {
    const book = await storage.getBook(req.params.bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });
    const selections = (book as any).dimensions as DimensionSelections | undefined;
    res.json(selections ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Save dimension selections for a book
router.put("/book/:bookId", async (req, res) => {
  try {
    const book = await storage.getBook(req.params.bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });

    const selections = req.body as DimensionSelections;
    const { valid, errors, normalized } = validateSelections(selections);

    if (!valid) {
      return res.status(400).json({ error: "Invalid selections", details: errors });
    }

    const ctx = assembleDimensionContext(normalized);

    (book as any).dimensions = normalized;
    await storage.saveBook(book);

    res.json({
      selections: normalized,
      selectedCount: ctx.selectedCount,
      activeConflicts: ctx.activeConflicts,
      hasIncompatiblePairs: ctx.hasIncompatiblePairs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Clear dimension selections
router.delete("/book/:bookId", async (req, res) => {
  try {
    const book = await storage.getBook(req.params.bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });
    delete (book as any).dimensions;
    await storage.saveBook(book);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Preview assembled context
router.post("/preview", (req, res) => {
  try {
    const selections = req.body as DimensionSelections;
    const { valid, errors, normalized } = validateSelections(selections);
    if (!valid) return res.status(400).json({ error: "Invalid selections", details: errors });
    const ctx = assembleDimensionContext(normalized);
    res.json(ctx);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get active conflicts for a set of selections
router.post("/conflicts", (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be an array" });
    const conflicts = findActiveConflicts(ids);
    res.json({ conflicts, hasIncompatiblePairs: conflicts.some(c => c.overrideCondition?.toLowerCase() === "none") });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dev: reload dimension cache
router.post("/reload-cache", (_req, res) => {
  clearDimensionCache();
  res.json({ success: true, message: "Dimension cache cleared" });
});

export default router;
