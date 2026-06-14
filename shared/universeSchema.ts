/**
 * universeSchema.ts
 *
 * Shared TypeScript interfaces for the Universe layer.
 * Universe → Series → Book hierarchy.
 */

// ─── CHARACTER MENAGERIE ────────────────────────────────────────────────────

export type CharacterStatus = "alive" | "dead" | "missing" | "retired" | "unknown";

export interface CharacterStatusEntry {
  book_id: string;
  book_title: string;
  status: CharacterStatus;
  note: string;             // how/why status changed, e.g. "killed by Lord Ilion in Ch. 22"
}

export interface CharacterAppearance {
  book_id: string;
  book_title: string;
  series_id: string | null;
  chapter_numbers: number[];
  role_in_book: string;     // protagonist / antagonist / supporting / minor
}

export interface MenagerieCharacter {
  id: string;
  name: string;
  aliases: string[];
  current_status: CharacterStatus;
  status_history: CharacterStatusEntry[];
  appearances: CharacterAppearance[];
  first_appeared_book_id: string;
  first_appeared_book_title: string;
  accumulated_notes: string;    // updated on each push — description, traits, relationships
  last_updated_by_book_id: string;
  last_updated_at: string;
}

// ─── WORLD STATE SNAPSHOT ───────────────────────────────────────────────────

export interface WorldStateSnapshot {
  last_updated_book_id: string;
  last_updated_book_title: string;
  last_updated_at: string;
  active_threats: string[];             // ongoing dangers as of end of last pushed book
  destroyed_or_changed_locations: string[];
  political_and_alliance_changes: string[];
  knowledge_revelations: string[];      // things now known to characters / world
  open_threads: string[];               // unresolved plot threads spanning books
  dead_characters: string[];            // quick-reference list (duplicates menagerie, for writing context)
  freeform_notes: string;               // anything that doesn't fit above categories
}

// ─── PUSH SYSTEM ────────────────────────────────────────────────────────────

export type PushItemType =
  | "book_summary"
  | "new_character"
  | "character_update"
  | "character_status_change"
  | "bible_conflict"
  | "world_building_addition"
  | "world_state_update"
  | "series_exception";

export type PushResolution =
  | "accepted"           // applied as-is
  | "rejected"           // ignored
  | "accepted_as_series_exception"  // stored in series notes, NOT in universe bible
  | "applied_to_bible";  // conflict resolved by updating the bible

export interface PushReviewItem {
  id: string;            // uuid for tracking resolution
  type: PushItemType;
  title: string;         // short label for the UI
  description: string;   // full explanation of what changed / what the conflict is
  current_value: string; // what's in the bible/menagerie/world-state NOW
  proposed_value: string;// what the book says
  character_name?: string;
  conflict_severity?: "critical" | "significant" | "minor";
  resolution: PushResolution | null;  // null = pending
  resolution_note?: string;  // author's comment on their choice
}

export interface PushRecord {
  push_id: string;
  pushed_at: string;
  book_id: string;
  book_title: string;
  book_summary_generated: boolean;
  review_items_total: number;
  review_items_accepted: number;
  review_items_rejected: number;
  review_items_pending: number;
  new_characters_added: number;
  characters_updated: number;
  conflicts_found: number;
  conflicts_resolved: number;
  series_exceptions_added: number;
}

// ─── SERIES ─────────────────────────────────────────────────────────────────

export interface UniverseSeries {
  id: string;
  universe_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  book_ids: string[];       // ordered — position in array = reading order
  series_notes: string;     // series-specific exceptions / additions to universe bible
  promoted_note_ids: string[]; // which series_notes sections have been promoted to universe bible
}

// ─── UNIVERSE ────────────────────────────────────────────────────────────────

export interface Universe {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  bible: string;                        // authoritative story bible (markdown)
  world_state: WorldStateSnapshot | null;
  series_ids: string[];
  standalone_book_ids: string[];        // books assigned to universe but no series
  push_history: PushRecord[];
}

// ─── MENAGERIE (stored separately from universe for size reasons) ────────────

export interface UniverseMenagerie {
  universe_id: string;
  updated_at: string;
  characters: MenagerieCharacter[];
}

// ─── PUSH SESSION (in-progress push, stored until author completes review) ──

export interface PushSession {
  push_session_id: string;
  universe_id: string;
  series_id: string | null;
  book_id: string;
  book_title: string;
  created_at: string;
  phase: "generating" | "review" | "applying" | "complete" | "error";
  error?: string;
  // Generated content
  book_summary: string;
  extracted_characters: ExtractedCharacter[];
  extracted_world_facts: string[];
  detected_conflicts: DetectedConflict[];
  extracted_world_state_updates: Partial<WorldStateSnapshot>;
  // Review items derived from above
  review_items: PushReviewItem[];
}

export interface ExtractedCharacter {
  name: string;
  aliases: string[];
  role: string;
  status: CharacterStatus;
  notes: string;
  chapter_numbers: number[];
  is_new: boolean;           // not yet in menagerie
  existing_id?: string;      // menagerie character id if updating
}

export interface DetectedConflict {
  id: string;
  description: string;       // what the conflict is
  bible_text: string;        // what the bible says
  book_text: string;         // what the book says
  severity: "critical" | "significant" | "minor";
  location: string;          // "Chapter 7" or "character: Marcus"
}
