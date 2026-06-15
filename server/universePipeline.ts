/**
 * universePipeline.ts
 *
 * The Push Pipeline — runs when an author finalizes a book and pushes it to its universe.
 *
 * Phase 1: GENERATE (runs automatically)
 *   1a. Book Summary — generated from chapter summaries
 *   1b. Character Extraction — pulls all named characters + appearances from summaries
 *   1c. World-Building Extraction — pulls new facts not yet in the bible
 *   1d. Conflict Detection — flags where the book contradicts the effective bible
 *   1e. World State Updates — identifies what changed in the world by book's end
 *
 * Phase 2: REVIEW (human-driven)
 *   Author reviews generated review items and resolves each one.
 *
 * Phase 3: APPLY (runs automatically after review)
 *   Applies accepted items to universe, menagerie, world state.
 */

import { callLLM } from "./llm";
import { randomUUID } from "crypto";
import {
  getMenagerie,
  saveMenagerie,
  getUniverse,
  saveUniverse,
  getSeries,
  saveSeries,
  findCharacterInMenagerie,
  writePushSession,
} from "./universeStorage";
import type {
  PushSession,
  PushReviewItem,
  ExtractedCharacter,
  DetectedConflict,
  MenagerieCharacter,
  CharacterStatus,
  WorldStateSnapshot,
  PushRecord,
} from "../shared/universeSchema";

// ─── PHASE 1: GENERATE ───────────────────────────────────────────────────────

/**
 * Generates all review items from chapter summaries + effective bible.
 * Takes a PushSession (already created) and populates it.
 */
export async function runPushGeneration(
  session: PushSession,
  chapterSummaries: string,  // concatenated chapter summaries from the book
  effectiveBible: string,    // universe bible + any series notes
  previousBookSummaries: string // summaries of prior books in series
): Promise<PushSession> {

  session.phase = "generating";
  await writePushSession(session);

  // 1a: Book Summary
  const bookSummary = await generateBookSummary(
    session.book_title,
    chapterSummaries,
    previousBookSummaries
  );
  session.book_summary = bookSummary;

  // 1b: Character Extraction
  const characters = await extractCharacters(chapterSummaries, session.book_title);
  session.extracted_characters = characters;

  // 1c: World-Building Extraction
  const worldFacts = await extractWorldBuildingFacts(chapterSummaries, effectiveBible, session.book_title);
  session.extracted_world_facts = worldFacts;

  // 1d: Conflict Detection
  const conflicts = await detectConflicts(chapterSummaries, effectiveBible, session.book_title);
  session.detected_conflicts = conflicts;

  // 1e: World State Updates
  const worldStateUpdates = await extractWorldStateUpdates(chapterSummaries, session.book_title);
  session.extracted_world_state_updates = worldStateUpdates;

  // Build review items
  session.review_items = buildReviewItems(session);
  session.phase = "review";
  await writePushSession(session);

  return session;
}

// ─── 1a: BOOK SUMMARY ────────────────────────────────────────────────────────

async function generateBookSummary(
  bookTitle: string,
  chapterSummaries: string,
  previousBookSummaries: string
): Promise<string> {
  return callLLM(
    `You are a series editor creating a canonical Book Summary for "${bookTitle}".
This summary will be used as reference context when writing subsequent books in the series.
It must capture everything a writer needs to know about this book's events, without re-reading it.

${previousBookSummaries ? `PREVIOUS BOOKS IN SERIES:\n${previousBookSummaries}\n\n` : ""}

CHAPTER SUMMARIES (source material):
${chapterSummaries}

Generate a structured Book Summary with these exact sections:

## Book Summary: ${bookTitle}

### The Core Story (2-3 paragraphs)
What this book is about at its core — the central conflict, the protagonist's arc from start to finish, and the central theme that plays out. Written as narrative, not a list.

### Major Plot Events (in order)
A numbered list of the most important things that happen. Include only events that: affect major characters' fates, change the world state, reveal significant information, or set up threads that carry into future books. Skip routine scene beats.

### Resolutions
What is resolved by the end of this book. Which questions raised are answered. Which conflicts ended. Be specific — "the identity of the traitor is revealed to be X" not "the mystery is solved."

### Open Threads
What is deliberately left unresolved. Questions raised that point toward future books. Character situations that are ongoing. Threats that weren't defeated. These are critical for series continuity.

### Character Fates at Book End
For every named character who had a meaningful arc in this book: where they are, what they know, what their status is (alive/dead/injured/changed), and what their emotional/relational state is as the book closes.

### World State Changes
What is different about the world at the end of this book vs. the beginning. Political changes, destroyed locations, shifted alliances, newly revealed information about the world's workings.

### Setup for Next Book
What this book planted that is clearly being seeded for future use. Introduced characters who didn't fully pay off. Mysteries gestured at but not resolved. The state of the protagonist as they enter whatever comes next.`,
    "powerful",
    undefined,
    6144
  );
}

