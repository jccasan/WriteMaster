/**
 * pipeline2.ts
 *
 * Pipeline 2: Story Dossier → Character Sheet + World-Building Sheet + Chapter Outline
 *
 * Takes the completed Story Dossier from Pipeline 1 and expands it into three
 * full working documents that the chapter writing pipeline (Pipeline 3) uses
 * as context. This is the missing bridge between dossier and draft.
 *
 * Steps:
 *   0  Init
 *   1  Character Sheet Draft  (powerful)
 *   2  Character Sheet Check — continuity + completeness  (cheap)
 *   3  Character Sheet Final  (cheap, implements check)
 *   4  World-Building Sheet Draft  (powerful)
 *   5  World-Building Sheet Check — internal consistency  (cheap)
 *   6  World-Building Sheet Final  (cheap, implements check)
 *   7  Chapter Outline Draft  (powerful)
 *   8  Outline Continuity Check — does outline match dossier beats?  (powerful)
 *   9  Chapter Outline Final  (cheap, implements check)
 */

import { callLLM } from "./llm";
import {
  AUTHOR_VOICE_CONTRACT,
  STORY_ARCHITECTURE_RULES,
  NARRATIVE_SLIDER_RULES,
  DEFAULT_DECISION_RULE,
  CONTEXT_ENGINEERING_RULES,
} from "./writing-rules";
import { getSkill } from "./skillLoader";

export interface Pipeline2State {
  pipeline2_id: string;
  book_id: string;
  created_at: string;
  dossier: string;
  brain_dump: string;
  genre: string;
  target_chapters: number;
  character_sheet_v1: string;
  character_sheet_check: string;
  character_sheet_final: string;
  world_building_v1: string;
  world_building_check: string;
  world_building_final: string;
  outline_v1: string;
  outline_check: string;
  outline_final: string;
  current_step: number;
}

const STEP_NAMES = [
  "Initialization",
  "Character Sheet — Draft",
  "Character Sheet — Completeness Check",
  "Character Sheet — Final",
  "World-Building Sheet — Draft",
  "World-Building Sheet — Consistency Check",
  "World-Building Sheet — Final",
  "Chapter Outline — Draft",
  "Chapter Outline — Continuity Check",
  "Chapter Outline — Final",
];

export function getP2StepName(step: number): string {
  return STEP_NAMES[step] ?? "Unknown Step";
}

export function createEmptyP2State(
  pipeline2Id: string,
  bookId: string,
  dossier: string,
  brainDump: string,
  genre: string,
  targetChapters: number
): Pipeline2State {
  return {
    pipeline2_id: pipeline2Id,
    book_id: bookId,
    created_at: new Date().toISOString(),
    dossier,
    brain_dump: brainDump,
    genre,
    target_chapters: targetChapters,
    character_sheet_v1: "",
    character_sheet_check: "",
    character_sheet_final: "",
    world_building_v1: "",
    world_building_check: "",
    world_building_final: "",
    outline_v1: "",
    outline_check: "",
    outline_final: "",
    current_step: 0,
  };
}

