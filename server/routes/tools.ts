import express from "express";
import { storage } from "../storage";
import { callLLM } from "../llm";

const router = express.Router();

// NOTE: POST /api/books/:id/style-guide lives here (not in books.ts) because it
// is the save step of the style-guide extractor tool flow directly below.

  // ── STYLE GUIDE EXTRACTOR ────────────────────────────────────────────────────

  // Two-step style extraction:
  // Step 1: Extract representative passages (calm, dialogue, action, comedy)
  // Step 2: Generate style guide from those passages
  // This mirrors the video approach — ensures full coverage across scene types.

  // List saved style guide files from data/style-guides/
  router.get("/api/tools/style-guides", async (_req, res) => {
    try {
      const { readdir, readFile } = await import("fs/promises");
      const { existsSync } = await import("fs");
      const dir = "data/style-guides";
      if (!existsSync(dir)) return res.json({ guides: [] });
      const files = (await readdir(dir)).filter(f => f.endsWith(".md"));
      const guides = await Promise.all(files.map(async f => ({
        filename: f,
        name: f.replace(".md", "").replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        content: await readFile(`${dir}/${f}`, "utf-8"),
      })));
      res.json({ guides });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/tools/extract-style-guide", async (req, res) => {
    try {
      const { sample_text, author_name, genre } = req.body;
      if (!sample_text || sample_text.trim().length < 500) {
        return res.status(400).json({ error: "Sample text must be at least 500 characters. Provide 2,000+ words for best results." });
      }

      const { getSkill } = await import("../skillLoader");
      const styleExtractor = getSkill("STYLE_EXTRACTOR");

      // Step 1: Extract representative passages by scene type
      // Run in parallel for the three mandatory types
      const [calmPassage, dialoguePassage, actionPassage] = await Promise.all([
        callLLM(`You are selecting a prose passage for style analysis.

WRITING SAMPLE:
${sample_text}

Your task: Find and reproduce verbatim approximately 400 words of CALM, DESCRIPTIVE text from this sample. This should be a moment with more description and atmosphere and less dialogue or action — a quiet scene, introspective moment, or setting description. Reproduce the passage exactly as written, including any paragraph breaks. Output only the passage, no commentary.`, "powerful", undefined, 1024),

        callLLM(`You are selecting a prose passage for style analysis.

WRITING SAMPLE:
${sample_text}

Your task: Find and reproduce verbatim approximately 400 words of DIALOGUE-HEAVY text from this sample. Choose a section with active conversation between characters. Reproduce the passage exactly as written, including paragraph breaks. Output only the passage, no commentary.`, "powerful", undefined, 1024),

        callLLM(`You are selecting a prose passage for style analysis.

WRITING SAMPLE:
${sample_text}

Your task: Find and reproduce verbatim approximately 400 words of ACTION or HIGH-TENSION text from this sample. Choose a scene with physical action, confrontation, or dramatic momentum. If no clear action scene exists, select the most emotionally intense or dramatically heightened passage. Reproduce exactly as written. Output only the passage, no commentary.`, "powerful", undefined, 1024),
      ]);

      // Step 2: Generate style guide from the representative passages
      const combinedPassages = `CALM/DESCRIPTIVE PASSAGE:
${calmPassage}

DIALOGUE PASSAGE:
${dialoguePassage}

ACTION/TENSION PASSAGE:
${actionPassage}`;

      const styleGuide = await callLLM(
        `You are an expert literary analyst. Analyze the prose passages below and produce a comprehensive Style Guide following the framework provided.

These passages were selected to represent the full range of this author's voice across different scene types.

AUTHOR: ${author_name || "Unknown"}${genre ? `
GENRE: ${genre}` : ""}

PROSE SAMPLES:
${combinedPassages}

${styleExtractor}

Important: Base every finding strictly on patterns present in the samples. Quote verbatim examples. Do not assume or invent characteristics.`,
        "powerful",
        undefined,
        8192
      );

      res.json({
        style_guide: styleGuide,
        passages: { calm: calmPassage, dialogue: dialoguePassage, action: actionPassage }
      });
    } catch (err: any) {
      console.error("[Style Extractor Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Save extracted style guide as a book document
  router.post("/api/books/:id/style-guide", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const { style_guide, name = "Prose Style Guide" } = req.body;
      if (!style_guide) return res.status(400).json({ error: "style_guide content is required" });

      const { randomUUID } = await import("crypto");
      if (!book.documents) book.documents = [];
      // Replace existing style guide if present
      book.documents = book.documents.filter((d) => d.name !== "Prose Style Guide" && d.name !== name);
      book.documents.push({
        id: randomUUID(),
        name,
        content: style_guide,
        type: "other",
        added_at: new Date().toISOString(),
      });

      await storage.saveBook(book);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── SKILLS ADMIN ─────────────────────────────────────────────────────────────

  router.get("/api/skills", async (_req, res) => {
    try {
      const { listSkills } = await import("../skillLoader");
      res.json({ skills: listSkills() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/skills/:token", async (req, res) => {
    try {
      const { getSkill } = await import("../skillLoader");
      const content = getSkill(req.params.token.toUpperCase());
      if (!content) return res.status(404).json({ error: "Skill not found" });
      res.json({ token: req.params.token.toUpperCase(), content });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Library snapshot — carry the library into deployments ────────────────

  router.get("/api/library/snapshot", async (_req, res) => {
    try {
      const { getSnapshotStatus } = await import("../librarySnapshot");
      res.json(await getSnapshotStatus());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/library/snapshot", async (_req, res) => {
    try {
      const { exportLibrarySnapshot } = await import("../librarySnapshot");
      res.json(await exportLibrarySnapshot());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/skills/reload", async (_req, res) => {
    try {
      const { reloadSkills } = await import("../skillLoader");
      reloadSkills();
      const { listSkills } = await import("../skillLoader");
      res.json({ reloaded: true, skills: listSkills() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

export default router;
