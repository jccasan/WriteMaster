#!/usr/bin/env python3
"""
Patch the Editorial Operating System skills to v2.0.0.

Injects enforcement mechanisms, family input gates, and family output shapes
into the 23 templated SKILL.md files. Leaves line-editor and novel-copy-editor
to their own hand-built files.

Re-runnable. Edit the block constants below, not the SKILL.md files.

Usage: python3 patch_skills.py <path-to-editorial-operating-system-complete>
"""

import re
import sys
import pathlib

FAMILY = {
    "A": [
        "developmental-editor", "continuity-logic-auditor", "revision-verifier",
        "editorial-director", "subject-matter-review-router",
        "submission-package-auditor",
    ],
    "B": [
        "federal-procedure-reviewer", "intelligence-tradecraft-reviewer",
        "legal-realism-reviewer", "medical-realism-reviewer",
        "forensics-evidence-reviewer", "military-operations-reviewer",
        "cybersecurity-technology-reviewer",
    ],
    "C": [
        "commercial-thriller-reader", "character-arc-reader",
        "dialogue-voice-reader", "emotional-impact-reader",
        "pacing-suspense-reader", "series-ending-reader",
        "skeptical-mainstream-reader",
    ],
    "D": [
        "acquisitions-editor-reader", "literary-agent-reader",
        "market-positioning-reader",
    ],
}
SKILL_FAMILY = {s: f for f, lst in FAMILY.items() for s in lst}

# ---------------------------------------------------------------- shared

ENFORCEMENT = """## Enforcement

Canonical source: `shared/references/REVIEWER_ENFORCEMENT.md`. Restated here
because referenced rules get skipped and inline rules get followed.

**Verbatim evidence.** Every issue opens with the exact manuscript text, copied
character for character, 5 to 25 words, in quotation marks. If you cannot
reproduce it verbatim, you may not raise it. Paraphrase is not evidence. For any
count, state the literal number or drop the claim.

**Budget.** Chapter pass: 8 issues maximum. Full manuscript: 20 maximum, 5
CRITICAL maximum. If more candidates exist, report the highest severity and state
how many you withheld. Returning fewer is expected. Returning zero is valid.

**No unrequested rewriting.** Do not produce replacement prose, sample
paragraphs, or a clean revision unless the author writes `REWRITE [id]`.
Describing a fix is in scope. Performing it is not.

**Minimal sufficient revision.** Smallest change that solves the actual problem,
with its tradeoff stated in one clause. Do not propose a new scene, character, or
subplot without first saying why a smaller fix fails.

**House style is not an error.** Load `DARKWELL_STYLE_SHEET.md`. Anything on it
is correct by definition. Standing carve-outs for every family: foreign language
accuracy is never in scope; deliberate fragments, flat closers, understatement,
and short paragraphs are house style; withheld information is not a defect;
profanity is not a defect. If a house rule is genuinely costing the book, say so
once as `HOUSE STYLE CHALLENGE` with a quote, then never again in the pass.

**Confidence.** HIGH only for mechanically verifiable claims: a count, a date, a
quoted contradiction, a named rule in the bible. Everything else is MED or LOW.

**Self-check before output.** Verbatim quotes on every issue. Within budget. No
unrequested prose. Carve-outs checked. Unverifiable claims marked down. At least
two things named as working, with quotes.
"""

# ---------------------------------------------------------------- family A

A_INPUTS = """## Inputs required

Manuscript or chapter range, project brief, novel bible, issue ledger, style
sheet. `revision-verifier` additionally requires the prior report and the
specific issue IDs claimed fixed.

If any are missing, output `MISSING INPUTS` with the list, and stop. Do not infer
the missing context.
"""

A_FAMILY = """## Structural family rules

**Fact admissibility.** Any fact you place in a table, timeline, or map must
carry a verbatim quote and a location. A fact you cannot quote is not a fact and
may not be used to support a finding. This is the rule that prevents inventing
canon and then auditing against it.

**Do not resolve ambiguity.** When the text is unclear, report the ambiguity.
Never pick the reading that makes your finding work.

**Separate symptom from cause once.** Name the root problem. Do not list its
downstream symptoms as separate issues to fill the budget.

**Deliberate is not broken.** Before flagging a choice, classify it: deliberate,
accidental, unclear, inconsistent, or unsupported. Report the classification. If
you cannot tell, the classification is unclear and the severity drops one level.
"""

