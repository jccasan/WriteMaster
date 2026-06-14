STYLE CHECK — PROSE STYLE GUIDE COMPLIANCE AUDIT

Use this check after a chapter draft has been written to identify where the prose deviates from the author's established style guide. Output is a style improvement plan. Do NOT rewrite — produce the plan only.

---

## PURPOSE

AI models default to a baseline voice that is competent but generic. Even with a style guide injected into the writing prompt, style drift occurs — especially across long passages and multiple chapters. This check catches the drift and produces specific, actionable instructions to bring the prose back in line.

---

## WHAT TO COMPARE

Given:
1. A prose style guide (author's extracted voice characteristics)
2. A newly written chapter draft

Check the chapter against the style guide on each of the following dimensions:

---

### 1. SENTENCE ARCHITECTURE COMPLIANCE

- Does the chapter's sentence length distribution match the style guide?
- Are fragments being used at the same frequency and for the same purposes?
- Are sentence openers varied or falling into a default pattern?
- Are clause structures matching the author's preference?

Flag: Any extended passage (3+ consecutive sentences) that falls outside the style guide's established range.

### 2. VOCABULARY AND DICTION COMPLIANCE

- Is the specificity level matching? (Generic "car" vs. specific "1987 Chevy Silverado")
- Is the formality register consistent?
- Are any banned words or AI-tell phrases present that the style guide prohibits?
- Are there words or constructions that belong to the AI's default voice rather than the author's?

Flag: Any paragraph that could appear in a different author's book without changing its character.

### 3. INTERIORITY COMPLIANCE

- Is internal thought being rendered in the author's established format?
- Is the frequency of internal thought matching the style guide?
- Are thoughts as compressed or as expansive as the author's baseline?

### 4. EMOTIONAL RENDERING COMPLIANCE

- Is the author's approach to showing vs. telling emotion being followed?
- Are the specific body language and physical symptom choices consistent with the author's style?
- Is emotional pacing (immediate vs. delayed reaction) matching the author?

### 5. DIALOGUE COMPLIANCE

- Do dialogue tags match the author's preference?
- Is the level of interruption and incompleteness consistent?
- Is subtext density matching — are characters as direct or as evasive as the author's characters typically are?
- Do all characters sound like this author's characters, or are some slipping into generic AI dialogue?

### 6. PACING AND RHYTHM COMPLIANCE

- Do action passages match the author's rhythm signature?
- Do quiet scenes expand to the right degree?
- Are transitions handled in the author's style?

### 7. DISTINCTIVE PATTERN COMPLIANCE

- Are the author's signature moves present?
- Are the author's avoidance patterns being respected?
- Is there anything in the chapter that the author would never write, given their established voice?

---

## OUTPUT FORMAT

**STYLE IMPROVEMENT PLAN**

For each deviation found:

**Dimension:** [Sentence Architecture / Vocabulary / Interiority / Emotional Rendering / Dialogue / Pacing / Distinctive Patterns]
**Location:** [Approximate location in chapter — beginning/middle/end, or character/scene context]
**Deviation:** [What the chapter does that doesn't match the style guide, 1-2 sentences]
**Fix:** [Specific change to bring it in line, 1-2 sentences]

Number each item. If a dimension has no deviations: "No deviations in [Dimension]."

---

## PRIORITY ORDERING

List deviations in this order:
1. Vocabulary/word choice (easiest to fix, most visible to readers)
2. Emotional rendering (high reader impact)
3. Dialogue (high reader impact)
4. Sentence architecture (pacing effect)
5. Interiority (voice coherence)
6. Pacing (structural)
7. Distinctive patterns (hardest to catch, but most important for voice consistency)

---

## SCOPE LIMITATION

This check focuses on style compliance only. Do not report:
- Plot issues → logic check
- Continuity errors → chronology check
- AI-tell phrases → AI-isms check (though overlap with vocabulary dimension is expected)
- Emotional arc issues → emotional check

If a finding clearly belongs to another check, note it parenthetically but don't elaborate.
