/**
 * writing-rules.ts
 *
 * Focused, non-redundant prompt constants for the writing pipeline.
 * Stripped of: character-specific voice contracts, duplicate AI-tell lists,
 * cargo-cult phase workflows, and raw-material instructions.
 *
 * What's here:
 *   PROSE_RULES       — the essential anti-AI-tell list (replaces AI_WRITING_RULES + ANTI_SLOP_FILTER)
 *   SCENE_RULES       — scene structure and execution
 *   CONTEXT_RULES     — pre-write mental setup
 *   STORY_ARCHITECTURE_RULES — for outlines only
 *   CHAPTER_SUMMARY_TEMPLATE — summary format
 *   NARRATIVE_SLIDER_RULES   — slider expression guide
 *   DEFAULT_DECISION_RULE    — tiebreaker heuristics
 *
 * Removed (intentionally):
 *   AUTHOR_VOICE_CONTRACT    — was character-specific (Miranda); now handled by user style guide
 *   LAYERED_GENERATION_WORKFLOW — models don't run ordered phases; was adding noise
 *   RAW_MATERIAL_MINDSET     — relevant to editing, not first draft
 *   READER_VALUE_TEST        — merged into SCENE_RULES
 *   ANTI_SLOP_FILTER         — merged into PROSE_RULES
 *   AI_WRITING_RULES         — merged into PROSE_RULES
 */

// ─── PROSE RULES ─────────────────────────────────────────────────────────────
// The consolidated anti-AI-tell ruleset. Replaces AI_WRITING_RULES + ANTI_SLOP_FILTER.
// Used in: Pipeline 3 first draft, Pipeline 4 line edit.

export const PROSE_RULES = `
PROSE RULES — WRITE LIKE A HUMAN NOVELIST:

BANNED WORDS (never use these): delve, pivotal, crucial, vibrant, tapestry, nestled,
groundbreaking, profound, indelible, underscores, highlights, bolstered, garnered,
foster, enhance, enduring, showcasing, exemplifies, encompassing, renowned.

BANNED PHRASES: "a testament to", "serves as", "stands as", "marks a", "in the heart of",
"setting the stage", "deeply rooted", "diverse array", "it is important to note",
"needless to say", "at the end of the day", "only time will tell", "align with",
"resonate with", "in conclusion".

BANNED SENTENCE OPENERS: "Additionally,", "Furthermore,", "Moreover," — restructure instead.

BANNED PATTERNS:
- "Not just X, but Y" / "Not only X, but also Y" — the #1 AI construction. Rewrite.
- Rule-of-three padding when two items make the point — use the exact number needed.
- Participial tails that editorialize: "...highlighting the importance of..." — cut.
- Copula avoidance: "serves as / stands as / marks / represents" when "is" works — use "is".
- Thesaurus cycling: calling the same thing three different fancy names — pick one.
- Em-dash overuse: use commas or break into two sentences instead. Never more than one per page.
- "Suddenly" — once per chapter maximum.
- "Little did they know" — never.

PROSE QUALITY:
- Vary sentence length. Short sentences for impact. Fragments valid. Long sentences earn
  their length through sensory layering, not decoration.
- End sentences on the strongest word. Never trail off with weak prepositional clauses.
- Show emotion through physical symptoms, body language, displaced behavior — never label it.
  BAD: "She felt afraid." GOOD: "Her mouth went dry. She didn't look at the door."
- Characters don't narrate their own feelings. Cut "She felt X because Y" — show X.
- No manufactured urgency. Not every moment is a turning point.
- Page-level value: every page must deliver at least one of: revelation, character shift,
  sensory immersion, tension escalation, or emotional payoff. No filler pages.
- Specific beats generic: "the Glock" beats "the gun". "NPR Morning Edition" beats "the radio".

TENSE DISCIPLINE:
- Stay in the established tense throughout narration.
- Dialogue and direct thought may use any natural tense — narration must stay consistent.
`;

// ─── SCENE RULES ─────────────────────────────────────────────────────────────
// Scene structure, pacing, and execution. Concise version of SCENE_WRITING_RULES.

