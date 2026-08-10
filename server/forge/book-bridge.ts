import type { BookProject } from "../storage";
import { storage } from "../storage";
import { countWords } from "./parsing/manuscript-parser";
import { createChunks } from "./parsing/chunker";
import { prisma } from "./db";

export type EditorialStatus =
  | "not_linked"
  | "needs_draft"
  | "ready"
  | "analyzing"
  | "reviewed"
  | "failed";

export interface BookEditorialStatus {
  linked: boolean;
  projectId: string | null;
  revisionId: string | null;
  status: EditorialStatus;
  issues: number;
  reports: number;
  chapters: number;
  latestJobStatus: string | null;
  updatedAt: string | null;
}

function writtenChapters(book: BookProject) {
  return book.chapters
    .filter((chapter) => Boolean(chapter.content?.trim()))
    .sort((a, b) => a.chapter_number - b.chapter_number);
}

export function composeBookManuscript(book: BookProject): string {
  return writtenChapters(book)
    .map((chapter) => {
      const title = chapter.title?.trim() || `Chapter ${chapter.chapter_number}`;
      return `# ${title}\n\n${chapter.content!.trim()}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Creates (or reuses) the FORGE project attached to a Book. When the Book has
 * changed since its latest FORGE snapshot, a new immutable revision is made.
 * Repeated calls with the same manuscript are intentionally idempotent.
 */
export async function ensureBookEditorialProject(book: BookProject) {
  const chapters = writtenChapters(book);
  const manuscriptText = composeBookManuscript(book);
  if (!manuscriptText) {
    throw new Error("This book has no written manuscript content to review yet.");
  }

  let project = book.forge_project_id
    ? await prisma.project.findUnique({ where: { id: book.forge_project_id } })
    : null;
  let createdProject = false;

  // A deleted legacy FORGE project should not strand its Book link.
  if (!project) {
    project = await prisma.project.create({
      data: {
        title: book.title,
        description: "Editorial workspace linked to this WriteMaster book.",
      },
    });
    await prisma.revisionVersion.create({
      data: { projectId: project.id, label: "Draft 1", versionNumber: 1 },
    });
    book.forge_project_id = project.id;
    await storage.saveBook(book);
    createdProject = true;
  }

  const latestRevision = await prisma.revisionVersion.findFirst({
    where: { projectId: project.id },
    orderBy: { versionNumber: "desc" },
    include: { _count: { select: { chapters: true, issues: true, reports: true } } },
  });

  const latestAsset = latestRevision?.manuscriptFileId
    ? await prisma.fileAsset.findUnique({ where: { id: latestRevision.manuscriptFileId } })
    : null;

  if (latestRevision && latestAsset?.extractedText === manuscriptText) {
    if (project.title !== book.title) {
      await prisma.project.update({ where: { id: project.id }, data: { title: book.title } });
    }
    return {
      projectId: project.id,
      revisionId: latestRevision.id,
      createdProject,
      createdRevision: false,
      chaptersDetected: latestRevision._count.chapters,
      totalWords: countWords(manuscriptText),
    };
  }

  const canReuseEmptyRevision = Boolean(
    latestRevision &&
    !latestRevision.manuscriptFileId &&
    latestRevision._count.chapters === 0 &&
    latestRevision._count.issues === 0 &&
    latestRevision._count.reports === 0,
  );

  const revision = canReuseEmptyRevision
    ? latestRevision!
    : await prisma.revisionVersion.create({
        data: {
          projectId: project.id,
          label: `Draft ${(latestRevision?.versionNumber || 0) + 1}`,
          versionNumber: (latestRevision?.versionNumber || 0) + 1,
        },
      });

  const chunkDefinitions = createChunks(chapters.length);
  await prisma.$transaction(async (tx) => {
    if (canReuseEmptyRevision) {
      await tx.chunk.deleteMany({ where: { revisionVersionId: revision.id } });
      await tx.chapter.deleteMany({ where: { revisionVersionId: revision.id } });
    }

    const asset = await tx.fileAsset.create({
      data: {
        projectId: project.id,
        revisionVersionId: revision.id,
        type: "manuscript",
        fileName: `${book.title || "manuscript"}.txt`,
        mimeType: "text/plain",
        storagePath: "",
        extractedText: manuscriptText,
      },
    });

    for (const chapter of chapters) {
      await tx.chapter.create({
        data: {
          revisionVersionId: revision.id,
          number: chapter.chapter_number,
          title: chapter.title || `Chapter ${chapter.chapter_number}`,
          rawText: chapter.content || "",
          wordCount: countWords(chapter.content || ""),
        },
      });
    }

    for (const chunk of chunkDefinitions) {
      const chunkChapters = chapters.filter(
        (chapter) => chapter.chapter_number >= chunk.startChapter && chapter.chapter_number <= chunk.endChapter,
      );
      await tx.chunk.create({
        data: {
          revisionVersionId: revision.id,
          chunkIndex: chunk.chunkIndex,
          startChapter: chunk.startChapter,
          endChapter: chunk.endChapter,
          rawCombinedText: chunkChapters.map((chapter) => chapter.content || "").join("\n\n---\n\n"),
        },
      });
    }

    await tx.revisionVersion.update({
      where: { id: revision.id },
      data: { manuscriptFileId: asset.id },
    });
    await tx.project.update({ where: { id: project.id }, data: { title: book.title } });
  });

  return {
    projectId: project.id,
    revisionId: revision.id,
    createdProject,
    createdRevision: !canReuseEmptyRevision,
    chaptersDetected: chapters.length,
    chunksCreated: chunkDefinitions.length,
    totalWords: countWords(manuscriptText),
  };
}

export async function getBookEditorialStatus(book: BookProject): Promise<BookEditorialStatus> {
  if (!book.forge_project_id) {
    return {
      linked: false,
      projectId: null,
      revisionId: null,
      status: "not_linked",
      issues: 0,
      reports: 0,
      chapters: 0,
      latestJobStatus: null,
      updatedAt: null,
    };
  }

  const project = await prisma.project.findUnique({ where: { id: book.forge_project_id } });
  if (!project) {
    return {
      linked: false,
      projectId: null,
      revisionId: null,
      status: "not_linked",
      issues: 0,
      reports: 0,
      chapters: 0,
      latestJobStatus: null,
      updatedAt: null,
    };
  }

  const revision = await prisma.revisionVersion.findFirst({
    where: { projectId: project.id },
    orderBy: { versionNumber: "desc" },
    include: {
      _count: { select: { chapters: true, issues: true, reports: true } },
      analysisJobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const latestJob = revision?.analysisJobs[0];
  const running = latestJob && !["complete", "error", "cancelled"].includes(latestJob.status);

  let status: EditorialStatus = "needs_draft";
  if (running) status = "analyzing";
  else if (latestJob?.status === "error") status = "failed";
  else if ((revision?._count.reports || 0) > 0 || (revision?._count.issues || 0) > 0) status = "reviewed";
  else if ((revision?._count.chapters || 0) > 0) status = "ready";

  return {
    linked: true,
    projectId: project.id,
    revisionId: revision?.id || null,
    status,
    issues: revision?._count.issues || 0,
    reports: revision?._count.reports || 0,
    chapters: revision?._count.chapters || 0,
    latestJobStatus: latestJob?.status || null,
    updatedAt: project.updatedAt.toISOString(),
  };
}
