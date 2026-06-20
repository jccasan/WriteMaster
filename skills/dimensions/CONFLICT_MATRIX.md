# CONFLICT MATRIX
# Every cross-dimension pair with a logged conflict.
# Blueprint Architect reads this before building a Story Blueprint to identify active conflicts.

Format: File A | File B | Default Winner | Override Condition

---

## MORAL REGISTER CONFLICTS

| File A | File B | Default Winner | Override Condition |
|---|---|---|---|
| moral-register-noir | moral-register-clear-stakes | moral-register-noir | Clear-stakes can operate confined to a character's private moral economy without claiming systemic legibility |
| moral-register-noir | moral-register-nihilistic | moral-register-noir | Nihilistic wins when the story reveals the tragic structure was itself a consolatory narrative |
| moral-register-noir | tone-register-morally-earnest | moral-register-noir | Morally-earnest can operate confined to a single character's private code, not claimed to extend to the world |
| moral-register-noir | tone-register-mounting-dread | tone-register-mounting-dread | Noir wins when dread is for what the protagonist will have to become, not what will happen to them |
| moral-register-noir | plot-engine-restoration | moral-register-noir | Restoration wins when the recovery is strictly personal and private, making no claim about the larger system |
| moral-register-clear-stakes | moral-register-grey | Neither (resolved scene by scene) | Clear-stakes wins when emotional investment in a choice's cost is required; grey wins when the impossibility of a right answer is the subject |
| moral-register-clear-stakes | moral-register-nihilistic | moral-register-nihilistic | Clear-stakes wins when stakes feel real to the character before nihilistic structure reveals them as illusory |
| moral-register-clear-stakes | pacing-slow-burn | pacing-slow-burn | Clear-stakes wins when stakes must be legible early to produce investment in slow-burn's choices |
| moral-register-tragic | moral-register-nihilistic | moral-register-tragic | Nihilistic wins when the story reveals the tragic structure was itself a fiction |
| moral-register-tragic | plot-engine-restoration | moral-register-tragic | Restoration wins when the restoration attempt is itself the tragic mechanism |
| moral-register-tragic | tone-register-mounting-dread | tone-register-mounting-dread | Tragic wins when the story should produce grief rather than suspense as its primary architecture |
| moral-register-grey | moral-register-nihilistic | moral-register-grey | Nihilistic wins when the grey conflict is revealed as manufactured by an institution that doesn't believe in either position |
| moral-register-grey | tone-register-morally-earnest | moral-register-grey | Morally-earnest wins when the story takes the impossibility of the moral choice seriously as the earnest act |
| moral-register-nihilistic | tone-register-morally-earnest | moral-register-nihilistic | Morally-earnest wins when applied to a character whose earnest engagement is rendered with compassion rather than irony |
| moral-register-nihilistic | plot-engine-restoration | moral-register-nihilistic | Restoration wins when recovery is mechanistic rather than moral |
| moral-register-nihilistic | plot-engine-information | plot-engine-information | Nihilistic wins when information is revealed as irrelevant to outcome |

---

## PACING CONFLICTS

| File A | File B | Default Winner | Override Condition |
|---|---|---|---|
| pacing-thriller-escalation | pacing-slow-burn | pacing-thriller-escalation | Slow-burn wins in sequences where the reader's growing awareness of what is coming IS the pressure |
| pacing-thriller-escalation | pacing-procedural | pacing-thriller-escalation | Procedural wins when investigation itself is the source of pressure and each step advances the threat |
| pacing-thriller-escalation | moral-register-noir | pacing-thriller-escalation | Noir wins when the escalation reveals prior corruption rather than producing new corruption |
| pacing-slow-burn | pacing-propulsive | pacing-propulsive | Slow-burn wins when the story has earned a slow-burn sequence as preparation for the next propulsive event |
| pacing-slow-burn | plot-engine-pursuit | plot-engine-pursuit | Slow-burn wins when pursuit is through accumulation of evidence rather than active physical closing |
| pacing-slow-burn | moral-register-clear-stakes | pacing-slow-burn | Clear-stakes wins when stakes must be legible early to generate investment that slow-burn requires |
| pacing-procedural | pacing-propulsive | pacing-procedural | Propulsive wins in set pieces within a procedural story when the procedure has produced an event requiring momentum |
| pacing-procedural | protagonist-structure-reluctant-inheritor | protagonist-structure-reluctant-inheritor | Procedural wins when reluctant inheritor's competence within procedure coexists with their resistance |

---

## SUPERNATURAL MECHANIC CONFLICTS

| File A | File B | Default Winner | Override Condition |
|---|---|---|---|
| supernatural-mechanic-absent | supernatural-mechanic-operative | Mutually exclusive | None |
| supernatural-mechanic-absent | supernatural-mechanic-central | Mutually exclusive | None |
| supernatural-mechanic-absent | supernatural-mechanic-atmospheric | supernatural-mechanic-absent | Atmospheric can operate during sequences before the grounded explanation has been provided |
| supernatural-mechanic-atmospheric | supernatural-mechanic-operative | supernatural-mechanic-operative | Atmospheric can survive in specific instances — particular events remain uncertain within an operative world |
| supernatural-mechanic-atmospheric | supernatural-mechanic-central | supernatural-mechanic-central | None — investigation cannot coexist with uncertainty about whether the supernatural exists |
| supernatural-mechanic-revelatory | supernatural-mechanic-atmospheric | supernatural-mechanic-revelatory | Atmospheric wins in a story where the revelatory event might be interpreted as hallucination |
| supernatural-mechanic-revelatory | supernatural-mechanic-absent | supernatural-mechanic-revelatory | Mutually exclusive once revelation occurs |
| supernatural-mechanic-central | pacing-propulsive | supernatural-mechanic-central | Propulsive wins when the investigation is producing rapid successive revelations |

---

## PROTAGONIST STRUCTURE CONFLICTS

| File A | File B | Default Winner | Override Condition |
|---|---|---|---|
| protagonist-structure-operative | protagonist-structure-asset | protagonist-structure-operative | Asset wins when the operative discovers they are being used — converting operative to asset status |
| protagonist-structure-insider-turned-outsider | protagonist-structure-operative | protagonist-structure-insider-turned-outsider | Operative wins in sequences where the insider operates as if still inside |

---

## TONE REGISTER CONFLICTS

| File A | File B | Default Winner | Override Condition |
|---|---|---|---|
| tone-register-morally-earnest | moral-register-noir | moral-register-noir | Morally-earnest wins confined to a single character's private code |
| tone-register-morally-earnest | moral-register-nihilistic | moral-register-nihilistic | Morally-earnest wins when applied to a character's earnest engagement with compassion |
| tone-register-morally-earnest | moral-register-grey | moral-register-grey | Morally-earnest wins when taking the impossibility of the moral choice seriously is itself the earnest act |
