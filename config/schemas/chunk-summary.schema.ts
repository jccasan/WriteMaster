export interface ChunkSummary {
  chunkIndex: number;
  startChapter: number;
  endChapter: number;
  majorEvents: string[];
  characterChanges: { character: string; change: string }[];
  plotThreadUpdates: { thread: string; status: string; notes: string }[];
  continuityNotes: string[];
  worldRuleNotes: string[];
  unresolvedQuestions: string[];
  evidenceReferences: string[];
  uncertaintyFlags: string[];
}
