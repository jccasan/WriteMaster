export type FactCheckType = "internal" | "external";

export type FactCheckStatus = "pending" | "verified" | "disputed" | "error";

export interface FactCheckRecord {
  type: FactCheckType;
  claim: string;
  finding: string;
  confidence: number;
  status: FactCheckStatus;
  citations: string[];
  notes: string;
  chapterNumber?: number;
}
