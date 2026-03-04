import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { runStep, getStepName } from "./pipeline";
import { callLLM } from "./llm";
import { AI_WRITING_RULES } from "./writing-rules";

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
      const { chapter_text, elements } = req.body;
      if (!chapter_text || !elements || !Array.isArray(elements)) {
        return res.status(400).json({ error: "chapter_text and elements array are required" });
      }

      const elementsList = elements
        .map((e: { label: string; value: string }) => `- **${e.label}**: ${e.value}`)
        .join("\n");

      const result = await callLLM(
        `You are a master fiction writer and editor. Your task is to rewrite the chapter below so that it faithfully incorporates ALL of the structural elements provided.

ORIGINAL CHAPTER:
${chapter_text}

STRUCTURAL ELEMENTS TO INCORPORATE:
${elementsList}

${AI_WRITING_RULES}

INSTRUCTIONS:
- Rewrite the entire chapter so it naturally embodies every element listed above
- Maintain the original voice, style, and point of view unless an element specifically changes it
- If an element contradicts the original, the element takes priority
- PRESERVE ORIGINAL DETAILS: The original chapter text is the authoritative source for specific world details, setting descriptions, character traits, and established facts. If the original says a road is "well-maintained" or a location is a "major trade corridor," those details MUST appear in the rewrite unless an element explicitly overrides them. Do not invent replacements for details the author already established.
- Preserve the original's best qualities — strong prose, vivid imagery, good dialogue
- Do NOT add meta-commentary or notes — output ONLY the rewritten chapter text
- Match approximately the same length as the original (within 20%)
- Make the transitions between elements feel organic, not forced

Output the rewritten chapter text only, no preamble or commentary.`,
        "powerful"
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

  return httpServer;
}