// ─── 1b: CHARACTER EXTRACTION ─────────────────────────────────────────────────

async function extractCharacters(
  chapterSummaries: string,
  bookTitle: string
): Promise<ExtractedCharacter[]> {
  const raw = await callLLM(
    `You are a character database editor. Extract every named character from the text of "${bookTitle}".

SOURCE TEXT:
${chapterSummaries}

For every named character (major, supporting, and minor), output a JSON array with this exact structure.
Respond with ONLY the JSON array — no preamble, no explanation, no markdown fences.

[
  {
    "name": "Full name as most commonly used",
    "aliases": ["any other names they go by"],
    "role": "protagonist | antagonist | supporting | minor",
    "status": "alive | dead | missing | retired | unknown",
    "notes": "2-4 sentences: who this person is, their key traits, their role in the story, their fate by book end. Be specific.",
    "chapter_numbers": []
  }
]

Rules:
- Include EVERY named character, even if they appear only once
- status should reflect their state at the END of this text
- If a character dies, status = "dead"
- Do not invent characters not present in the text
- aliases should include any titles, epithets, or pseudonyms used`,
    "powerful"
  );

  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return parsed.map((c: any) => ({
      name: c.name ?? "Unknown",
      aliases: Array.isArray(c.aliases) ? c.aliases : [],
      role: c.role ?? "minor",
      status: (c.status ?? "unknown") as CharacterStatus,
      notes: c.notes ?? "",
      chapter_numbers: Array.isArray(c.chapter_numbers) ? c.chapter_numbers : [],
      is_new: true,
    }));
  } catch {
    console.error("[UniversePipeline] Failed to parse character extraction JSON");
    return [];
  }
}

// Public wrapper — used by the menagerie upload route
export async function extractCharactersFromText(
  text: string,
  sourceLabel: string
): Promise<ExtractedCharacter[]> {
  return extractCharacters(text, sourceLabel);
}

// ─── 1c: WORLD-BUILDING EXTRACTION ───────────────────────────────────────────

async function extractWorldBuildingFacts(
  chapterSummaries: string,
  effectiveBible: string,
  bookTitle: string
): Promise<string[]> {
  const raw = await callLLM(
    `You are a world-building editor. Identify world-building facts established in "${bookTitle}" that are NOT already in the story bible.

CURRENT STORY BIBLE:
${effectiveBible}

CHAPTER SUMMARIES:
${chapterSummaries}

Extract only facts that:
- Are new information about the world's rules, geography, magic/technology, social structures, history, or politics
- Are NOT already covered in the current story bible
- Were definitively established in the story (not speculated or mentioned in passing)
- Would be useful for a writer working on a future book in this universe

Respond with ONLY a JSON array of strings. Each string is one self-contained world-building fact.
No preamble, no explanation, no markdown fences.

Example format:
["The Veil cannot be crossed by those who have taken the Oath of Binding.", "Arch City's lower spans are ungoverned by the Heights Watch.", "Node charges decay after 72 hours outside a living host."]

If there are no new world-building facts, return an empty array: []`,
    "powerful"
  );

  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return [];
  }
}

// ─── 1d: CONFLICT DETECTION ───────────────────────────────────────────────────

async function detectConflicts(
  chapterSummaries: string,
  effectiveBible: string,
  bookTitle: string
): Promise<DetectedConflict[]> {
  if (!effectiveBible.trim()) return []; // No bible to conflict with

  const raw = await callLLM(
    `You are a continuity editor. Identify contradictions between "${bookTitle}" and the story bible.

STORY BIBLE (the authority):
${effectiveBible}

CHAPTER SUMMARIES:
${chapterSummaries}

Find every place where the book contradicts or is inconsistent with the story bible.
This includes: factual contradictions, rule violations, character attribute conflicts, geography errors, timeline impossibilities, and lore contradictions.

Respond with ONLY a JSON array. Each object represents one conflict.
No preamble, no markdown fences.

[
  {
    "id": "unique string id, e.g. conflict_1",
    "description": "Clear description of the contradiction in one sentence",
    "bible_text": "Exact or paraphrased text from the bible that establishes the rule/fact",
    "book_text": "What the chapter summaries say that contradicts this",
    "severity": "critical | significant | minor",
    "location": "Where in the book this occurs, e.g. 'Chapter 14' or 'character: Borin'"
  }
]

Severity guide:
- critical: directly contradicts a core world rule or major established fact
- significant: contradicts a supporting detail that affects story coherence
- minor: small inconsistency that is technically wrong but doesn't break the story

If no conflicts are found, return: []`,
    "powerful"
  );

  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return [];
  }
}

