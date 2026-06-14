import { callLLM } from "./llm";
import { AUTHOR_VOICE_CONTRACT, AI_WRITING_RULES, STORY_ARCHITECTURE_RULES, ANTI_SLOP_FILTER, DEFAULT_DECISION_RULE, CONTEXT_ENGINEERING_RULES } from "./writing-rules";
import { getSkill } from "./skillLoader";

export interface TropePack {
  genre: string;
  display_name: string;
  major_tropes: string[];
  plot_template: string;
  character_archetypes: string[];
  world_building_notes: string;
  emotional_core: string;
}

export interface ProjectState {
  project_id: string;
  created_at: string;
  brain_dump: string;
  genre: string;
  trope_pack: TropePack | null;
  subgenre_label: string;
  pitches: string;
  pitch_selection_reasoning: string;
  best_pitch: string;
  dossier_v1: string;
  emotional_check: string;
  name_check: string;
  dossier_v2: string;
  logic_check: string;
  dossier_final: string;
  current_step: number;
}

export function createEmptyProject(
  projectId: string,
  brainDump: string,
  genre: string,
  tropePack: TropePack
): ProjectState {
  return {
    project_id: projectId,
    created_at: new Date().toISOString(),
    brain_dump: brainDump,
    genre,
    trope_pack: tropePack,
    subgenre_label: "",
    pitches: "",
    pitch_selection_reasoning: "",
    best_pitch: "",
    dossier_v1: "",
    emotional_check: "",
    name_check: "",
    dossier_v2: "",
    logic_check: "",
    dossier_final: "",
    current_step: 0,
  };
}

const STEP_NAMES = [
  "Project Initialization",
  "Subgenre Detection",
  "Pitch Generation",
  "Best Pitch Selection",
  "Pitch Extraction",
  "Story Dossier Draft",
  "Emotional & Theme Check",
  "Character Name Check",
  "Dossier Revision I",
  "Logic & Plausibility Check",
  "Final Polish",
];

export function getStepName(step: number): string {
  return STEP_NAMES[step] || "Unknown Step";
}

function tropePackToString(tp: TropePack): string {
  return `Genre: ${tp.display_name}
Major Tropes:
${tp.major_tropes.map((t) => `- ${t}`).join("\n")}

Plot Template: ${tp.plot_template}

Character Archetypes: ${tp.character_archetypes.join(", ")}

World-Building Notes: ${tp.world_building_notes}

Emotional Core: ${tp.emotional_core}`;
}