# ---------------------------------------------------------------- family B

B_INPUTS = """## Inputs required

The specific scenes in scope, the in-world rules that govern them, the era, and
the jurisdiction.

Do not accept a full manuscript. A specialist given the whole book reviews the
whole book and leaves jurisdiction. If handed one, ask for scenes and stop.

You must be told which story rules are fixed canon. Without that you will flag
the premise as an error.

If any input is missing, output `MISSING INPUTS` with the list, and stop.
"""

B_FAMILY = """## Subject-matter family rules

**Every claim carries a class tag.** No exceptions, including claims that feel
obvious.

- `[STANDARD]` documented practice you can name.
- `[COMMON]` widely true, not universal.
- `[VARIES]` depends on agency, jurisdiction, era, or unit, and you say on what.
- `[SPECULATION]` your reasoning, not established practice.
- `[RESEARCH NEEDED]` the author should verify this with a practitioner.

An untagged claim is a fabrication. If most of your report is `[SPECULATION]`,
say so in the first line and shorten the report.

**State the falsifier.** For each significant finding, name the one fact that
would change your assessment. If nothing would change it, it is not a
plausibility judgment, it is a preference.

**No operational uplift.** Describe why something reads as wrong to an informed
reader. Do not supply procedure detailed enough to be used. Refuse and say why.

**Cinematic shorthand is not impossibility.** A genre convention that informed
readers accept is at most MINOR. Reserve severity for what breaks trust.

**Story rules beat real rules.** Where the bible defines a rule, real-world
practice does not override it. Flag only inconsistency with the story's own rule.

**No research dumping.** Background context is capped at three sentences per
issue. The author asked whether it works, not for a briefing.
"""

# ---------------------------------------------------------------- family C

C_INPUTS = """## Inputs required

The manuscript, in reading order. Nothing else.

**Barred inputs.** The novel bible, project brief, style sheet, issue ledger,
prior reviewer reports, author intent statements, series outlines, and any
statement of what a scene is meant to accomplish.

If any barred material is present in your context, output `CONTAMINATED INPUT`,
name what you were given, and refuse to review. Do not attempt to ignore it.

This is the whole point of the family. Six other skills already read with full
knowledge. You are the only instrument in the system that measures what happens
to someone who does not know what comes next, and knowing ruins the reading.
"""

C_FAMILY = """## Reader family rules

**You are not an editor.** Do not use the words pacing, arc, stakes, beat, setup,
payoff structure, or motivation. If those words appear in your report, rewrite it
in the language a person uses when telling a friend about a book.

**Reaction, not prescription.** Report what happened to you while reading.
Diagnosis is optional and must be tagged `[my guess]`. Prescriptions are banned.
Never write "add," "cut," "move," or "consider." A reader who prescribes has
stopped being useful.

**Report skimming first.** Where you skimmed, where you reread a line because you
lost the thread, and where you would have put the book down. Quote the line you
were on. This is the most valuable and most commonly suppressed data you produce.

**Quote or it did not happen.** Attach a verbatim quote to every reaction. A
reaction with no anchor is invented.

**Be one specific person.** You have a personality, a tolerance, a genre history,
and things you do not like. Stay in it. If your report could be swapped with
another reader's and nobody would notice, the panel produced one data point.

**Confusion has two kinds.** Say which: the kind that made you want to keep
reading, or the kind that made you feel the book had lost control.

**Do not solve the mystery.** If you worked out a twist early, say when and quote
what gave it away. Do not explain how to hide it better.
"""

# ---------------------------------------------------------------- family D

D_INPUTS = """## Inputs required

The manuscript or the sample the author would actually submit, the intended
category, and the word count.

**Barred inputs.** The novel bible and any series outline beyond what the
submission package itself contains. An agent reading Book 1 has not read the
Book 2 plan.

If any input is missing, output `MISSING INPUTS` with the list, and stop.
"""

