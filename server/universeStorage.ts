/**
 * universeStorage.ts
 *
 * File-based storage for the Universe layer.
 * Mirrors the pattern in storage.ts but scoped to universe/series/menagerie/push-session data.
 */

import { readFile, writeFile, readdir, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  Universe,
  UniverseSeries,
  UniverseMenagerie,
  PushSession,
  MenagerieCharacter,
  WorldStateSnapshot,
} from "../shared/universeSchema";

const UNIVERSES_DIR  = path.resolve("data/universes");
const SERIES_DIR     = path.resolve("data/series");
const MENAGERIES_DIR = path.resolve("data/menageries");
const PUSH_SESSIONS_DIR = path.resolve("data/push-sessions");

const SAFE_ID = /^[a-zA-Z0-9_-]{1,64}$/;
function vid(id: string): string {
  if (!SAFE_ID.test(id)) throw new Error(`Invalid ID: ${id}`);
  return id;
}

async function ensureDirs() {
  for (const dir of [UNIVERSES_DIR, SERIES_DIR, MENAGERIES_DIR, PUSH_SESSIONS_DIR]) {
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  }
}
ensureDirs().catch(console.error);

// ─── UNIVERSE ────────────────────────────────────────────────────────────────

export async function createUniverse(name: string, description: string, bible = ""): Promise<Universe> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const universe: Universe = {
    id, name, description, created_at: now, updated_at: now,
    bible, world_state: null,
    series_ids: [], standalone_book_ids: [], push_history: [],
  };
  await writeFile(path.join(UNIVERSES_DIR, `${id}.json`), JSON.stringify(universe, null, 2));
  return universe;
}

export async function getUniverse(id: string): Promise<Universe | null> {
  const p = path.join(UNIVERSES_DIR, `${vid(id)}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(await readFile(p, "utf-8")) as Universe;
}

export async function saveUniverse(universe: Universe): Promise<void> {
  universe.updated_at = new Date().toISOString();
  await writeFile(path.join(UNIVERSES_DIR, `${vid(universe.id)}.json`), JSON.stringify(universe, null, 2));
}

export async function listUniverses(): Promise<Array<{ id: string; name: string; description: string; updated_at: string; series_count: number; book_count: number }>> {
  if (!existsSync(UNIVERSES_DIR)) return [];
  const files = await readdir(UNIVERSES_DIR);
  const results = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const u = JSON.parse(await readFile(path.join(UNIVERSES_DIR, f), "utf-8")) as Universe;
      const bookCount = u.standalone_book_ids.length; // series books counted separately
      results.push({ id: u.id, name: u.name, description: u.description, updated_at: u.updated_at, series_count: u.series_ids.length, book_count: bookCount });
    } catch { continue; }
  }
  return results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function deleteUniverse(id: string): Promise<void> {
  const p = path.join(UNIVERSES_DIR, `${vid(id)}.json`);
  if (existsSync(p)) await unlink(p);
}

// ─── SERIES ──────────────────────────────────────────────────────────────────

export async function createSeries(universeId: string, name: string, description = ""): Promise<UniverseSeries> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const series: UniverseSeries = {
    id, universe_id: universeId, name, description,
    created_at: now, updated_at: now,
    book_ids: [], series_notes: "", promoted_note_ids: [],
  };
  await writeFile(path.join(SERIES_DIR, `${id}.json`), JSON.stringify(series, null, 2));

  // Register series in universe
  const universe = await getUniverse(universeId);
  if (universe) {
    universe.series_ids.push(id);
    await saveUniverse(universe);
  }
  return series;
}

export async function getSeries(id: string): Promise<UniverseSeries | null> {
  const p = path.join(SERIES_DIR, `${vid(id)}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(await readFile(p, "utf-8")) as UniverseSeries;
}

export async function saveSeries(series: UniverseSeries): Promise<void> {
  series.updated_at = new Date().toISOString();
  await writeFile(path.join(SERIES_DIR, `${vid(series.id)}.json`), JSON.stringify(series, null, 2));
}

export async function getSeriesForUniverse(universeId: string): Promise<UniverseSeries[]> {
  const universe = await getUniverse(universeId);
  if (!universe) return [];
  const results: UniverseSeries[] = [];
  for (const sid of universe.series_ids) {
    const s = await getSeries(sid);
    if (s) results.push(s);
  }
  return results;
}

export async function deleteSeries(id: string): Promise<void> {
  const series = await getSeries(id);
  if (!series) return;
  // Remove from universe
  const universe = await getUniverse(series.universe_id);
  if (universe) {
    universe.series_ids = universe.series_ids.filter(s => s !== id);
    await saveUniverse(universe);
  }
  await unlink(path.join(SERIES_DIR, `${id}.json`));
}

// ─── MENAGERIE ───────────────────────────────────────────────────────────────

export async function getMenagerie(universeId: string): Promise<UniverseMenagerie> {
  const p = path.join(MENAGERIES_DIR, `${vid(universeId)}.json`);
  if (!existsSync(p)) {
    return { universe_id: universeId, updated_at: new Date().toISOString(), characters: [] };
  }
  return JSON.parse(await readFile(p, "utf-8")) as UniverseMenagerie;
}

export async function saveMenagerie(menagerie: UniverseMenagerie): Promise<void> {
  menagerie.updated_at = new Date().toISOString();
  await writeFile(path.join(MENAGERIES_DIR, `${vid(menagerie.universe_id)}.json`), JSON.stringify(menagerie, null, 2));
}

export function findCharacterInMenagerie(menagerie: UniverseMenagerie, name: string): MenagerieCharacter | null {
  const normalized = name.toLowerCase().trim();
  return menagerie.characters.find(c =>
    c.name.toLowerCase() === normalized ||
    c.aliases.some(a => a.toLowerCase() === normalized)
  ) ?? null;
}

// ─── PUSH SESSIONS ───────────────────────────────────────────────────────────

export async function createPushSession(
  universeId: string,
  seriesId: string | null,
  bookId: string,
  bookTitle: string
): Promise<PushSession> {
  const id = randomUUID();
  const session: PushSession = {
    push_session_id: id,
    universe_id: universeId,
    series_id: seriesId,
    book_id: bookId,
    book_title: bookTitle,
    created_at: new Date().toISOString(),
    phase: "generating",
    book_summary: "",
    extracted_characters: [],
    extracted_world_facts: [],
    detected_conflicts: [],
    extracted_world_state_updates: {},
    review_items: [],
  };
  await writePushSession(session);
  return session;
}

export async function getPushSession(id: string): Promise<PushSession | null> {
  const p = path.join(PUSH_SESSIONS_DIR, `${vid(id)}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(await readFile(p, "utf-8")) as PushSession;
}

export async function writePushSession(session: PushSession): Promise<void> {
  await writeFile(path.join(PUSH_SESSIONS_DIR, `${vid(session.push_session_id)}.json`), JSON.stringify(session, null, 2));
}

export async function listPushSessionsForBook(bookId: string): Promise<Array<{ id: string; created_at: string; phase: string; book_title: string }>> {
  if (!existsSync(PUSH_SESSIONS_DIR)) return [];
  const files = await readdir(PUSH_SESSIONS_DIR);
  const results = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const s = JSON.parse(await readFile(path.join(PUSH_SESSIONS_DIR, f), "utf-8")) as PushSession;
      if (s.book_id === bookId) {
        results.push({ id: s.push_session_id, created_at: s.created_at, phase: s.phase, book_title: s.book_title });
      }
    } catch { continue; }
  }
  return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ─── EFFECTIVE BIBLE ─────────────────────────────────────────────────────────
// Combines universe bible with promoted series notes for writing pipeline seeding

export async function getEffectiveBible(universeId: string, seriesId: string | null): Promise<string> {
  const universe = await getUniverse(universeId);
  if (!universe) return "";

  let bible = universe.bible;

  if (seriesId) {
    const series = await getSeries(seriesId);
    if (series?.series_notes?.trim()) {
      bible += `\n\n---\n## Series-Specific Notes (${series.name})\n\n${series.series_notes}`;
    }
  }

  return bible;
}

