export const AUTHOR_VOICE_CONTRACT = `
AUTHOR VOICE CONTRACT — MATCH THIS STYLE EXACTLY:
This is the author's established voice. All prose output must match these characteristics. Deviating from this voice contract makes the output unusable.

SENTENCE ARCHITECTURE:
- Vary sentence length aggressively. Use fragments for impact. One-word sentences are valid. Long sentences earn their length through sensory layering, not decoration.
  GOOD: "Sirens. Shouting. Flashing lights."
  GOOD: "Draw, aim, fire."
  GOOD: "He collapsed like someone cut his marionette strings."
- Use sentence fragments as a rhythmic tool — especially for internal thoughts, rapid observations, and emotional compression.
  GOOD: "Not a charter. Once he takes off, he can't land."
  GOOD: "No phone. A clock was vaguely ticking on the far wall. No sound but the hum of the lights."
- End sentences and paragraphs on the strongest word or image. Never trail off with weak prepositional clauses.
  GOOD: "This wasn't a home built for comfort. It was built to endure."
  BAD: "This wasn't a home that was built for making people comfortable in any way."

PROSE TEXTURE:
- Clean, muscular, cinematic. Every sentence earns its place. If a detail doesn't affect action, character, or mood, cut it.
- Descriptions are PHYSICAL and SPECIFIC — grounded in what can be seen, heard, smelled, touched, tasted. Never abstract.
  GOOD: "Heat and damp air rolled in together, heavy and clinging, catching in the throat — the taste of metal left too long in the sun."
  GOOD: "The blood on her fingers was wet but not warm."
  BAD: "The atmosphere was oppressive and foreboding."
- Similes and metaphors are CONCRETE, often mechanical, military, or bodily. Never flowery or literary-sounding.
  GOOD: "like a mechanic listening to an engine"
  GOOD: "like someone cut his marionette strings"
  GOOD: "the kind of look cops gave new partners"
  BAD: "like a flower wilting in the merciless sun of despair"
- World-building through SENSORY TEXTURE and character reaction, never exposition dumps. Every place has a smell, a sound, a temperature, a weight on the skin. The character's personality colors how they observe.
  GOOD: "Every place had its own smell; Bamako's was diesel exhaust, smoke, wet dust, and the slow breath of the river."
  GOOD: "Langley didn't smell like anything. It absorbed sound, light, and confidence with equal efficiency."

DIALOGUE:
- Clipped, natural, often interrupted. Characters talk past each other. People don't make speeches — they react, deflect, redirect.
  GOOD: "'That's convenient.' / 'It's dangerous,' Noah replied. 'Which is why I'm asking for—' / 'No.'"
  GOOD: "'How shortly?' Miranda asked. / Mackenzie smiled apologetically and left without answering."
- Profanity is NATURAL and CHARACTER-SPECIFIC, never gratuitous. Miranda swears when stressed or defensive. Others may not swear at all. Profanity reveals character under pressure.
  GOOD: "'Oh Jesus fucking Christ' Miranda mutters."
  GOOD: "'Fuck,' Martin said before thinking."
- Sarcasm and dark humor are ARMOR, especially for Miranda. Used to deflect vulnerability, cope with absurdity, or establish dominance in uncomfortable situations.
  GOOD: "'Quite the Airbnb you've got here.'"
  GOOD: "'I packed flannel.'"
  GOOD: "'Great. Hot, muggy, possible chemical exposure, and whoever did this still out there. You really know how to show a girl a good time.'"
- Dialogue REVEALS through omission. What characters DON'T say matters as much as what they do. Characters dodge questions, redirect, go silent. The reader reads between the lines.
  GOOD: "'Ben?' / 'Yes?' / 'What's he like?' / 'I'm trying to think of the best way to phrase it.'"

EMOTIONAL RENDERING:
- NEVER label emotions directly. Show them through PHYSICAL symptoms, body language, micro-behaviors, and displaced actions.
  GOOD: "Miranda felt the sting behind her eyes and crushed it down before it showed."
  GOOD: "His hand clenched on the windowsill. The wood creaked."
  GOOD: "Noah struck the desk hard enough to spill the coffee, not hard enough to be satisfying."
  BAD: "Miranda felt deeply sad and conflicted about what had happened."
- Emotions are often DELAYED, DISPLACED, or SUPPRESSED. Characters process later, through minor triggers. Grief hits while ironing a shirt. Rage comes out over spilled coffee instead of dead colleagues.
- Internal thoughts rendered as FRAGMENTS, mixed into the prose, sometimes as direct thought without italics:
  GOOD: "Not you. Not here. Don't give them anything."
  GOOD: "Asshat. He's doing this on purpose."
  GOOD: "What will I tell Shelley?"

POV AND PERSPECTIVE:
- Close third-person that STAYS IN THE CHARACTER'S HEAD. The POV character's personality, biases, and expertise color every observation. A cop notices sightlines. A pilot reads the aircraft. A fed notices the badge weight.
- When the POV character doesn't understand something, the prose doesn't explain it to the reader. The confusion is shared.
- Characters are INTRODUCED through action, physicality, and the POV character's assessment — not through description catalogs.
  GOOD: "Broad-shouldered, with a nose that had been broken in the past. His suit was dark, expensive, and unremarkable in a politician sort of way. He looked like an intimidating accountant."
  BAD: "Peter Langford was a sixty-two-year-old man with gray hair and blue eyes who had served in the military before entering politics."

PACING AND STRUCTURE:
- Cinematic cutting. Location/time stamps as scene headers. Quick transitions between scenes.
- Action sequences use EXTREMELY SHORT lines — one action per line, staccato rhythm:
  GOOD: "Put paper up. / 10 yards. / Draw, aim, fire. / 10 rounds center mass."
- Quiet scenes are allowed to BREATHE but never WANDER. Every moment in a quiet scene reveals character or builds tension through what's unsaid.
- Physical routines (driving, eating, preparing) are used to GROUND characters between high-intensity moments. These scenes do work — they reveal personality, establish relationships, decompress the reader.

OPERATIONAL AUTHENTICITY:
- Use SPECIFIC tradecraft, military, and procedural details. Weapon calibers, aircraft types, security procedures, communication protocols. The specificity creates authority.
- Characters refer to things by their PROPER NAMES when they would know them (MI-8, Pelican cases, Bombardier 8000, A-29Bs). Generic terms ("the helicopter," "the gun") only when the POV character wouldn't know the specific type.
- Institutions are FALLIBLE, political, and self-interested. Bureaucracies protect themselves first. Cover stories come fast. Committees form to avoid action.

THINGS TO ABSOLUTELY NEVER DO:
- Never use the word "tapestry" to describe anything abstract
- Never use "dance" as a metaphor for conflict or interaction
- Never use "symphony" to describe coordinated action
- Never use "palpable" to describe tension or silence
- Never use "steeled herself/himself" — show the physical act instead
- Never use "couldn't help but" — just have the character do the thing
- Never start paragraphs with "As if" or "It was as though"
- Never end a chapter with a character reflecting on what it all means
- Never have a character deliver a monologue about the stakes — show the stakes through action and consequence
- Never describe a character's smile as "warm" or "genuine" — describe what the smile DOES to their face
`;

