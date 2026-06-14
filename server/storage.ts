import { readFile, writeFile, readdir, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ProjectState, TropePack } from "./pipeline";
import { createEmptyProject } from "./pipeline";
import type { Pipeline2State } from "./pipeline2";
import type { ChapterPipelineState } from "./pipeline3";
import type { LineEditState } from "./pipeline4";

const TEMPLATES_DIR = path.resolve("data/templates");
const PROJECTS_DIR = path.resolve("data/projects");
const CHAPTERS_DIR = path.resolve("data/chapters");
const BOOKS_DIR = path.resolve("data/books");
const PIPELINE2_DIR = path.resolve("data/pipeline2");
const PIPELINE3_DIR = path.resolve("data/pipeline3");
const PIPELINE4_DIR = path.resolve("data/pipeline4");

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
  if (!existsSync(PIPELINE2_DIR)) await mkdir(PIPELINE2_DIR, { recursive: true });
  if (!existsSync(PIPELINE3_DIR)) await mkdir(PIPELINE3_DIR, { recursive: true });
  if (!existsSync(PIPELINE4_DIR)) await mkdir(PIPELINE4_DIR, { recursive: true });
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

export interface ChapterAnalysis {
  type: "beta_reader" | "editorial_assessment" | "developmental_assessment";
  profile?: string;
  result: any;
  ran_at: string;
}

export interface BookChapter {
  chapter_number: number;
  title: string;
  outline: string;
  content: string | null;
  summary: string | null;
  status: "outlined" | "writing" | "written" | "committed";
  sliders?: NarrativeSliders | null;
  analyses?: ChapterAnalysis[];
}

export interface BookDocument {
  id: string;
  name: string;
  content: string;
  type: "story_bible" | "character_sheet" | "world_doc" | "outline" | "notes" | "other";
  added_at: string;
}

export interface BookProject {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  source_project_id: string | null;
  forge_project_id: string | null;
  brain_dump: string;
  dossier: string;
  chapters: BookChapter[];
  documents?: BookDocument[];
  google_doc_id?: string | null;
}

export interface IStorage {
  getGenres(): Promise<Array<{ id: string; display_name: string }>>;
  getTemplate(genre: string): Promise<TropePack | null>;
  createProject(brainDump: string, genre: string): Promise<ProjectState>;
  getProject(projectId: string): Promise<ProjectState | null>;
  saveProject(state: ProjectState): Promise<void>;
  listProjects(): Promise<Array<{ id: string; created_at: string; genre: string; current_step: number; best_pitch: string }>>;
  listChapterSessions(): Promise<Array<{ id: string; title: string; created_at: string; updated_at: string; has_rewrite: boolean }>>;
  getChapterSession(id: string): Promise<ChapterSession | null>;
  saveChapterSession(session: ChapterSession): Promise<void>;
  deleteChapterSession(id: string): Promise<boolean>;
  createBook(sourceProjectId: string | null, brainDump: string, dossier: string, title: string): Promise<BookProject>;
  getBook(id: string): Promise<BookProject | null>;
  saveBook(book: BookProject): Promise<void>;
  listBooks(): Promise<Array<{ id: string; title: string; created_at: string; updated_at: string; chapter_count: number; chapters_written: number }>>;
  deleteBook(id: string): Promise<boolean>;
  // Pipeline 2
  getP2State(id: string): Promise<Pipeline2State | null>;
  saveP2State(state: Pipeline2State): Promise<void>;
  listP2States(bookId: string): Promise<Array<{ id: string; book_id: string; created_at: string; current_step: number }>>;
  // Pipeline 3
  getP3State(id: string): Promise<ChapterPipelineState | null>;
  saveP3State(state: ChapterPipelineState): Promise<void>;
  listP3States(bookId: string): Promise<Array<{ id: string; book_id: string; chapter_number: number; created_at: string; current_step: number }>>;
  // Pipeline 4
  getP4State(id: string): Promise<LineEditState | null>;
  saveP4State(state: LineEditState): Promise<void>;
  listP4States(bookId: string): Promise<Array<{ id: string; book_id: string; chapter_number: number; created_at: string; current_step: number }>>;
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

