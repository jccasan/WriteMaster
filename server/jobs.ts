import { randomUUID } from "crypto";
import type { Express } from "express";

/**
 * Generic background job registry.
 *
 * Every long-running AI operation (autopilot runs, pipeline executions,
 * batch analyses) registers here instead of running fire-and-forget inside a
 * request handler. Jobs expose a uniform status shape the client polls via
 * GET /api/jobs/:id (see client/src/hooks/useJob.ts).
 */

export type JobState = "queued" | "running" | "paused" | "done" | "error";

export interface JobProgress {
  current: number;
  total: number;
  label?: string;
}

export interface Job<TResult = unknown> {
  id: string;
  kind: string;
  status: JobState;
  progress: JobProgress | null;
  result: TResult | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  /** Extra data specific to the job kind (e.g. bookId) — visible to clients */
  meta: Record<string, unknown>;
}

export interface JobHandle {
  /** Report progress; safe to call often */
  setProgress(current: number, total: number, label?: string): void;
  /** True when a pause was requested — runners should stop at a safe point */
  isPauseRequested(): boolean;
  /** Mark the job paused (after the runner reaches its safe point) */
  markPaused(): void;
}

interface InternalJob extends Job<unknown> {
  pauseRequested: boolean;
}

const jobs = new Map<string, InternalJob>();

// Retain finished jobs for an hour so clients can read final status,
// then drop them to keep the map bounded.
const RETENTION_MS = 60 * 60 * 1000;

function touch(job: InternalJob) {
  job.updatedAt = new Date().toISOString();
}

function scheduleCleanup(id: string) {
  setTimeout(() => jobs.delete(id), RETENTION_MS).unref?.();
}

export function startJob<TResult>(
  kind: string,
  meta: Record<string, unknown>,
  runner: (handle: JobHandle) => Promise<TResult>
): Job<TResult> {
  const now = new Date().toISOString();
  const job: InternalJob = {
    id: randomUUID(),
    kind,
    status: "queued",
    progress: null,
    result: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    meta,
    pauseRequested: false,
  };
  jobs.set(job.id, job);

  const handle: JobHandle = {
    setProgress(current, total, label) {
      job.progress = { current, total, label };
      touch(job);
    },
    isPauseRequested: () => job.pauseRequested,
    markPaused() {
      job.status = "paused";
      touch(job);
    },
  };

  job.status = "running";
  runner(handle)
    .then((result) => {
      // A runner that paused itself keeps its paused status
      if (job.status === "running") {
        job.status = "done";
        job.result = result ?? null;
      }
      touch(job);
      scheduleCleanup(job.id);
    })
    .catch((err) => {
      job.status = "error";
      job.error = err instanceof Error ? err.message : String(err);
      touch(job);
      scheduleCleanup(job.id);
      console.error(`[jobs] ${kind} job ${job.id} failed:`, err);
    });

  return publicView(job) as Job<TResult>;
}

function publicView(job: InternalJob): Job {
  const { pauseRequested: _p, ...pub } = job;
  return pub;
}

export function getJob(id: string): Job | null {
  const job = jobs.get(id);
  return job ? publicView(job) : null;
}

export function listJobs(filter?: { kind?: string; active?: boolean }): Job[] {
  let all = [...jobs.values()];
  if (filter?.kind) all = all.filter((j) => j.kind === filter.kind);
  if (filter?.active)
    all = all.filter((j) => j.status === "queued" || j.status === "running" || j.status === "paused");
  return all
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(publicView);
}

export function requestPause(id: string): boolean {
  const job = jobs.get(id);
  if (!job || (job.status !== "running" && job.status !== "queued")) return false;
  job.pauseRequested = true;
  touch(job);
  return true;
}

/** Mount the uniform job-status endpoints */
export function registerJobRoutes(app: Express) {
  app.get("/api/jobs", (req, res) => {
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    res.json(listJobs({ kind, active: req.query.active === "1" }));
  });

  app.get("/api/jobs/:id", (req, res) => {
    const job = getJob(String(req.params.id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  app.post("/api/jobs/:id/pause", (req, res) => {
    const ok = requestPause(String(req.params.id));
    if (!ok) return res.status(404).json({ error: "Job not found or not running" });
    res.json({ success: true });
  });
}
