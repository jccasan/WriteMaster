import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { prisma } from "./forge/db";

/**
 * Generic JSON document store on SQLite (Prisma `Doc` model).
 *
 * Replaces the per-collection folders of JSON files under data/. Documents
 * are stored as (collection, id, json) rows — the same access pattern the
 * file storage had, but transactional, queryable, and in one database with
 * the Forge data.
 */

export async function docGet<T>(collection: string, id: string): Promise<T | null> {
  const row = await prisma.doc.findUnique({
    where: { collection_id: { collection, id } },
  });
  return row ? (JSON.parse(row.data) as T) : null;
}

export async function docPut(collection: string, id: string, value: unknown): Promise<void> {
  const data = JSON.stringify(value);
  await prisma.doc.upsert({
    where: { collection_id: { collection, id } },
    create: { collection, id, data },
    update: { data },
  });
}

export async function docDelete(collection: string, id: string): Promise<boolean> {
  try {
    await prisma.doc.delete({ where: { collection_id: { collection, id } } });
    return true;
  } catch {
    return false;
  }
}

export async function docList<T>(collection: string): Promise<T[]> {
  const rows = await prisma.doc.findMany({ where: { collection } });
  const out: T[] = [];
  for (const row of rows) {
    try {
      out.push(JSON.parse(row.data) as T);
    } catch {
      continue;
    }
  }
  return out;
}

/**
 * One-time import of a legacy data/<dir> folder of `<id>.json` files into a
 * collection. Runs only when the collection is empty; existing files on disk
 * are left untouched as a backup.
 */
export async function importLegacyDir(collection: string, dir: string): Promise<void> {
  const count = await prisma.doc.count({ where: { collection } });
  if (count > 0) return;
  const abs = path.resolve(dir);
  if (!existsSync(abs)) return;

  let imported = 0;
  for (const file of await readdir(abs)) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(path.join(abs, file), "utf-8");
      JSON.parse(raw); // validate before storing
      const id = file.replace(/\.json$/, "");
      await prisma.doc.upsert({
        where: { collection_id: { collection, id } },
        create: { collection, id, data: raw },
        update: {},
      });
      imported++;
    } catch {
      continue;
    }
  }
  if (imported > 0) {
    console.log(`[docStore] Imported ${imported} legacy file(s) into '${collection}'`);
  }
}