D_FAMILY = """## Publishing family rules

**Every market claim carries a class tag.**

- `[KNOWN]` verifiable and named: a real comp title, a stated submission
  requirement, a category convention you can point to.
- `[COMMON]` widely believed in the trade, not universal.
- `[UNVERIFIED]` plausible, no source to hand.

**No numbers without `[KNOWN]` and a source.** Advances, print runs, sales
figures, and acquisition outcomes are the most expensive fabrications in this
system because the author may act on them. If you do not have a source, say the
number is unavailable.

**Comps must be real, named, and dated.** Mark `[UNVERIFIED]` if you cannot
confirm the title exists as you describe it. Never invent a comp to complete a
pattern.

**The immortality premise is a late structural reveal.** It is barred from any
hook, logline, pitch, or jacket copy you produce. Build on desire and mystery.

**Taste is not the market.** Separate what you would acquire from what the
category supports. Label which you are giving.
"""

INPUTS = {"A": A_INPUTS, "B": B_INPUTS, "C": C_INPUTS, "D": D_INPUTS}
FAMILY_RULES = {"A": A_FAMILY, "B": B_FAMILY, "C": C_FAMILY, "D": D_FAMILY}
SHAPE = {
    "A": "Shape 1: Issue report",
    "B": "Shape 1: Issue report",
    "C": "Shape 2: Reader report",
    "D": "Shape 3: Market report",
}

BOILERPLATE = re.compile(
    r"\nFor every issue, include:.*?taste-based\.\n", re.S)
SHARED_RULES = re.compile(r"\n## Shared-system rules\n.*?$", re.S)


def section(text, name):
    m = re.search(r"\n## " + re.escape(name) + r"\n(.*?)(?=\n## |\Z)", text, re.S)
    return m.group(1).strip() if m else ""


def patch(path: pathlib.Path, fam: str) -> str:
    raw = path.read_text()
    raw = raw.replace("version: 1.0.0", "version: 2.0.0\n  supersedes: 1.0.0")

    body = BOILERPLATE.sub("\n", raw)
    body = SHARED_RULES.sub("\n", body)

    tags = section(body, "Issue tags")
    prohibitions = section(body, "Prohibitions")
    required_output = section(body, "Required output")

    head = re.split(r"\n## Required output\n", body)[0].rstrip()

    parts = [head, "", INPUTS[fam].rstrip(), ""]

    parts += ["## Required output", ""]
    if required_output and fam != "C":
        parts += [required_output, ""]
    parts += [
        f"Use `{SHAPE[fam]}` from `shared/references/REVIEW_OUTPUT_STANDARD.md`.",
        "Do not add a scorecard. Do not add a verdict paragraph.",
        "",
    ]

    if tags and fam != "C":
        parts += ["## Issue tags", "", tags, ""]

    parts += [ENFORCEMENT.rstrip(), "", FAMILY_RULES[fam].rstrip(), ""]

    if prohibitions:
        parts += ["## Prohibitions", "", prohibitions, ""]

    parts += [
        "## Shared-system rules",
        "",
        "Governed by `EDITORIAL_CONSTITUTION.md`, `REVIEWER_ENFORCEMENT.md`,",
        "`INPUT_CONTRACT.md`, `REVIEW_OUTPUT_STANDARD.md`, and",
        "`ISSUE_MEMORY_PROTOCOL.md`. Where they conflict, `REVIEWER_ENFORCEMENT.md`",
        "wins on mechanism and the constitution wins on principle.",
        "",
        "Preserve authorial intent. Mark uncertainty. Never assert textual evidence",
        "you did not quote.",
        "",
    ]

    out = "\n".join(parts)
    out = re.sub(r"\n{3,}", "\n\n", out)
    for bad in ("\u2014", "\u2013"):
        out = out.replace(bad, ",")
    return out.rstrip() + "\n"


def main():
    root = pathlib.Path(sys.argv[1])
    skills = root / "skills"
    n = 0
    for name, fam in SKILL_FAMILY.items():
        p = skills / name / "SKILL.md"
        if not p.exists():
            print(f"MISSING {name}")
            continue
        p.write_text(patch(p, fam))
        print(f"patched [{fam}] {name}")
        n += 1
    print(f"\n{n} skills patched")


if __name__ == "__main__":
    main()
