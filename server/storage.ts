import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ProjectState, TropePack } from "./pipeline";
import { createEmptyProject } from "./pipeline";
import type { Pipeline2State } from "./pipeline2";
import type { ChapterPipelineState } from "./pipeline3";
import type { LineEditState } from "./pipeline4";
import { docGet, docPut, docDelete, docList, importLegacyDir } from "./docStore";

// Genre trope packs are seed content that ships with the app — they stay as
// files under data/templates and are tracked in git.
const TEMPLATES_DIR = path.resolve("data/templates");

// Everything user-generated lives in the SQLite document store, in these
// collections (formerly folders of JSON files under data/).
const COLLECTIONS = {
  projects: "projects",
  chapters: "chapters",
  books: "books",
  pipeline2: "pipeline2",
  pipeline3: "pipeline3",
  pipeline4: "pipeline4",
} as const;

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

function validateId(id: string): string {
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new Error("Invalid ID");
  }
  return id;
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
  mode?: "pantser" | "planner";          // writing mode — pantser or planner
  discovered_world?: DiscoveredWorld;    // auto-extracted world from pantser writing
}

export interface DiscoveredWorld {
  characters: Array<{
    name: string;
    notes: string;
    first_chapter: number;
    last_seen_chapter: number;
  }>;
  world_facts: string[];
  open_threads: string[];
  last_extracted_chapter: number;
  updated_at: string;
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

/**
 * SQLite-backed storage (Prisma document store). Public API is unchanged
 * from the old FileStorage; only the persistence layer moved. On first use
 * it imports any legacy data/*.json files into the database, leaving the
 * files on disk as a backup.
 */
export class DocStorage implements IStorage {
  private ready: Promise<void> | null = null;

