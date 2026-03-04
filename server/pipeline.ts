import { callLLM } from "./llm";
import { AI_WRITING_RULES, STORY_ARCHITECTURE_RULES } from "./writing-rules";

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
      const result = await callLLM(
        `You are a bestselling author's creative collaborator. Your task is to brainstorm 5 compelling story pitches for a new ${state.subgenre_label} book.

HOOK RUBRIC (every pitch must satisfy all of these):
- Has a protagonist with a clear, visceral want AND a hidden need
- Has a ticking clock or escalating pressure
- Has a unique world or setting detail that makes it feel fresh
- Has a central moral dilemma or impossible choice
- Emotionally hooks the reader in the first two sentences
- Uses no clichés or AI-obvious phrases

${AI_WRITING_RULES}

GENRE TROPES AND PLOT TEMPLATE:
${tp}

AUTHOR BRAIN DUMP:
${state.brain_dump}

Format each pitch in Markdown exactly as:
### Pitch [N]
**Logline:** [one sentence]
**Full Pitch:** [150-200 words]
**Why it works:** [2-3 sentences explaining the hook]`,
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

${AI_WRITING_RULES}`,
        "powerful"
      );
      state.dossier_v1 = result;
      state.current_step = 6;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 6: {
      const result = await callLLM(
        `You are a developmental editor specializing in emotional resonance and theme.
Analyze the Story Dossier below.

STORY DOSSIER:
${state.dossier_v1}

Perform these checks:
1. THEME COHESION: Theme is a moral argument tested through the plot, not a label. For each theme, list every major story moment where it should land but currently feels absent or weak. Does the protagonist face forced choices that test the theme?
2. EMOTIONAL PAYOFF: Does the protagonist's arc deliver a genuine gut punch? Check the Lie→Truth arc: is the Ghost concrete enough? Is the Midpoint a true shift from reaction to action? Does the climax force a conscious choice between Lie and Truth? Where does the arc fall flat?
3. CHARACTER MOTIVATION: Is every character's Want vs. Need tension specific and believable? Does the antagonist mirror or invert the protagonist's Lie? Are supporting characters full people with their own agendas?
4. SUSPENSE ENGINE: Is there a ticking clock or escalating deadline? Does every major scene end with an open circuit? Would the Zeigarnik effect keep a reader turning pages?
5. CONVENIENCE AUDIT: Are there coincidences, convenient discoveries, or external rescues where character action should drive the plot?

For each issue found, write a specific, actionable improvement instruction.
Format as a numbered list titled: EMOTIONAL IMPROVEMENT PLAN`,
        "powerful"
      );
      state.emotional_check = result;
      state.current_step = 7;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 7: {
      const result = await callLLM(
        `You are a fiction editor. Review the character names in the Story Dossier below and flag any that sound like AI-generated filler names.

NAMES TO AVOID (flag if any character uses these):
Marcus, Nora, Lyra, Lara, Thorn, Kale, Kalen, Kayla, Silas, Vayne, Vesper, Chen, Aria, Zara, Mira, Zephyr, Caden, Aiden, Ethan, Lucas, Elara, Seraphina, Theron, Aldric, Malachar, Cassius, Rylan, Talon, Orion, Drake, Kane, Raven

EXCEPTION: If a name was specifically mentioned in the Author Brain Dump, do not flag it.

STORY DOSSIER:
${state.dossier_v1}

AUTHOR BRAIN DUMP:
${state.brain_dump}

For each flagged name:
- State the character's role
- Explain in 1 sentence why this name feels AI-generic
- Propose 3 alternative names that fit the character's culture and role
- Justify each alternative in 1 sentence

Format as: CHARACTER NAME IMPROVEMENT PLAN`,
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

${AI_WRITING_RULES}`,
        "cheap"
      );
      state.dossier_v2 = result;
      state.current_step = 9;
      outputPreview = "Dossier revised with emotional and name improvements.";
      break;
    }

    case 9: {
      const result = await callLLM(
        `You are a developmental editor and logic expert. Rigorously analyze the Story Dossier below for internal consistency and plausibility.

STORY DOSSIER:
${state.dossier_v2}

Check for ALL of the following:
1. TIMELINE LOGIC: Do events happen in a sequence that makes sense? Is there a clear ticking clock or escalating deadline?
2. CHARACTER CONSISTENCY: Do characters act in ways that contradict their stated motivations, Lie/Truth arcs, or abilities? Does the antagonist function as a dark mirror of the protagonist?
3. WORLD-BUILDING RULES: Does any plot beat violate the established rules of the world's magic, technology, or social structure? Does the world serve as a thematic mirror?
4. PLOT PLAUSIBILITY (ECONOMY OF CONVENIENCE): Are there any moments where a character does something convenient rather than logical? Are revelations earned through character action or handed out by authorial convenience? Flag every coincidence.
5. STAKES CONSISTENCY: Are the stakes clearly established and consistently maintained? Do pinch points show the antagonist's power? Does the midpoint represent a true shift from reaction to action?
6. ARC INTEGRITY: Is the protagonist's Lie→Truth journey complete? Is the Ghost concrete? Does the climax force a conscious choice? Does the ending echo the opening?
7. CHEKHOV'S ARMORY: Are there introduced elements (weapons, abilities, relationships, secrets) that never pay off? Are there payoffs that lack proper setup?

For each issue found, write a specific, actionable fix.
Format as a numbered list titled: LOGIC IMPROVEMENT PLAN`,
        "powerful"
      );
      state.logic_check = result;
      state.current_step = 10;
      outputPreview = result.substring(0, 300) + "...";
      break;
    }

    case 10: {
      const result = await callLLM(
        `You are a precise editor. Implement the logic improvement plan into the Story Dossier.

STORY DOSSIER:
${state.dossier_v2}

LOGIC IMPROVEMENT PLAN:
${state.logic_check}

Instructions:
- Implement ONLY the changes in the Logic Improvement Plan
- Do NOT change anything not flagged
- Reproduce the ENTIRE dossier with changes applied
- Maintain all Markdown section headers
This is the FINAL version of the dossier.

${AI_WRITING_RULES}`,
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