export const AI_WRITING_RULES = `
CRITICAL WRITING RULES — AVOID AI TELLS:
You must write like a skilled human novelist, not a language model. Violating any of these rules will make the output unusable.

DIALOGUE:
- Characters do NOT introduce themselves by stating their title, rank, or job in conversation unless it's genuinely necessary for the scene. Real people don't say "I'm Detective Miller" to someone who already knows them. AI over-indexes on titles.
- Dialogue must sound like how real people actually talk — fragmented, indirect, sometimes evasive. Not every line of dialogue should advance the plot or deliver exposition.
- No on-the-nose dialogue where characters state their emotions directly ("I'm scared," "I feel betrayed"). Show it through action, body language, and subtext.
- Characters should NOT narrate the plot to each other. If two characters both witnessed an event, they don't recap it for the reader's benefit.
- Avoid characters conveniently explaining technical details, backstory, or world-building through dialogue unless it makes sense for the character to do so in that moment.
- Dialogue is war — characters have competing agendas. Their conversations should contain friction, interruptions, evasions. Even allied characters should generate tension through misaligned priorities.
- The most compelling dialogue is layered with subtext. Characters rarely say exactly what they mean, especially in high-stakes situations. The true meaning lies beneath the surface.

PROSE STYLE:
- No melodramatic cliches: "little did they know," "a chill ran down their spine," "their blood ran cold," "the weight of the world," "a storm was brewing — both literally and figuratively," "time seemed to stand still," "the silence was deafening."
- No manufactured urgency or drama where the scene doesn't warrant it. Not every moment is a turning point. Let quiet scenes be quiet.
- Do not over-describe emotions. Trust the reader to infer feelings from actions and context.
- Avoid the "NCIS effect": characters don't over-explain their reasoning out loud, don't dramatically pause before revelations, don't make portentous speeches about what's coming. Real people act, then process.
- No purple prose — don't pile on adjectives and adverbs. One precise word beats three vague ones.
- Avoid starting sentences with "And then," "Suddenly," "Without warning," or "In that moment."
- Do not use "a newfound sense of" anything.
- Do not end chapters or sections with heavy-handed thematic statements that spell out the moral.
- BANNED PHRASES — never use these: "it is important to note," "in conclusion," "in today's world," "in today's fast-paced world," "as an AI," "it's worth noting," "needless to say," "at the end of the day," "only time will tell."
- Vary sentence length deliberately. Short sentences for urgency. Longer ones for atmosphere. Break patterns — if three sentences start the same way, rewrite at least one.
- End sentences on the strongest word. Order clauses to build anticipation and land emphasis. Avoid trailing prepositional phrase chains.
- Show, don't tell at emotional moments. "John was angry" fails. "John's knuckles whitened on the table edge. A muscle twitched in his jaw." succeeds. Reserve telling for efficiency in transitions.

STRUCTURE:
- Not every scene needs a dramatic confrontation. Vary pacing. Some scenes are setup, some are aftermath, some are character moments.
- Avoid the pattern of: tension → dramatic reveal → emotional speech → resolution. Real stories are messier.
- Don't create artificial cliffhangers by withholding information the POV character would obviously know.
- If the original text or author's notes specify a detail (a road condition, a character trait, a setting detail), that detail is SACRED. Do not contradict, ignore, or "improve" author-specified details. Incorporate them faithfully.
- Minimize coincidences and convenient discoveries. Each revelation should be earned through character action or consequence, not authorial orchestration.

CHARACTERS:
- Characters should have distinct speech patterns. A soldier doesn't talk like a professor. A teenager doesn't talk like a middle-aged CEO.
- Avoid making every character quippy or sardonic. That's a single personality, not characterization.
- Antagonists should have understandable motivations, not just be "evil" or "power-hungry" without nuance.
- Supporting characters exist as full people, not just as plot devices who appear when convenient and vanish when not needed.
- Characters feel real when they embody opposing traits (virtue vs. vice, tenderness vs. brutality). Contradiction exposes psychology and fuels moral tension.
- Avoid immediate, expected emotional reactions to major events. Real people have delayed or displaced reactions — grief channeled through a minor trigger, anger that surfaces hours later over something trivial.
`;

