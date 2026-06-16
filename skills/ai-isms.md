# AI-ISMS DETECTION GUIDE — PATTERNS THAT MARK OUTPUT AS AI-GENERATED

Use this guide to scan prose for AI fingerprints. For each pattern found, apply the fix described. Sections are ordered roughly by how damaging the pattern is. The scan checklist at the end covers all of them.

---

## BANNED WORDS (hard stop — never use)

delve, pivotal, crucial, vibrant, underscores, highlights, bolstered, garner,
foster, fostering, enhance, enhancing, enduring, showcasing, exemplifies,
encompassing, nestled, groundbreaking, renowned, profound, indelible, tapestry,
landscape (metaphorical), testament, focal point, diverse array, palpable,
steeled (as in "steeled herself"), myriad (as adjective before noun),
harness, harnessing, unveil, unveiling, realm, meticulous, robust, innovative,
intricate, unpack, beacon, underscore

**Fix:** Replace with a specific concrete word or restructure. "It was crucial" means nothing. Describe why it mattered through action or consequence instead.

---

## BANNED PHRASES

- "a testament to"
- "serves as" / "stands as" / "marks a" / "represents a" — use "is" or "has"
- "commitment to"
- "in the heart of"
- "setting the stage"
- "shaping the"
- "deeply rooted"
- "evolving landscape" / "political landscape" / "cultural landscape"
- "it is important to note" / "it's worth noting"
- "needless to say"
- "at the end of the day"
- "only time will tell"
- "valuable insights"
- "align with" / "resonate with"
- "a rich history"
- "natural beauty"
- "in conclusion" / "in today's world"
- "couldn't help but" — just have the character do the thing
- "a newfound sense of"
- "little did they know"
- "in that moment"
- "without warning" / "suddenly" — limit to once per chapter maximum
- "and then" at sentence start
- "not just X, but also Y" — see Structural Patterns below

**Fix:** Rewrite as direct statement. "The city serves as a backdrop" becomes "The city is the backdrop." "She couldn't help but smile" becomes "She smiled."

---

## BANNED SENTENCE OPENERS

Never start a sentence with:

- Additionally
- Furthermore
- Moreover
- As if (to open a paragraph)
- It was as though (to open a paragraph)

**Fix:** Restructure the sentence or use a transition rooted in action or causality.

---

## BANNED PUNCTUATION

### Em Dashes (hard stop)

The em dash is one of the most reliably flagged AI tells across all contexts. AI overuses it for dramatic emphasis, parenthetical insertions, and abrupt pivots. Even skilled human writers who use em dashes legitimately should remove them from AI-assisted drafts because the association is too strong.

**Fix:** Replace with a comma, a period and new sentence, or a colon. If the construction requires an em dash to hold together, the sentence is probably doing too much work and should be split.

BAD: "She knew — had always known — that he would leave."
BETTER: "She had always known he would leave."

---

## STRUCTURAL AI PATTERNS (rewrite on sight)

### The "Not Just X But Y" Pattern

> "It wasn't just a house, it was a home."
> "Not only did she survive, but she thrived."
> "This isn't just a story about loss, but about redemption."

The single most recognizable AI construction. It negates an idea only to replace it with something supposedly more profound. The structure signals effort at depth without doing the work of depth.

**Fix:** Make a direct statement. "The house had become something more than shelter." Cut the parallelism entirely.

---

### Rule-of-Three Padding

> "She was intelligent, resourceful, and determined."
> "The city was loud, chaotic, and alive."

AI groups things in threes compulsively because three is the smallest number that creates a sense of pattern. When two words make the point, the third is filler.

**Fix:** Cut to the two most precise words. Or restructure into an action that demonstrates all three without listing them.

---

### Participial Editorializing Tails

Sentences that end with -ing phrases that comment on their own significance:

> "...highlighting the importance of trust."
> "...underscoring the significance of the moment."
> "...reflecting broader tensions in the relationship."
> "...showcasing her resilience."
> "...emphasizing the stakes."

