import express from "express";
import { storage } from "../storage";
import { runStep, getStepName } from "../pipeline";

const router = express.Router();

  router.get("/api/genres", async (_req, res) => {
    try {
      const genres = await storage.getGenres();
      res.json(genres);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/projects", async (_req, res) => {
    try {
      const projects = await storage.listProjects();
      res.json(projects);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/project/start", async (req, res) => {
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

  router.post("/api/project/:projectId/run-step", async (req, res) => {
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

  router.get("/api/project/:projectId/state", async (req, res) => {
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

  router.get("/api/project/:projectId/final", async (req, res) => {
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

  router.put("/api/project/:projectId/dossier", async (req, res) => {
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

export default router;