  async listProjects(): Promise<Array<{ id: string; created_at: string; genre: string; current_step: number; best_pitch: string }>> {
    if (!existsSync(PROJECTS_DIR)) return [];
    const files = await readdir(PROJECTS_DIR);
    const projects: Array<{ id: string; created_at: string; genre: string; current_step: number; best_pitch: string }> = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = await readFile(path.join(PROJECTS_DIR, file), "utf-8");
        const data = JSON.parse(content) as ProjectState;
        projects.push({
          id: data.project_id,
          created_at: data.created_at,
          genre: data.genre,
          current_step: data.current_step,
          best_pitch: data.best_pitch || "",
        });
      } catch {
        continue;
      }
    }
    return projects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
      forge_project_id: null,
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
          chapters_written: data.chapters.filter(c => c.status === "written" || c.status === "committed").length,
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

  // ── Pipeline 2 ────────────────────────────────────────────────────────────

  async getP2State(id: string): Promise<Pipeline2State | null> {
    validateId(id);
    const filePath = path.join(PIPELINE2_DIR, `${id}.json`);
    if (!existsSync(filePath)) return null;
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as Pipeline2State;
  }

  async saveP2State(state: Pipeline2State): Promise<void> {
    validateId(state.pipeline2_id);
    const filePath = path.join(PIPELINE2_DIR, `${state.pipeline2_id}.json`);
    await writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
  }

  async listP2States(bookId: string): Promise<Array<{ id: string; book_id: string; created_at: string; current_step: number }>> {
    if (!existsSync(PIPELINE2_DIR)) return [];
    const files = await readdir(PIPELINE2_DIR);
    const results: Array<{ id: string; book_id: string; created_at: string; current_step: number }> = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = await readFile(path.join(PIPELINE2_DIR, file), "utf-8");
        const data = JSON.parse(content) as Pipeline2State;
        if (data.book_id === bookId) {
          results.push({ id: data.pipeline2_id, book_id: data.book_id, created_at: data.created_at, current_step: data.current_step });
        }
      } catch { continue; }
    }
    return results;
  }

  // ── Pipeline 3 ────────────────────────────────────────────────────────────

  async getP3State(id: string): Promise<ChapterPipelineState | null> {
    validateId(id);
    const filePath = path.join(PIPELINE3_DIR, `${id}.json`);
    if (!existsSync(filePath)) return null;
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as ChapterPipelineState;
  }

  async saveP3State(state: ChapterPipelineState): Promise<void> {
    validateId(state.pipeline3_id);
    const filePath = path.join(PIPELINE3_DIR, `${state.pipeline3_id}.json`);
    await writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
  }

  async listP3States(bookId: string): Promise<Array<{ id: string; book_id: string; chapter_number: number; created_at: string; current_step: number }>> {
    if (!existsSync(PIPELINE3_DIR)) return [];
    const files = await readdir(PIPELINE3_DIR);
    const results: Array<{ id: string; book_id: string; chapter_number: number; created_at: string; current_step: number }> = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = await readFile(path.join(PIPELINE3_DIR, file), "utf-8");
        const data = JSON.parse(content) as ChapterPipelineState;
        if (data.book_id === bookId) {
          results.push({ id: data.pipeline3_id, book_id: data.book_id, chapter_number: data.chapter_number, created_at: data.created_at, current_step: data.current_step });
        }
      } catch { continue; }
    }
    return results;
  }

  // ── Pipeline 4 ────────────────────────────────────────────────────────────

  async getP4State(id: string): Promise<LineEditState | null> {
    validateId(id);
    const filePath = path.join(PIPELINE4_DIR, `${id}.json`);
    if (!existsSync(filePath)) return null;
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as LineEditState;
  }

  async saveP4State(state: LineEditState): Promise<void> {
    validateId(state.pipeline4_id);
    const filePath = path.join(PIPELINE4_DIR, `${state.pipeline4_id}.json`);
    await writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
  }

  async listP4States(bookId: string): Promise<Array<{ id: string; book_id: string; chapter_number: number; created_at: string; current_step: number }>> {
    if (!existsSync(PIPELINE4_DIR)) return [];
    const files = await readdir(PIPELINE4_DIR);
    const results: Array<{ id: string; book_id: string; chapter_number: number; created_at: string; current_step: number }> = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = await readFile(path.join(PIPELINE4_DIR, file), "utf-8");
        const data = JSON.parse(content) as LineEditState;
        if (data.book_id === bookId) {
          results.push({ id: data.pipeline4_id, book_id: data.book_id, chapter_number: data.chapter_number, created_at: data.created_at, current_step: data.current_step });
        }
      } catch { continue; }
    }
    return results;
  }
}

export const storage = new FileStorage();