export async function runP2Step(state: Pipeline2State): Promise<{
  updatedState: Pipeline2State;
  outputPreview: string;
}> {
  const step = state.current_step;
  let outputPreview = "";
  const narrativeSliders = getSkill("NARRATIVE_SLIDERS");
  const logicCheck = getSkill("CHECKS_LOGIC_CHECK");

  switch (step) {
    case 0: {
      outputPreview = `Pipeline 2 initialized for book ${state.book_id}. Target: ${state.target_chapters} chapters.`;
      state.current_step = 1;
      break;
    }

    // ── CHARACTER SHEET ──────────────────────────────────────────────────────

    case 1: {
      const result = await callLLM(
        `You are a master story architect creating a detailed Character Sheet to be used as reference during novel writing.

STORY DOSSIER:
${state.dossier}

AUTHOR BRAIN DUMP:
${state.brain_dump}

${STORY_ARCHITECTURE_RULES}

${narrativeSliders}

${AUTHOR_VOICE_CONTRACT}

Create a comprehensive CHARACTER SHEET. This document will be injected into every chapter-writing prompt, so it must be:
- Specific enough to constrain AI generation toward the author's vision
- Complete enough that a ghostwriter could start tomorrow
- Structured so that individual characters can be extracted by name

For EACH named character (major and minor), include ALL of the following sections. Use this exact format:

---
## [CHARACTER NAME]
**Role:** [protagonist / antagonist / supporting / minor]
**First Appears:** [chapter or scene description]

### Core Identity
- **Age:** [specific or range]
- **Physical:** [3-4 sentences — specific, not generic. Include distinctive details: scars, gait, hands, how they occupy space]
- **Voice/Speech Pattern:** [how they talk — vocabulary level, cadence, what they say vs. don't say, speech under stress]
- **Profession/Skills:** [what they're good at, what they use day-to-day]

### Psychology
- **Want (Conscious Goal):** [what they're actively pursuing]
- **Need (Unconscious Requirement):** [what they must learn/accept to grow]
- **Lie (Flawed Belief):** [the false belief driving their behavior]
- **Ghost (Origin of Lie):** [the past event that created the Lie]
- **Fatal Flaw:** [the specific weakness that will cost them]
- **Moral Code:** [what lines they won't cross — and which ones they will]
- **Contradictions:** [2-3 specific ways they contain opposing traits]

### Relationships
For each significant relationship: how they feel about that person, how they behave around them, what they want from them, what they're afraid to admit.

### Narrative Sliders (Baseline)
Rate each slider at their emotional default when nothing unusual is happening:
- tension: [0-10]
- intimacy: [0-10]
- violence_risk: [0-10]
- wonder: [0-10]
- dread: [0-10]
- trust: [-10 to +10 relative to most people]
- stress: [-10 to +10]
- control: [-10 to +10]
- hope: [-10 to +10]

### Arc Summary
[2-3 paragraphs: where they start, what forces them to change, where they end. Include the moment the change happens and what it costs.]

### Voice Reference
[3-5 lines of representative dialogue that could only come from this character. No context needed — just the lines.]

---

After all characters, include:

## RELATIONSHIP MAP
A text diagram of key relationships: who trusts whom, who wants what from whom, where the alliances and tensions lie.

## CHARACTER KNOWLEDGE MAP
For each major character: what they know at the START of the story that other characters don't know yet.

${DEFAULT_DECISION_RULE}`,
        "powerful",
        undefined,
        16384
      );
      state.character_sheet_v1 = result;
      state.current_step = 2;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 2: {
      const result = await callLLM(
        `You are a continuity editor reviewing a Character Sheet for completeness and consistency with the story dossier.

STORY DOSSIER:
${state.dossier}

CHARACTER SHEET:
${state.character_sheet_v1}

Perform these checks:

1. COMPLETENESS CHECK
- Is every named character from the dossier present in the character sheet?
- Does each major character have all required sections (Core Identity, Psychology, Relationships, Sliders, Arc Summary, Voice Reference)?
- Are any sections vague or generic where the dossier has specific information?

2. CONSISTENCY CHECK
- Do character descriptions match what the dossier establishes?
- Are relationships described consistently — if the dossier says X distrusts Y, does the character sheet show that?
- Do the stated Wants/Needs/Lies align with the plot beats in the dossier?
- Are any sliders clearly wrong for the character's established psychology?

3. MISSING INFORMATION FLAGS
- What important character information from the dossier is absent from the character sheet?
- Are there character arcs in the dossier that aren't reflected in the Arc Summary sections?

Output as: CHARACTER SHEET IMPROVEMENT PLAN
Number each issue. State the fix specifically.`,
        "cheap"
      );
      state.character_sheet_check = result;
      state.current_step = 3;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 3: {
      const result = await callLLM(
        `You are a precise editor. Implement the improvement plan into the Character Sheet without changing anything else.

ORIGINAL CHARACTER SHEET:
${state.character_sheet_v1}

CHARACTER SHEET IMPROVEMENT PLAN:
${state.character_sheet_check}

Instructions:
- Implement ONLY the changes specified in the improvement plan
- Do NOT rewrite sections that were not flagged
- Reproduce the ENTIRE character sheet with changes applied
- Maintain all formatting and section headers

This is the FINAL Character Sheet.`,
        "cheap",
        undefined,
        16384
      );
      state.character_sheet_final = result;
      state.current_step = 4;
      outputPreview = "Character Sheet finalized.";
      break;
    }

    // ── WORLD-BUILDING SHEET ──────────────────────────────────────────────────

    case 4: {
      const result = await callLLM(
        `You are a master world-builder creating a comprehensive World-Building Sheet for a ${state.genre} novel.

STORY DOSSIER:
${state.dossier}

AUTHOR BRAIN DUMP:
${state.brain_dump}

${STORY_ARCHITECTURE_RULES}

${CONTEXT_ENGINEERING_RULES}

Create a WORLD-BUILDING SHEET. This document will be used as reference during chapter writing. Follow the iceberg principle: provide complete detail so the writer knows the world, but note which elements should be revealed gradually vs. established early.

Structure the sheet with these sections:

## WORLD OVERVIEW
[3-4 paragraphs: what kind of world this is, its dominant tone/atmosphere, how it differs from our world or the genre baseline, what makes it feel fresh]

## GEOGRAPHY AND SETTINGS
For each named location, provide:
- **[Location Name]**
  - Physical description (2-3 sentences — sensory specifics: smell, sound, light, texture, temperature)
  - Emotional atmosphere (what it feels like to be there)
  - Who uses/lives there and why
  - What has happened there that matters to the story
  - Reveal timing: [establish early / reveal when character arrives / background detail only]

## POWER STRUCTURES AND FACTIONS
For each faction, organization, or power structure:
- **[Name]**
  - What they control, want, and fear
  - How they enforce their position
  - Their relationship to other factions
  - How they appear to outsiders vs. how they actually operate
  - Key figures (reference Character Sheet names)

## RULES OF THE WORLD
[This section covers whatever is unique to this world's operation: magic systems, technology, laws of physics, social codes, economic systems, etc.]

For each rule or system:
- **[Rule/System Name]**
  - How it works (specific, not vague)
  - Its costs and limits
  - Who controls access to it
  - How it affects the story's conflict
  - What happens when it fails or is abused

## HISTORY THAT MATTERS
[Only history that directly affects current events — not lore for its own sake]
For each relevant historical event:
- What happened
- Who was responsible
- What it changed
- What lie about it persists in the present
- Which characters know the truth

## ATMOSPHERE AND TONE GUIDE
[For chapter writers: what this world feels like on a normal day vs. during the story's escalating crisis. Include sensory anchors — the specific smells, sounds, and textures that signal "we are in this world."]

## WORLD SECRETS (reveal tracking)
Things the world contains that are not known at story start — sorted by when they should be revealed.
- [Secret]: [When/how it should emerge]

${DEFAULT_DECISION_RULE}`,
        "powerful",
        undefined,
        12288
      );
      state.world_building_v1 = result;
      state.current_step = 5;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 5: {
      const result = await callLLM(
        `You are an internal consistency editor reviewing a World-Building Sheet.

STORY DOSSIER:
${state.dossier}

WORLD-BUILDING SHEET:
${state.world_building_v1}

Check for:

1. INTERNAL CONSISTENCY
- Do the world rules contradict each other?
- Do geography and power structures make logical sense together?
- Are there factions whose behavior is inconsistent with their stated goals?

2. DOSSIER ALIGNMENT
- Does the world-building match what the dossier established?
- Are there world details in the dossier that are absent here?
- Are any world rules described differently here vs. in the dossier?

3. STORY UTILITY
- Are there world-building sections that are too vague to be useful for chapter writing?
- Are key settings described with enough sensory specificity?
- Is the reveal timing logical — nothing spoiled too early, nothing hidden when the reader needs it?

Output as: WORLD-BUILDING IMPROVEMENT PLAN
Number each issue. Be specific about what needs to change.`,
        "cheap"
      );
      state.world_building_check = result;
      state.current_step = 6;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 6: {
      const result = await callLLM(
        `You are a precise editor. Implement the improvement plan into the World-Building Sheet without changing anything else.

ORIGINAL WORLD-BUILDING SHEET:
${state.world_building_v1}

WORLD-BUILDING IMPROVEMENT PLAN:
${state.world_building_check}

Instructions:
- Implement ONLY the changes specified in the improvement plan
- Do NOT rewrite sections that were not flagged
- Reproduce the ENTIRE world-building sheet with changes applied
- Maintain all formatting and section headers

This is the FINAL World-Building Sheet.`,
        "cheap",
        undefined,
        12288
      );
      state.world_building_final = result;
      state.current_step = 7;
      outputPreview = "World-Building Sheet finalized.";
      break;
    }

    // ── CHAPTER OUTLINE ───────────────────────────────────────────────────────

    case 7: {
      const result = await callLLM(
        `You are a master story architect creating a complete Chapter-by-Chapter Outline for a ${state.genre} novel.

STORY DOSSIER:
${state.dossier}

CHARACTER SHEET (final):
${state.character_sheet_final}

WORLD-BUILDING SHEET (final):
${state.world_building_final}

AUTHOR BRAIN DUMP:
${state.brain_dump}

${STORY_ARCHITECTURE_RULES}

${narrativeSliders}

Create a complete chapter outline for approximately ${state.target_chapters} chapters. For each chapter, provide ALL of the following. Use this exact format:

---
## Chapter [N]: [Title]

**POV Character:** [name]
**Setting:** [specific location(s) from World-Building Sheet]
**Timeline:** [day/time relative to story start, or absolute date if established]
**Estimated Word Count:** [800–5000, based on scene density and genre pacing]

### Plot
[What happens in this chapter. Specific actions, discoveries, confrontations. Not "they argue" but "X reveals to Y that Z — which contradicts what Y told X in chapter 3." Be specific enough that a ghostwriter knows exactly what scenes to write.]

### Scene Beats
List each scene:
1. [Scene: what happens, where, who's present, what changes]
2. [Scene: ...]

### Character Arcs This Chapter
For each POV or active character:
- **[Name]:** [where they start emotionally, what pushes them, where they end — only if it changes]

### Narrative Sliders (this chapter)
For the POV character, indicate slider values that DIFFER from their baseline:
[Only list sliders that deviate from baseline established in Character Sheet]

### What Changes
[The single most important thing that is different at the end of this chapter vs. the start. If nothing changes, the chapter fails.]

### Cliffhanger / Chapter Exit
[The unresolved question, image, or decision that pulls the reader forward. Must be specific.]

### Continuity Notes
- [Any character knowledge state changes: who learns what]
- [Any physical changes: injuries, item gains/losses]
- [Any world state changes: locations destroyed, alliances shifted, deaths]

---

Structure notes:
- Prologue if appropriate
- Act 1 (chapters 1 through ~25% of total): establish world, characters, and inciting incident
- Midpoint (~50%): protagonist shifts from reaction to action
- Act 3 (final ~25%): escalation, dark night, climax, resolution
- Mark each chapter with its structural position: [Setup / Rising Action / Midpoint / Escalation / Dark Night / Climax / Resolution]

After all chapters, include:

## OPEN LOOPS TRACKER
List every unresolved question the outline creates, and which chapter closes it.

## CHARACTER ARC CHECKPOINTS
For each major character: chapter N (start state) → chapter N (midpoint shift) → chapter N (arc completion).

${DEFAULT_DECISION_RULE}`,
        "powerful",
        undefined,
        16384
      );
      state.outline_v1 = result;
      state.current_step = 8;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 8: {
      const result = await callLLM(
        `You are a developmental editor auditing a Chapter Outline for consistency with the story dossier and internal coherence.

STORY DOSSIER (the authority — outline must match this):
${state.dossier}

CHARACTER SHEET:
${state.character_sheet_final}

CHAPTER OUTLINE:
${state.outline_v1}

Perform these checks:

1. DOSSIER ALIGNMENT
- Do the key plot beats from the dossier (inciting incident, midpoint, pinch points, dark night, climax, closing image) appear in the outline at approximately the right structural positions?
- Are character arcs in the outline consistent with the Ghost/Lie/Want/Need established in the dossier and character sheet?
- Are all named characters accounted for across the outline?

2. PACING AUDIT
- Does Act 1 establish everything needed without dragging?
- Is the midpoint a genuine shift from reaction to action (not just a plot event)?
- Does the escalation build continuously, or are there flat stretches?
- Does the climax actually require the protagonist to resolve their internal arc (Lie vs. Truth)?

3. CONTINUITY AUDIT (pre-write)
- Are there chapters where a character knows something they shouldn't yet?
- Are there timeline impossibilities?
- Are there chapters where nothing changes (start state = end state)?

4. OPEN LOOP TRACKING
- Are all major questions raised in Act 1 closed before the ending?
- Are there threads introduced that are never resolved?
- Are there resolutions that happen without the corresponding setup?

Output as: OUTLINE IMPROVEMENT PLAN
Number each item. Be specific about which chapter and what changes.`,
        "powerful"
      );
      state.outline_check = result;
      state.current_step = 9;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 9: {
      const result = await callLLM(
        `You are a precise editor. Implement the improvement plan into the Chapter Outline without changing anything else.

ORIGINAL CHAPTER OUTLINE:
${state.outline_v1}

OUTLINE IMPROVEMENT PLAN:
${state.outline_check}

Instructions:
- Implement ONLY the changes specified in the improvement plan
- Do NOT restructure chapters that were not flagged
- Reproduce the ENTIRE outline with changes applied
- Maintain all formatting and section headers

This is the FINAL Chapter Outline.`,
        "cheap",
        undefined,
        16384
      );
      state.outline_final = result;
      state.current_step = 10;
      outputPreview = "Chapter Outline finalized. Pipeline 2 complete.";
      break;
    }

    default:
      throw new Error(`Pipeline 2 step ${step} is out of range. Pipeline is complete.`);
  }

  return { updatedState: state, outputPreview };
}