// ─── 1e: WORLD STATE UPDATES ─────────────────────────────────────────────────

async function extractWorldStateUpdates(
  chapterSummaries: string,
  bookTitle: string
): Promise<Partial<WorldStateSnapshot>> {
  const raw = await callLLM(
    `You are a world state editor. Extract the state of the world at the END of "${bookTitle}".

CHAPTER SUMMARIES:
${chapterSummaries}

Respond with ONLY a JSON object. No preamble, no markdown fences.

{
  "active_threats": ["list of ongoing dangers still unresolved at book end"],
  "destroyed_or_changed_locations": ["locations significantly changed or destroyed in this book"],
  "political_and_alliance_changes": ["political shifts, new alliances, broken alliances, power changes"],
  "knowledge_revelations": ["things now publicly known or known to major characters that weren't before"],
  "open_threads": ["unresolved plot threads that carry into future books"],
  "dead_characters": ["list of character names confirmed dead by book end"],
  "freeform_notes": "any world state information that doesn't fit the above categories"
}

Rules:
- Only include items that are TRUE at the END of the book
- If something was destroyed but rebuilt, don't include it
- Be specific — "The Heights Watch is now controlled by Lord Ilion's faction" not "political change"
- open_threads should be things explicitly set up for future books, not every loose end
- dead_characters should only include confirmed deaths, not presumed or ambiguous`,
    "powerful"
  );

  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return {};
  }
}

// ─── BUILD REVIEW ITEMS ──────────────────────────────────────────────────────

export function buildReviewItemsExport(session: PushSession): PushReviewItem[] {
  return buildReviewItems(session);
}

function buildReviewItems(session: PushSession): PushReviewItem[] {
  const items: PushReviewItem[] = [];

  // Book summary
  items.push({
    id: randomUUID(),
    type: "book_summary",
    title: `Book Summary: ${session.book_title}`,
    description: "AI-generated summary of this book from its chapter summaries. Will be stored as the canonical book record.",
    current_value: "(no summary exists yet)",
    proposed_value: session.book_summary,
    resolution: null,
  });

  // Conflicts first (most critical)
  for (const conflict of session.detected_conflicts) {
    items.push({
      id: conflict.id,
      type: "bible_conflict",
      title: `Conflict: ${conflict.description.substring(0, 60)}...`,
      description: conflict.description,
      current_value: `BIBLE SAYS: ${conflict.bible_text}`,
      proposed_value: `BOOK SAYS: ${conflict.book_text}\nLocation: ${conflict.location}`,
      conflict_severity: conflict.severity,
      resolution: null,
    });
  }

  // New world-building facts
  for (const fact of session.extracted_world_facts) {
    items.push({
      id: randomUUID(),
      type: "world_building_addition",
      title: "New World-Building Fact",
      description: "A world-building fact established in this book not yet in the bible.",
      current_value: "(not in bible)",
      proposed_value: fact,
      resolution: null,
    });
  }

  // World state updates
  const ws = session.extracted_world_state_updates;
  if (ws && Object.keys(ws).some(k => {
    const v = (ws as any)[k];
    return Array.isArray(v) ? v.length > 0 : !!v;
  })) {
    items.push({
      id: randomUUID(),
      type: "world_state_update",
      title: "World State Update",
      description: "Changes to the world state detected at the end of this book.",
      current_value: "(current world state — will be merged)",
      proposed_value: JSON.stringify(ws, null, 2),
      resolution: null,
    });
  }

  // Characters
  for (const char of session.extracted_characters) {
    if (char.is_new) {
      items.push({
        id: randomUUID(),
        type: "new_character",
        title: `New Character: ${char.name}`,
        description: `${char.name} appears in this book and is not yet in the menagerie.`,
        current_value: "(not in menagerie)",
        proposed_value: `Role: ${char.role}\nStatus: ${char.status}\nChapters: ${char.chapter_numbers.join(", ")}\n\n${char.notes}`,
        character_name: char.name,
        resolution: null,
      });
    } else {
      items.push({
        id: randomUUID(),
        type: "character_update",
        title: `Update Character: ${char.name}`,
        description: `New information about ${char.name} from this book.`,
        current_value: "(existing menagerie entry)",
        proposed_value: `Updated notes from this book:\n${char.notes}\nStatus: ${char.status}\nAppears in chapters: ${char.chapter_numbers.join(", ")}`,
        character_name: char.name,
        resolution: null,
      });
    }

    // Flag status changes separately
    if (char.status === "dead" || char.status === "missing" || char.status === "retired") {
      items.push({
        id: randomUUID(),
        type: "character_status_change",
        title: `Status Change: ${char.name} → ${char.status.toUpperCase()}`,
        description: `${char.name}'s status changed to ${char.status} in this book.`,
        current_value: "alive (or previous status)",
        proposed_value: `${char.status}`,
        character_name: char.name,
        resolution: null,
      });
    }
  }

  return items;
}