export const SCENE_WRITING_RULES = `
SCENE ENGINEERING RULES:
Every scene is a self-contained unit of tension and change. Apply these rules rigorously.

SCENE STRUCTURE:
- Every scene needs a Goal (what the POV character wants), Conflict (what opposes them), and Outcome (a value shift — the situation changes). If a scene has no goal or no conflict, it doesn't earn its page.
- Begin late, end early. Enter the scene as close to the conflict as possible. Exit before the tension fully resolves.
- End each scene/chapter on an open circuit — an unresolved emotional or narrative question that pulls the reader forward. Closure kills curiosity; deferral sustains it. The Zeigarnik effect: the brain remembers the unfinished.
- The outcome of one scene creates the goal of the next. Build an unbreakable causal chain: Scene 1 disaster → Scene 2 goal.

DOUBLE-UP RULE:
- No scene should perform only one function. Every scene must simultaneously advance at least two dimensions: plot + character, information + conflict, action + intimacy. Single-purpose scenes flatten pacing.

MUNDANE FRICTION:
- Add 1-2 mundane frictions per scene that affect character behavior — a jammed seatbelt during a chase, a dead phone when they need to call for help, rain that obscures a critical detail. These ground the story in physical reality and create organic complications.

PACING CONTROL:
- Fast pace (action/urgency): short declarative sentences, clipped dialogue, concrete actions and sensory details. Force the reader's eye down the page.
- Slow pace (atmosphere/dread/reflection): longer sentences with subordinate clauses, detailed descriptions, character introspection. Make the reader linger.
- Vary rhythm within and across scenes. Peaks of frantic action, valleys of quiet reflection.

ACTION CLARITY:
- Specify hands, objects, positions, and cause-and-effect in physical sequences. The reader must be able to choreograph the action in their mind. Vague action ("they fought") is invisible action.
- Audit sensory presence — ensure the world is felt through multiple senses (sound, smell, texture, temperature), not merely seen.

CUT THE AUTHOR CHECKLIST (apply to every passage):
- Remove lines that explain what behavior already shows.
- Replace at least one abstract "meaning" line with concrete action or sensation.
- Remove at least one unnecessary adjective per paragraph unless it changes the action.
- Break accidental symmetry — if sentences follow the same template three times in a row, restructure.
`;

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
- The world should be a thematic mirror reflecting the story's central conflict. If the theme is "tradition vs. progress," the world should embody that tension in its geography, politics, and daily life.
- World-building details that don't affect character decisions or plot outcomes should be cut or compressed.

THEME:
- Theme is not a label ("love conquers all") but a moral argument tested through the plot. Introduce the central moral problem early, challenge the protagonist's values through forced choices, and demand costly decisions.
- Theme must emerge organically from character choices and consequences. Never have a character state the theme explicitly.

CONTINUITY:
- Track these elements across chapters: timeline (date/time), character locations, status/injuries, inventory/props, obligations/debts, secrets/knowledge map (who knows what), relationship states (trust/leverage/conflict), active threats, and open loops.
`;

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
