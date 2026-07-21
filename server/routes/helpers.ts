// Shared helpers moved verbatim out of the old monolithic server/routes.ts.
// Used across the books, chapters, and pipelines routers.
import type { BookChapter, NarrativeSliders } from "../storage";
import { NARRATIVE_SLIDER_RULES } from "../writing-rules";

export function buildPreviousSummariesContext(chapters: BookChapter[], upToChapter: number): string {
    const relevant = chapters
      .filter(c => c.chapter_number < upToChapter && c.summary)
      .sort((a, b) => a.chapter_number - b.chapter_number);

    if (relevant.length === 0) {
      return "No previous chapters yet — this is the first chapter.";
    }

    const RECENT_FULL_COUNT = 5;

    if (relevant.length <= RECENT_FULL_COUNT) {
      return relevant
        .map(c => `### Chapter ${c.chapter_number}: ${c.title}\n${c.summary}`)
        .join("\n\n");
    }

    const older = relevant.slice(0, relevant.length - RECENT_FULL_COUNT);
    const recent = relevant.slice(relevant.length - RECENT_FULL_COUNT);

    const compressedOlder = older.map(c => {
      const plotMatch = c.summary!.match(/\*\*Plot Summary:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      const changedMatch = c.summary!.match(/\*\*What Changed:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      const threadsMatch = c.summary!.match(/\*\*Open Threads:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      const continuityMatch = c.summary!.match(/\*\*Continuity Tracking:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      const parts = [`### Chapter ${c.chapter_number}: ${c.title} (compressed)`];
      if (plotMatch) parts.push(plotMatch[0].trim());
      if (changedMatch) parts.push(changedMatch[0].trim());
      if (threadsMatch) parts.push(threadsMatch[0].trim());
      if (continuityMatch) parts.push(continuityMatch[0].trim());
      if (parts.length === 1) parts.push(c.summary!.substring(0, 500) + "...");
      return parts.join("\n");
    }).join("\n\n");

    const fullRecent = recent
      .map(c => `### Chapter ${c.chapter_number}: ${c.title}\n${c.summary}`)
      .join("\n\n");

    return `[EARLIER CHAPTERS — compressed for context efficiency]\n\n${compressedOlder}\n\n[RECENT CHAPTERS — full detail]\n\n${fullRecent}`;
  }

export function formatSlidersBlock(sliders?: NarrativeSliders | null): string {
    if (!sliders) return "";
    return `
[NARRATIVE_SLIDERS] — Apply these dynamic values to character behavior in this scene:
- tension: ${sliders.tension}/10
- intimacy: ${sliders.intimacy}/10
- violence_risk: ${sliders.violence_risk}/10
- wonder: ${sliders.wonder}/10
- dread: ${sliders.dread}/10
- trust: ${sliders.trust} (range -10 to +10)
- stress: ${sliders.stress} (range -10 to +10)
- control: ${sliders.control} (range -10 to +10)
- hope: ${sliders.hope} (range -10 to +10)

${NARRATIVE_SLIDER_RULES}`;
  }

export const VARIANT_LENSES = [
    { name: "Tighter Pacing", instruction: "CREATIVE LENS — TIGHTER PACING: Compress transitions, shorten dialogue exchanges, increase the pace of reveals and complications. Every paragraph must earn its space. Cut breathing room in favor of momentum. The reader should feel pulled through the chapter." },
    { name: "More Atmospheric", instruction: "CREATIVE LENS — MORE ATMOSPHERIC: Lean into environmental texture, sensory layering, and mood. Let the setting become a character. Expand quiet moments with physical detail that creates dread, wonder, or unease. The reader should feel the world pressing in." },
    { name: "Stronger Dialogue Focus", instruction: "CREATIVE LENS — STRONGER DIALOGUE FOCUS: Let conversation drive the scene. Reduce narration between dialogue beats. Make characters reveal themselves through what they say, dodge, interrupt, and refuse to say. Subtext carries the weight. The chapter should feel like eavesdropping." },
  ];
