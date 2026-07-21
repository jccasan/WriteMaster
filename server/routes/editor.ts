import express from "express";
import { callLLM } from "../llm";

const router = express.Router();

  router.post("/api/editor/analyze", async (req, res) => {
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
          const { runEditorialAssessment } = await import("../forge/analysis/modules/editorial-assessment");
          result = await runEditorialAssessment(text, ctx, g, "");
          break;
        }
        case "developmental_editor": {
          const { runDevEdit } = await import("../forge/analysis/modules/developmental-editor");
          result = await runDevEdit(text, ctx, g, "");
          break;
        }
        case "copy_editor": {
          const { runCopyEdit } = await import("../forge/analysis/modules/copy-editor");
          result = await runCopyEdit(text, ctx, g);
          break;
        }
        case "proofreader": {
          const { runProofread } = await import("../forge/analysis/modules/proofreader");
          result = await runProofread(text);
          break;
        }
        case "beta_reader": {
          const { runBetaReader } = await import("../forge/analysis/modules/beta-reader");
          result = await runBetaReader(text, ctx, g, betaProfile || "genre_enthusiast");
          break;
        }
        case "scene_scanner": {
          const { runSceneScan } = await import("../forge/analysis/modules/scene-scanner");
          result = await runSceneScan(text, ctx, g, [1]);
          break;
        }
        case "addiction_loop": {
          const { runAddictionLoopAnalysis } = await import("../forge/analysis/modules/addiction-loop-analyzer");
          result = await runAddictionLoopAnalysis(
            [{ chapter_number: 1, title: "Chapter", content: text }],
            1
          );
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

  // ── PROSE AI ACTIONS (inline editor: continue, rewrite, shorter, longer) ────

  router.post("/api/ai/prose-action", async (req, res) => {
    try {
      const { action, selected_text, context, chapter_title = "" } = req.body;
      if (!action) return res.status(400).json({ error: "action is required" });

      const prompts: Record<string, string> = {
        continue: `You are a fiction author. Continue the following passage naturally, matching the voice and tone exactly. Write 100-200 words. Output only the continuation, no preamble.

CHAPTER: ${chapter_title}
CONTEXT (recent text):
${context}

Continue from exactly where this ends:`,

        rewrite: `You are a fiction editor. Rewrite the selected passage to improve clarity, flow, and prose quality while preserving the meaning and voice exactly. Output only the rewritten passage, no preamble.

SELECTED TEXT TO REWRITE:
${selected_text}

SURROUNDING CONTEXT:
${context}`,

        shorter: `You are a fiction editor. Make the selected passage shorter — cut unnecessary words, tighten sentences, remove anything that doesn't earn its place. Preserve all essential meaning. Output only the shortened version, no preamble.

SELECTED TEXT:
${selected_text}`,

        longer: `You are a fiction author. Expand the selected passage with more detail, sensory texture, or emotional depth. Match the voice and style of the surrounding text. Output only the expanded version, no preamble.

SELECTED TEXT TO EXPAND:
${selected_text}

SURROUNDING CONTEXT:
${context}`,
      };

      const prompt = prompts[action];
      if (!prompt) return res.status(400).json({ error: `Unknown action: ${action}` });

      const result = await callLLM(prompt, "powerful", undefined, 1024);
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

export default router;
