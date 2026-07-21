# Issue and Revision-Memory Protocol

## Issue ID format

Use:

`BOOK-SCOPE-CATEGORY-NUMBER`

Examples:

- `OV-CH03-POV-001`
- `OV-ACT3-PACING-004`
- `OV-GLOBAL-MYTH-002`

## Required fields

- Issue ID
- Draft first observed
- Draft last checked
- Location
- Category
- Classification
- Severity
- Confidence
- Reviewer source
- Textual evidence
- Reader reaction
- Diagnosis
- Suggested revision
- Author decision
- Status
- Verification note
- Related issue IDs

## Status values

- `OPEN`
- `ACCEPTED`
- `DECLINED-AUTHOR-CHOICE`
- `FIXED`
- `PARTIALLY-FIXED`
- `DISPLACED`
- `WORSENED`
- `OBSOLETE`
- `NEEDS-AUTHOR-DECISION`

## Verification rules

A revision is not automatically fixed because the original wording disappeared.

Check:

1. Did the reader problem disappear?
2. Did the revision preserve voice and pacing?
3. Did the fix introduce contradiction or repetition elsewhere?
4. Did the manuscript still fulfill the original dramatic purpose?
5. Did the author intentionally choose a tradeoff?

## Duplicate handling

When multiple reports identify the same underlying concern:

- preserve all reviewer reactions,
- create one canonical issue,
- list each reviewer as a source,
- note disagreements about diagnosis or solution.

## Revision-note wording

Use concrete language:

- `FIXED`: The missing causal link is now established before the decision.
- `PARTIALLY-FIXED`: Motivation is clearer, but the emotional transition remains abrupt.
- `DISPLACED`: Exposition was removed here but reappears in Chapter 12.
- `WORSENED`: Added explanation resolves the rule but stalls the confrontation.