export async function runStep(state: ProjectState): Promise<{
  updatedState: ProjectState;
  outputPreview: string;
}> {
  const step = state.current_step;
  const tp = tropePackToString(state.trope_pack!);
  let outputPreview = "";

  switch (step) {
    case 0: {
      outputPreview = `Project initialized for genre: ${state.trope_pack!.display_name}`;
      state.current_step = 1;
      break;
    }

    case 1: {
      const result = await callLLM(
        `You are a literary genre expert. Below are genre tropes and a plot template.\nIdentify the specific subgenre these templates belong to.\nOutput ONLY the subgenre name, nothing else.\nTROPES: ${tp}`,
        "cheap"
      );
      state.subgenre_label = result.trim();
      state.current_step = 2;
      outputPreview = `Detected subgenre: ${state.subgenre_label}`;
      break;
    }

    case 2: {
      const hookRubric = getSkill("HOOK_RUBRIC");
      const result = await callLLM(
        `You are a bestselling author's creative collaborator. Your task is to brainstorm 5 compelling story pitches for a new ${state.subgenre_label} book.

${hookRubric}

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

GENRE TROPES AND PLOT TEMPLATE:
${tp}

AUTHOR BRAIN DUMP:
${state.brain_dump}

Format each pitch in Markdown exactly as:
### Pitch [N]
**Logline:** [one sentence]
**Full Pitch:** [150-200 words]
**Why it works:** [2-3 sentences explaining the hook]

${ANTI_SLOP_FILTER}

${DEFAULT_DECISION_RULE}`,
        "powerful"
      );
      state.pitches = result;
      state.current_step = 3;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 3: {
      const result = await callLLM(
        `You are a senior literary agent. Review these 5 story pitches and identify which single pitch is most commercially viable and emotionally compelling for the ${state.subgenre_label} genre.

PITCHES:
${state.pitches}

Explain in detail why your chosen pitch is strongest. Consider: hook strength, originality, emotional resonance, genre fit, and marketability.
End your response with a line that reads exactly:
BEST PITCH: [N]
where N is the pitch number.`,
        "powerful"
      );
      state.pitch_selection_reasoning = result;
      const match = result.match(/BEST PITCH:\s*(\d)/);
      const bestIndex = match ? match[1] : "1";
      state.current_step = 4;
      outputPreview = `Selected Pitch ${bestIndex} as strongest. ${result.substring(0, 200)}...`;
      break;
    }

    case 4: {
      const match =
        state.pitch_selection_reasoning.match(/BEST PITCH:\s*(\d)/);
      const bestIndex = match ? match[1] : "1";
      const result = await callLLM(
        `From the pitches below, extract and reproduce ONLY the full text of Pitch ${bestIndex}, including its logline and full pitch sections. Output nothing else.
PITCHES: ${state.pitches}`,
        "cheap"
      );
      state.best_pitch = result;
      state.current_step = 5;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 5: {
      const result = await callLLM(
        `You are a master story architect. Using the materials below, create a complete Story Dossier for a ${state.subgenre_label} novel.

BEST PITCH:
${state.best_pitch}

GENRE TROPES AND TEMPLATE:
${tp}

AUTHOR BRAIN DUMP:
${state.brain_dump}

${STORY_ARCHITECTURE_RULES}

The Story Dossier must include ALL of the following sections in Markdown:

## 1. Logline
[One sentence]

## 2. Full Pitch
[150-200 words]

## 3. Characters
For each named character include: Full name, role, physical description (2 sentences), personality (2 sentences), motivation, fatal flaw, arc summary.
REQUIRED for each major character: their Lie (flawed belief), Truth (what they must learn), Want (conscious goal), Need (unconscious requirement), and Ghost (past event that created the Lie).
Include: protagonist, antagonist, 2-3 supporting characters.
The antagonist should mirror or invert the protagonist's Lie — they represent what happens if the protagonist never changes.

## 4. World-Building
Describe: setting overview, unique rules/magic/technology, social/political structure, atmosphere/tone, 3 specific locations with sensory detail.
The world should be a thematic mirror — its structures, conflicts, and atmosphere should reflect the story's central moral argument.
Follow the iceberg principle: provide enough detail that the writer knows the full world, but note which details should be revealed organically through action vs. stated directly.

## 5. Themes
List primary theme and 2 secondary themes. Theme is not a label but a moral argument tested through the plot.
For each theme: explain in concrete terms how it manifests in character choices, world details, and plot consequences — not just "the story explores X."

## 6. Key Plot Beats
- Opening image (what we see on page 1 — establish protagonist in grip of their Lie)
- Inciting incident (disruption that forces engagement)
- Act 1 twist / lock-in moment (point of no return)
- Pinch Point 1 (antagonist pressure — reminder of what protagonist faces)
- Midpoint shift (protagonist moves from reaction to action — a true fulcrum)
- Pinch Point 2 (antagonist's power escalates, consequences of failure shown)
- Dark night of the soul (apparent defeat, internal reckoning with the Lie)
- Climax (protagonist must consciously choose between Lie and Truth to resolve the conflict)
- Closing image (mirror of opening — shows how character and world have changed)

Include a ticking clock or escalating deadline that creates urgency across the plot.

Be specific. No vague placeholders. Write as if you are handing this to a ghostwriter who needs to start writing tomorrow.

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

${CONTEXT_ENGINEERING_RULES}

${ANTI_SLOP_FILTER}

${DEFAULT_DECISION_RULE}`,
        "powerful"
      );
      state.dossier_v1 = result;
      state.current_step = 6;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 6: {
      const emotionalCheck = getSkill("CHECKS_EMOTIONAL_CHECK");
      const result = await callLLM(
        `You are a developmental editor specializing in emotional resonance and theme.
Analyze the Story Dossier below using the emotional check framework provided.

STORY DOSSIER:
${state.dossier_v1}

${emotionalCheck}`,
        "powerful"
      );
      state.emotional_check = result;
      state.current_step = 7;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 7: {
      const nameBlacklist = getSkill("CHARACTER_NAME_BLACKLIST");
      const nameCheck = getSkill("CHECKS_CHARACTER_NAME_CHECK");
      const result = await callLLM(
        `You are a fiction editor. Review the character names in the Story Dossier below and flag any that read as AI-generated.

${nameBlacklist}

STORY DOSSIER:
${state.dossier_v1}

AUTHOR BRAIN DUMP:
${state.brain_dump}

${nameCheck}`,
        "cheap"
      );
      state.name_check = result;
      state.current_step = 8;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 8: {
      const result = await callLLM(
        `You are a precise editor. Your job is to implement specific improvement instructions into a Story Dossier without changing anything else.

ORIGINAL STORY DOSSIER:
${state.dossier_v1}

EMOTIONAL IMPROVEMENT PLAN:
${state.emotional_check}

CHARACTER NAME IMPROVEMENT PLAN:
${state.name_check}

Instructions:
- Implement ONLY the changes suggested in both improvement plans
- Do NOT rewrite sections that weren't flagged
- Do NOT add new content beyond what was suggested
- Reproduce the ENTIRE dossier with changes applied
- Maintain all original Markdown section headers

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

${ANTI_SLOP_FILTER}

${DEFAULT_DECISION_RULE}`,
        "cheap"
      );
      state.dossier_v2 = result;
      state.current_step = 9;
      outputPreview = "Dossier revised with emotional and name improvements.";
      break;
    }

    case 9: {
      const logicCheck = getSkill("CHECKS_LOGIC_CHECK");
      const result = await callLLM(
        `You are auditing an early-stage story dossier for logical consistency and plausibility.

<dossier>
${state.dossier_v2}
</dossier>

${logicCheck}`,
        "powerful"
      );
      state.logic_check = result;
      state.current_step = 10;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 10: {
      const result = await callLLM(
        `You are a precise editor. Implement the fixes from the Logic Audit Report into the Story Dossier.

STORY DOSSIER:
${state.dossier_v2}

LOGIC AUDIT REPORT:
${state.logic_check}

Instructions:
- The audit report has 6 sections: Premise Logic, Character-World Fit, World-Building Coherence, Plot Setup Plausibility, Early-Stage Convenience Flags, and Specific Fixes
- Implement ONLY the fixes described in Section 6 (Specific Fixes) — each has an Issue, Why it breaks, and Suggested fix
- Do NOT change anything that was not explicitly flagged with a fix in Section 6
- If Section 6 says "No significant issues identified," reproduce the dossier unchanged
- Reproduce the ENTIRE dossier with changes applied
- Maintain all Markdown section headers
This is the FINAL version of the dossier.

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

${ANTI_SLOP_FILTER}

${DEFAULT_DECISION_RULE}`,
        "cheap"
      );
      state.dossier_final = result;
      state.current_step = 11;
      outputPreview = "Final dossier complete!";
      break;
    }

    default:
      throw new Error(`Invalid step: ${step}. Pipeline is already complete.`);
  }

  return { updatedState: state, outputPreview };
}