// ─── PHASE 3: APPLY ──────────────────────────────────────────────────────────

export async function applyPushSession(session: PushSession): Promise<PushRecord> {
  session.phase = "applying";
  await writePushSession(session);

  const [universe, menagerie, series] = await Promise.all([
    getUniverse(session.universe_id),
    getMenagerie(session.universe_id),
    session.series_id ? getSeries(session.series_id) : Promise.resolve(null),
  ]);

  if (!universe) throw new Error("Universe not found");

  let newChars = 0, updatedChars = 0, conflictsResolved = 0, seriesExceptions = 0;
  const bibleAdditions: string[] = [];

  for (const item of session.review_items) {
    if (!item.resolution || item.resolution === "rejected") continue;

    switch (item.type) {
      case "book_summary":
        // Book summary is stored on the BookProject by the route handler
        break;

      case "bible_conflict": {
        conflictsResolved++;
        if (item.resolution === "applied_to_bible") {
          universe.bible += `\n\n### Correction (from ${session.book_title})\n${item.proposed_value}`;
        } else if (item.resolution === "accepted_as_series_exception" && series) {
          series.series_notes += `\n\n### Series Exception (from ${session.book_title})\n${item.proposed_value}`;
          seriesExceptions++;
        }
        break;
      }

      case "world_building_addition": {
        if (item.resolution === "applied_to_bible") {
          bibleAdditions.push(item.proposed_value);
        } else if (item.resolution === "accepted_as_series_exception" && series) {
          series.series_notes += `\n- ${item.proposed_value}`;
          seriesExceptions++;
        }
        break;
      }

      case "world_state_update": {
        try {
          const updates = JSON.parse(item.proposed_value) as Partial<WorldStateSnapshot>;
          const existing = universe.world_state ?? {
            last_updated_book_id: session.book_id,
            last_updated_book_title: session.book_title,
            last_updated_at: new Date().toISOString(),
            active_threats: [],
            destroyed_or_changed_locations: [],
            political_and_alliance_changes: [],
            knowledge_revelations: [],
            open_threads: [],
            dead_characters: [],
            freeform_notes: "",
          };
          // Merge arrays (deduplicate), replace freeform
          universe.world_state = {
            ...existing,
            last_updated_book_id: session.book_id,
            last_updated_book_title: session.book_title,
            last_updated_at: new Date().toISOString(),
            active_threats: dedupe([...existing.active_threats, ...(updates.active_threats ?? [])]),
            destroyed_or_changed_locations: dedupe([...existing.destroyed_or_changed_locations, ...(updates.destroyed_or_changed_locations ?? [])]),
            political_and_alliance_changes: dedupe([...existing.political_and_alliance_changes, ...(updates.political_and_alliance_changes ?? [])]),
            knowledge_revelations: dedupe([...existing.knowledge_revelations, ...(updates.knowledge_revelations ?? [])]),
            open_threads: updates.open_threads ?? existing.open_threads,
            dead_characters: dedupe([...existing.dead_characters, ...(updates.dead_characters ?? [])]),
            freeform_notes: updates.freeform_notes
              ? existing.freeform_notes + "\n\n" + updates.freeform_notes
              : existing.freeform_notes,
          };
        } catch {}
        break;
      }

      case "new_character": {
        const extracted = session.extracted_characters.find(c => c.name === item.character_name);
        if (!extracted) break;
        const now = new Date().toISOString();
        const newChar: MenagerieCharacter = {
          id: randomUUID(),
          name: extracted.name,
          aliases: extracted.aliases,
          current_status: extracted.status,
          status_history: [{
            book_id: session.book_id,
            book_title: session.book_title,
            status: extracted.status,
            note: `First appearance. Status at book end: ${extracted.status}.`,
          }],
          appearances: [{
            book_id: session.book_id,
            book_title: session.book_title,
            series_id: session.series_id,
            chapter_numbers: extracted.chapter_numbers,
            role_in_book: extracted.role,
          }],
          first_appeared_book_id: session.book_id,
          first_appeared_book_title: session.book_title,
          accumulated_notes: extracted.notes,
          last_updated_by_book_id: session.book_id,
          last_updated_at: now,
        };
        menagerie.characters.push(newChar);
        newChars++;
        break;
      }

      case "character_update": {
        const extracted = session.extracted_characters.find(c => c.name === item.character_name);
        if (!extracted) break;
        let existing = findCharacterInMenagerie(menagerie, extracted.name);
        if (!existing) break;
        existing.accumulated_notes += `\n\n[${session.book_title}]\n${extracted.notes}`;
        existing.appearances.push({
          book_id: session.book_id,
          book_title: session.book_title,
          series_id: session.series_id,
          chapter_numbers: extracted.chapter_numbers,
          role_in_book: extracted.role,
        });
        existing.last_updated_by_book_id = session.book_id;
        existing.last_updated_at = new Date().toISOString();
        updatedChars++;
        break;
      }

      case "character_status_change": {
        const char = findCharacterInMenagerie(menagerie, item.character_name ?? "");
        if (!char) break;
        const newStatus = item.proposed_value as CharacterStatus;
        char.current_status = newStatus;
        char.status_history.push({
          book_id: session.book_id,
          book_title: session.book_title,
          status: newStatus,
          note: item.resolution_note ?? `Status changed in ${session.book_title}.`,
        });
        break;
      }
    }
  }

  // Apply bible additions as a block
  if (bibleAdditions.length > 0) {
    universe.bible += `\n\n## World-Building Additions (from ${session.book_title})\n\n` +
      bibleAdditions.map(f => `- ${f}`).join("\n");
  }

  // Save everything
  await Promise.all([
    saveUniverse(universe),
    saveMenagerie(menagerie),
    series ? saveSeries(series) : Promise.resolve(),
  ]);

  const accepted = session.review_items.filter(i => i.resolution && i.resolution !== "rejected").length;
  const rejected = session.review_items.filter(i => i.resolution === "rejected").length;
  const pending = session.review_items.filter(i => !i.resolution).length;

  const record: PushRecord = {
    push_id: randomUUID(),
    pushed_at: new Date().toISOString(),
    book_id: session.book_id,
    book_title: session.book_title,
    book_summary_generated: !!session.book_summary,
    review_items_total: session.review_items.length,
    review_items_accepted: accepted,
    review_items_rejected: rejected,
    review_items_pending: pending,
    new_characters_added: newChars,
    characters_updated: updatedChars,
    conflicts_found: session.detected_conflicts.length,
    conflicts_resolved: conflictsResolved,
    series_exceptions_added: seriesExceptions,
  };

  universe.push_history.push(record);
  await saveUniverse(universe);

  session.phase = "complete";
  await writePushSession(session);

  return record;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.map(s => s.trim()).filter(Boolean))];
}

// ─── BIBLE COMPLIANCE CHECK (for Pipeline 3 pre-draft step) ─────────────────

export async function checkSceneBriefAgainstBible(
  sceneBrief: string,
  effectiveBible: string,
  chapterNum: number
): Promise<string> {
  if (!effectiveBible.trim()) {
    return "BIBLE COMPLIANCE: No bible on file — check skipped.";
  }

  return callLLM(
    `You are a continuity editor. Check the scene brief below against the story bible for any contradictions before this chapter is written.

STORY BIBLE:
${effectiveBible}

SCENE BRIEF FOR CHAPTER ${chapterNum}:
${sceneBrief}

Identify any place where the scene brief describes something that contradicts the story bible.
This includes: rule violations, factual contradictions, character attribute conflicts, world-building inconsistencies.

If contradictions are found, output:

BIBLE COMPLIANCE ISSUES:
[N]. ISSUE: [what the brief says]
    BIBLE SAYS: [what the bible establishes]
    RECOMMENDATION: [how to resolve without breaking the bible]

If no contradictions are found, output exactly:
BIBLE COMPLIANCE: CLEAR — scene brief is consistent with the story bible.`,
    "cheap"
  );
}
