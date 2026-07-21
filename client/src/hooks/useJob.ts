import { useQuery } from "@tanstack/react-query";

export interface JobStatus<TResult = unknown> {
  id: string;
  kind: string;
  status: "queued" | "running" | "paused" | "done" | "error";
  progress: { current: number; total: number; label?: string } | null;
  result: TResult | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Poll a background job by id until it reaches a terminal state.
 * The single, shared way to track long-running AI work — replaces the
 * hand-rolled setInterval loops that used to live in individual pages.
 */
export function useJob<TResult = unknown>(
  jobId: string | null | undefined,
  opts?: { intervalMs?: number; onDone?: (job: JobStatus<TResult>) => void }
) {
  const query = useQuery<JobStatus<TResult>>({
    queryKey: ["job", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const r = await fetch(`/api/jobs/${jobId}`);
      if (!r.ok) throw new Error(`Job fetch failed (${r.status})`);
      return r.json();
    },
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (status === "done" || status === "error") return false;
      return opts?.intervalMs ?? 2000;
    },
  });

  const job = query.data ?? null;
  const isRunning = !!job && (job.status === "queued" || job.status === "running");

  return {
    job,
    isRunning,
    isDone: job?.status === "done",
    isError: job?.status === "error" || query.isError,
    error: job?.error ?? (query.error as Error | null)?.message ?? null,
    refetch: query.refetch,
  };
}
