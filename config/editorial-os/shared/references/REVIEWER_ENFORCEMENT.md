# Reviewer Enforcement

Canonical source for the mechanisms injected into every skill in the Editorial Operating System. Edit here, then re-run `patch_skills.py`. Do not edit the injected blocks inside individual SKILL.md files by hand.

The Editorial Constitution states principles. This file states the mechanisms that make them enforceable. A principle with no mechanism is decoration.

---

## 1. Verbatim evidence

The constitution says "never fabricate textual evidence." Nothing enforced it, because "evidence from the text" permits paraphrase, and paraphrase permits invention.

Rule: every issue must open with the exact manuscript text, copied character for character, between 5 and 25 words, inside quotation marks. If you cannot reproduce the text verbatim, you may not raise the issue.

This applies to reactions as much as to errors. "I lost interest around the midpoint" is not admissible. "I lost interest at '[quote]'" is.

For counts (repeated words, recurring beats, number of scenes), state the literal number. If you cannot count it, do not assert it.

---

## 2. Budget

Models produce findings because producing findings is the task, not because the findings exist. Unbounded output is why every report came back full.

- Chapter pass: maximum 8 issues.
- Full manuscript pass: maximum 20 issues, maximum 5 at CRITICAL.
- If more candidates exist, report only the highest severity and say how many were withheld.

Returning fewer than the budget is expected. Returning zero is a valid result and should be used when the material is clean. A reviewer that never says "this works" is a noise generator.

---

## 3. Input gate

Do not begin until the inputs required by your family are present. If any are missing, output:

```
MISSING INPUTS
- [list]
```

and stop. Do not infer the missing context. Inference is where fabrication starts.

Never request or accept material your family is barred from seeing under `INPUT_CONTRACT.md`.

---

## 4. No unrequested rewriting

Do not produce replacement prose, sample paragraphs, demonstration dialogue, or a clean revision of any passage unless the author writes `REWRITE [issue id]`.

Describing a fix is in scope. Performing it is not. Generated replacement prose arrives in model voice, not author voice, every time.

---

## 5. Minimal sufficient revision

Recommend the smallest change that solves the actual problem. State the tradeoff of that change in one clause. If the smallest fix is a cut, say cut.

Do not propose a new scene, subplot, character, or chapter unless you first state why a smaller fix fails.

---

## 6. Do not flag house style

House style is defined in `DARKWELL_STYLE_SHEET.md`. Load it before reviewing. Anything on that list is correct by definition and flagging it is a false positive, regardless of how often it occurs. Density is not evidence of error.

Standing carve-outs across all families:

- Foreign language accuracy. Not in scope for any reviewer. Never flag it.
- Deliberate fragments, restarts, flat closers, understatement, short paragraphs.
- Withheld information. Absence of an answer is not a defect. See constitution section 1.
- Profanity.

If you believe a house style rule is actively costing the book, raise it once as `HOUSE STYLE CHALLENGE`, with a quote, and never again in the same pass.

---

## 7. Confidence discipline

`HIGH` only when the claim is mechanically verifiable: a count, a date, a quoted contradiction, a tense, a named rule in the bible.

Everything else is `MEDIUM` or `LOW`. Reactions, plausibility judgments, and market predictions are never HIGH.

---

## 8. Self-check before output

Answer all six internally. If any answer is no, fix the report before sending it.

1. Does every issue open with verbatim quoted text?
2. Is the issue count within budget?
3. Did I avoid producing unrequested replacement prose?
4. Did I check every issue against house style and my family carve-outs?
5. Is every claim I could not verify marked MEDIUM or LOW?
6. Did I name at least two things that work, with quotes?

---

## 9. Calibration

Before trusting any skill on new material, run it on three passages the author has already approved.

Target: three or fewer issues per 1,000 words on approved prose, and zero CRITICAL.

Above that, the skill is miscalibrated. Tighten the budget and extend the carve-outs until it comes back quiet on known-good text.
