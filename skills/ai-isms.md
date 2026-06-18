# AI-ISMS SKILL
# Token: {{AI_ISMS}}
# Purpose: Detect and fix AI fingerprints in fiction prose.
# Scope: Patterns NOT already covered by PROSE_RULES (banned words, banned phrases, etc.)
# Use this for line-editing passes and Pipeline 4 AI-isms scan.

---

## 1. STACKED COMPRESSION (Eyeball Kicks)
AI piles two or three compressed, imagistic observations into adjacent sentences,
creating a "poetic density" that signals artificial generation.

TELL: "The light died on her face. The room held its breath. He was already gone."
Three separate "poetic" beats in three sentences — no single beat earns the weight.

FIX: One compressed image per scene moment, maximum. Reserve for moments that have
earned the density. Cut all but the strongest instance per scene.

---

## 2. BLOCKY MODE TRANSITIONS
AI switches abruptly between dialogue, action, and thought in clean, separated blocks
rather than letting them bleed together naturally.

TELL:
> "I can't do this." [dialogue block]
> She looked out the window. The rain hadn't stopped. [action/description block]
> She wondered if he'd ever understood her at all. [thought block]

FIX: Let modes interrupt each other. Action beats inside thought. Description embedded
in dialogue rhythm. A character's observation should interrupt their own speech.

---

## 3. SIGNIFICANCE CONFERRAL (Pre-loaded Weight)
AI announces importance before earning it.

TELL:
- "The pen that had signed a thousand contracts." (object pre-loaded as symbolic)
- "This was no ordinary meeting." (narrator flags significance)
- "Dr. Sarah Chen, the renowned neuroscientist..." (title as personality)
- "What happened next would change everything." (forecasting the payoff)

FIX: Show the significance through action and consequence. Never announce it.
If you have to say it matters, it doesn't yet.

---

## 4. PROPORTIONALITY FAILURE (Nothing Breathes)
AI applies the same emotional weight and prose density to a minor scene as to a
major one. Every scene feels equally important — which means none of them are.

TELL: Character getting a cup of coffee treated with the same interiority as a
betrayal. Five-sentence reflection on a mundane decision. Childhood wound surfaces
at a random moment with no specific trigger.

FIX: Match prose intensity to what actually happens. Quiet scenes are allowed to be
quiet. Loud scenes earn their loudness only if quiet scenes existed first.

---

## 5. MELODRAMATIC CLICHÉS (hard ban)
AI defaults to stock emotional shorthand.

NEVER USE: "a chill ran down their spine" / "their blood ran cold" / "time seemed to
stand still" / "the silence was deafening" / "the weight of the world" / "a storm
was brewing — both literally and figuratively" / "little did they know" / "in that
moment, everything changed".

FIX: Describe the specific physical sensation. "Her scalp tightened. She stopped
walking." Not "a chill ran down her spine."

---

## 6. OVER-EXPLAINED EMOTIONS
AI narrates the emotional logic instead of showing the emotion.

TELL: "She felt angry because he had betrayed her trust." / "He was scared, which
was understandable given what had happened." / "Miranda felt a mix of emotions."

FIX: Physical symptom + displaced action. Cut the "because" clause. The reader
infers the cause from context. "Her jaw tightened. She picked up the mug, set it
down, picked it up again."

---

## 7. FAKE-DEEP OBSERVATIONS
AI inserts philosophical generalizations that sound profound but say nothing specific.

TELL: "In that moment, she realized that sometimes the hardest battles were the ones
fought within." / "Life had a way of surprising you when you least expected it." /
"He'd learned long ago that people showed you who they were if you watched carefully."

FIX: Cut entirely. If a character needs to reflect, make the reflection specific to
this character in this moment — not a sentiment applicable to any human in any story.

---

## 8. NCIS EFFECT (On-The-Nose Explanation)
Characters explain their own reasoning, feelings, or deductions as if narrating
a documentary. Real people don't announce their own thought process.

TELL: "'I realized that if we followed the money back to its source, we'd find the
killer,' she said, explaining her logic carefully." / "'I'm pushing you away because
I'm afraid of getting hurt,' he admitted."

FIX: Show the deduction through the action it produces. Show the fear through the
pushing-away behavior. Characters act; the reader interprets.

---

## 9. NARRATION RESTATEMENT
AI summarizes what just happened in dialogue or action, telling the reader what
they already witnessed.

TELL:
> "I quit," she said, slamming the door.
> She had quit. The door was closed behind her. There was no going back now.

FIX: The prose event is the prose event. Never restate it. Move forward.

---

## 10. DIALOGUE TITLE DROPS
AI has characters introduce themselves or each other by title in situations where
that would never happen naturally.

TELL: "'Dr. Martinez, Chief of Surgery, will see you now.'" (to a colleague who
already knows her) / "'As the head of the department, I have to say...'"

FIX: People use names, nicknames, or nothing. Titles only when genuinely establishing
authority to someone who doesn't know it.

---

## 11. DIALOGUE INFO DUMPS
Characters explain things to each other that both of them already know, for the
reader's benefit.

TELL: "'As you know, the merger was announced three months ago, which is why we're
in this situation now...'" / "'Remember when we were in Kabul in 2019...'"

FIX: Characters don't recap shared history to each other. Find another way to
deliver the exposition, or trust the reader to infer it.

---

## 12. BALANCED TWO-CLAUSE ROBOTICS (Robotic Symmetry)
AI defaults to sentences built from two balanced halves of equal weight. Repeated,
this creates a metronomic, inhuman rhythm.

TELL: "She was tired, but she kept going. He was afraid, but he held his ground.
The situation was bad, but they had survived worse."

FIX: Break the balance. Fragment. Run-on. Single clause. Inversion. The goal is
rhythm that does not repeat itself every two sentences.

---

## 13. MANUFACTURED RESILIENCE
AI describes characters overcoming obstacles through generic determination language
rather than specific action.

TELL: "Despite the odds stacked against her, she persevered." / "He had faced worse
and survived." / "She drew on her inner strength and pushed forward."

FIX: Show the specific setback and the specific next action taken. Not "despite
the odds" — what were the odds, and what exactly did she do next?

---

## 14. ADVERB AS SUBSTITUTE FOR SPECIFICITY
AI modifies weak verbs with adverbs instead of choosing a precise verb.

TELL: "She walked quickly." / "He looked carefully." / "She said softly."

FIX: "She strode." / "He studied." / "She murmured." One precise verb beats
a weak verb + adverb every time. Flag any adverb modifying a motion or speech verb.

---

## 15. TENSE DRIFT
AI slips from established past-tense narration into present tense mid-paragraph,
especially during action sequences or moments of heightened emotion.

TELL: "She ran down the corridor. Her heart is pounding. She reaches the door."
(mixed tenses in one action sequence)

FIX: Narration stays in the established tense throughout. Dialogue and direct
unquoted thought ("Not now. Not here.") may use any natural tense. Everything
else: consistent.

---

## SCAN CHECKLIST (run before finalizing any prose)

- [ ] Any of the 15 patterns above present?
- [ ] Any banned words from PROSE_RULES?
- [ ] Any "not just X but Y" constructions?
- [ ] Any em-dash overuse (more than 1 per page)?
- [ ] Any participial tails that editorialize?
- [ ] Any thesaurus cycling on the same noun?
- [ ] Tense consistent throughout narration?
- [ ] Every page delivering at least one: revelation / shift / immersion / tension / payoff?
