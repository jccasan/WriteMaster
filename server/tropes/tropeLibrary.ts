/**
 * tropeLibrary.ts
 *
 * The canonical trope database for WriteMaster's trope system.
 * Each trope carries reader expectations, structural beats, required elements,
 * forbidden violations, and combination role modifiers.
 *
 * Usage: primary trope sets the genre contract, secondary adds a convention layer,
 * tertiary shapes pacing and atmosphere only.
 */

export interface Trope {
  id: string;
  name: string;
  category: "genre" | "subgenre" | "tone" | "structure";
  description: string;          // 1-2 sentences for the picker
  reader_expectations: string[]; // What they came for — non-negotiable
  required_elements: string[];   // Must appear somewhere in the book
  structural_beats: string[];    // Pacing and chapter-level patterns
  forbidden_violations: string[]; // What breaks the reader contract
  pacing_note: string;           // How fast/slow, where to breathe
  as_primary: string;            // How this trope governs when it's the lead genre
  as_secondary: string;          // How it modifies the primary when secondary
  as_tertiary: string;           // Lightest touch — what it adds as background
}

export const TROPES: Trope[] = [
  // ─── GENRE TROPES ───────────────────────────────────────────────────────────

  {
    id: "supernatural",
    name: "Supernatural",
    category: "genre",
    description: "Magic, monsters, or unexplained forces breaking into the mundane world.",
    reader_expectations: [
      "Clearly defined, internally consistent rules for how the supernatural works",
      "A cost or limitation to supernatural power — nothing is free",
      "At least one moment of genuine wonder or dread (not just function)",
      "The uncanny disrupting ordinary life in ways that can't be undone",
      "Characters permanently changed by contact with the supernatural",
    ],
    required_elements: [
      "Establish supernatural rules early — what it can and can't do",
      "Show the price of power at least once in a way that costs the protagonist",
      "One scene of pure uncanny that exists for atmosphere, not plot mechanics",
    ],
    structural_beats: [
      "Inciting incident: first supernatural intrusion the protagonist can't rationalize",
      "Crossing the threshold: protagonist accepts the supernatural is real and acts on that knowledge",
      "Dark night: the cost of the supernatural becomes deeply personal",
      "Climax: protagonist confronts the supernatural on their own terms",
    ],
    forbidden_violations: [
      "Undefined or inconsistently applied supernatural rules (deus ex machina)",
      "Supernatural power with no cost, limit, or consequence",
      "Using the supernatural purely as plot device without emotional weight",
      "Over-explaining the supernatural — mystery is part of the contract",
    ],
    pacing_note: "Allow uncanny moments to breathe. Don't rush supernatural reveals. The strange needs room to be strange before it becomes functional.",
    as_primary: "The genre contract. Everything else must respect the internal logic of the supernatural world. Rules must be established before they're used as plot solutions.",
    as_secondary: "Adds a supernatural layer to the primary genre's central conflict. Tradecraft, romance, or mystery now has a supernatural dimension — but the primary genre's conventions still govern structure.",
    as_tertiary: "Light supernatural atmosphere only — portents, uncanny coincidences, the sense that forces beyond the mundane are at work. No supernatural plot mechanics required.",
  },

  {
    id: "espionage",
    name: "Espionage / Spy",
    category: "genre",
    description: "Covert operations, intelligence work, and the betrayal of identities and loyalties.",
    reader_expectations: [
      "Tradecraft that feels authentic — surveillance, dead drops, cover identities, signals intelligence",
      "The protagonist operating under false identity or hidden agenda",
      "Institutional betrayal — someone trusted is working against the protagonist",
      "Information as the real weapon (what is known, by whom, and what it costs to learn)",
      "Moral compromise — the work requires the protagonist to do things they're not proud of",
    ],
    required_elements: [
      "At least one scene of tradecraft executed with specific, procedural detail",
      "A double-cross or revelation that recontextualizes prior loyalty",
      "The protagonist having to choose between mission and personal ethics at least once",
    ],
    structural_beats: [
      "Cover establishment: protagonist enters the operational environment with a false identity or hidden agenda",
      "The intelligence problem: what is unknown and must be learned at significant cost",
      "Compromise: cover is threatened or broken in a way that forces escalation",
      "Betrayal reveal: the institution or ally that was trusted is working against the protagonist",
      "Resolution through information: the climax is resolved by knowing something others don't",
    ],
    forbidden_violations: [
      "Tradecraft that doesn't hold up to scrutiny — amateur fieldwork in a professional context",
      "A spy who never has to compromise their values",
      "Villains with theatrical ambitions rather than institutional or political motivations",
      "Resolution by direct combat when information is available",
    ],
    pacing_note: "Slow build of paranoia and information uncertainty. Not every chapter needs action — many of the best spy chapters are reading a room, decoding silence, watching hands.",
    as_primary: "The genre contract. The story is about information, loyalty, and institutional betrayal. Combat is secondary to intelligence. Character is revealed through what they're willing to hide and what they can't.",
    as_secondary: "The protagonist's primary conflict (supernatural, romance, mystery) is complicated by institutional loyalty, hidden agendas, and the ethics of deception. Adds procedural texture and moral compromise.",
    as_tertiary: "Adds a layer of paranoia, careful observation, and the sense that everyone has a hidden agenda. Characters are more guarded; information is more controlled.",
  },

  {
    id: "thriller",
    name: "Thriller / Suspense",
    category: "genre",
    description: "High stakes, competent protagonists under extreme pressure with ticking clocks.",
    reader_expectations: [
      "A protagonist who is genuinely competent but consistently outgunned or outmaneuvered",
      "Escalating stakes — each development makes the situation worse, not better",
      "A ticking clock — the cost of delay is concrete and escalating",
      "Set pieces of sustained tension (not just action — sustained dread)",
      "A villain or antagonistic force with real power and intelligence",
    ],
    required_elements: [
      "Establish the clock and stakes by chapter 3 — what happens if the protagonist fails",
      "At least two escalations where things get genuinely, not superficially, worse",
      "A set piece of pure sustained tension (a chase, a surveillance, a confrontation)",
    ],
    structural_beats: [
      "Threat establishment: what the protagonist is facing and why it can't be ignored",
      "First escalation: the initial plan fails or the threat is revealed as larger than expected",
      "Midpoint reversal: what the protagonist thought they were fighting is revealed to be different",
      "Dark night: protagonist is stripped of resources, allies, or options",
      "Final confrontation: protagonist must use intelligence and adaptability, not just force",
    ],
    forbidden_violations: [
      "Stakes that don't escalate — a thriller at the same tension level throughout is just a procedural",
      "A protagonist who is too invincible — competence must be matched by genuine opposition",
      "Resolution by coincidence, luck, or external rescue",
      "Chapters that release tension without immediately re-establishing it",
    ],
    pacing_note: "Never let the reader rest for more than one chapter. Every chapter should end at equal or higher tension than it began. Variation: type of tension can change (action to dread to revelation), but intensity must sustain.",
    as_primary: "The genre contract. Stakes, clock, and escalation govern everything. Structure must relentlessly increase pressure. Character is revealed under extreme pressure, not in leisure.",
    as_secondary: "The primary genre's conflict is given stakes, a clock, and escalating opposition. A romance becomes a romance under life-threatening pressure. A mystery becomes a race against time. Pacing tightens.",
    as_tertiary: "Adds urgency and momentum to the primary genre. Every chapter has a sense of consequence. The reader feels time pressure even in slower scenes.",
  },

  {
    id: "romance",
    name: "Romance",
    category: "genre",
    description: "The developing emotional and romantic relationship between two protagonists as the central story.",
    reader_expectations: [
      "The central relationship gets page time — it can't be a subplot",
      "Both parties are emotionally complex and have reasons to resist the relationship",
      "Clear chemistry demonstrated through scene-level interaction, not told in retrospect",
      "A dark moment where the relationship seems permanently broken (the black moment)",
      "An emotionally satisfying resolution — not necessarily marriage, but commitment",
    ],
    required_elements: [
      "First meeting or re-meeting scene that establishes both attraction and obstacle",
      "At least three scenes of genuine intimacy (emotional, not necessarily physical) that advance the relationship",
      "The black moment — a scene where the relationship seems irreparably broken",
    ],
    structural_beats: [
      "Meet: characters are forced into proximity; immediate attraction complicated by obstacle",
      "Resistance: both characters push back against the relationship for their own valid reasons",
      "Softening: defenses lower; intimacy increases; the reader sees what this relationship could be",
      "Black moment: internal or external force seems to end the relationship permanently",
      "Resolution: protagonist makes an active choice that prioritizes the relationship",
    ],
    forbidden_violations: [
      "A black moment that's resolved too easily — the reader needs to believe it's over",
      "One partner carrying all the emotional labor or making all the sacrifices",
      "External obstacles that substitute for internal character obstacles",
      "A resolution where the protagonist doesn't actively choose — they just get lucky",
    ],
    pacing_note: "Relationship development must be visible scene to scene. Readers notice when chapters pass without relationship advancement. The relationship IS the plot clock.",
    as_primary: "The genre contract. The relationship is the story. External plot exists to pressure and reveal the relationship, not to overshadow it.",
    as_secondary: "The primary genre's protagonist has a romantic subplot that genuinely complicates (not just decorates) the central conflict. The relationship has stakes tied to the main plot.",
    as_tertiary: "Unresolved romantic tension as atmospheric texture. Adds emotional charge to scenes without requiring relationship plot mechanics.",
  },

  {
    id: "mystery",
    name: "Mystery / Detective",
    category: "genre",
    description: "A puzzle with a solution — the reader and protagonist discover the truth together.",
    reader_expectations: [
      "All clues are present in the text before the solution is revealed — fair play",
      "A detective figure (professional or amateur) whose investigative logic the reader can follow",
      "Red herrings that are genuinely misleading but not dishonest",
      "A satisfying solution that reconfigures all prior clues into a new pattern",
      "The mystery is about a human truth, not just a procedural puzzle",
    ],
    required_elements: [
      "The central question established by chapter 2 (who did what, and why)",
      "At least three clues planted before the solution — all visible to the attentive reader",
      "A scene where the detective's working theory is wrong — they must revise",
    ],
    structural_beats: [
      "Crime or problem: the central mystery established; initial scene preserved",
      "Investigation: clues gathered, suspects introduced, working theory formed",
      "False solution: the detective's first answer is wrong, and the investigation restarts",
      "Complication: someone else is at risk, or the stakes of the mystery become personal",
      "Revelation: all clues resolve into a single, inevitable solution",
    ],
    forbidden_violations: [
      "The solution requires information the reader couldn't have had (cheating)",
      "A detective who is right by intuition rather than logic",
      "Red herrings that are never explained or resolved",
      "A solution that is emotionally unsatisfying even if logically correct",
    ],
    pacing_note: "Mysteries breathe differently than thrillers — chapters can be slower, more observational. The tension is intellectual, not physical. But the investigation must always be moving — new information every chapter.",
    as_primary: "The genre contract. The puzzle and its solution govern everything. Plot is the investigation. Character is revealed through how they investigate, not through action.",
    as_secondary: "Adds an investigative layer — a secret that must be uncovered within the primary genre. A romance where one character is hiding something. A thriller where the protagonist must solve a puzzle under time pressure.",
    as_tertiary: "Adds a sense of hidden information — the reader knows more (or less) than they appear to. Secrets and reveals add texture without requiring a full mystery plot.",
  },

  {
    id: "horror",
    name: "Horror",
    category: "genre",
    description: "The sustained cultivation of dread, fear, and the confrontation with what cannot be controlled.",
    reader_expectations: [
      "Genuine fear — not just gore, but dread and the anticipation of the terrible",
      "A threat that is credible and escalating",
      "Characters making understandable (if wrong) decisions under fear",
      "At least one moment that is genuinely disturbing",
      "The horror must mean something — it connects to a human fear beyond the literal threat",
    ],
    required_elements: [
      "Establish the threat's nature and rules early — the reader must understand what they're afraid of",
      "At least one scene of sustained dread (not jump scare — the approach of something terrible)",
      "The horror must have a thematic dimension (isolation, loss of control, the failure of trust)",
    ],
    structural_beats: [
      "Unease: something is wrong; the protagonist can't name it yet",
      "Confirmation: the threat is real; denial is no longer possible",
      "Escalation: the threat intensifies; the protagonist's resources erode",
      "Dark night: the protagonist faces the threat without their defenses",
      "Resolution: the threat is survived, defeated, or accepted — but the protagonist is changed",
    ],
    forbidden_violations: [
      "Horror that relies solely on gore without psychological dimension",
      "A threat with no established rules — arbitrary horror is just chaos",
      "Characters who are stupid rather than scared (decisions must be understandable, not convenient)",
      "A tidy resolution that undoes the horror — horror should leave marks",
    ],
    pacing_note: "Dread builds slowly. Horror chapters can move at a crawl — the terror is in the approach. Never resolve tension completely; let it recede and rebuild. The reader should never fully relax.",
    as_primary: "The genre contract. Dread and fear are the point. All other genre elements serve the horror's emotional impact.",
    as_secondary: "Adds genuine fear and dread to the primary genre. A mystery becomes a terrifying one. A thriller gains psychological horror. The threat becomes something that disturbs, not just endangers.",
    as_tertiary: "Adds an atmosphere of unease — something is wrong, even when everything seems normal. Characters are never fully comfortable; the reader senses threat beneath the surface.",
  },

  {
    id: "epic_fantasy",
    name: "Epic Fantasy",
    category: "genre",
    description: "Large-scale conflict, fully realized secondary worlds, and protagonists with world-historical stakes.",
    reader_expectations: [
      "A world that feels real and fully inhabited — history, politics, geography, culture",
      "Stakes that are genuinely large (kingdoms, ages, civilizations at risk)",
      "A cast of distinct, memorable characters whose loyalties evolve",
      "Magic or power systems with internal logic and cost",
      "A sense of mythic weight — this story matters beyond its characters",
    ],
    required_elements: [
      "World-building that reveals itself through character action, not exposition dumps",
      "Clear factions with distinct values and legitimate grievances",
      "The protagonist must make at least one choice that sacrifices something they love for the larger cause",
    ],
    structural_beats: [
      "Ordinary world: protagonist's starting position before the inciting call",
      "The call: world-historical stakes are introduced; the protagonist is implicated",
      "Alliance building: the protagonist gathers the people and resources for the larger conflict",
      "The cost: something precious is lost in service of the larger cause",
      "Final conflict: the climax resolves the world-historical question",
    ],
    forbidden_violations: [
      "World-building delivered as lecture rather than embedded in action",
      "Stakes that feel abstract — the reader must feel what's lost, not be told",
      "A chosen one with no genuine cost or sacrifice",
      "Magic that solves problems without being established in advance",
    ],
    pacing_note: "Epic fantasy can breathe. Readers want time in the world. But every scene of world-building must earn its length through character revelation or plot advancement. No pure travelogue.",
    as_primary: "The genre contract. World and stakes govern everything. The reader is here for a complete, fully realized world with cosmic-level consequences.",
    as_secondary: "Adds world-historical stakes and world-building texture to the primary genre. A romance set against a dying world. A spy story in a fully realized secondary world with its own politics.",
    as_tertiary: "Adds a sense of history and mythic weight. The events feel like they matter beyond the immediate story. Setting is richly rendered.",
  },

  {
    id: "urban_fantasy",
    name: "Urban Fantasy",
    category: "genre",
    description: "The magical and mundane coexisting in a contemporary or near-contemporary setting.",
    reader_expectations: [
      "The supernatural woven into recognizable contemporary life — not separate from it",
      "A protagonist who navigates both worlds with competence",
      "Distinct supernatural factions, rules, or politics",
      "The city (or contemporary setting) as a character in itself",
      "A protagonist who is permanently positioned between the mundane and magical worlds",
    ],
    required_elements: [
      "Establish the rules of how the supernatural and mundane coexist (hidden, open, contested)",
      "At least one scene where the contemporary setting and supernatural intersect in an unexpected way",
      "The protagonist's dual position creates genuine tension — not just a cool aesthetic",
    ],
    structural_beats: [
      "The mundane surface: ordinary life in a world that contains the supernatural",
      "Inciting incident: the supernatural intrudes in a way that can't be managed from the outside",
      "Entry: protagonist crosses into the hidden world with stakes",
      "Faction politics: the supernatural world's internal conflicts become the protagonist's problem",
      "Resolution: the two worlds are reconciled, separated, or the protagonist makes a permanent choice",
    ],
    forbidden_violations: [
      "A supernatural world that exists separately from the setting — not integrated",
      "Contemporary trappings that are only aesthetic (coffee shops, smartphones) without genuine integration",
      "Supernatural factions with no distinct culture or motivation beyond opposition",
    ],
    pacing_note: "The texture of contemporary life gives urban fantasy its distinctive rhythm. Don't rush past the mundane — the collision of ordinary and magical is the genre's pleasure.",
    as_primary: "The genre contract. The blend of mundane and magical governs everything. The setting must feel genuinely inhabited by both.",
    as_secondary: "Adds a supernatural layer embedded in contemporary life to the primary genre. The espionage or romance or mystery happens in a world where magic is real but hidden.",
    as_tertiary: "Adds the sense that the contemporary world contains hidden layers — not everything is what it appears. Hints of the magical without full supernatural plot mechanics.",
  },

  {
    id: "military_action",
    name: "Military / Action",
    category: "genre",
    description: "Tactical competence, unit loyalty, and physical conflict with authentic procedural detail.",
    reader_expectations: [
      "Authentic military culture, hierarchy, and procedure",
      "Combat sequences that feel choreographed and credible (not cinematic chaos)",
      "Loyalty, duty, and the bonds of unit cohesion under extreme pressure",
      "Physical stakes — bodies matter; injury, exhaustion, and death have real consequences",
      "A moral dimension to the violence — what is worth fighting for and at what cost",
    ],
    required_elements: [
      "Establish unit/team relationships before placing them under combat pressure",
      "At least one tactical sequence with specific procedural detail",
      "A moment where loyalty to the mission conflicts with loyalty to the team",
    ],
    structural_beats: [
      "Team establishment: characters defined through their roles and relationships",
      "Mission: objective established with specific stakes and constraints",
      "Complication: the mission plan fails; adaptation required under fire",
      "Cost: at least one significant loss (human, material, or moral)",
      "Resolution: mission succeeded or failed, but the team is changed",
    ],
    forbidden_violations: [
      "Combat that has no physical consequence — characters who don't get tired, injured, or scared",
      "Military procedure treated as set dressing rather than shaping character decision",
      "Individual heroism that ignores team dynamics",
      "Death that's cheap — every loss must land",
    ],
    pacing_note: "Action sequences should feel fast but not chaotic — the reader should always know where everyone is. Quiet before and after action is essential; don't shortchange aftermath.",
    as_primary: "The genre contract. Physical competence, unit loyalty, and combat reality govern everything. The reader is here for authentic military experience.",
    as_secondary: "Adds tactical competence, physical stakes, and military culture to the primary genre. A spy thriller with military precision. A supernatural story where the protagonist has a soldier's training and worldview.",
    as_tertiary: "Adds physical competence and the procedural texture of trained professionals. Characters move through the world with tactical awareness. Consequences of violence are taken seriously.",
  },

  {
    id: "psychological_thriller",
    name: "Psychological Thriller",
    category: "subgenre",
    description: "The protagonist's perception of reality is unreliable; the threat comes from within as much as without.",
    reader_expectations: [
      "Unreliable narration or perception — the reader can't fully trust what they're being told",
      "A protagonist with a psychological vulnerability that the plot exploits",
      "Reveals that recontextualize prior events (the reader saw it but didn't see it)",
      "The boundary between internal and external threat is deliberately blurred",
      "A satisfying reveal that, in retrospect, was always visible",
    ],
    required_elements: [
      "Establish the protagonist's psychological vulnerability in the first act",
      "Plant at least three clues that the narrator is unreliable before the reveal",
      "A reveal that makes the reader want to reread the early chapters",
    ],
    structural_beats: [
      "Stable surface: the protagonist's world appears normal; their perception appears trustworthy",
      "First fissure: something doesn't add up; the protagonist explains it away",
      "Escalating doubt: the reader begins to question the narrator's reliability",
      "Crisis: the protagonist's perception is directly challenged",
      "Reveal: the true shape of reality is shown; all prior events recontextualize",
    ],
    forbidden_violations: [
      "An unreliable narrator whose unreliability comes from nowhere — it must be rooted in character",
      "A reveal that requires information the reader couldn't have caught (unfair)",
      "Confusion for its own sake with no payoff reveal",
      "A protagonist so unreliable that the reader can't invest in them",
    ],
    pacing_note: "Build slow, careful doubt. The reader should feel uncertain before they know why. Every chapter should slightly destabilize what came before.",
    as_primary: "The genre contract. Unreliable perception and psychological depth govern everything. The thriller's external plot exists to exploit the protagonist's internal vulnerabilities.",
    as_secondary: "Adds unreliable narration and psychological dimension to the primary genre. A mystery where we can't fully trust the detective. A romance where the protagonist's psychology distorts their perception of the other person.",
    as_tertiary: "Adds a subtle layer of unreliability — the reader is never fully certain. Small inconsistencies suggest a character who may be misremembering or misperceiving.",
  },

  {
    id: "heist",
    name: "Heist",
    category: "subgenre",
    description: "A crew assembles to pull off an elaborate, carefully planned theft or con.",
    reader_expectations: [
      "A team with distinct skills whose individual competencies are all essential",
      "A plan that is revealed incrementally — the reader doesn't know the full plan until it unfolds",
      "Complications that force improvisation",
      "The reveal that what appeared to go wrong was actually planned",
      "A satisfying tying together of all threads at the end",
    ],
    required_elements: [
      "Crew establishment — each member's specific skill and their reason for being there",
      "The plan presented in enough detail that complications feel like complications, not confusion",
      "At least one complication that appears catastrophic but is resolved through team adaptation",
    ],
    structural_beats: [
      "The score: the target is established with specific constraints and value",
      "Crew assembly: team members gathered with established chemistry and tension",
      "The plan: exposition that is made engaging through character and procedural detail",
      "The job: the plan executes with complications",
      "The twist: what appeared to go wrong was planned; the true shape of the scheme is revealed",
    ],
    forbidden_violations: [
      "A team where members' skills overlap or aren't all essential to the plan",
      "A plan that works perfectly with no complications",
      "Complications that are resolved through luck rather than skill or preparation",
      "A twist that makes prior events feel arbitrary rather than clever",
    ],
    pacing_note: "Build meticulous before delivering chaos. The planning sequences are as important as the execution. The reader needs to understand the plan to feel the complications.",
    as_primary: "The genre contract. The plan, the crew, and the execution govern everything. Plot is the job.",
    as_secondary: "Adds planning, crew dynamics, and a satisfying scheme-reveal to the primary genre. A supernatural story where the climax requires a carefully planned operation. A thriller with heist structure.",
    as_tertiary: "Adds a sense that events are more carefully arranged than they appear. Characters have plans within plans. Satisfying reveals that what seemed random was engineered.",
  },

  {
    id: "coming_of_age",
    name: "Coming of Age",
    category: "structure",
    description: "A protagonist moves from a limited, protected, or naive worldview to a harder-won adult understanding.",
    reader_expectations: [
      "A protagonist who is genuinely, not ironically, naive at the start",
      "A loss of innocence that is earned and irreversible",
      "Mentors who help and fail the protagonist in roughly equal measure",
      "The protagonist making choices that define who they are becoming",
      "An ending that is bittersweet — something gained, something permanently lost",
    ],
    required_elements: [
      "The protagonist's initial worldview clearly established — what they believe at the start",
      "A mentor figure who models both the appeal and the cost of adulthood",
      "A moment of genuine disillusionment that can't be walked back",
    ],
    structural_beats: [
      "The limited world: the protagonist's starting worldview — comfortable but constraining",
      "The intrusion: something from outside the protagonist's world disrupts their certainty",
      "Testing: the protagonist tries and fails to maintain their initial worldview",
      "Disillusionment: the protagonist loses something they can't get back",
      "Earned maturity: the protagonist chooses their new self — not without loss",
    ],
    forbidden_violations: [
      "A protagonist who learns everything and loses nothing",
      "Mentors who are purely wise — they must also fail the protagonist",
      "A coming-of-age that ends with the protagonist restored to their starting innocence",
      "The lesson being stated rather than demonstrated through consequence",
    ],
    pacing_note: "Allow the protagonist's naivety to be genuinely endearing before destroying it. The reader must love what's being lost. Don't rush the disillusionment.",
    as_primary: "The genre contract. The protagonist's internal growth IS the story. External events exist to accelerate and test that growth.",
    as_secondary: "The protagonist of the primary genre is also on a coming-of-age arc — their external conflict is the mechanism of their internal growth.",
    as_tertiary: "The protagonist begins with a particular worldview that the story challenges. They end differently than they began — not necessarily more mature, but changed.",
  },

  {
    id: "found_family",
    name: "Found Family",
    category: "structure",
    description: "A group of people who are not related by blood form bonds that become family.",
    reader_expectations: [
      "Each member of the found family has a reason they couldn't find belonging elsewhere",
      "The family forms slowly and earns its cohesion — not instant bonding",
      "Individual members sacrifice for each other in ways that demonstrate what family means",
      "At least one member nearly leaves, and the cost of that possibility is felt",
      "The family as a unit faces a threat that requires them to act as one",
    ],
    required_elements: [
      "Each core member's loneliness or displacement established before they find the group",
      "A scene where one member sacrifices something for another that they wouldn't for a stranger",
      "A test where the family faces fracture and chooses to hold together",
    ],
    structural_beats: [
      "Displacement: members are individually alone or displaced",
      "Gathering: circumstance brings them together — not warmly, not easily",
      "Friction: initial conflict establishes who these people are to each other",
      "Cohesion: shared crisis or vulnerability creates genuine bonds",
      "Test: the group is threatened with dissolution; they choose each other",
    ],
    forbidden_violations: [
      "Instant bonding with no friction or testing",
      "A found family that never faces genuine threat of dissolution",
      "Members without individual arcs — the group can't do the character work that individual relationships do",
      "Resolution that relies on blood family coming back to save the day",
    ],
    pacing_note: "Let the bonds form slowly. The reader needs to feel what's at stake when the family is threatened. Rushed bonding means nothing threatens it.",
    as_primary: "The genre contract. The relationships ARE the story. External plot exists to test and reveal the family bonds.",
    as_secondary: "The protagonist's primary conflict is experienced with a found family rather than alone. The bonds of the group complicate and enrich the primary genre's stakes.",
    as_tertiary: "The protagonist has relationships with a small group of people who matter more to them than blood family. These relationships add emotional stakes to any scene.",
  },

  {
    id: "enemies_to_lovers",
    name: "Enemies to Lovers",
    category: "subgenre",
    description: "Two people in genuine opposition develop romantic feelings that neither can easily act on.",
    reader_expectations: [
      "The enmity must be genuine — not a misunderstanding, but a real conflict of values or interests",
      "The attraction must coexist with the opposition from early in the story",
      "Neither character capitulates without cost — both must change",
      "A moment where the stakes are high enough that choosing each other is a real sacrifice",
      "A resolution where the opposition is genuinely resolved, not just set aside",
    ],
    required_elements: [
      "Establish what makes them enemies before showing what makes them attracted to each other",
      "A scene where they must cooperate despite their enmity — and almost succeed at denying the attraction",
      "The cost of choosing each other must be real and demonstrated, not hypothetical",
    ],
    structural_beats: [
      "Opposition established: the protagonists are genuinely in conflict, not merely disliking each other",
      "Forced proximity: circumstances require them to interact despite their enmity",
      "Grudging respect: each sees something in the other they didn't expect",
      "Recognition: they both know what's happening; the attraction is mutual and denied",
      "The choice: one or both must choose the other at genuine cost",
    ],
    forbidden_violations: [
      "Enemies whose enmity is a misunderstanding that gets cleared up — this isn't enemies to lovers, it's miscommunication to lovers",
      "Attraction that appears before the enmity is established and felt",
      "A resolution where neither character sacrifices anything",
      "Using the enemy status purely for sexual tension without genuine conflict of values",
    ],
    pacing_note: "The enmity must feel real and sustained. Don't soften it too quickly — the reader needs to believe they genuinely can't be together before believing they will be.",
    as_primary: "The genre contract. The opposition and its resolution IS the story. All external plot exists to maintain and ultimately resolve the central conflict.",
    as_secondary: "Adds romantic tension rooted in genuine opposition to the primary genre. Two characters on opposite sides of the primary genre's conflict develop feelings.",
    as_tertiary: "Two characters with genuine friction or opposing values are drawn to each other. The tension adds charge to their shared scenes without requiring full romantic plot mechanics.",
  },

  {
    id: "redemption",
    name: "Redemption Arc",
    category: "structure",
    description: "A character who has done genuine harm works to earn a kind of forgiveness — from others or themselves.",
    reader_expectations: [
      "The protagonist's sin or failure must be serious and genuinely harmful — not a minor mistake",
      "Redemption must be earned through action, not through suffering alone",
      "The people harmed must have the agency to withhold forgiveness",
      "The protagonist cannot be restored to their pre-fall status — they become something new",
      "Partial or uncertain forgiveness is often more satisfying than complete absolution",
    ],
    required_elements: [
      "The fall — what the protagonist did and who it harmed, shown not just described",
      "At least one scene where the protagonist has an opportunity to take the easy way out and refuses it",
      "The harmed party (or their representative) having real power over whether redemption is possible",
    ],
    structural_beats: [
      "The fall: what the protagonist did — shown with enough weight that the reader feels the harm",
      "Recognition: the protagonist faces what they did without rationalization",
      "The work: active choices that serve the harmed rather than the protagonist's guilt",
      "The test: a moment that will reveal whether the change is real or just performance",
      "Resolution: partial, earned, and irreversible — not a return to innocence",
    ],
    forbidden_violations: [
      "A fall that isn't serious enough to require real redemption",
      "Redemption through suffering rather than action",
      "The harmed party being obligated to forgive",
      "A restoration to the protagonist's pre-fall life that implies no real change",
    ],
    pacing_note: "Don't rush the fall or the redemption. Both require space to feel real. The reader needs to carry the weight of what was done throughout the story.",
    as_primary: "The genre contract. The arc is the story — the protagonist's fall, recognition, and work toward redemption.",
    as_secondary: "The protagonist of the primary genre is also carrying a past failure that the story forces them to confront and address.",
    as_tertiary: "The protagonist carries the weight of something they've done. This shapes their choices and adds a layer of self-scrutiny to their character.",
  },

  {
    id: "chosen_one",
    name: "Chosen One",
    category: "structure",
    description: "A protagonist singled out by fate, prophecy, or power — and what that cost them.",
    reader_expectations: [
      "The protagonist's specialness should feel like burden, not gift — at least some of the time",
      "Other characters who might have been chosen, or who resent the selection",
      "The selection process must have logic — arbitrary chosen-ness is unsatisfying",
      "A moment where the protagonist rejects or questions their selection",
      "What the protagonist gives up by accepting the role must be real",
    ],
    required_elements: [
      "Establish what the protagonist loses by being chosen — not just what they gain",
      "At least one character who resents, doubts, or contests the selection",
      "The protagonist must make an active choice to accept the role — not just discover it",
    ],
    structural_beats: [
      "Selection: the protagonist is identified as special by prophecy, power, or fate",
      "Resistance: the protagonist resists or doubts the selection",
      "Training/preparation: the protagonist becomes capable enough to fulfill the role",
      "Crisis of faith: the protagonist considers rejecting the role when the cost becomes clear",
      "Active choice: the protagonist chooses the role with full knowledge of what it costs",
    ],
    forbidden_violations: [
      "A chosen one who experiences no meaningful cost for their selection",
      "A world that requires the chosen one without explaining why normal people couldn't solve the problem",
      "The protagonist accepting their role passively — they must choose",
      "Specialness without genuine sacrifice",
    ],
    pacing_note: "The weight of the selection must accumulate throughout the story. Early chapters should show the appeal; middle chapters should reveal the cost; the final choice must feel genuinely hard.",
    as_primary: "The genre contract. Destiny, sacrifice, and active choice govern everything. The external plot is the mechanism of the chosen one's internal journey.",
    as_secondary: "The protagonist of the primary genre is also carrying the burden of selection — something has marked them for a role they didn't choose.",
    as_tertiary: "The protagonist has been marked by fate or power in a way that sets them apart. This adds weight to their choices and the sense that things are moving toward a reckoning.",
  },

  {
    id: "political_intrigue",
    name: "Political Intrigue",
    category: "genre",
    description: "Power, alliance, and betrayal in institutional or governmental settings.",
    reader_expectations: [
      "Factions with distinct values, histories, and legitimate (if opposed) interests",
      "Alliance-building and betrayal as the primary action mechanics",
      "Information and leverage as weapons — what someone knows and who they can ruin",
      "Protagonists who must navigate institutional politics without losing themselves",
      "A sense that power corrupts — including protagonists",
    ],
    required_elements: [
      "At least three distinct factions with clear interests and limited shared ground",
      "A scene where the protagonist must choose between their values and political survival",
      "A betrayal that recontextualizes prior alliances",
    ],
    structural_beats: [
      "Power map: establish who has power, what they want, and who their enemies are",
      "Entry: protagonist enters the political arena with a goal that requires navigating factions",
      "Alliance: protagonist builds coalitions with characters who have conflicting interests",
      "Betrayal: an alliance fractures or is revealed to have been provisional all along",
      "Resolution: the political landscape is realigned — some factions rise, some fall",
    ],
    forbidden_violations: [
      "A faction that is simply evil without understandable interests",
      "Political maneuvering that has no personal cost for the protagonist",
      "A resolution that leaves all factions intact — politics is zero-sum",
      "Dialogue that explains rather than enacts political maneuvering",
    ],
    pacing_note: "Political intrigue moves at the pace of conversation and information. Long scenes of negotiation and subtext are the genre's medium. But they must move — every conversation shifts the power map.",
    as_primary: "The genre contract. Power, alliance, and betrayal govern everything. The story is told in rooms, not on battlefields.",
    as_secondary: "Adds institutional politics and power maneuvering to the primary genre. A military story where the real battle is in the command structure. A romance complicated by political allegiances.",
    as_tertiary: "Every scene has political subtext. Characters are always aware of who has power and what they want. Information is currency.",
  },

  {
    id: "cozy",
    name: "Cozy",
    category: "tone",
    description: "A setting and community the reader wants to inhabit, with conflicts that don't threaten the fundamental safety of the world.",
    reader_expectations: [
      "A specific, vivid, and appealing community or setting that feels lived-in",
      "A protagonist who is embedded in that community with real relationships",
      "Conflict that is real but contained — the fundamental safety of the world is not at stake",
      "Warmth, humor, and pleasurable detail (food, craft, seasonal texture)",
      "Resolution that reinforces community bonds rather than severing them",
    ],
    required_elements: [
      "Establish the community with specific, sensory detail that makes the reader want to be there",
      "At least three community relationships that feel genuine and have history",
      "A conflict that disturbs the community without destroying it",
    ],
    structural_beats: [
      "Community introduction: the world and its people, rendered with warmth and specificity",
      "Disturbance: something disrupts the community's equilibrium",
      "Investigation or response: the protagonist engages with the disturbance through their community relationships",
      "Complication: the disturbance is more serious than initially apparent",
      "Resolution: the community is restored — changed, but intact",
    ],
    forbidden_violations: [
      "Genuine existential threat — the cozy genre contract prohibits stakes that are too high",
      "A protagonist who is isolated from the community rather than embedded in it",
      "Resolution that permanently harms a beloved community member",
      "Gritty or graphic content — this genre is about comfort, not challenge",
    ],
    pacing_note: "Cozy can breathe at length in setting and community texture. The pleasure is in being in the world. Don't rush through the community to get to the conflict.",
    as_primary: "The genre contract. Community, warmth, and bounded conflict govern everything. The reader is here to inhabit a pleasant world safely.",
    as_secondary: "Adds community texture and warmth to the primary genre. A mystery in a community the reader loves. A romance embedded in a vivid, specific place.",
    as_tertiary: "Adds warmth and community texture to the atmosphere. The world is specific and lovingly rendered; the reader feels welcome in it.",
  },

  {
    id: "literary",
    name: "Literary Fiction",
    category: "tone",
    description: "Language, interiority, and the precise rendering of human experience as primary values.",
    reader_expectations: [
      "Prose that is worth reading for itself — not just for plot or information delivery",
      "Interiority that reveals how this specific mind processes the world",
      "Ambiguity that is earned — not every question has an answer",
      "Thematic resonance that accumulates without being stated",
      "Characters who are specific enough to be irreducible to type",
    ],
    required_elements: [
      "At least one passage where the prose itself is remarkable — not just functional",
      "A central question the story asks without fully answering",
      "Character interiority that couldn't be produced for any other character in any other story",
    ],
    structural_beats: [
      "Immersion: the reader is placed inside a specific consciousness",
      "Accumulation: meaning builds through image, detail, and behavior rather than event",
      "Crisis: the central question of the story is brought to a head",
      "Revelation: something is seen that can't be unseen — but may not be fully understood",
      "Open ending: the story closes without all questions answered; some things remain in motion",
    ],
    forbidden_violations: [
      "Plot-driven momentum that overrides interiority",
      "Thematic statements delivered by characters rather than earned through action",
      "Prose that is plain when the moment calls for precision",
      "Resolution that is too complete — life doesn't resolve cleanly",
    ],
    pacing_note: "Literary fiction can and should move slowly when the interiority demands it. The pace is set by the depth of the moment, not the urgency of the plot.",
    as_primary: "The genre contract. Language and interiority are the point. Plot is the occasion for consciousness, not the goal.",
    as_secondary: "Adds prose quality and interiority depth to the primary genre. A thriller with literary interiority. A romance rendered with precise, beautiful observation.",
    as_tertiary: "Adds prose precision and specific interiority to the atmospheric texture. The writing itself earns notice. Characters' inner lives are rendered with specificity.",
  },

  {
    id: "historical",
    name: "Historical Fiction",
    category: "genre",
    description: "Fiction set in a specific historical period, where the period shapes and constrains the story.",
    reader_expectations: [
      "Period authenticity — language, social structure, material culture, and daily life feel real",
      "The historical period creating genuine constraints that characters must navigate",
      "Historical events used as story material, not merely backdrop",
      "A protagonist whose worldview is shaped by their historical moment",
      "Research worn lightly — present in texture, not in lecture",
    ],
    required_elements: [
      "At least one major historical event or figure that directly affects the protagonist's plot",
      "Constraints of the period that genuinely limit the protagonist's options",
      "Material culture rendered with specific, sensory accuracy",
    ],
    structural_beats: [
      "Period immersion: establish the historical world through specific daily detail",
      "Inciting event: a historical event or its consequences touches the protagonist",
      "Period navigation: the protagonist must move through the constraints of their time",
      "Historical convergence: the personal plot and historical moment intersect at high stakes",
      "Resolution: the protagonist's story concludes in a way shaped by its historical moment",
    ],
    forbidden_violations: [
      "Modern values transplanted wholesale into historical characters without friction",
      "Historical detail as lecture rather than embedded in action and character",
      "Ignoring the genuine constraints of the period when they're inconvenient for the plot",
      "Using historical tragedy as mere backdrop for a love story",
    ],
    pacing_note: "The period texture requires space to accumulate. But period texture without narrative momentum is a history lesson. Both must be present throughout.",
    as_primary: "The genre contract. The period is a character. Everything is shaped by its historical moment.",
    as_secondary: "Embeds the primary genre in a specific historical moment that creates authentic constraint and texture. A spy story in a specific historical period. A romance shaped by the social constraints of its time.",
    as_tertiary: "Adds period texture and authenticity to the setting. The world feels historically grounded; daily life has the specific texture of its moment.",
  },
];

export function getTropeById(id: string): Trope | undefined {
  return TROPES.find(t => t.id === id);
}

export function getTropeList() {
  return TROPES.map(t => ({
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
  }));
}
