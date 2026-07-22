/**
 * pipeline3.ts
 *
 * Pipeline 3 v2 — Advanced Chapter Writing
 *
 * Takes a book with (optional) P2 documents and writes a single chapter
 * through a 13-step pipeline that produces consistently higher quality prose
 * than the single-call approach: context selection → scene briefs →
 * chronology checks → draft → style check → final rewrite.
 */

import {
  PROSE_RULES,
  SCENE_RULES,
  CONTEXT_RULES,
  DEFAULT_DECISION_RULE,
  NARRATIVE_SLIDER_RULES,
} from "./writing-rules";
import { getSkill } from "./skillLoader";
import type { NarrativeSliders } from "./storage";
import { definePipeline, runPipelineStep, stepNameOf, llm, preview } from "./pipelineEngine";

export interface ChapterPipelineState {
  pipeline3_id: string;
  book_id: string;
  chapter_number: number;
  chapter_title: string;
  created_at: string;

  // Inputs (set at init, not changed)
  chapter_outline: string;        // The chapter's outline section
  full_outline: string;           // Full book outline (from P2 or assembled summaries)
  character_sheet: string;        // Full character sheet (P2 or dossier)
  world_building: string;         // Full world-building doc (P2 or dossier)
  style_guide: string;            // Prose style guide (or empty string)
  previous_context: string;       // Last 2,000 words of prior text
  long_context: string;           // Last 20,000 words for chrono check B
  tense: string;                  // "past" | "present" — applies to all narration
  author_notes: string;           // Optional free-form author instructions
  sliders: NarrativeSliders | null;
  universe_id: string | null;     // If set, bible compliance check runs
  series_id: string | null;       // For effective bible lookup

  // Pipeline outputs
  plot_extract: string;
  character_extract: string;
  world_extract: string;
  word_count_target: number;
  plot_scene_brief: string;
  character_scene_brief: string;
  world_scene_brief: string;
  chrono_check_a: string;
  consolidated_brief: string;
  bible_compliance: string;       // result of bible check (empty if no universe)
  first_draft: string;
  chrono_check_b: string;
  style_check: string;
  final_draft: string;

  current_step: number;
}

export function createEmptyP3State(
  pipeline3Id: string,
  bookId: string,
  chapterNumber: number,
  chapterTitle: string,
  chapterOutline: string,
  fullOutline: string,
  characterSheet: string,
  worldBuilding: string,
  styleGuide: string,
  previousContext: string,
  longContext: string,
  tense: string,
  authorNotes: string,
  sliders: NarrativeSliders | null,
  universeId: string | null = null,
  seriesId: string | null = null
): ChapterPipelineState {
  return {
    pipeline3_id: pipeline3Id,
    book_id: bookId,
    chapter_number: chapterNumber,
    chapter_title: chapterTitle,
    created_at: new Date().toISOString(),
    chapter_outline: chapterOutline,
    full_outline: fullOutline,
    character_sheet: characterSheet,
    world_building: worldBuilding,
    style_guide: styleGuide,
    previous_context: previousContext,
    long_context: longContext,
    tense,
    author_notes: authorNotes,
    sliders,
    universe_id: universeId,
    series_id: seriesId,
    plot_extract: "",
    character_extract: "",
    world_extract: "",
    word_count_target: 0,
    plot_scene_brief: "",
    character_scene_brief: "",
    world_scene_brief: "",
    chrono_check_a: "",
    consolidated_brief: "",
    bible_compliance: "",
    first_draft: "",
    chrono_check_b: "",
    style_check: "",
    final_draft: "",
    current_step: 0,
  };
}

function formatSliders(sliders: NarrativeSliders | null, characterName: string): string {
  if (!sliders) return "";
  const entries = Object.entries(sliders)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");
  return `\nNARRATIVE SLIDERS FOR ${characterName} (this chapter):\n${entries}\n`;
}

