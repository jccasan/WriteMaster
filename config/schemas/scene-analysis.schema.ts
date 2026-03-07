export type NecessityRating =
  | "essential"
  | "strong"
  | "useful_but_weak"
  | "underperforming"
  | "redundant";

export interface SceneAnalysisRecord {
  chapterNumber: number;
  sceneIndex: number;
  purpose: string;
  conflict: string;
  changeOccurred: boolean;
  plotValue: string;
  characterValue: string;
  thematicValue: string;
  necessityRating: NecessityRating;
}