  private ensureReady(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        await importLegacyDir(COLLECTIONS.projects, "data/projects");
        await importLegacyDir(COLLECTIONS.chapters, "data/chapters");
        await importLegacyDir(COLLECTIONS.books, "data/books");
        await importLegacyDir(COLLECTIONS.pipeline2, "data/pipeline2");
        await importLegacyDir(COLLECTIONS.pipeline3, "data/pipeline3");
        await importLegacyDir(COLLECTIONS.pipeline4, "data/pipeline4");
      })().catch((err) => {
        console.error("[storage] Legacy import failed:", err);
      });
    }
    return this.ready;
  }

  // ── Genre templates (seed files, read-only) ───────────────────────────────

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

  // ── Dossier projects ──────────────────────────────────────────────────────

  async createProject(brainDump: string, genre: string): Promise<ProjectState> {
    const template = await this.getTemplate(genre);
    if (!template) throw new Error(`Genre template not found: ${genre}`);
    const projectId = randomUUID();
    const state = createEmptyProject(projectId, brainDump, genre, template);
    await this.saveProject(state);
    return state;
  }

  async getProject(projectId: string): Promise<ProjectState | null> {
    await this.ensureReady();
    return docGet<ProjectState>(COLLECTIONS.projects, projectId);
  }

  async saveProject(state: ProjectState): Promise<void> {
    await this.ensureReady();
    await docPut(COLLECTIONS.projects, state.project_id, state);
  }

  async listProjects(): Promise<Array<{ id: string; created_at: string; genre: string; current_step: number; best_pitch: string }>> {
    await this.ensureReady();
    const all = await docList<ProjectState>(COLLECTIONS.projects);
    return all
      .map((data) => ({
        id: data.project_id,
        created_at: data.created_at,
        genre: data.genre,
        current_step: data.current_step,
        best_pitch: data.best_pitch || "",
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ── Chapter analyzer sessions ─────────────────────────────────────────────

  async listChapterSessions(): Promise<Array<{ id: string; title: string; created_at: string; updated_at: string; has_rewrite: boolean }>> {
    await this.ensureReady();
    const all = await docList<ChapterSession>(COLLECTIONS.chapters);
    return all
      .map((data) => ({
        id: data.id,
        title: data.title,
        created_at: data.created_at,
        updated_at: data.updated_at,
        has_rewrite: !!data.rewritten_chapter,
      }))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  async getChapterSession(id: string): Promise<ChapterSession | null> {
    validateId(id);
    await this.ensureReady();
    return docGet<ChapterSession>(COLLECTIONS.chapters, id);
  }

  async saveChapterSession(session: ChapterSession): Promise<void> {
    validateId(session.id);
    await this.ensureReady();
    await docPut(COLLECTIONS.chapters, session.id, session);
  }

  async deleteChapterSession(id: string): Promise<boolean> {
    validateId(id);
    await this.ensureReady();
    return docDelete(COLLECTIONS.chapters, id);
  }

  // ── Books ─────────────────────────────────────────────────────────────────

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
    await this.ensureReady();
    return docGet<BookProject>(COLLECTIONS.books, id);
  }

  async saveBook(book: BookProject): Promise<void> {
    validateId(book.id);
    await this.ensureReady();
    book.updated_at = new Date().toISOString();
    await docPut(COLLECTIONS.books, book.id, book);
  }

  async listBooks(): Promise<Array<{ id: string; title: string; created_at: string; updated_at: string; chapter_count: number; chapters_written: number; last_written_chapter: number | null; last_written_chapter_title: string | null }>> {
    await this.ensureReady();
    const all = await docList<BookProject>(COLLECTIONS.books);
    const books = all.map((data) => {
      // Find the most recently active chapter — highest written/committed chapter
      const writtenChapters = data.chapters
        .filter(c => c.status === "written" || c.status === "committed");
      const lastChapter = writtenChapters.length > 0
        ? writtenChapters[writtenChapters.length - 1]
        : data.chapters.find(c => c.status === "outlined") ?? null;
      return {
        id: data.id,
        title: data.title,
        created_at: data.created_at,
        updated_at: data.updated_at,
        chapter_count: data.chapters.length,
        chapters_written: writtenChapters.length,
        last_written_chapter: lastChapter?.chapter_number ?? null,
        last_written_chapter_title: lastChapter?.title ?? null,
      };
    });
    books.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return books;
  }

  async deleteBook(id: string): Promise<boolean> {
    validateId(id);
    await this.ensureReady();
    return docDelete(COLLECTIONS.books, id);
  }

  // ── Pipeline 2 ────────────────────────────────────────────────────────────

  async getP2State(id: string): Promise<Pipeline2State | null> {
    validateId(id);
    await this.ensureReady();
    return docGet<Pipeline2State>(COLLECTIONS.pipeline2, id);
  }

  async saveP2State(state: Pipeline2State): Promise<void> {
    validateId(state.pipeline2_id);
    await this.ensureReady();
    await docPut(COLLECTIONS.pipeline2, state.pipeline2_id, state);
  }

  async listP2States(bookId: string): Promise<Array<{ id: string; book_id: string; created_at: string; current_step: number }>> {
    await this.ensureReady();
    const all = await docList<Pipeline2State>(COLLECTIONS.pipeline2);
    return all
      .filter((data) => data.book_id === bookId)
      .map((data) => ({ id: data.pipeline2_id, book_id: data.book_id, created_at: data.created_at, current_step: data.current_step }));
  }

  // ── Pipeline 3 ────────────────────────────────────────────────────────────

  async getP3State(id: string): Promise<ChapterPipelineState | null> {
    validateId(id);
    await this.ensureReady();
    return docGet<ChapterPipelineState>(COLLECTIONS.pipeline3, id);
  }

  async saveP3State(state: ChapterPipelineState): Promise<void> {
    validateId(state.pipeline3_id);
    await this.ensureReady();
    await docPut(COLLECTIONS.pipeline3, state.pipeline3_id, state);
  }

  async listP3States(bookId: string): Promise<Array<{ id: string; book_id: string; chapter_number: number; created_at: string; current_step: number }>> {
    await this.ensureReady();
    const all = await docList<ChapterPipelineState>(COLLECTIONS.pipeline3);
    return all
      .filter((data) => data.book_id === bookId)
      .map((data) => ({ id: data.pipeline3_id, book_id: data.book_id, chapter_number: data.chapter_number, created_at: data.created_at, current_step: data.current_step }));
  }

  // ── Pipeline 4 ────────────────────────────────────────────────────────────

  async getP4State(id: string): Promise<LineEditState | null> {
    validateId(id);
    await this.ensureReady();
    return docGet<LineEditState>(COLLECTIONS.pipeline4, id);
  }

  async saveP4State(state: LineEditState): Promise<void> {
    validateId(state.pipeline4_id);
    await this.ensureReady();
    await docPut(COLLECTIONS.pipeline4, state.pipeline4_id, state);
  }

  async listP4States(bookId: string): Promise<Array<{ id: string; book_id: string; chapter_number: number; created_at: string; current_step: number }>> {
    await this.ensureReady();
    const all = await docList<LineEditState>(COLLECTIONS.pipeline4);
    return all
      .filter((data) => data.book_id === bookId)
      .map((data) => ({ id: data.pipeline4_id, book_id: data.book_id, chapter_number: data.chapter_number, created_at: data.created_at, current_step: data.current_step }));
  }
}

export const storage = new DocStorage();