// ─── CONTEXT FOR PIPELINE 1 ──────────────────────────────────────────────────
// Assembles bible + previous summaries + menagerie for dossier seeding

export async function assembleUniverseContext(
  universeId: string,
  seriesId: string | null,
  excludeBookId?: string // exclude the current book being written
): Promise<{
  bible: string;
  previousSummaries: string;
  menagerieSnapshot: string;
  worldState: string;
}> {
  const [universe, menagerie, series] = await Promise.all([
    getUniverse(universeId),
    getMenagerie(universeId),
    seriesId ? getSeries(seriesId) : Promise.resolve(null),
  ]);

  if (!universe) return { bible: "", previousSummaries: "", menagerieSnapshot: "", worldState: "" };

  // Effective bible
  const bible = await getEffectiveBible(universeId, seriesId);

  // Previous book summaries from this series (in order)
  let previousSummaries = "";
  if (series) {
    const prevBookIds = series.book_ids.filter(id => id !== excludeBookId);
    if (prevBookIds.length > 0) {
      // We need to fetch summaries — these are stored on the BookProject
      // The caller (universeRoutes.ts) will inject them since we don't import storage here
      previousSummaries = `[${prevBookIds.length} previous books in series — summaries injected by caller]`;
    }
  }

  // Menagerie snapshot (living characters + key dead)
  const living = menagerie.characters.filter(c => c.current_status === "alive" || c.current_status === "unknown");
  const dead = menagerie.characters.filter(c => c.current_status === "dead");
  const lines: string[] = [];
  if (living.length > 0) {
    lines.push("## Known Living Characters");
    for (const c of living) {
      lines.push(`### ${c.name}${c.aliases.length ? ` (also: ${c.aliases.join(", ")})` : ""}`);
      lines.push(c.accumulated_notes);
    }
  }
  if (dead.length > 0) {
    lines.push("## Confirmed Dead");
    for (const c of dead) {
      const entry = c.status_history.find(h => h.status === "dead");
      lines.push(`- **${c.name}**: ${entry?.note ?? "deceased"}`);
    }
  }
  const menagerieSnapshot = lines.join("\n");

  // World state
  const ws = universe.world_state;
  const wsLines: string[] = [];
  if (ws) {
    if (ws.active_threats.length) wsLines.push("**Active Threats:** " + ws.active_threats.join("; "));
    if (ws.open_threads.length) wsLines.push("**Open Threads:** " + ws.open_threads.join("; "));
    if (ws.knowledge_revelations.length) wsLines.push("**Known to World:** " + ws.knowledge_revelations.join("; "));
    if (ws.political_and_alliance_changes.length) wsLines.push("**Political State:** " + ws.political_and_alliance_changes.join("; "));
    if (ws.freeform_notes) wsLines.push(ws.freeform_notes);
  }
  const worldState = wsLines.join("\n");

  return { bible, previousSummaries, menagerieSnapshot, worldState };
}
