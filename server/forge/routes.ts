import { Router, Request, Response } from "express";
import multer from "multer";
import * as fs from "fs/promises";
import * as path from "path";
import { prisma } from "./db";
import { extractText, countWords } from "./parsing/manuscript-parser";
import { detectChapters, createSegments } from "./parsing/chapter-detector";
import { createChunks } from "./parsing/chunker";
import { startAnalysisJob, getJobStatus, getAllJobs } from "./analysis/job-runner";
import { seedDemoProject } from "./seed/seed-demo";
import { runEditorialAssessment } from "./analysis/modules/editorial-assessment";
import { runBetaReader, getProfileKeys } from "./analysis/modules/beta-reader";

const router = Router();

const uploadsDir = path.join(process.cwd(), "data", "forge-uploads");
fs.mkdir(uploadsDir, { recursive: true }).catch(() => {});

const upload = multer({ dest: uploadsDir });

router.get("/projects", async (_req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: { revisions: { include: { _count: { select: { chapters: true, issues: true, reports: true } } } } },
      orderBy: { updatedAt: "desc" },
    });
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects", async (req: Request, res: Response) => {
  try {
    const { title, authorName, genre, description } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });
    const project = await prisma.project.create({
      data: { title, authorName: authorName || "", genre: genre || "", description: description || "" },
    });
    await prisma.revisionVersion.create({
      data: { projectId: project.id, label: "Draft 1", versionNumber: 1 },
    });
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id", async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        revisions: {
          include: {
            chapters: { orderBy: { number: "asc" } },
            chunks: { orderBy: { chunkIndex: "asc" } },
            _count: { select: { issues: true, reports: true, characters: true, sceneAnalyses: true, factCheckItems: true } },
          },
        },
        fileAssets: true,
      },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/projects/:id", async (req: Request, res: Response) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/upload", upload.single("manuscript"), async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    let text = "";
    let fileName = "pasted-text.txt";
    let fileType = req.body.fileType || "manuscript";

    if (req.file) {
      fileName = req.file.originalname;
      text = await extractText(req.file.path, req.file.mimetype);
    } else if (req.body.text) {
      text = req.body.text;
      fileName = req.body.fileName || "pasted-text.txt";
    } else {
      return res.status(400).json({ error: "No file or text provided" });
    }

    const asset = await prisma.fileAsset.create({
      data: {
        projectId: project.id,
        type: fileType,
        fileName,
        mimeType: req.file?.mimetype || "text/plain",
        storagePath: req.file?.path || "",
        extractedText: text,
      },
    });

    if (fileType === "manuscript") {
      const revision = await prisma.revisionVersion.findFirst({
        where: { projectId: project.id },
        orderBy: { versionNumber: "desc" },
      });

      if (revision) {
        await prisma.chapter.deleteMany({ where: { revisionVersionId: revision.id } });
        await prisma.chunk.deleteMany({ where: { revisionVersionId: revision.id } });

        let detectedChapters = detectChapters(text);
        if (detectedChapters.length === 0) {
          detectedChapters = createSegments(text, 6);
        }

        for (const ch of detectedChapters) {
          await prisma.chapter.create({
            data: {
              revisionVersionId: revision.id,
              number: ch.number,
              title: ch.title,
              rawText: ch.rawText,
              wordCount: ch.wordCount,
              detectedStartOffset: ch.startOffset,
              detectedEndOffset: ch.endOffset,
            },
          });
        }

        const chunkDefs = createChunks(detectedChapters.length);
        for (const cd of chunkDefs) {
          const chunkChapters = detectedChapters.filter(ch => ch.number >= cd.startChapter && ch.number <= cd.endChapter);
          const combinedText = chunkChapters.map(ch => ch.rawText).join("\n\n---\n\n");
          await prisma.chunk.create({
            data: {
              revisionVersionId: revision.id,
              chunkIndex: cd.chunkIndex,
              startChapter: cd.startChapter,
              endChapter: cd.endChapter,
              rawCombinedText: combinedText,
            },
          });
        }

        await prisma.revisionVersion.update({
          where: { id: revision.id },
          data: { manuscriptFileId: asset.id },
        });

        res.json({
          asset,
          chaptersDetected: detectedChapters.length,
          chunksCreated: chunkDefs.length,
          totalWords: countWords(text),
        });
        return;
      }
    }

    res.json({ asset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/reparse", async (req: Request, res: Response) => {
  try {
    const revision = await prisma.revisionVersion.findFirst({
      where: { projectId: req.params.id },
      orderBy: { versionNumber: "desc" },
    });
    if (!revision?.manuscriptFileId) {
      res.status(400).json({ error: "No manuscript uploaded" });
      return;
    }

    const file = await prisma.fileAsset.findUnique({ where: { id: revision.manuscriptFileId } });
    if (!file) {
      res.status(404).json({ error: "Manuscript file not found" });
      return;
    }

    await prisma.sceneAnalysis.deleteMany({ where: { revisionVersionId: revision.id } });
    await prisma.factCheckItem.deleteMany({ where: { revisionVersionId: revision.id } });
    await prisma.issue.deleteMany({ where: { revisionVersionId: revision.id } });
    await prisma.chapter.deleteMany({ where: { revisionVersionId: revision.id } });
    await prisma.chunk.deleteMany({ where: { revisionVersionId: revision.id } });

    let text = file.extractedText;
    if (file.storagePath && (file.fileName.endsWith(".docx") || file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
      try {
        const freshText = await extractText(file.storagePath, file.mimeType);
        text = freshText;
        await prisma.fileAsset.update({ where: { id: file.id }, data: { extractedText: freshText } });
      } catch (e) {
      }
    }
    let detectedChapters = detectChapters(text);
    if (detectedChapters.length === 0) {
      detectedChapters = createSegments(text, 6);
    }

    for (const ch of detectedChapters) {
      await prisma.chapter.create({
        data: {
          revisionVersionId: revision.id,
          number: ch.number,
          title: ch.title,
          rawText: ch.rawText,
          wordCount: ch.wordCount,
          detectedStartOffset: ch.startOffset,
          detectedEndOffset: ch.endOffset,
        },
      });
    }

    const chunkDefs = createChunks(detectedChapters.length);
    for (const cd of chunkDefs) {
      const chunkChapters = detectedChapters.filter(ch => ch.number >= cd.startChapter && ch.number <= cd.endChapter);
      const combinedText = chunkChapters.map(ch => ch.rawText).join("\n\n---\n\n");
      await prisma.chunk.create({
        data: {
          revisionVersionId: revision.id,
          chunkIndex: cd.chunkIndex,
          startChapter: cd.startChapter,
          endChapter: cd.endChapter,
          rawCombinedText: combinedText,
        },
      });
    }

    res.json({
      chaptersDetected: detectedChapters.length,
      chunksCreated: chunkDefs.length,
      totalWords: countWords(text),
      chapters: detectedChapters.map(ch => ({ number: ch.number, title: ch.title, wordCount: ch.wordCount })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id/revision", async (req: Request, res: Response) => {
  try {
    const revision = await prisma.revisionVersion.findFirst({
      where: { projectId: req.params.id },
      orderBy: { versionNumber: "desc" },
      include: {
        chapters: { orderBy: { number: "asc" } },
        chunks: { orderBy: { chunkIndex: "asc" } },
        _count: { select: { issues: true, reports: true, characters: true } },
      },
    });
    if (!revision) return res.status(404).json({ error: "No revision found" });
    res.json(revision);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/analyze", async (req: Request, res: Response) => {
  try {
    const revision = await prisma.revisionVersion.findFirst({
      where: { projectId: req.params.id },
      orderBy: { versionNumber: "desc" },
    });
    if (!revision) return res.status(404).json({ error: "No revision found" });

    const chunks = await prisma.chunk.findMany({ where: { revisionVersionId: revision.id } });
    if (chunks.length === 0) return res.status(400).json({ error: "No chunks. Upload and parse a manuscript first." });

    const { modules, betaReaderProfiles, genre } = req.body;
    const defaultModules = ["editorial_assessment", "developmental_editor", "character_tracker", "structure_analyzer", "scene_scanner", "copy_editor", "fact_checker"];

    const jobId = await startAnalysisJob(revision.id, {
      modules: modules || defaultModules,
      betaReaderProfiles: betaReaderProfiles || [],
      genre: genre || "",
    });

    res.json({ jobId, status: "queued" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/jobs/:id", async (req: Request, res: Response) => {
  const status = getJobStatus(req.params.id);
  if (status) {
    res.json(status);
  } else {
    try {
      const job = await prisma.analysisJob.findUnique({ where: { id: req.params.id } });
      if (job) {
        res.json({
          id: job.id,
          status: job.status,
          progress: job.progress,
          logs: JSON.parse(job.logsJson || "[]"),
          error: job.errorMessage,
        });
      } else {
        res.status(404).json({ error: "Job not found" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
});

router.get("/jobs", async (_req: Request, res: Response) => {
  res.json(getAllJobs());
});

router.get("/projects/:id/issues", async (req: Request, res: Response) => {
  try {
    const revision = await prisma.revisionVersion.findFirst({
      where: { projectId: req.params.id },
      orderBy: { versionNumber: "desc" },
    });
    if (!revision) return res.status(404).json({ error: "No revision found" });
    const issues = await prisma.issue.findMany({
      where: { revisionVersionId: revision.id },
      orderBy: [{ severity: "asc" }, { type: "asc" }],
    });
    res.json(issues);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/issues/:id", async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const issue = await prisma.issue.update({ where: { id: req.params.id }, data: { status } });
    res.json(issue);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id/reports", async (req: Request, res: Response) => {
  try {
    const revision = await prisma.revisionVersion.findFirst({
      where: { projectId: req.params.id },
      orderBy: { versionNumber: "desc" },
    });
    if (!revision) return res.status(404).json({ error: "No revision found" });
    const reports = await prisma.editorialReport.findMany({
      where: { revisionVersionId: revision.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/reports/:id", async (req: Request, res: Response) => {
  try {
    const report = await prisma.editorialReport.findUnique({
      where: { id: req.params.id },
      include: { issues: true },
    });
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id/characters", async (req: Request, res: Response) => {
  try {
    const revision = await prisma.revisionVersion.findFirst({
      where: { projectId: req.params.id },
      orderBy: { versionNumber: "desc" },
    });
    if (!revision) return res.status(404).json({ error: "No revision found" });
    const characters = await prisma.characterRecord.findMany({ where: { revisionVersionId: revision.id } });
    res.json(characters);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id/structure", async (req: Request, res: Response) => {
  try {
    const revision = await prisma.revisionVersion.findFirst({
      where: { projectId: req.params.id },
      orderBy: { versionNumber: "desc" },
    });
    if (!revision) return res.status(404).json({ error: "No revision found" });
    const beats = await prisma.structureBeat.findMany({
      where: { revisionVersionId: revision.id },
      orderBy: { chapterNumber: "asc" },
    });
    res.json(beats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id/scenes", async (req: Request, res: Response) => {
  try {
    const revision = await prisma.revisionVersion.findFirst({
      where: { projectId: req.params.id },
      orderBy: { versionNumber: "desc" },
    });
    if (!revision) return res.status(404).json({ error: "No revision found" });
    const scenes = await prisma.sceneAnalysis.findMany({
      where: { revisionVersionId: revision.id },
      include: { chapter: true },
    });
    res.json(scenes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id/fact-checks", async (req: Request, res: Response) => {
  try {
    const revision = await prisma.revisionVersion.findFirst({
      where: { projectId: req.params.id },
      orderBy: { versionNumber: "desc" },
    });
    if (!revision) return res.status(404).json({ error: "No revision found" });
    const items = await prisma.factCheckItem.findMany({
      where: { revisionVersionId: revision.id },
      include: { chapter: true },
    });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id/beta-readers", async (req: Request, res: Response) => {
  try {
    const revision = await prisma.revisionVersion.findFirst({
      where: { projectId: req.params.id },
      orderBy: { versionNumber: "desc" },
    });
    if (!revision) return res.status(404).json({ error: "No revision found" });
    const responses = await prisma.betaReaderResponse.findMany({
      where: { revisionVersionId: revision.id },
      include: { profile: true },
    });
    res.json(responses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/beta-reader-profiles", async (_req: Request, res: Response) => {
  try {
    const profiles = await prisma.betaReaderProfile.findMany();
    res.json(profiles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/quick-feedback", async (req: Request, res: Response) => {
  try {
    const { text, genre, betaProfiles } = req.body;
    if (!text || typeof text !== "string" || text.trim().length < 50) {
      res.status(400).json({ error: "Please provide at least 50 characters of text." });
      return;
    }
    const g = genre || "general fiction";
    const profiles: string[] = (betaProfiles && betaProfiles.length > 0) ? betaProfiles : getProfileKeys();

    const [editorial, ...betaResults] = await Promise.all([
      runEditorialAssessment(text, "", g, ""),
      ...profiles.map(p => runBetaReader(text, "", g, p)),
    ]);

    res.json({ editorial, betaReaders: betaResults });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/seed", async (_req: Request, res: Response) => {
  try {
    await seedDemoProject();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
