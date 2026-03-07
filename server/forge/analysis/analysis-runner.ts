import { prisma } from "../db";
import { MemoryStore } from "../memory/memory-store";
import { runEditorialAssessment } from "./modules/editorial-assessment";
import { runDevEdit } from "./modules/developmental-editor";
import { runCopyEdit } from "./modules/copy-editor";
import { runProofread } from "./modules/proofreader";
import { runFactCheck } from "./modules/fact-checker";
import { runBetaReader, getProfileKeys } from "./modules/beta-reader";
import { runStructureAnalysis } from "./modules/structure-analyzer";
import { runCharacterTrack } from "./modules/character-tracker";
import { runSceneScan } from "./modules/scene-scanner";
import { v4 as uuid } from "uuid";

type ProgressCallback = (step: string) => void;

interface ChunkRecord {
  id: string;
  chunkIndex: number;
  startChapter: number;
  endChapter: number;
  rawCombinedText: string;
}

export async function runAnalysisPipeline(
  jobId: string,
  revisionVersionId: string,
  chunks: ChunkRecord[],
  modules: string[],
  genre: string,
  supportFiles: string,
  betaReaderProfiles: string[],
  onProgress: ProgressCallback
) {
  const memory = new MemoryStore();
  const totalChapters = chunks.length > 0
    ? Math.max(...chunks.map(c => c.endChapter))
    : 0;

  for (const chunk of chunks) {
    const context = memory.getContextForChunk(chunk.startChapter);
    const chapterRange = `${chunk.startChapter}-${chunk.endChapter}`;
    const chapterNumbers = [];
    for (let i = chunk.startChapter; i <= chunk.endChapter; i++) chapterNumbers.push(i);

    for (const mod of modules) {
      try {
        onProgress(`Chunk ${chunk.chunkIndex + 1}/${chunks.length}: Running ${mod}...`);

        switch (mod) {
          case "editorial_assessment": {
            const result = await runEditorialAssessment(chunk.rawCombinedText, context, genre, supportFiles);
            for (const event of result.majorEvents || []) {
              memory.addOutlineEntry({ chapterNumber: chunk.startChapter, title: "", summary: event, majorEvents: [event] });
            }
            for (const cc of result.characterChanges || []) {
              memory.updateCharacter(cc.character, { description: cc.change, lastSeenChapter: chunk.endChapter });
            }
            for (const pt of result.plotThreadUpdates || []) {
              memory.updatePlotThread(pt.thread, { status: pt.status as any, notes: [pt.notes], lastUpdatedChapter: chunk.endChapter });
            }
            for (const cn of result.continuityNotes || []) {
              memory.addContinuityNote({ type: "general", description: cn, chapter: chunk.startChapter, status: "noted" });
            }
            for (const wr of result.worldRuleNotes || []) {
              memory.addWorldRule({ rule: wr, source: `chunk_${chunk.chunkIndex}`, chapter: chunk.startChapter });
            }
            for (const issue of result.issues || []) {
              const issueId = uuid();
              memory.addIssue({
                id: issueId, type: issue.type, severity: issue.severity,
                title: issue.title, description: issue.description,
                evidence: issue.evidence, suggestion: issue.suggestion,
                status: "active", introducedAtChapter: chunk.startChapter, chunkIndex: chunk.chunkIndex,
              });
              await prisma.issue.create({
                data: {
                  id: issueId, revisionVersionId, chunkId: chunk.id,
                  type: issue.type, severity: issue.severity, title: issue.title,
                  description: issue.description, evidenceJson: JSON.stringify(issue.evidence),
                  suggestion: issue.suggestion, status: "active", introducedAtChapter: chunk.startChapter,
                },
              });
            }
            await prisma.chunk.update({
              where: { id: chunk.id },
              data: { status: "analyzed", summaryJson: JSON.stringify({ editorial: result }) },
            });
            break;
          }

          case "developmental_editor": {
            const result = await runDevEdit(chunk.rawCombinedText, context, genre, supportFiles);
            for (const issue of result.issues || []) {
              await createIssue(revisionVersionId, chunk.id, issue, chunk.startChapter, chunk.chunkIndex, memory);
            }
            for (const scene of result.sceneByScene || []) {
              const chapterForScene = chapterNumbers[0] || chunk.startChapter;
              const chapter = await prisma.chapter.findFirst({ where: { revisionVersionId, number: chapterForScene } });
              if (chapter) {
                await prisma.sceneAnalysis.create({
                  data: {
                    revisionVersionId, chapterId: chapter.id, sceneIndex: scene.sceneIndex,
                    purpose: scene.purpose, conflict: scene.conflict,
                    changeOccurred: scene.change, valueRating: scene.rating,
                  },
                });
              }
            }
            break;
          }

          case "copy_editor": {
            const result = await runCopyEdit(chunk.rawCombinedText, context, genre);
            for (const issue of result.issues || []) {
              await createIssue(revisionVersionId, chunk.id, issue, chunk.startChapter, chunk.chunkIndex, memory);
            }
            break;
          }

          case "proofreader": {
            const result = await runProofread(chunk.rawCombinedText);
            for (const issue of result.issues || []) {
              await createIssue(revisionVersionId, chunk.id, issue, chunk.startChapter, chunk.chunkIndex, memory);
            }
            break;
          }

          case "fact_checker": {
            const result = await runFactCheck(chunk.rawCombinedText, context, supportFiles);
            for (const item of result.internalConsistency || []) {
              const chapter = item.chapter ? await prisma.chapter.findFirst({ where: { revisionVersionId, number: item.chapter } }) : null;
              await prisma.factCheckItem.create({
                data: {
                  revisionVersionId, chapterId: chapter?.id,
                  type: "internal", claim: item.claim, finding: item.finding,
                  confidence: item.confidence, status: item.status,
                },
              });
            }
            for (const item of result.externalFacts || []) {
              await prisma.factCheckItem.create({
                data: {
                  revisionVersionId, type: "external",
                  claim: item.claim, finding: item.finding,
                  confidence: item.confidence, status: item.status,
                },
              });
            }
            for (const issue of result.issues || []) {
              await createIssue(revisionVersionId, chunk.id, issue, chunk.startChapter, chunk.chunkIndex, memory);
            }
            break;
          }

          case "beta_reader": {
            const profiles = betaReaderProfiles.length > 0 ? betaReaderProfiles : getProfileKeys();
            for (const profileKey of profiles) {
              const result = await runBetaReader(chunk.rawCombinedText, context, genre, profileKey);
              const dbProfile = await prisma.betaReaderProfile.findFirst({ where: { name: result.profileName } });
              if (dbProfile) {
                await prisma.betaReaderResponse.create({
                  data: {
                    revisionVersionId, profileId: dbProfile.id,
                    responseJson: JSON.stringify(result),
                  },
                });
              }
            }
            break;
          }

          case "structure_analyzer": {
            const result = await runStructureAnalysis(chunk.rawCombinedText, context, genre, totalChapters, chapterRange);
            for (const beat of result.beats || []) {
              await prisma.structureBeat.create({
                data: {
                  revisionVersionId, beatType: beat.beatType,
                  chapterNumber: beat.chapterNumber, confidence: beat.confidence, notes: beat.notes,
                },
              });
            }
            for (const issue of result.issues || []) {
              await createIssue(revisionVersionId, chunk.id, issue, chunk.startChapter, chunk.chunkIndex, memory);
            }
            break;
          }

          case "character_tracker": {
            const result = await runCharacterTrack(chunk.rawCombinedText, context, genre);
            for (const char of result.characters || []) {
              memory.updateCharacter(char.name, {
                aliases: char.aliases, description: char.description,
                traits: char.traits, goals: char.goals, motives: char.motives,
                relationships: char.relationships, injuries: char.injuries,
                voiceNotes: char.voiceNotes, continuityNotes: char.continuityNotes,
                lastSeenChapter: chunk.endChapter,
              });
              await prisma.characterRecord.upsert({
                where: { id: `${revisionVersionId}_${char.name.toLowerCase().trim()}` },
                create: {
                  id: `${revisionVersionId}_${char.name.toLowerCase().trim()}`,
                  revisionVersionId, name: char.name,
                  aliasesJson: JSON.stringify(char.aliases || []),
                  description: char.description || "",
                  traitsJson: JSON.stringify(char.traits || []),
                  goalsJson: JSON.stringify(char.goals || []),
                  motivesJson: JSON.stringify(char.motives || []),
                  relationshipsJson: JSON.stringify(char.relationships || []),
                  injuriesJson: JSON.stringify(char.injuries || []),
                  voiceNotesJson: JSON.stringify(char.voiceNotes || []),
                  continuityNotesJson: JSON.stringify(char.continuityNotes || []),
                },
                update: {
                  description: char.description || "",
                  traitsJson: JSON.stringify(char.traits || []),
                  goalsJson: JSON.stringify(char.goals || []),
                  motivesJson: JSON.stringify(char.motives || []),
                  relationshipsJson: JSON.stringify(char.relationships || []),
                  injuriesJson: JSON.stringify(char.injuries || []),
                  voiceNotesJson: JSON.stringify(char.voiceNotes || []),
                  continuityNotesJson: JSON.stringify(char.continuityNotes || []),
                },
              });
            }
            for (const issue of result.issues || []) {
              await createIssue(revisionVersionId, chunk.id, issue, chunk.startChapter, chunk.chunkIndex, memory);
            }
            break;
          }

          case "scene_scanner": {
            const result = await runSceneScan(chunk.rawCombinedText, context, genre, chapterNumbers);
            for (const scene of result.scenes || []) {
              const chapter = await prisma.chapter.findFirst({ where: { revisionVersionId, number: scene.chapterNumber } });
              if (chapter) {
                await prisma.sceneAnalysis.create({
                  data: {
                    revisionVersionId, chapterId: chapter.id, sceneIndex: scene.sceneIndex,
                    purpose: scene.purpose, conflict: scene.conflict,
                    changeOccurred: scene.changeOccurred, valueRating: scene.necessityRating,
                    issueFlagsJson: JSON.stringify(scene.issueFlagsJson || []),
                  },
                });
              }
            }
            for (const issue of result.issues || []) {
              await createIssue(revisionVersionId, chunk.id, issue, chunk.startChapter, chunk.chunkIndex, memory);
            }
            break;
          }
        }
      } catch (err: any) {
        onProgress(`ERROR in ${mod} for chunk ${chunk.chunkIndex}: ${err.message}`);
      }
    }
  }
}

async function createIssue(
  revisionVersionId: string,
  chunkId: string,
  issue: { type: string; severity: string; title: string; description: string; evidence: string[]; suggestion: string },
  startChapter: number,
  chunkIndex: number,
  memory: MemoryStore
) {
  const issueId = uuid();
  memory.addIssue({
    id: issueId, type: issue.type, severity: issue.severity,
    title: issue.title, description: issue.description,
    evidence: issue.evidence || [], suggestion: issue.suggestion || "",
    status: "active", introducedAtChapter: startChapter, chunkIndex,
  });
  await prisma.issue.create({
    data: {
      id: issueId, revisionVersionId, chunkId,
      type: issue.type, severity: issue.severity, title: issue.title,
      description: issue.description || "", evidenceJson: JSON.stringify(issue.evidence || []),
      suggestion: issue.suggestion || "", status: "active", introducedAtChapter: startChapter,
    },
  });
}