**Fix:** Cut the tail entirely. The sentence almost always works without it. If the significance needs stating, earn it through the next action instead.

---

### Elegant Variation (Thesaurus Cycling)

Using different fancy synonyms for the same noun across nearby sentences:

> "The detective examined the room. The investigator noted the disarray. The sleuth catalogued each detail."

**Fix:** Pick the natural word and repeat it. Readers don't notice reasonable repetition. They notice synonym gymnastics.

---

### Copula Avoidance

Using "serves as / stands as / marks a / represents a / features / offers / boasts" when "is" or "has" works:

> "The tower serves as a symbol of oppression."
> "The city boasts a thriving arts scene."

**Fix:** "The tower is a symbol of oppression." "The city has a thriving arts scene."

---

### Manufactured Resilience Formula

> "Despite the odds, she continued to fight."
> "Despite setbacks, the project moved forward."
> "Despite X, Y persisted."

The "despite" formula abstracts both the obstacle and the response. It tells you the shape of struggle without any of its texture.

**Fix:** Show the specific setback and the specific action taken. Not "despite the odds" — what were the odds, and what exactly did she do?

---

### Minimize-Then-Puff

> "While relatively unknown, X has had a profound impact on..."
> "Though modest in scope, the decision would prove pivotal..."

AI hedges down, then hedges up, creating false modesty that immediately collapses into grandiosity. Neither the minimizing nor the puffing is earned.

**Fix:** Either show the impact with specifics or drop the claim. Pick one register and stay in it.

Note: this pattern is distinct from natural qualifying language such as "I think," "it seems," or "probably," which marks a human voice. The problem here is the specific minimize-then-escalate construction, not hedging language in general.

---

### The Balanced Two-Clause Sentence (Robotic Symmetry)

> "She was afraid of the dark, but she walked in anyway."
> "He didn't know the answer, but he asked the question."

One or two of these per scene is fine. Three in a row is an AI fingerprint: a mechanical rhythm that reads as constructed rather than felt.

**Fix:** Vary the structure. Fragment. Run-on. Single clause. Break the pattern.

---

### Stacked Compression (Eyeball Kicks)

AI attempts to produce "literary" prose by cramming abstract/concrete conjunctions into as many phrases as possible:

> "Her grief had the texture of static."
> "The morning tasted like a decision already made."
> "A timestamp like a scar."
> "The smell of something burnt and forgotten."

Individually, these can work. Used constantly, they become the single most identifiable marker of AI creative writing. Research on frontier model fiction output found that a 1,200-word AI story contained 19 of these constructions in sequence. The effect is relentless and, paradoxically, flattening. When every phrase tries to be striking, nothing is. The pace becomes exhausting. Nothing has weight because everything is weighted equally.

**Fix:** This is a density problem, not a word-level problem. Flag any passage where this construction appears more than once per scene. Cut all but the strongest instance. Reserve compressed poetic language for moments that have earned it.

---

### Blocky Mode Transitions

AI organizes prose into discrete sections: a block of dialogue, then a block of narration, then a block of description, then back to dialogue. Each block is internally coherent. The transitions between them are mechanical.

Human prose weaves these modes together. A character speaks while noticing something. Description interrupts action. Thought bleeds into dialogue mid-sentence.

BAD: [Four lines of dialogue] [Three lines of room description] [Two lines of action] [Four lines of dialogue]

**Fix:** Break the blocks. Let a character's observation interrupt their own speech. Let action beat and thought share the same sentence. Let description do double duty as emotional register. The modes should be indistinguishable from each other at the sentence level.

---

### Syntactic Repetition (Beyond Banned Openers)

AI repeats sentence-opening structures even when no banned word is present. Watch for consecutive sentences with the same grammatical launch:

> "She picked up the letter. She read it twice. She set it down."
> "The light was cold. The air was still. The room was empty."