// Static craft rules for the drafting steps, sent as a cacheable system
// prompt. Identical across steps AND across chapters of a book, so prompt
// caching pays off heavily on autopilot runs.
const RULES_SYSTEM = [
  PROSE_RULES,
  SCENE_RULES,
  CONTEXT_RULES,
  NARRATIVE_SLIDER_RULES,
  DEFAULT_DECISION_RULE,
].join("\n\n");

const p3Pipeline = definePipeline<ChapterPipelineState>("Pipeline 3", [
  {
    name: "Initialization",
    run: (s) => `Pipeline 3 initialized for Chapter ${s.chapter_number}: ${s.chapter_title}`,
  },
  {
    name: "Context Selection — Plot",
    run: async (s) => {
      const result = await llm.cheap(
        `You are a parser. Your task is to extract ONLY the section of the book outline that corresponds to Chapter ${s.chapter_number}: "${s.chapter_title}".

FULL OUTLINE:
${s.full_outline}

Instructions:
- Find the entry for Chapter ${s.chapter_number} (titled "${s.chapter_title}" or similar)
- Reproduce that chapter's ENTIRE outline entry verbatim — every field, beat, and note
- Do NOT include any other chapters
- Do NOT summarize or paraphrase — verbatim extraction only
- If you cannot find this exact chapter, output the closest matching entry and flag it

Output ONLY the chapter outline text. Nothing else.`
      );
      s.plot_extract = result.trim();
      return `Plot extract: ${result.substring(0, 200)}...`;
    },
  },
  {
    name: "Context Selection — Characters",
    run: async (s) => {
      const result = await llm.cheap(
        `You are a context selector. Your task is to identify which characters are present or mentioned in Chapter ${s.chapter_number} and extract only their relevant profiles.

CHAPTER ${s.chapter_number} OUTLINE:
${s.plot_extract}

FULL CHARACTER SHEET:
${s.character_sheet}

Instructions:
1. Read the chapter outline and identify:
   A. Characters ACTIVELY in the scene (speaking, acting, physically present)
   B. Characters MENTIONED or indirectly relevant (referred to, thought about, off-page but relevant)

2. For ACTIVE characters:
   - Reproduce their COMPLETE profile from the Character Sheet verbatim
   - Include all sections: Core Identity, Psychology, Relationships, Sliders, Arc Summary, Voice Reference

3. For MENTIONED characters:
   - Include only their name, role, and a 1-2 sentence summary

4. Do NOT include characters not relevant to this chapter.

Output in this format:

## ACTIVE CHARACTERS
[Full profiles verbatim]

## MENTIONED CHARACTERS
[Brief summaries only]`,
        { maxTokens: 8192 }
      );
      s.character_extract = result.trim();
      return `Character extract complete (${result.length} chars)`;
    },
  },
  {
    name: "Context Selection — World-Building",
    run: async (s) => {
      const result = await llm.cheap(
        `You are a context selector. Extract only the world-building elements relevant to Chapter ${s.chapter_number}: "${s.chapter_title}".

CHAPTER ${s.chapter_number} OUTLINE:
${s.plot_extract}

FULL WORLD-BUILDING SHEET:
${s.world_building}

Instructions:
1. Identify which locations, factions, rules, and world elements are active or referenced in this chapter
2. Extract verbatim only those sections from the World-Building Sheet
3. Do NOT include world elements not relevant to this chapter
4. Do NOT include world secrets whose reveal timing is marked as later than this chapter

Output only the relevant world-building sections.`,
        { maxTokens: 8192 }
      );
      s.world_extract = result.trim();
      return `World-building extract complete (${result.length} chars)`;
    },
  },
  {
    name: "Word Count Estimation",
    run: async (s) => {
      const raw = await llm.cheap(
        `You are a story pacing specialist. Based on the chapter outline below, determine the appropriate word count for Chapter ${s.chapter_number}.

CHAPTER ${s.chapter_number} OUTLINE:
${s.plot_extract}

FULL OUTLINE (for pacing context — how this chapter fits the whole):
${s.full_outline}

Rules:
- Minimum: 1000 words
- Maximum: 5000 words
- Action-heavy or climax chapters: lean toward the high end
- Transitional or quiet chapters: lean toward the low end
- Standard chapters: 2000-3500 words

Analyze the scene density, emotional weight, and pacing position, then output ONLY the target word count as a single integer. No units, no explanation, no other text. Example: 2800`
      );
      const parsed = parseInt(raw.trim().replace(/\D/g, ""), 10);
      const clamped = Math.min(5000, Math.max(1000, isNaN(parsed) ? 2500 : parsed));
      // Inflate by 25% since LLMs under-fill
      s.word_count_target = Math.round(clamped * 1.25);
      return `Word count target: ${s.word_count_target} words (${clamped} base × 1.25)`;
    },
  },
  {
    name: "Plot Scene Brief",
    run: async (s) => {
      const cliffhangerGuide = getSkill("CLIFFHANGER_GUIDE");
      const result = await llm.powerful(
        `You are a story architect creating a detailed Plot Scene Brief for Chapter ${s.chapter_number}: "${s.chapter_title}".
This brief will be handed to a novelist and must be specific enough to write from directly.

CHAPTER OUTLINE:
${s.plot_extract}

FULL OUTLINE (context — where this chapter sits):
${s.full_outline}

PREVIOUS CHAPTER TEXT (last 2000 words — where we left off):
${s.previous_context || "(This is the first chapter)"}

Create the PLOT SCENE BRIEF with these required sections:

**Chapter:** Chapter ${s.chapter_number} — ${s.chapter_title}
**POV:** [extract POV character from outline]
**Tense:** ${s.tense}
**Target Word Count:** ${s.word_count_target}

**Plot (verbatim from outline):**
[Copy the plot section from the chapter outline exactly]

**Scene Beats (expanded):**
For each scene in the chapter:
1. [Scene name/descriptor]: [What happens, who does what, what is said, what changes. Specific enough that the novelist knows exactly what to write. Not "they argue" but what they argue about and who says what.]
[Continue for each scene]

**Continuity Pickup:**
[One paragraph: based on the previous chapter text, where are characters, what just happened, what emotional state are they in as this chapter opens? This ensures the chapter opens without repeating what just happened.]

**Cliffhanger / Chapter Exit:**
[Using the cliffhanger guide below, specify exactly what the final image, line, or unresolved question is. Be specific — name the image or phrase, not just the type.]

${cliffhangerGuide}

**Author Notes:**
${s.author_notes || "(None)"}`,
        { system: RULES_SYSTEM, maxTokens: 6144 }
      );
      s.plot_scene_brief = result.trim();
      return preview(s.plot_scene_brief);
    },
  },
  {
    name: "Character Scene Brief",
    run: async (s) => {
      const slidersBlock = formatSliders(s.sliders, "POV character");
      const result = await llm.powerful(
        `You are a character director creating a Character Scene Brief for Chapter ${s.chapter_number}: "${s.chapter_title}".
This brief ensures characters behave consistently with their psychology AND their current emotional state in this specific scene.

PLOT SCENE BRIEF (what happens):
${s.plot_scene_brief}

CHARACTERS FOR THIS CHAPTER:
${s.character_extract}
${slidersBlock}
FULL OUTLINE (for future-proofing — do not reveal what comes after this chapter):
${s.full_outline}

Create the CHARACTER SCENE BRIEF with these required sections:

## ACTIVE CHARACTERS — SCENE-SPECIFIC PROFILES

For each active character, produce a scene-specific version of their profile:

### [Character Name]
**Arc Position (this chapter):** [Where they are in their Lie→Truth journey at this moment — not their overall arc, just right now]

**In This Scene:**
- What they WANT in this scene (immediate, specific)
- What they FEAR in this scene (immediate, specific)
- What they are HIDING from other characters present
- How their STRESS/CONTROL/TRUST sliders differ from baseline in this scene and why

**Future Detail Redactions:**
[List any information from their full profile that must NOT appear in this chapter because it's a future reveal — things the character knows, will do, or is that shouldn't be shown yet]

**Scene-Specific Physicality:**
[Current appearance, clothing, injuries, fatigue level that differs from their baseline profile]

**Voice in This Scene:**
[How the emotional state affects their speech — shorter? More evasive? Uncharacteristically direct? Give 1-2 example lines that only this character would say in this exact moment]

---

## RELATIONSHIP DYNAMICS THIS SCENE
[For each pair of active characters: what's the current status between them, what's unspoken, what each wants from the other, where the friction is]

## SLIDER SETTINGS FOR THIS CHAPTER
[For each active character: list only sliders that DEVIATE from their baseline, with the value and reason]`,
        { system: RULES_SYSTEM, maxTokens: 8192 }
      );
      s.character_scene_brief = result.trim();
      return preview(s.character_scene_brief);
    },
  },
  {
    name: "World-Building Scene Brief",
    run: async (s) => {
      const result = await llm.cheap(
        `You are a world-building editor creating a World Scene Brief for Chapter ${s.chapter_number}: "${s.chapter_title}".

PLOT SCENE BRIEF:
${s.plot_scene_brief}

WORLD-BUILDING ELEMENTS FOR THIS CHAPTER:
${s.world_extract}

FULL OUTLINE (do not reveal world secrets scheduled for later):
${s.full_outline}

Create the WORLD SCENE BRIEF:

## ACTIVE LOCATIONS
For each location used in this chapter:
- **[Name]:** [Sensory description — what the character perceives now, in this scene, under these circumstances. Include sound, smell, texture, temperature, light. Not generic description — this moment, this character's filter.]
- **World rules in effect here:** [Any magic, technology, or social rules that apply in this location during this chapter]
- **What has changed since last time this location appeared:** [If previously visited]

## WORLD RULES ACTIVE THIS CHAPTER
[Only rules that affect what characters can or cannot do in this chapter. Include limits and costs.]

## WORLD SECRETS — STATUS
[Any world secrets that are partially revealed in this chapter: how much is revealed, through what mechanism, what remains hidden]

## ATMOSPHERE NOTES
[The specific sensory texture of this chapter's world — what makes "right now in this world" feel different from the default world state. What has the approaching conflict changed about the atmosphere?]`,
        { maxTokens: 4096 }
      );
      s.world_scene_brief = result.trim();
      return preview(s.world_scene_brief);
    },
  },
  {
    name: "Chronology Check A (Pre-Draft)",
    run: async (s) => {
      const chronologyCheck = getSkill("CHECKS_CHRONOLOGY_CHECK");
      const result = await llm.powerful(
        `You are a continuity editor. Run a Pre-Draft Chronology Check on the assembled scene briefs before the chapter is written.

CHAPTER ${s.chapter_number} SCENE BRIEFS:

PLOT BRIEF:
${s.plot_scene_brief}

CHARACTER BRIEF:
${s.character_scene_brief}

WORLD BRIEF:
${s.world_scene_brief}

FULL OUTLINE (authority — scene briefs must match this):
${s.full_outline}

${chronologyCheck}

Run VARIANT A (Pre-Draft Chronology Check) from the guide above.
Check the scene briefs against the full outline for: timeline consistency, character state consistency, world state consistency, setup/payoff tracking.

Output the PRE-DRAFT CHRONOLOGY REPORT as specified in the skill guide.`
      );
      s.chrono_check_a = result.trim();
      return preview(s.chrono_check_a);
    },
  },
  {
    name: "Scene Brief Consolidation",
    run: async (s) => {
      const result = await llm.cheap(
        `You are a precise editor. Consolidate the three scene briefs into one unified Scene Brief, applying any corrections from the Pre-Draft Chronology Report.

PLOT SCENE BRIEF:
${s.plot_scene_brief}

CHARACTER SCENE BRIEF:
${s.character_scene_brief}

WORLD-BUILDING SCENE BRIEF:
${s.world_scene_brief}

PRE-DRAFT CHRONOLOGY REPORT:
${s.chrono_check_a}

Instructions:
- Merge all three briefs into a single document
- If the Chronology Report says CLEAR: merge as-is
- If the Chronology Report says REVISE: implement only the specified corrections during merge
- Maintain all sections from each brief
- Do not add new content beyond what's in the briefs and the corrections
- The result is the FINAL SCENE BRIEF used to write the chapter

Output the complete unified Scene Brief.`,
        { maxTokens: 8192 }
      );
      s.consolidated_brief = result.trim();
      return "Scene Brief consolidated. Ready to write.";
    },
  },
  {
    name: "First Draft",
    run: async (s) => {
      // Run bible compliance check if universe is attached (cheap, pre-draft)
      if (s.universe_id && !s.bible_compliance) {
        try {
          const { checkSceneBriefAgainstBible } = await import("./universePipeline");
          const { getEffectiveBible } = await import("./universeStorage");
          const bible = await getEffectiveBible(s.universe_id, s.series_id);
          if (bible.trim()) {
            s.bible_compliance = await checkSceneBriefAgainstBible(
              s.consolidated_brief, bible, s.chapter_number
            );
          } else {
            s.bible_compliance = "BIBLE COMPLIANCE: No bible content yet — check skipped.";
          }
        } catch {
          s.bible_compliance = "BIBLE COMPLIANCE: Check failed — proceeding without it.";
        }
      }

      const bibleSection = s.bible_compliance && !s.bible_compliance.includes("CLEAR") && !s.bible_compliance.includes("skipped") && !s.bible_compliance.includes("failed")
        ? `\nBIBLE COMPLIANCE ISSUES TO AVOID:\n${s.bible_compliance}\n\nThe above conflicts between the scene brief and the story bible MUST be resolved before writing. Do not write anything that contradicts the story bible.\n`
        : "";

      const styleSection = s.style_guide
        ? `PROSE STYLE GUIDE (match this voice exactly):\n${s.style_guide}\n`
        : "";

      // Build trope + dimension context if the book has them set
      let tropeBlock = "";
      let dimensionBlock = "";
      if (s.book_id) {
        try {
          const { buildTropePromptBlock } = await import("./tropes/tropeSystem");
          const book = await (await import("./storage")).storage.getBook(s.book_id);
          const tropeSelection = (book as any)?.tropes;
          if (tropeSelection?.primary) {
            tropeBlock = buildTropePromptBlock(tropeSelection, "full");
          }
        } catch { /* non-blocking */ }
        try {
          const { buildDimensionPromptBlock } = await import("./dimensions/dimensionSystem");
          const book = await (await import("./storage")).storage.getBook(s.book_id);
          const dimSelections = (book as any)?.dimensions;
          if (dimSelections && Object.keys(dimSelections).length > 0) {
            dimensionBlock = buildDimensionPromptBlock(dimSelections, "write");
          }
        } catch { /* non-blocking */ }
      }

      const result = await llm.powerful(
        `You are a skilled novelist. Write Chapter ${s.chapter_number}: "${s.chapter_title}" as polished, publication-ready prose.

${styleSection}

${bibleSection}

${tropeBlock ? `${tropeBlock}\n` : ""}${dimensionBlock ? `${dimensionBlock}\n` : ""}
SCENE BRIEF — follow every element:
${s.consolidated_brief}

ADDICTION LOOP — required in every chapter:
- STAKES: Establish character + specific risk + urgency in the first 200 words
- BIG QUESTION: Load a question readers can predict by page 2
- HEAD FAKE: Break that prediction in a way that makes retroactive sense
- RE-HOOK: Open the next loop in the same beat as this chapter's resolution — no gap

Write in ${s.tense} tense. Target ${s.word_count_target} words.
Begin with the chapter title as a Markdown heading.
Follow the scene brief exactly. Output ONLY the chapter prose.`,
        { system: RULES_SYSTEM, maxTokens: 16384 }
      );
      s.first_draft = result.trim();
      return `First draft complete (${result.length} chars, ~${Math.round(result.split(/\s+/).length)} words)`;
    },
  },
  {
    name: "Chronology Check B (Post-Draft)",
    run: async (s) => {
      const chronologyCheck = getSkill("CHECKS_CHRONOLOGY_CHECK");
      const priorText = s.long_context
        ? `PRIOR CHAPTERS TEXT (last ~20,000 words):\n${s.long_context}`
        : "(No prior chapters — this is the opening chapter)";

      const result = await llm.powerful(
        `You are a continuity editor. Run a Post-Draft Chronology Check on the newly written chapter.

${priorText}

NEWLY WRITTEN CHAPTER ${s.chapter_number}:
${s.first_draft}

${chronologyCheck}

Run VARIANT B (Post-Draft Chronology Check) from the guide above.
Check the new chapter against all prior text for: repeated introductions, contradicted facts, relationship state contradictions, active threat continuity, open loop status.

Output the POST-DRAFT CHRONOLOGY REPORT as specified in the skill guide.`
      );
      s.chrono_check_b = result.trim();
      return preview(s.chrono_check_b);
    },
  },
  {
    name: "Style Check",
    run: async (s) => {
      if (!s.style_guide) {
        // No style guide — skip this step
        s.style_check = "SKIPPED — no prose style guide provided for this book.";
        return "Style check skipped (no style guide on file).";
      }

      const styleCheck = getSkill("CHECKS_STYLE_CHECK");
      const result = await llm.powerful(
        `You are a prose style editor. Check the chapter draft against the author's style guide.

PROSE STYLE GUIDE:
${s.style_guide}

CHAPTER ${s.chapter_number} DRAFT:
${s.first_draft}

${styleCheck}

Run the Style Check using the framework above. Check all seven dimensions: sentence architecture, vocabulary/diction, interiority, emotional rendering, dialogue, pacing/rhythm, distinctive patterns.

Output the STYLE IMPROVEMENT PLAN as specified.`
      );
      s.style_check = result.trim();
      return preview(s.style_check);
    },
  },
  {
    name: "Final Rewrite",
    run: async (s) => {
      const hasStyleIssues = s.style_check && !s.style_check.startsWith("SKIPPED");
      const hasChronoIssues = !s.chrono_check_b.includes("PASS");

      if (!hasStyleIssues && !hasChronoIssues) {
        // Both checks passed — first draft is the final draft
        s.final_draft = s.first_draft;
        return "Both checks passed. First draft accepted as final.";
      }

      const chronoSection = hasChronoIssues
        ? `POST-DRAFT CHRONOLOGY REPORT (fix these issues):\n${s.chrono_check_b}\n`
        : "CHRONOLOGY: No issues found.\n";

      const styleSection = hasStyleIssues
        ? `STYLE IMPROVEMENT PLAN (implement these fixes):\n${s.style_check}\n`
        : "STYLE: No issues found.\n";

      const result = await llm.powerful(
        `You are a precise editor. Rewrite Chapter ${s.chapter_number} implementing the specific fixes from the reports below.

ORIGINAL CHAPTER DRAFT:
${s.first_draft}

${chronoSection}

${styleSection}

Instructions:
- Implement ONLY the fixes specified in the reports
- Do NOT rewrite passages not flagged by either report
- Do NOT change the chapter's structure, scene order, or cliffhanger
- Reproduce the ENTIRE chapter with fixes applied
- Maintain the prose voice established in the first draft
- Output in ${s.tense} tense throughout all narration
- Begin with the chapter title heading

Output ONLY the chapter prose.`,
        { system: RULES_SYSTEM, maxTokens: 16384 }
      );
      s.final_draft = result.trim();
      return `Final rewrite complete (${result.length} chars)`;
    },
  },
]);

export function getP3StepName(step: number): string {
  return stepNameOf(p3Pipeline, step);
}

export async function runP3Step(state: ChapterPipelineState): Promise<{
  updatedState: ChapterPipelineState;
  outputPreview: string;
}> {
  return runPipelineStep(p3Pipeline, state);
}
