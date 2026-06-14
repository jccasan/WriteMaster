CHARACTER NAME CHECK — AI FINGERPRINT NAME DETECTION

Use this check on a story dossier to identify character names that read as AI-generated. Output is a character name improvement plan. Do NOT rewrite anything — produce the plan only.

---

## WHAT THIS CHECK DOES

Scans all named characters in the document and flags any whose names:
1. Appear on the AI-common name blacklist (see CHARACTER_NAME_BLACKLIST skill)
2. Sound like generic fantasy/thriller archetypes regardless of genre
3. Are thematically on-the-nose (villain named Drake, wise woman named Seraphina)
4. Are culturally inconsistent with the character's stated background
5. Follow a recognizable AI naming pattern (two "strong" syllables, vague exotic sound)

---

## EXCEPTION RULE

If a name appears verbatim in the author's brain dump or explicit author notes, do NOT flag it. The author chose it intentionally. Note the exception in the output.

---

## PROCEDURE

1. Extract every named character from the document (major and minor)
2. For each character: record full name, role, and cultural/setting context
3. Check each name independently against the blacklist and the five criteria above
4. Flag any matches — explain specifically why the name feels AI-generated
5. For each flagged name: propose 3 alternatives with justification

---

## OUTPUT FORMAT

**CHARACTER NAME IMPROVEMENT PLAN**

For each flagged name:

**Character:** [Full name] — [Role]
**Flag reason:** [Which criterion it violated and why, 1-2 sentences]
**Proposed alternatives:**
1. [Name] — [1 sentence justification: why this name fits this specific character, culture, and world]
2. [Name] — [1 sentence justification]
3. [Name] — [1 sentence justification]

If no names are flagged: "No AI-common names detected. Character names appear appropriate for the genre and setting."

---

## REPLACEMENT GUIDANCE

Good alternative names are:
- Culturally grounded in the character's actual background and world
- Specific enough to feel chosen for this character, not borrowed from a name generator
- Pronounceable without instruction
- Not on the blacklist
- Not thematically on-the-nose

Test: could this name appear in a published novel in this genre without a reader raising an eyebrow? If yes, it passes.

---

## AUTHOR REVIEW NOTE

This check catches the most obvious AI name patterns, but it is not infallible. Include this note in all outputs:

"Recommended: review all character names in the completed dossier manually, especially minor characters who were generated without author input. AI models will repeat common name patterns even for characters not flagged here. Trust your instinct — if a name feels generic or wrong for the character, change it regardless of whether it appears on the blacklist."
