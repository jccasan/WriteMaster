export type BeatType =
  | "opening_setup"
  | "inciting_incident"
  | "first_turn"
  | "midpoint"
  | "second_turn"
  | "climax"
  | "denouement";

export interface StructureBeatRecord {
  beatType: BeatType;
  chapterNumber?: number;
  confidence: number;
  notes: string;
}
