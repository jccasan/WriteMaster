export type IssueType =
  | "plot_hole"
  | "weak_causality"
  | "pacing_drag"
  | "weak_stakes"
  | "unclear_motivation"
  | "continuity_error"
  | "unresolved_thread"
  | "exposition_overload"
  | "scene_redundancy"
  | "flat_arc"
  | "inconsistent_voice"
  | "prose_clarity"
  | "grammar"
  | "punctuation"
  | "formatting"
  | "realism_issue"
  | "factual_error"
  | "world_rule_conflict"
  | "knowledge_inconsistency"
  | "character_inconsistency"
  | "structural_weakness";

export type IssueSeverity = "minor" | "moderate" | "major" | "critical";

export type IssueStatus =
  | "introduced"
  | "active"
  | "resolved_later"
  | "reintroduced"
  | "uncertain"
  | "dismissed"
  | "merged";

export interface IssueRecord {
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  evidence: string[];
  suggestion: string;
  status: IssueStatus;
  introducedAtChapter?: number;
  resolvedAtChapter?: number;
  chapterNumber?: number;
}