export const SCENE_RULES = `
SCENE RULES:

STRUCTURE: Every scene needs a Goal (what POV character wants), Conflict (what opposes them),
Outcome (value shift — something changes). No goal + no conflict = scene doesn't earn its page.
Begin late, end early. Enter close to the conflict. Exit before tension fully resolves.

DOUBLE-UP: Every scene must do at least two things simultaneously: plot + character,
or information + conflict, or action + intimacy. Single-purpose scenes flatten pacing.

PHYSICALITY: Specify hands, objects, positions, cause-and-effect. Ground in at least
three senses (sound, smell, texture, temperature) not just sight.

PACING: Fast (action/urgency): short sentences, clipped dialogue, concrete sensory detail.
Slow (atmosphere/dread): longer sentences, detailed description, internality. Vary deliberately.

DIALOGUE: Characters dodge, interrupt, imply, evade. They rarely say exactly what they mean.
Use action beats over dialogue tags. Voices must be distinct — characters don't all sound the same.

EMOTIONAL TRUTH: Emotions arrive delayed or displaced. Grief surfaces at the shooting range,
not at the funeral. Rage comes out over spilled coffee. Characters suppress, then crack.

ENDING: Every scene closes on an open circuit — an unresolved question that pulls forward.
Closure kills curiosity. The Re-hook fires in the same beat as the resolution, not after.
`;

// ─── CONTEXT RULES ───────────────────────────────────────────────────────────
// Pre-write mental setup. Replaces CONTEXT_ENGINEERING_RULES.

export const CONTEXT_RULES = `
BEFORE WRITING — silently determine (do not output):
1. What does the POV character KNOW right now?
2. What do they WANT right now (immediate scene desire)?
3. What STANDS IN THE WAY (external obstacle, internal resistance, or both)?
4. What EMOTIONAL PRESSURE is active (carried from prior scenes)?
5. What CONTINUITY FACTS must not be violated (injuries, locations, who knows what)?

Use only context relevant to this scene. Don't force in unrelated lore or world-building.
`;

// ─── STORY ARCHITECTURE RULES ────────────────────────────────────────────────
// For outlines and dossier generation. Not used in chapter writing.

export const STORY_ARCHITECTURE_RULES = `
STORY ARCHITECTURE RULES:
Apply these principles when constructing plot structures, outlines, and character arcs.

CHARACTER ARC ENGINE:
- Every protagonist needs a Lie (flawed belief), a Truth (what they must learn), a Want (conscious external goal driven by the Lie), and a Need (unconscious internal requirement for growth).
- The Lie is born from a Ghost — a significant past event that created their flawed worldview. Define the Ghost explicitly; without it, the internal struggle feels arbitrary.
- A well-structured plot makes it impossible to achieve the Want without addressing the Need. The external goal forces confrontation with the internal flaw.
- Three arc types: Positive (overcomes Lie, embraces Truth), Negative (rejects Truth or embraces worse Lie), Flat (already has Truth, changes the world around them). Choose deliberately.
- The antagonist should be a dark mirror — someone who has taken the protagonist's Lie to its extreme. Defeating the villain requires defeating the part of themselves that is like the villain.

PLOT STRUCTURE:
- Every story needs a ticking element — an approaching event or deadline that anchors anticipation. Without it, tension dissipates into abstraction.
- Midpoint must be a true shift from reaction to action. The protagonist stops running and starts fighting (or vice versa). This is the fulcrum of the whole story.
- Pinch points must be antagonist pressure — direct reminders of what the protagonist is up against. Not arbitrary obstacles, but the antagonist flexing power.
- The climax requires a conscious choice that embodies the protagonist's rejection (or acceptance) of their Lie. It cannot be solved by luck, convenience, or external rescue.

WORLD-BUILDING:
- Follow the iceberg principle: know 100% of your world, show only 10% on the page. Reveal through character action, prejudice, and struggle — never through exposition dumps.
- The world should be a thematic mirror reflecting the story's central conflict.
- World-building details that don't affect character decisions or plot outcomes should be cut or compressed.

THEME:
- Theme is not a label ("love conquers all") but a moral argument tested through the plot. Introduce the central moral problem early, challenge the protagonist's values through forced choices, and demand costly decisions.
- Theme must emerge organically from character choices and consequences. Never have a character state the theme explicitly.

CONTINUITY:
- Track these elements across chapters: timeline (date/time), character locations, status/injuries, inventory/props, obligations/debts, secrets/knowledge map (who knows what), relationship states (trust/leverage/conflict), active threats, and open loops.
`;

// ─── CHAPTER SUMMARY TEMPLATE ────────────────────────────────────────────────

