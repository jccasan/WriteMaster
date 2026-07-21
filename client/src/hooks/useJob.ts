import { useEffect, useRef } from "react";
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
  opts?: {
    intervalMs?: number;
    /** Called once when the job reaches a terminal state (done or error) */
    onSettled?: (job: JobStatus<TResult>) => void;
  }
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

  const settledRef = useRef<string | null>(null);
  const onSettled = opts?.onSettled;
  useEffect(() => {
    if (!job || !onSettled) return;
    const terminal = job.status === "done" || job.status === "error";
    if (terminal && settledRef.current !== job.id) {
      settledRef.current = job.id;
      onSettled(job);
    }
  }, [job, onSettled]);

  return {
    job,
    isRunning,
    isDone: job?.status === "done",
    isError: job?.status === "error" || query.isError,
    error: job?.error ?? (query.error as Error | null)?.message ?? null,
    refetch: query.refetch,
  };
}
