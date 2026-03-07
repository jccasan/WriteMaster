export interface OutlineMemoryEntry {
  chapterNumber: number;
  title: string;
  summary: string;
  majorEvents: string[];
  beatType?: string;
}

export interface CharacterMemoryEntry {
  name: string;
  aliases: string[];
  description: string;
  traits: string[];
  goals: string[];
  motives: string[];
  relationships: { character: string; type: string; notes: string }[];
  injuries: { description: string; chapter: number; resolved: boolean }[];
  voiceNotes: string[];
  continuityNotes: string[];
  lastSeenChapter: number;
}

export interface PlotThreadEntry {
  label: string;
  introducedInChapter: number;
  status: "active" | "resolved" | "dormant" | "abandoned";
  notes: string[];
  lastUpdatedChapter: number;
}

export interface WorldRuleEntry {
  rule: string;
  source: string;
  chapter: number;
}

export interface ContinuityEntry {
  type: string;
  description: string;
  chapter: number;
  status: "noted" | "verified" | "violated";
}

export interface IssueMemoryEntry {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  evidence: string[];
  suggestion: string;
  status: "introduced" | "active" | "resolved_later" | "reintroduced" | "uncertain" | "dismissed" | "merged";
  introducedAtChapter?: number;
  resolvedAtChapter?: number;
  chunkIndex: number;
}

export interface ResolutionTimelineEntry {
  issueTitle: string;
  introducedChapter: number;
  resolvedChapter?: number;
  status: string;
}

export interface ManuscriptMemory {
  outline: OutlineMemoryEntry[];
  characters: Map<string, CharacterMemoryEntry>;
  plotThreads: Map<string, PlotThreadEntry>;
  worldRules: WorldRuleEntry[];
  continuity: ContinuityEntry[];
  issues: IssueMemoryEntry[];
  resolutionTimeline: ResolutionTimelineEntry[];
}
