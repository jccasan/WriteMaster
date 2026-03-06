import { readFile, writeFile, readdir, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ProjectState, TropePack } from "./pipeline";
import { createEmptyProject } from "./pipeline";

const TEMPLATES_DIR = path.resolve("data/templates");
const PROJECTS_DIR = path.resolve("data/projects");
const CHAPTERS_DIR = path.resolve("data/chapters");
const BOOKS_DIR = path.resolve("data/books");

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

function validateId(id: string): string {
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new Error("Invalid ID");
  }
  return id;
}

async function ensureDirs() {
  if (!existsSync(TEMPLATES_DIR)) await mkdir(TEMPLATES_DIR, { recursive: true });
  if (!existsSync(PROJECTS_DIR)) await mkdir(PROJECTS_DIR, { recursive: true });
  if (!existsSync(CHAPTERS_DIR)) await mkdir(CHAPTERS_DIR, { recursive: true });
  if (!existsSync(BOOKS_DIR)) await mkdir(BOOKS_DIR, { recursive: true });
}

export interface ChapterElement {
  key: string;
  label: string;
  value: string;
}

export interface ChapterSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  chapter_text: string;
  elements: ChapterElement[];
  rewritten_chapter: string | null;
}

export interface NarrativeSliders {
  tension: number;
  intimacy: number;
  violence_risk: number;
  wonder: number;
  dread: number;
  trust: number;
  stress: number;
  control: number;
  hope: number;
}

export interface BookChapter {
  chapter_number: number;
  title: string;
  outline: string;
  content: string | null;
  summary: string | null;
  status: "outlined" | "writing" | "written";
  sliders?: NarrativeSliders | null;
}

export interface BookProject {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  source_project_id: string | null;
  brain_dump: string;
  dossier: string;
  chapters: BookChapter[];
}

export interface IStorage {
  getGenres(): Promise<Array<{ id: string; display_name: string }>>;
  getTemplate(genre: string): Promise<TropePack | null>;
  createProject(brainDump: string, genre: string): Promise<ProjectState>;
  getProject(projectId: string): Promise<ProjectState | null>;
  saveProject(state: ProjectState): Promise<void>;
  listChapterSessions(): Promise<Array<{ id: string; title: string; created_at: string; updated_at: string; has_rewrite: boolean }>>;
  getChapterSession(id: string): Promise<ChapterSession | null>;
  saveChapterSession(session: ChapterSession): Promise<void>;
  deleteChapterSession(id: string): Promise<boolean>;
  createBook(sourceProjectId: string | null, brainDump: string, dossier: string, title: string): Promise<BookProject>;
  getBook(id: string): Promise<BookProject | null>;
  saveBook(book: BookProject): Promise<void>;
  listBooks(): Promise<Array<{ id: string; title: string; created_at: string; updated_at: string; chapter_count: number; chapters_written: number }>>;
  deleteBook(id: string): Promise<boolean>;
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

  async listChapterSessions(): Promise<Array<{ id: string; title: string; created_at: string; updated_at: string; has_rewrite: boolean }>> {
    if (!existsSync(CHAPTERS_DIR)) return [];
    const files = await readdir(CHAPTERS_DIR);
    const sessions: Array<{ id: string; title: string; created_at: string; updated_at: string; has_rewrite: boolean }> = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = await readFile(path.join(CHAPTERS_DIR, file), "utf-8");
        const data = JSON.parse(content) as ChapterSession;
        sessions.push({
          id: data.id,
          title: data.title,
          created_at: data.created_at,
          updated_at: data.updated_at,
          has_rewrite: !!data.rewritten_chapter,
        });
      } catch {
        continue;
      }
    }
    sessions.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return sessions;
  }

  async getChapterSession(id: string): Promise<ChapterSession | null> {
    validateId(id);
    const filePath = path.join(CHAPTERS_DIR, `${id}.json`);
    if (!existsSync(filePath)) return null;
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as ChapterSession;
  }

  async saveChapterSession(session: ChapterSession): Promise<void> {
    validateId(session.id);
    const filePath = path.join(CHAPTERS_DIR, `${session.id}.json`);
    await writeFile(filePath, JSON.stringify(session, null, 2));
  }

  async deleteChapterSession(id: string): Promise<boolean> {
    validateId(id);
    const filePath = path.join(CHAPTERS_DIR, `${id}.json`);
    if (!existsSync(filePath)) return false;
    await unlink(filePath);
    return true;
  }

  async createBook(sourceProjectId: string | null, brainDump: string, dossier: string, title: string): Promise<BookProject> {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const now = new Date().toISOString();
    const book: BookProject = {
      id,
      title,
      created_at: now,
      updated_at: now,
      source_project_id: sourceProjectId,
      brain_dump: brainDump,
      dossier,
      chapters: [],
    };
    await this.saveBook(book);
    return book;
  }

  async getBook(id: string): Promise<BookProject | null> {
    validateId(id);
    const filePath = path.join(BOOKS_DIR, `${id}.json`);
    if (!existsSync(filePath)) return null;
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as BookProject;
  }

  async saveBook(book: BookProject): Promise<void> {
    validateId(book.id);
    book.updated_at = new Date().toISOString();
    const filePath = path.join(BOOKS_DIR, `${book.id}.json`);
    await writeFile(filePath, JSON.stringify(book, null, 2));
  }

  async listBooks(): Promise<Array<{ id: string; title: string; created_at: string; updated_at: string; chapter_count: number; chapters_written: number }>> {
    if (!existsSync(BOOKS_DIR)) return [];
    const files = await readdir(BOOKS_DIR);
    const books: Array<{ id: string; title: string; created_at: string; updated_at: string; chapter_count: number; chapters_written: number }> = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = await readFile(path.join(BOOKS_DIR, file), "utf-8");
        const data = JSON.parse(content) as BookProject;
        books.push({
          id: data.id,
          title: data.title,
          created_at: data.created_at,
          updated_at: data.updated_at,
          chapter_count: data.chapters.length,
          chapters_written: data.chapters.filter(c => c.status === "written").length,
        });
      } catch {
        continue;
      }
    }
    books.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return books;
  }

  async deleteBook(id: string): Promise<boolean> {
    validateId(id);
    const filePath = path.join(BOOKS_DIR, `${id}.json`);
    if (!existsSync(filePath)) return false;
    await unlink(filePath);
    return true;
  }
}

export const storage = new FileStorage();
