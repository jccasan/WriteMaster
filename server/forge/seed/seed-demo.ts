import { prisma } from '../db';
import * as fs from 'fs';
import * as path from 'path';
import { detectChapters, createSegments } from '../parsing/chapter-detector';
import { createChunks } from '../parsing/chunker';

export async function seedDemoProject(): Promise<void> {
  const existingProjects = await prisma.project.count();
  if (existingProjects > 0) {
    console.log('Demo seed skipped: projects already exist.');
    return;
  }

  const seedDir = path.join(process.cwd(), 'server', 'forge', 'seed');

  const manuscriptText = fs.readFileSync(path.join(seedDir, 'demo-manuscript.txt'), 'utf-8');
  const outlineText = fs.readFileSync(path.join(seedDir, 'demo-outline.txt'), 'utf-8');
  const storyBibleText = fs.readFileSync(path.join(seedDir, 'demo-story-bible.txt'), 'utf-8');

  const project = await prisma.project.create({
    data: {
      title: 'The Meridian Deception',
      genre: 'contemporary_thriller',
      authorName: 'Demo Author',
      description: 'A contemporary thriller about a tech startup co-founder who discovers her business partner is laundering money through their company.',
    },
  });

  const revision = await prisma.revisionVersion.create({
    data: {
      projectId: project.id,
      label: 'Alpha Draft',
      versionNumber: 1,
      status: 'draft',
    },
  });

  await prisma.fileAsset.createMany({
    data: [
      {
        projectId: project.id,
        revisionVersionId: revision.id,
        type: 'manuscript',
        fileName: 'demo-manuscript.txt',
        mimeType: 'text/plain',
        storagePath: path.join(seedDir, 'demo-manuscript.txt'),
        extractedText: manuscriptText,
      },
      {
        projectId: project.id,
        revisionVersionId: revision.id,
        type: 'outline',
        fileName: 'demo-outline.txt',
        mimeType: 'text/plain',
        storagePath: path.join(seedDir, 'demo-outline.txt'),
        extractedText: outlineText,
      },
      {
        projectId: project.id,
        revisionVersionId: revision.id,
        type: 'story_bible',
        fileName: 'demo-story-bible.txt',
        mimeType: 'text/plain',
        storagePath: path.join(seedDir, 'demo-story-bible.txt'),
        extractedText: storyBibleText,
      },
    ],
  });

  await prisma.betaReaderProfile.createMany({
    data: [
      {
        name: 'Genre Enthusiast',
        description: 'An avid thriller reader who consumes 3-4 books per month in the genre. Prioritizes plot twists, pacing, and authentic procedural detail. Will notice if the police procedure or financial crime mechanics feel implausible.',
        genreBiasesJson: JSON.stringify(['thriller', 'mystery', 'crime_fiction']),
        readingPreferencesJson: JSON.stringify(['fast_pacing', 'plot_driven', 'realistic_detail']),
      },
      {
        name: 'Casual Commercial',
        description: 'A mainstream reader who enjoys popular fiction across genres. Reads for entertainment and emotional engagement. Less concerned with technical accuracy, more focused on whether the story is compelling and the characters are likable.',
        genreBiasesJson: JSON.stringify(['commercial_fiction', 'thriller', 'romance']),
        readingPreferencesJson: JSON.stringify(['accessible_prose', 'relatable_characters', 'satisfying_resolution']),
      },
      {
        name: 'Emotion-First',
        description: 'A reader who prioritizes emotional resonance and character depth. Wants to feel what the protagonist feels. Will flag moments where emotions are told rather than shown, and where character reactions feel inauthentic.',
        genreBiasesJson: JSON.stringify(['literary_fiction', 'womens_fiction', 'thriller']),
        readingPreferencesJson: JSON.stringify(['character_driven', 'emotional_depth', 'internal_conflict']),
      },
      {
        name: 'Pacing-Sensitive',
        description: 'A reader with a low tolerance for slow sections. Skims description-heavy passages and gets impatient with extended internal monologue. Values momentum, scene-level tension, and chapter hooks that compel turning pages.',
        genreBiasesJson: JSON.stringify(['thriller', 'action', 'suspense']),
        readingPreferencesJson: JSON.stringify(['fast_pacing', 'short_chapters', 'cliffhangers', 'minimal_description']),
      },
      {
        name: 'Critical Craft',
        description: 'A writer or MFA-trained reader who evaluates prose at the sentence level. Will catch clichés, filter words, passive voice overuse, and point-of-view inconsistencies. Provides detailed craft-level feedback but may undervalue commercial appeal.',
        genreBiasesJson: JSON.stringify(['literary_fiction', 'literary_thriller']),
        readingPreferencesJson: JSON.stringify(['precise_prose', 'strong_voice', 'structural_innovation', 'subtext']),
      },
    ],
  });

  let detectedChapters = detectChapters(manuscriptText);
  if (detectedChapters.length === 0) {
    detectedChapters = createSegments(manuscriptText, 6);
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
    const combinedText = chunkChapters.map(ch => ch.rawText).join('\n\n---\n\n');
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

  console.log(`Demo project seeded: "${project.title}" (${project.id}) — ${detectedChapters.length} chapters, ${chunkDefs.length} chunks`);
}
