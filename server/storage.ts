import { readFile, writeFile, readdir, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ProjectState, TropePack } from "./pipeline";
import { createEmptyProject } from "./pipeline";

const TEMPLATES_DIR = path.resolve("data/templates");
const PROJECTS_DIR = path.resolve("data/projects");

async function ensureDirs() {
  if (!existsSync(TEMPLATES_DIR)) await mkdir(TEMPLATES_DIR, { recursive: true });
  if (!existsSync(PROJECTS_DIR)) await mkdir(PROJECTS_DIR, { recursive: true });
}

export interface IStorage {
  getGenres(): Promise<Array<{ id: string; display_name: string }>>;
  getTemplate(genre: string): Promise<TropePack | null>;
  createProject(brainDump: string, genre: string): Promise<ProjectState>;
  getProject(projectId: string): Promise<ProjectState | null>;
  saveProject(state: ProjectState): Promise<void>;
}

export class FileStorage implements IStorage {
  constructor() {
    ensureDirs();
  }

  async getGenres(): Promise<Array<{ id: string; display_name: string }>> {
    const files = await readdir(TEMPLATES_DIR);
    const genres: Array<{ id: string; display_name: string }> = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const content = await readFile(path.join(TEMPLATES_DIR, file), "utf-8");
      const data = JSON.parse(content);
      genres.push({ id: data.genre, display_name: data.display_name });
    }
    return genres;
  }

  async getTemplate(genre: string): Promise<TropePack | null> {
    const filePath = path.join(TEMPLATES_DIR, `${genre}.json`);
    if (!existsSync(filePath)) return null;
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as TropePack;
  }

  async createProject(brainDump: string, genre: string): Promise<ProjectState> {
    const template = await this.getTemplate(genre);
    if (!template) throw new Error(`Genre template not found: ${genre}`);
    const projectId = randomUUID();
    const state = createEmptyProject(projectId, brainDump, genre, template);
    await this.saveProject(state);
    return state;
  }

  async getProject(projectId: string): Promise<ProjectState | null> {
    const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
    if (!existsSync(filePath)) return null;
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as ProjectState;
  }

  async saveProject(state: ProjectState): Promise<void> {
    const filePath = path.join(PROJECTS_DIR, `${state.project_id}.json`);
    await writeFile(filePath, JSON.stringify(state, null, 2));
  }
}

export const storage = new FileStorage();