**Fix:** Vary the opening grammatical move. Subject-verb, then an introductory clause, then a fragment, then an inverted structure. The goal is not randomness but rhythm that does not repeat.

---

## PROSE ANTI-PATTERNS

### Proportionality Failure (Nothing Breathes)

AI interprets "make this engaging" as "raise the stakes." Every scene escalates. Every conversation approaches confrontation. Every internal monologue spirals to the character's deepest wound. Chapter endings default to revelation or cliffhanger. There are no quiet closes.

The result is not intensity — it is monotony. Sustained maximum pressure drains tension from everything. Weight requires contrast.

Specific signs:
- Minor inconvenience produces existential dread
- Small kindness produces overwhelming gratitude
- Physical descriptors default to maximum: not "her pulse quickened" but "her heart hammered"
- No scene exists for texture, character breathing room, or purely sensory grounding — every scene is plot
- Characters access their deepest traumas in response to proportionally small triggers

**Fix:** Ask what this scene actually is. A five-minute argument is a five-minute argument. The character's childhood wound does not need to surface here unless something specific in this moment genuinely reaches it. Match the emotional weight of the writing to what actually happens in the scene. Quiet scenes earn loud ones.

---

### Significance Conferral (Pre-loaded Weight)

AI tells you something matters instead of writing it in a way that makes you feel it matters. Internet training data describes important things with important-sounding language, so AI defaults to that register regardless of whether the subject has earned it.

**Credentials as character:** "Dr. Sarah Chen, the renowned neuroscientist" treats the title as a personality. The title is not the person.

**Objects announced as symbolic:** "The pen that had signed a thousand contracts." "The photograph that would change everything." The object is pre-loaded with weight it has not earned through the story.

**Prestige description for locations:** "The prestigious conference room." "The historic courthouse." Described by reputation rather than by what can be seen, heard, or smelled.

**Flagged decisions:** "This was no ordinary meeting." "What happened next would alter the course of everything." The narration announces significance before demonstrating it.

**Inflation of the mundane:** A job title becomes a destiny. A routine choice becomes a moral crossroads. A phone call becomes "the call that changed everything."

**Fix:** Strip credentials from introductions and let the person demonstrate competence through action. Let objects be objects until the story earns their weight. Describe places by their sensory specifics, not their reputations. Never flag a moment as significant in narration — earn it through what happens.

---

### Melodramatic Clichés (hard ban)

- "a chill ran down their spine"
- "their blood ran cold"
- "the weight of the world"
- "a storm was brewing, both literally and figuratively"
- "time seemed to stand still"
- "the silence was deafening"
- "her heart hammered in her chest"
- "he felt a knot in his stomach"

**Fix:** Show the physiological response with specificity. "Her hands went cold. She pressed them flat against her thighs." Not "a chill ran down her spine."

---

### Over-Explained Emotions

> "She felt angry because he had betrayed her trust."
> "He was sad, grieving the loss of what they once had."

**Fix:** Show the physical displacement of the emotion. Trust the reader to infer. Cut the because-clause.

---

### Fake-Deep Observations

> "In that moment, she realized that sometimes the hardest battles are the ones fought within."
> "He understood then that life rarely gives you the endings you expect."

**Fix:** Cut entirely. If the theme needs landing, do it through action and consequence in the next scene, not through the narrator observing that something was meaningful.

---

### Frictionless Filler (Beige Passages)

Technically competent prose where nothing is at stake, nothing is specific, and nothing could appear only in this story:

> "She walked to the kitchen and poured herself a cup of coffee. She sat down at the table and thought about what to do next."

**Fix:** Either cut or give the action a second job: character reveal, tension signal, sensory texture. "She poured coffee she didn't want. The mug was the one from the conference, the one Daniel had given her as a joke. She put it back."

---

### NCIS Effect (On-The-Nose Explanation)

Characters who dramatically pause before revelations, explain their reasoning out loud in detail, or make portentous speeches about what's coming.

**Fix:** Have characters act, then process. Cut the pre-action monologue.

---

