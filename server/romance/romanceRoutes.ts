/**
 * romanceRoutes.ts
 *
 * GET    /api/romance                    — list all romance projects
 * POST   /api/romance                    — create new project
 * GET    /api/romance/:id                — get project
 * PUT    /api/romance/:id                — update parameters/title
 * DELETE /api/romance/:id                — delete project
 * POST   /api/romance/:id/outline        — generate outline
 * POST   /api/romance/:id/beat-sheet     — generate beat sheet
 * POST   /api/romance/:id/scene          — draft a scene
 * PUT    /api/romance/:id/scene/:sceneId — update scene content
 * DELETE /api/romance/:id/scene/:sceneId — delete scene
 */

import { Router } from "express";
import { readFile, writeFile, readdir, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";
import { callLLM } from "../llm";
import {
  ROMANCE_SYSTEM_PROMPT,
  buildOutlinePrompt,
  buildBeatSheetPrompt,
  buildSceneDraftPrompt,
  type RomanceProject,
  type RomanceParameters,
} from "./romanceSystem";

const router = Router();
const PROJECTS_DIR = path.resolve("data/romance-projects");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

if (!existsSync(PROJECTS_DIR)) {
  mkdir(PROJECTS_DIR, { recursive: true }).catch(() => {});
}

// ─── STORAGE HELPERS ──────────────────────────────────────────────────────────

async function saveProject(project: RomanceProject) {
  project.updated_at = new Date().toISOString();
  await writeFile(
    path.join(PROJECTS_DIR, `${project.id}.json`),
    JSON.stringify(project, null, 2)
  );
}

async function loadProject(id: string): Promise<RomanceProject | null> {
  const p = path.join(PROJECTS_DIR, `${id}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(await readFile(p, "utf-8"));
}

async function listProjects(): Promise<RomanceProject[]> {
  if (!existsSync(PROJECTS_DIR)) return [];
  const files = (await readdir(PROJECTS_DIR)).filter(f => f.endsWith(".json"));
  const projects = await Promise.all(
    files.map(async f => {
      try {
        return JSON.parse(await readFile(path.join(PROJECTS_DIR, f), "utf-8")) as RomanceProject;
      } catch { return null; }
    })
  );
  return (projects.filter(Boolean) as RomanceProject[])
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

router.get("/", async (_req, res) => {
  try {
    const projects = await listProjects();
    res.json(projects.map(p => ({
      id: p.id,
      title: p.title,
      subgenre: p.subgenre,
      created_at: p.created_at,
      updated_at: p.updated_at,
      has_outline: !!p.outline,
      has_beat_sheet: !!p.beat_sheet,
      scene_count: p.scenes.length,
      has_parameters: !!p.parameters,
      manuscript_chapters: p.manuscript?.length ?? 0,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { title, subgenre } = req.body;
  if (!title || !subgenre) return res.status(400).json({ error: "title and subgenre required" });

  const project: RomanceProject = {
    id: randomUUID(),
    title,
    subgenre,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    scenes: [],
  };

  await saveProject(project);
  res.json(project);
});

router.get("/:id", async (req, res) => {
  const project = await loadProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

router.put("/:id", async (req, res) => {
  const project = await loadProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const { title, parameters } = req.body;
  if (title) project.title = title;
  if (parameters) project.parameters = parameters;

  await saveProject(project);
  res.json(project);
});

router.delete("/:id", async (req, res) => {
  const p = path.join(PROJECTS_DIR, `${req.params.id}.json`);
  if (existsSync(p)) await unlink(p).catch(() => {});
  res.json({ success: true });
});

// ─── MANUSCRIPT UPLOAD ───────────────────────────────────────────────────────
// Parse an uploaded file and store chapters in the project.

router.post("/:id/upload", upload.single("file"), async (req, res) => {
  const project = await loadProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    // Reuse the expand upload parsing logic
    const FormData = (await import("form-data")).default;
    const fetch = (await import("node-fetch")).default as any;
    const form = new FormData();
    form.append("file", req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });

    // Parse using the existing expand endpoint
    const parseRes = await fetch(`http://localhost:${process.env.PORT ?? 5000}/api/expand/upload`, {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
    });
    const parsed = await parseRes.json() as any;
    if (!parseRes.ok) throw new Error(parsed.error ?? "Parse failed");

    const manuscript = parsed.chapters.map((ch: any, i: number) => ({
      title: ch.title,
      content: parsed.chapter_contents[i] ?? "",
    }));

    project.manuscript = manuscript;
    await saveProject(project);
    res.json({ chapter_count: manuscript.length, chapters: manuscript.map((c: any) => c.title) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MANUSCRIPT CHAPTER SAVE ─────────────────────────────────────────────────
// Save edited chapter content back to the project.

router.put("/:id/manuscript", async (req, res) => {
  const project = await loadProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const { chapters } = req.body as { chapters: { title: string; content: string }[] };
  if (!Array.isArray(chapters)) return res.status(400).json({ error: "chapters array required" });

  project.manuscript = chapters;
  await saveProject(project);
  res.json({ saved: chapters.length });
});

// ─── OUTLINE ──────────────────────────────────────────────────────────────────

router.post("/:id/outline", async (req, res) => {
  const project = await loadProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!project.parameters) return res.status(400).json({ error: "Set story parameters before generating outline" });

  try {
    const prompt = buildOutlinePrompt(project.parameters);
    const outline = await callLLM(
      `${ROMANCE_SYSTEM_PROMPT}\n\n---\n\n${prompt}`,
      "powerful"
    );
    project.outline = outline;
    await saveProject(project);
    res.json({ outline });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BEAT SHEET ───────────────────────────────────────────────────────────────

router.post("/:id/beat-sheet", async (req, res) => {
  const project = await loadProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!project.parameters) return res.status(400).json({ error: "Set story parameters first" });
  if (!project.outline) return res.status(400).json({ error: "Generate outline first" });

  try {
    const prompt = buildBeatSheetPrompt(project.parameters, project.outline);
    const beatSheet = await callLLM(
      `${ROMANCE_SYSTEM_PROMPT}\n\n---\n\n${prompt}`,
      "powerful",
      undefined,
      8192
    );
    project.beat_sheet = beatSheet;
    await saveProject(project);
    res.json({ beat_sheet: beatSheet });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SCENE DRAFT ──────────────────────────────────────────────────────────────

router.post("/:id/scene", async (req, res) => {
  const project = await loadProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!project.parameters) return res.status(400).json({ error: "Set story parameters first" });

  const { purpose, pov, beat_position, length, context, title } = req.body;
  if (!purpose || !pov || !beat_position) {
    return res.status(400).json({ error: "purpose, pov, and beat_position required" });
  }

  try {
    const prompt = buildSceneDraftPrompt(
      project.parameters,
      purpose,
      pov,
      beat_position,
      length ?? "1,500–2,500 words",
      context
    );

    const content = await callLLM(
      `${ROMANCE_SYSTEM_PROMPT}\n\n---\n\n${prompt}`,
      "powerful",
      undefined,
      8192
    );

    const scene = {
      id: randomUUID(),
      title: title ?? `Scene: ${purpose.slice(0, 50)}`,
      purpose,
      pov,
      beat_position,
      content,
      created_at: new Date().toISOString(),
    };

    project.scenes.push(scene);
    await saveProject(project);
    res.json(scene);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/scene/:sceneId", async (req, res) => {
  const project = await loadProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const idx = project.scenes.findIndex(s => s.id === req.params.sceneId);
  if (idx === -1) return res.status(404).json({ error: "Scene not found" });

  const { content, title } = req.body;
  if (content !== undefined) project.scenes[idx].content = content;
  if (title !== undefined) project.scenes[idx].title = title;

  await saveProject(project);
  res.json(project.scenes[idx]);
});

router.delete("/:id/scene/:sceneId", async (req, res) => {
  const project = await loadProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  project.scenes = project.scenes.filter(s => s.id !== req.params.sceneId);
  await saveProject(project);
  res.json({ success: true });
});

export default router;
