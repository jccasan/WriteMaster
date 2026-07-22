import { readFile, writeFile, readdir, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { prisma } from "./forge/db";

/**
 * Library snapshot — carries the user's library into deployments.
 *
 * User data lives in the SQLite Doc store (books, dossier projects, chapter
 * sessions, pipeline states) and in per-feature JSON folders under data/
 * (universes, series, romance projects, etc.). None of that ships with a
 * fresh deployment container.
 *
 * `exportLibrarySnapshot()` writes everything into one committable file:
 * data/library-snapshot.json. On boot, `importLibrarySnapshotIfEmpty()`
 * restores it into an empty database — so taking a snapshot before
 * deploying makes the deployed app open with your library intact.
 */

const SNAPSHOT_PATH = path.resolve("data/library-snapshot.json");

// User-data folders of JSON/text documents (uploads and seed content excluded)
const FILE_DIRS = [
  "data/universes",
  "data/series",
  "data/menageries",
  "data/push-sessions",
  "data/romance-projects",
  "data/outline-sessions",
  "data/expand-sessions",
  "data/chapter-drafts",
  "data/style-guides",
];

const TEXT_EXTENSIONS = [".json", ".md", ".txt"];

interface LibrarySnapshot {
  version: 1;
  taken_at: string;
  docs: Array<{ collection: string; id: string; data: string }>;
  files: Record<string, string>; // repo-relative path -> content
}

export async function exportLibrarySnapshot(): Promise<{ taken_at: string; docCount: number; fileCount: number }> {
  const docs = await prisma.doc.findMany({
    select: { collection: true, id: true, data: true },
  });

  const files: Record<string, string> = {};
  for (const dir of FILE_DIRS) {
    const abs = path.resolve(dir);
    if (!existsSync(abs)) continue;
    for (const name of await readdir(abs)) {
      if (!TEXT_EXTENSIONS.some((ext) => name.endsWith(ext))) continue;
      try {
        files[`${dir}/${name}`] = await readFile(path.join(abs, name), "utf-8");
      } catch {
        continue;
      }
    }
  }

  const snapshot: LibrarySnapshot = {
    version: 1,
    taken_at: new Date().toISOString(),
    docs,
    files,
  };
  await writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot));
  return { taken_at: snapshot.taken_at, docCount: docs.length, fileCount: Object.keys(files).length };
}

export async function getSnapshotStatus(): Promise<{ exists: boolean; taken_at?: string; docCount?: number; fileCount?: number }> {
  if (!existsSync(SNAPSHOT_PATH)) return { exists: false };
  try {
    const snap = JSON.parse(await readFile(SNAPSHOT_PATH, "utf-8")) as LibrarySnapshot;
    return {
      exists: true,
      taken_at: snap.taken_at,
      docCount: snap.docs?.length ?? 0,
      fileCount: Object.keys(snap.files ?? {}).length,
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Restore the snapshot into a fresh environment. Runs at boot; does nothing
 * unless the database's Doc store is completely empty (i.e. a new container).
 * Files are only written where none exist, so it never clobbers live data.
 */
export async function importLibrarySnapshotIfEmpty(): Promise<void> {
  if (!existsSync(SNAPSHOT_PATH)) return;
  try {
    const existing = await prisma.doc.count();
    if (existing > 0) return;

    const snap = JSON.parse(await readFile(SNAPSHOT_PATH, "utf-8")) as LibrarySnapshot;
    if (!snap.docs?.length && !Object.keys(snap.files ?? {}).length) return;

    for (const doc of snap.docs ?? []) {
      await prisma.doc.upsert({
        where: { collection_id: { collection: doc.collection, id: doc.id } },
        create: doc,
        update: {},
      });
    }

    let filesWritten = 0;
    for (const [rel, content] of Object.entries(snap.files ?? {})) {
      // Only restore into the known user-data folders — ignore anything else
      if (!FILE_DIRS.some((dir) => rel.startsWith(dir + "/")) || rel.includes("..")) continue;
      const abs = path.resolve(rel);
      if (existsSync(abs)) continue;
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, content);
      filesWritten++;
    }

    console.log(
      `[library] Restored snapshot from ${snap.taken_at}: ${snap.docs?.length ?? 0} docs, ${filesWritten} files`
    );
  } catch (err) {
    console.error("[library] Snapshot restore failed:", err);
  }
}
