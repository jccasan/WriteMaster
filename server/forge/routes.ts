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

router.patch("/characters/:charId", async (req: Request, res: Response) => {
  try {
    const { relationshipsJson, projectId } = req.body;
    if (relationshipsJson === undefined) return res.status(400).json({ error: "relationshipsJson required" });
    if (!projectId) return res.status(400).json({ error: "projectId required" });

    const rels = typeof relationshipsJson === "string" ? JSON.parse(relationshipsJson) : relationshipsJson;
    if (!Array.isArray(rels)) return res.status(400).json({ error: "relationshipsJson must be an array" });
    for (const r of rels) {
      if (!r.character || typeof r.character !== "string") return res.status(400).json({ error: "Each relationship must have a character name" });
    }

    const char = await prisma.characterRecord.findUnique({ where: { id: req.params.charId } });
    if (!char) return res.status(404).json({ error: "Character not found" });

    const revision = await prisma.revisionVersion.findUnique({ where: { id: char.revisionVersionId } });
    if (!revision || revision.projectId !== projectId) {
      return res.status(403).json({ error: "Character does not belong to this project" });
    }

    const updated = await prisma.characterRecord.update({
      where: { id: req.params.charId },
      data: { relationshipsJson: JSON.stringify(rels) },
    });
    res.json(updated);
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

router.post("/quick-feedback/chat", async (req: Request, res: Response) => {
  try {
    const { messages, originalText, genre, feedbackSummary } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Messages are required." });
      return;
    }
    if (!originalText || typeof originalText !== "string") {
      res.status(400).json({ error: "Original text context is required." });
      return;
    }
    if (messages.length > 40) {
      res.status(400).json({ error: "Too many messages. Please start a new conversation." });
      return;
    }
    const validRoles = new Set(["user", "assistant"]);
    for (const m of messages) {
      if (!m.content || typeof m.content !== "string" || !validRoles.has(m.role)) {
        res.status(400).json({ error: "Invalid message format." });
        return;
      }
      if (m.content.length > 10000) {
        res.status(400).json({ error: "Message too long." });
        return;
      }
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    const systemPrompt = `You are an expert fiction editor and writing coach. The user has submitted a passage for feedback and wants to discuss the results with you.

GENRE: ${genre || "general fiction"}

ORIGINAL PASSAGE:
${originalText.slice(0, 12000)}

FEEDBACK SUMMARY:
${(feedbackSummary || "").slice(0, 6000)}

Use the passage and feedback as context. Give specific, actionable craft advice. Reference exact lines or moments from the passage when possible. Be encouraging but honest. Keep responses focused and concise.`;

    const apiMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      messages: apiMessages,
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "";
    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/chat", async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const MAX_MESSAGES = 50;
    const MAX_CONTENT_LENGTH = 10000;
    const validRoles = new Set(["user", "assistant"]);
    const validated = messages.slice(-MAX_MESSAGES).filter((m: any) =>
      m && typeof m.content === "string" && validRoles.has(m.role) && m.content.length <= MAX_CONTENT_LENGTH
    );
    if (validated.length === 0) {
      return res.status(400).json({ error: "No valid messages provided" });
    }

    const revision = await prisma.revisionVersion.findFirst({
      where: { projectId: project.id },
      orderBy: { versionNumber: "desc" },
    });

    let contextParts: string[] = [];
    contextParts.push(`PROJECT: "${project.title}" (${project.genre || "fiction"})`);
    if (project.description) contextParts.push(`DESCRIPTION: ${project.description}`);

    if (revision) {
      const [chapters, characters, issues, chunks] = await Promise.all([
        prisma.chapter.findMany({
          where: { revisionVersionId: revision.id },
          orderBy: { number: "asc" },
          select: { number: true, title: true, wordCount: true },
        }),
        prisma.characterRecord.findMany({
          where: { revisionVersionId: revision.id },
          select: { name: true, description: true, traits: true, goals: true, relationships: true },
        }),
        prisma.issue.findMany({
          where: { revisionVersionId: revision.id },
          orderBy: { severity: "asc" },
          take: 30,
          select: { type: true, severity: true, title: true, description: true, suggestion: true },
        }),
        prisma.chunk.findMany({
          where: { revisionVersionId: revision.id, status: "analyzed" },
          orderBy: { chunkIndex: "asc" },
          select: { startChapter: true, endChapter: true, summaryJson: true },
        }),
      ]);

      if (chapters.length > 0) {
        contextParts.push(`\nCHAPTERS (${chapters.length}):\n` +
          chapters.map(c => `  Ch${c.number}: "${c.title || "Untitled"}" (${c.wordCount} words)`).join("\n"));
      }

      if (characters.length > 0) {
        contextParts.push(`\nCHARACTERS (${characters.length}):\n` +
          characters.map(c => {
            let line = `  ${c.name}`;
            if (c.description) line += ` — ${c.description}`;
            let traits: string[] = [];
            try { traits = JSON.parse(c.traits || "[]"); } catch {}
            if (traits.length) line += ` [Traits: ${traits.join(", ")}]`;
            let goals: string[] = [];
            try { goals = JSON.parse(c.goals || "[]"); } catch {}
            if (goals.length) line += ` [Goals: ${goals.join(", ")}]`;
            return line;
          }).join("\n"));
      }

      if (chunks.length > 0) {
        const summaries = chunks.map(c => {
          let s: any = {};
          try { s = JSON.parse(c.summaryJson || "{}"); } catch {}
          const ed = s.editorial || {};
          return ed.overallImpression
            ? `  Ch${c.startChapter}-${c.endChapter}: ${ed.overallImpression}`
            : null;
        }).filter(Boolean);
        if (summaries.length) {
          contextParts.push(`\nEDITORIAL SUMMARIES:\n` + summaries.join("\n"));
        }
      }

      if (issues.length > 0) {
        contextParts.push(`\nTOP ISSUES (${issues.length}):\n` +
          issues.slice(0, 15).map(i => `  [${i.severity}] ${i.title}: ${i.description}`).join("\n"));
      }
    }

    const systemPrompt = `You are an expert fiction editor and writing consultant. You have full context about the user's manuscript project and its analysis results. Use this context to give specific, actionable advice.

Be direct, specific, and reference characters, chapters, and issues by name when relevant. Avoid generic writing advice — ground your responses in the actual manuscript data you have.

PROJECT CONTEXT:
${contextParts.join("\n")}`;

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: validated.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "";
    res.json({ reply });
  } catch (err: any) {
    console.error("[forge chat] Error:", err.message);
    res.status(500).json({ error: "Chat request failed. Please try again." });
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
