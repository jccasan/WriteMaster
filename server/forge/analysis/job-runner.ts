import { prisma } from "../db";
import { runAnalysisPipeline } from "./analysis-runner";
import { runSynthesis } from "./synthesis-runner";

export interface JobStatus {
  id: string;
  status: "queued" | "parsing" | "chunking" | "analyzing" | "synthesizing" | "rendering" | "complete" | "error";
  progress: number;
  logs: string[];
  error?: string;
}

const activeJobs = new Map<string, JobStatus>();

export function getJobStatus(jobId: string): JobStatus | undefined {
  return activeJobs.get(jobId);
}

export function getAllJobs(): JobStatus[] {
  return [...activeJobs.values()];
}

function addLog(jobId: string, message: string) {
  const job = activeJobs.get(jobId);
  if (job) {
    job.logs.push(`[${new Date().toISOString()}] ${message}`);
    console.log(`[FORGE Job ${jobId}] ${message}`);
  }
}

async function updateDbJob(jobId: string, updates: { status?: string; progress?: number; errorMessage?: string; logsJson?: string }) {
  try {
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: updates,
    });
  } catch (e) {
    console.error(`Failed to update job ${jobId} in DB:`, e);
  }
}

export async function startAnalysisJob(
  revisionVersionId: string,
  config: {
    modules: string[];
    betaReaderProfiles?: string[];
    genre?: string;
  }
): Promise<string> {
  const job = await prisma.analysisJob.create({
    data: {
      revisionVersionId,
      analysisType: "full_analysis",
      status: "queued",
      progress: 0,
      configJson: JSON.stringify(config),
    },
  });

  const jobStatus: JobStatus = {
    id: job.id,
    status: "queued",
    progress: 0,
    logs: [],
  };
  activeJobs.set(job.id, jobStatus);

  runJob(job.id, revisionVersionId, config).catch(err => {
    console.error(`Job ${job.id} failed:`, err);
  });

  return job.id;
}

async function runJob(
  jobId: string,
  revisionVersionId: string,
  config: {
    modules: string[];
    betaReaderProfiles?: string[];
    genre?: string;
  }
) {
  const job = activeJobs.get(jobId)!;

  try {
    job.status = "analyzing";
    job.progress = 5;
    await updateDbJob(jobId, { status: "analyzing", progress: 5 });
    addLog(jobId, "Clearing previous analysis results...");

    await prisma.issue.deleteMany({ where: { revisionVersionId } });
    await prisma.sceneAnalysis.deleteMany({ where: { revisionVersionId } });
    await prisma.structureBeat.deleteMany({ where: { revisionVersionId } });
    await prisma.characterRecord.deleteMany({ where: { revisionVersionId } });
    await prisma.factCheckItem.deleteMany({ where: { revisionVersionId } });
    await prisma.betaReaderResponse.deleteMany({ where: { revisionVersionId } });
    await prisma.editorialReport.deleteMany({ where: { revisionVersionId } });
    await prisma.chunk.updateMany({ where: { revisionVersionId }, data: { status: "pending", summaryJson: "{}" } });

    addLog(jobId, "Starting analysis pipeline...");

    const revision = await prisma.revisionVersion.findUnique({
      where: { id: revisionVersionId },
      include: { chapters: true, chunks: true, project: true },
    });

    if (!revision) throw new Error("Revision not found");

    const genre = config.genre || revision.project.genre || "general_fiction";

    let supportFiles = "";
    const assets = await prisma.fileAsset.findMany({
      where: { projectId: revision.projectId },
    });
    for (const asset of assets) {
      if (asset.type === "outline" || asset.type === "story_bible") {
        supportFiles += `\n--- ${asset.type.toUpperCase()}: ${asset.fileName} ---\n${asset.extractedText}\n`;
      }
    }

    const chunks = await prisma.chunk.findMany({
      where: { revisionVersionId },
      orderBy: { chunkIndex: "asc" },
    });

    if (chunks.length === 0) {
      throw new Error("No chunks found. Please parse the manuscript first.");
    }

    addLog(jobId, `Found ${chunks.length} chunks to analyze with modules: ${config.modules.join(", ")}`);

    const totalSteps = chunks.length * config.modules.length + 1;
    let completedSteps = 0;

    await runAnalysisPipeline(
      jobId,
      revisionVersionId,
      chunks,
      config.modules,
      genre,
      supportFiles,
      config.betaReaderProfiles || [],
      (step: string) => {
        completedSteps++;
        const progress = Math.min(95, Math.round((completedSteps / totalSteps) * 90) + 5);
        job.progress = progress;
        job.status = "analyzing";
        addLog(jobId, step);
        updateDbJob(jobId, { status: "analyzing", progress });
      }
    );

    job.status = "synthesizing";
    job.progress = 92;
    await updateDbJob(jobId, { status: "synthesizing", progress: 92 });
    addLog(jobId, "Running synthesis and report generation...");

    await runSynthesis(revisionVersionId, genre);

    job.status = "complete";
    job.progress = 100;
    await updateDbJob(jobId, { status: "complete", progress: 100 });
    addLog(jobId, "Analysis complete!");

  } catch (err: any) {
    job.status = "error";
    job.error = err.message;
    addLog(jobId, `ERROR: ${err.message}`);
    await updateDbJob(jobId, { status: "error", errorMessage: err.message });
  }
}
