IMPROVEMENT PLAN REWRITE — THE SELECTIVE REVISION PATTERN

This is the core revision pattern used across all pipelines. It separates the critique step from the rewrite step, which produces better results than asking an AI to critique-and-rewrite in a single pass.

---

## THE TWO-STEP PATTERN

### Step 1: Produce an Improvement Plan (critique only, no rewrite)
Ask the model to identify issues and produce a numbered list of specific fixes.
Do NOT ask it to rewrite yet.

**Why:** When the model focuses only on analysis, it identifies more issues and produces more specific, targeted recommendations. Combined critique-and-rewrite prompts cause the model to rewrite based on what it notices first — missing subtler issues and often rewriting more than necessary.

### Step 2: Implement the Improvement Plan (rewrite using the plan as constraint)
Give the model the original document + the improvement plan.
Ask it to implement ONLY what the plan specifies and change NOTHING ELSE.

**Why:** The "change nothing else" constraint prevents the model from improving the document in ways you didn't ask for — which often means changing things that were working, introducing its own preferences, or producing a generic rewrite that loses the author's voice. The constraint keeps the rewrite surgical.

---

## THE CRITICAL CONSTRAINT

The single most important instruction in the rewrite step:

> "Implement ONLY the changes suggested in the improvement plan. Do NOT rewrite sections that weren't flagged. Do NOT add new content beyond what was suggested. Reproduce the ENTIRE document with the changes applied."

This constraint is what makes the pattern work. Without it, the model will:
- Rewrite the entire document to a lower quality than the original
- Add its own improvements that weren't asked for
- Change the author's voice in sections that were working
- Lose specific details that the improvement plan was designed to preserve

---

## WHICH CHECKS PRODUCE IMPROVEMENT PLANS

Use this pattern for all of the following checks:
- **Emotional Check** → Emotional Improvement Plan → Dossier Rewrite
- **Character Name Check** → Character Name Improvement Plan → Dossier Rewrite
- **Logic Check** → Logic Audit Report (Section 6: Specific Fixes) → Dossier Rewrite
- **Chronology Check (Pre-Draft)** → Chronology Issues → Scene Brief Revision
- **Chronology Check (Post-Draft)** → Chronology Issues → Chapter Rewrite
- **Style Check** → Style Improvement Plan → Chapter Rewrite
- **AI-Isms Check** → AI-Isms Improvement Plan → Passage Rewrite

---

## STACKING MULTIPLE PLANS

When implementing multiple improvement plans at once (e.g., emotional + name check together in Dossier Rewrite #1), give the model all plans simultaneously and ask it to implement them all in one pass. Implementing plans one at a time risks the second implementation partially undoing the first.

Exception: if two plans contain conflicting recommendations (rare but possible with emotional check + logic check), flag the conflict to the author before implementing.

---

## MODEL TIER FOR REWRITE STEPS

Rewrite steps using this pattern can often use a cheaper/faster model than the check that produced the improvement plan, because:
- The plan does the analytical work
- The model just needs to execute precise surgical edits
- "Implement what was listed, change nothing else" is a constrained, lower-complexity task

Use cheap model for rewrites unless the original content is extremely long (100k+ tokens) or the improvement plan requires nuanced judgment in execution.

---

## REWRITE PROMPT TEMPLATE

```
You are a precise editor. Your task is to implement specific improvement instructions into a [DOCUMENT TYPE] without changing anything else.

ORIGINAL [DOCUMENT TYPE]:
[original text]

[IMPROVEMENT PLAN 1 NAME]:
[improvement plan 1 text]

[IMPROVEMENT PLAN 2 NAME] (if applicable):
[improvement plan 2 text]

Instructions:
- Implement ONLY the changes suggested in the improvement plan(s)
- Do NOT rewrite sections that were not flagged
- Do NOT add new content beyond what was suggested
- Reproduce the ENTIRE document with changes applied
- Maintain all original formatting and section headers
```

---

## QUALITY SIGNAL

A well-executed improvement plan rewrite should:
- Be clearly recognizable as the same document with targeted changes
- Preserve the author's voice in all sections not touched by the plan
- Apply all listed improvements without missing any
- Not introduce new AI-tells or generic phrasing in the changed sections

If the rewrite output looks dramatically different from the original — longer, smoother, more generic — the "change nothing else" constraint wasn't followed. Reject and retry with a stricter prompt.
