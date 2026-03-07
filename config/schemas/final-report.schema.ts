import type { IssueRecord } from "./issue-record.schema";

export interface FinalReportSection {
  title: string;
  summary: string;
  bodyMarkdown: string;
  issueCount: number;
  topIssues: IssueRecord[];
}