export const CHAPTER_SUMMARY_TEMPLATE = `
Produce a continuity snapshot with these exact sections:

**Plot Summary:** [What happened in this chapter, 3-5 sentences]

**Key Events:**
- [Major event 1]
- [Major event 2]
...

**Character States at Chapter End:**
- [Character name]: [emotional state, physical location, key knowledge gained, decisions made]
...

**What Changed:** [What is different about the story world — relationships, power dynamics, knowledge, stakes]

**Open Threads:** [Unresolved questions, pending threats, setups needing payoff]

**Continuity Tracking:**
- Timeline: [date/time if established, elapsed time]
- Locations: [where each key character is at chapter end]
- Status/Injuries: [physical limits, fatigue, meds, resources]
- Inventory/Props: [items gained, lost, used, or broken this chapter]
- Obligations/Debts: [promises made, debts owed, blackmail, warrants, deals struck]
- Secrets/Knowledge Map: [who learned what this chapter, who still doesn't know]
- Relationship States: [trust/leverage/conflict shifts between characters]
- Active Threats: [hunters, deadlines, surveillance, danger level]

**Tone/Pacing Note:** [Was this high-action, reflective, transitional? What energy should the next chapter carry?]
`;

// ─── NARRATIVE SLIDER RULES ──────────────────────────────────────────────────

export const NARRATIVE_SLIDER_RULES = `
NARRATIVE SLIDER SYSTEM:
Characters are not static. A character's behavior in every scene must reflect BOTH their baseline traits AND their current dynamic state. The following sliders represent emotional/situational pressure that overrides default characterization for this scene.

SLIDER DEFINITIONS:
- tension (0-10): Overall scene pressure. High tension sharpens pacing, compresses thought, tightens dialogue. Low tension allows breathing room and observation.
- intimacy (0-10): Emotional closeness or vulnerability exposure. High intimacy increases sensitivity, hesitation, attraction, or discomfort depending on relationship context. Low intimacy keeps interactions transactional.
- violence_risk (0-10): Proximity to physical danger. High violence_risk activates survival instincts, hyperawareness, adrenaline responses. Characters notice exits, weapons, cover.
- wonder (0-10): Sense of discovery or awe. High wonder opens perception, slows the character's internal clock, invites detailed observation. Low wonder makes the world feel routine.
- dread (0-10): Anticipation of something terrible. High dread darkens interpretation of neutral stimuli, creates paranoia, amplifies small sounds and shadows. Characters catastrophize.
- trust (-10 to +10): Willingness to be vulnerable with others present. Negative trust creates guardedness, deception, testing behavior. Positive trust allows honesty and cooperation.
- stress (-10 to +10): Accumulated mental/emotional load. High stress shifts dialogue (shorter, sharper), reduces patience, increases impulsiveness. Low/negative stress creates calm deliberation.
- control (-10 to +10): Sense of agency over the situation. Negative control increases chaos, defensive reactions, or desperate grasping for leverage. Positive control creates confidence, strategic thinking.
- hope (-10 to +10): Belief that things can improve. Negative hope creates resignation, nihilism, reckless behavior. Positive hope can create risk-taking, openness, or denial of danger.

EXPRESSION RULES:
Do NOT mention slider values or names in the prose. Express through word choice, sentence rhythm, body language, micro-behaviors, pacing, dialogue turn-taking, internal thought patterns, decisions under pressure, and sensory filtering.
`;

// ─── DEFAULT DECISION RULE ───────────────────────────────────────────────────

export const DEFAULT_DECISION_RULE = `
WHEN UNCERTAIN, ALWAYS CHOOSE:
Specific over vague · Implied over explained · Causal over convenient
Character-true over theatrically dramatic · Concrete over abstract
Earned over coincidental · Messy over tidy when the mess is dramatically stronger
`;

// ─── LEGACY EXPORTS (kept for backward compatibility with pipeline.ts) ────────
// These are the old names — point to the new consolidated constants.

export const AUTHOR_VOICE_CONTRACT = "";        // Removed — use user style guide
export const AI_WRITING_RULES = PROSE_RULES;    // Legacy alias
export const SCENE_WRITING_RULES = SCENE_RULES; // Legacy alias
export const CONTEXT_ENGINEERING_RULES = CONTEXT_RULES; // Legacy alias
export const ANTI_SLOP_FILTER = "";             // Merged into PROSE_RULES
export const READER_VALUE_TEST = "";             // Merged into SCENE_RULES
export const RAW_MATERIAL_MINDSET = "";          // Removed
export const LAYERED_GENERATION_WORKFLOW = "";   // Removed
