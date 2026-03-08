import { prisma } from "../db";
import { callLLM } from "../../llm";
import { extractJSON } from "./parse-json";
import { renderReport } from "../renderers/report-renderer";

export async function runSynthesis(revisionVersionId: string, genre: string) {
  const issues = await prisma.issue.findMany({ where: { revisionVersionId } });
  const characters = await prisma.characterRecord.findMany({ where: { revisionVersionId } });
  const beats = await prisma.structureBeat.findMany({ where: { revisionVersionId } });
  const scenes = await prisma.sceneAnalysis.findMany({ where: { revisionVersionId }, include: { chapter: true } });
  const factChecks = await prisma.factCheckItem.findMany({ where: { revisionVersionId } });
  const betaResponses = await prisma.betaReaderResponse.findMany({ where: { revisionVersionId }, include: { profile: true } });
  const chunks = await prisma.chunk.findMany({ where: { revisionVersionId }, orderBy: { chunkIndex: "asc" } });

  const issuesSummary = issues.map(i => `[${i.severity}] ${i.type}: ${i.title} - ${i.description}`).join("\n");

  let synthesisResponse: any = {};
  try {
    const synthesisPrompt = `You are synthesizing all analysis results for a ${genre} manuscript. Here are the findings:

TOTAL ISSUES: ${issues.length}
CRITICAL: ${issues.filter(i => i.severity === "critical").length}
MAJOR: ${issues.filter(i => i.severity === "major").length}
MODERATE: ${issues.filter(i => i.severity === "moderate").length}
MINOR: ${issues.filter(i => i.severity === "minor").length}

ALL ISSUES:
${issuesSummary}

CHARACTERS TRACKED: ${characters.length}
STRUCTURE BEATS: ${beats.length}
SCENES ANALYZED: ${scenes.length}
FACT CHECKS: ${factChecks.length}
BETA READER RESPONSES: ${betaResponses.length}

Provide a synthesis that:
1. Identifies the top 5 most impactful issues to address first
2. Groups related issues that might share a root cause
3. Notes any issues that seem to contradict each other
4. Provides an overall manuscript health assessment
5. Suggests a revision priority order

Return JSON:
{
  "overallAssessment": "2-3 paragraph assessment",
  "manuscriptHealth": "strong|adequate|needs_work|significant_revision_needed",
  "topPriorityIssues": ["issue titles in priority order"],
  "relatedIssueGroups": [{"theme": "group name", "issueIndices": [0,1,2]}],
  "contradictions": ["any contradictory findings"],
  "revisionPriority": ["ordered list of what to fix first"],
  "strengths": ["top strengths to preserve"],
  "encouragement": "honest but encouraging closing note"
}`;

    const result = await callLLM(synthesisPrompt, "powerful", "You are a senior fiction editor synthesizing multiple analysis passes into a coherent revision plan.", 8192);
    synthesisResponse = extractJSON(result, null);
    if (!synthesisResponse) throw new Error("Parse failed");
  } catch (err) {
    synthesisResponse = {
      overallAssessment: "Synthesis could not be generated automatically.",
      manuscriptHealth: "unknown",
      topPriorityIssues: [],
      relatedIssueGroups: [],
      contradictions: [],
      revisionPriority: [],
      strengths: [],
      encouragement: "Review individual module results for detailed findings.",
    };
  }

  const editorialLetter = renderReport("editorial_letter", {
    synthesis: synthesisResponse,
    issues,
    characters,
    beats,
    scenes,
    factChecks,
    betaResponses,
    genre,
  });

  await prisma.editorialReport.create({
    data: {
      revisionVersionId,
      reportType: "editorial_letter",
      title: "Editorial Letter",
      summary: synthesisResponse.overallAssessment || "",
      bodyMarkdown: editorialLetter,
      metadataJson: JSON.stringify(synthesisResponse),
    },
  });

  const chapterFindingsMarkdown = renderReport("chapter_findings", { issues, chunks, genre });
  await prisma.editorialReport.create({
    data: {
      revisionVersionId,
      reportType: "chapter_findings",
      title: "Chapter-by-Chapter Findings",
      summary: `${issues.length} issues across ${chunks.length} chunks`,
      bodyMarkdown: chapterFindingsMarkdown,
    },
  });

  if (characters.length > 0) {
    const characterReport = renderReport("character_report", { characters, issues, genre });
    await prisma.editorialReport.create({
      data: {
        revisionVersionId,
        reportType: "character_report",
        title: "Character Analysis Report",
        summary: `${characters.length} characters tracked`,
        bodyMarkdown: characterReport,
      },
    });
  }

  if (beats.length > 0) {
    const structureReport = renderReport("structure_report", { beats, issues, genre });
    await prisma.editorialReport.create({
      data: {
        revisionVersionId,
        reportType: "structure_report",
        title: "Structure Analysis Report",
        summary: `${beats.length} structural beats identified`,
        bodyMarkdown: structureReport,
      },
    });
  }

  if (scenes.length > 0) {
    const sceneReport = renderReport("scene_report", { scenes, issues, genre });
    await prisma.editorialReport.create({
      data: {
        revisionVersionId,
        reportType: "scene_report",
        title: "Scene Purpose Report",
        summary: `${scenes.length} scenes analyzed`,
        bodyMarkdown: sceneReport,
      },
    });
  }

  if (factChecks.length > 0) {
    const factReport = renderReport("fact_check_report", { factChecks, genre });
    await prisma.editorialReport.create({
      data: {
        revisionVersionId,
        reportType: "fact_check_report",
        title: "Fact Check Report",
        summary: `${factChecks.length} claims checked`,
        bodyMarkdown: factReport,
      },
    });
  }

  if (betaResponses.length > 0) {
    const betaReport = renderReport("beta_reader_report", { betaResponses, genre });
    await prisma.editorialReport.create({
      data: {
        revisionVersionId,
        reportType: "beta_reader_report",
        title: "Beta Reader Packet",
        summary: `${betaResponses.length} reader responses`,
        bodyMarkdown: betaReport,
      },
    });
  }
}