## DIALOGUE AI-TELLS

**Self-introduction to someone who knows them.** Characters stating their title or rank to a person who already knows it.

**On-the-nose emotion statements.** "I'm scared." "I feel betrayed." "I'm so proud of you." Characters naming their emotional state directly rather than expressing it through what they say and don't say.

**Witnessed-event recap.** Characters summarizing events both parties were present for, for the reader's benefit rather than the scene's.

**Uniformly polished speech.** No deflections, evasions, non-answers, or interruptions. Every character completes their thought clearly and waits their turn.

**Uniform voice across characters.** Every character speaks with the same register, the same rhythm, the same sardonic wit or earnestness. After a few exchanges, all AI dialogue sounds like one person. Each character should have a speech pattern specific enough to be identifiable without a dialogue tag.

**Stakes speeches.** Characters deliver monologues about what's at risk rather than taking action in response to it.

**Scare quote wrapping.** Ordinary words placed in quotation marks for no discernible reason: "She walked into the 'office.'" "He handed her the 'solution.'" The quotes imply irony or distancing without earning either.

**Fix:** Add friction. Let characters dodge, interrupt, misread, and deflect. Give each character at least one speech habit that belongs only to them. Subtext over text.

---

## NARRATION RESTATEMENT

A sentence that summarizes or restates the sentence before it rather than advancing the scene:

> "The room was empty. There was nothing there."
> "She said nothing. She didn't speak."
> "He left without a word. He walked out and didn't look back."

**Fix:** Cut the restatement. The first sentence did the work. Let it stand.

---

## TENSE DRIFT

Narration that drifts into present tense inside a past-tense scene:

> "She walked to the window. She looks out at the street. She sees nothing."

**Fix:** Normalize all narration to past tense. Direct thought fragments may use present tense. Dialogue may use any natural tense.

---

## ADVERB AUDIT

Flag any adverb modifying a verb. Keep only those that change meaning, not those that add emphasis:

- KEEP: "She nodded slightly" (implies restraint, distinct from a full nod)
- CUT: "She ran quickly" — use "sprinted"
- CUT: "He said quietly" — use an action beat or low-voice indicator instead
- CUT: "very," "extremely," "incredibly" before any adjective — replace with a specific detail

---

## SCAN CHECKLIST

Apply before finalizing any prose output.

**Remove:**
- [ ] Any banned words present?
- [ ] Any "Not just X but Y" constructions?
- [ ] Any participial tails that editorialize?
- [ ] Three or more balanced two-clause sentences in a row?
- [ ] Thesaurus cycling on the same noun across three sentences?
- [ ] Copula avoidance ("serves as," "stands as," "boasts")?
- [ ] Any over-explained emotion with a "because" clause?
- [ ] Any melodramatic cliché?
- [ ] Any fake-deep observation at scene end?
- [ ] Tense drift in narration?
- [ ] Adverbs that add emphasis rather than change meaning?
- [ ] "Additionally," "Furthermore," "Moreover" starting a sentence?
- [ ] Any beige passage where nothing is specific or at stake?
- [ ] Em dashes anywhere?
- [ ] Stacked compression: more than one abstract/concrete conjunction per scene?
- [ ] Syntactic repetition: three or more consecutive sentences with the same grammatical opener?
- [ ] Narration restatement: a sentence that restates the one before it?
- [ ] Blocky mode transitions: solid blocks of dialogue, then narration, then description, with no weaving?
- [ ] Significance conferral: object, title, location, or decision flagged as important before it has earned that weight?
- [ ] Scare quotes around ordinary words?
- [ ] All characters speaking in the same register and rhythm?

**Check presence of:**
- [ ] Does at least one moment in this scene exist for texture, breathing room, or character rather than plot advancement?
- [ ] Does the emotional register of this passage match what actually happens in it, or has it been inflated?
- [ ] Do characters in dialogue have distinguishable speech patterns?
- [ ] Is sentence length varied: short, medium, long, fragment — not uniform throughout?
