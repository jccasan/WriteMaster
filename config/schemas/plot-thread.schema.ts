export type PlotThreadStatus = "active" | "resolved" | "dormant" | "abandoned";

export interface PlotThreadState {
  label: string;
  introducedInChapter: number;
  status: PlotThreadStatus;
  notes: string;
}
