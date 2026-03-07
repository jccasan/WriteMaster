import type {
  ManuscriptMemory, OutlineMemoryEntry, CharacterMemoryEntry,
  PlotThreadEntry, WorldRuleEntry, ContinuityEntry,
  IssueMemoryEntry, ResolutionTimelineEntry
} from "./types";

export class MemoryStore {
  private memory: ManuscriptMemory;

  constructor() {
    this.memory = {
      outline: [],
      characters: new Map(),
      plotThreads: new Map(),
      worldRules: [],
      continuity: [],
      issues: [],
      resolutionTimeline: [],
    };
  }

  addOutlineEntry(entry: OutlineMemoryEntry) {
    const existing = this.memory.outline.findIndex(e => e.chapterNumber === entry.chapterNumber);
    if (existing >= 0) {
      this.memory.outline[existing] = { ...this.memory.outline[existing], ...entry };
    } else {
      this.memory.outline.push(entry);
    }
    this.memory.outline.sort((a, b) => a.chapterNumber - b.chapterNumber);
  }

  updateCharacter(name: string, updates: Partial<CharacterMemoryEntry>) {
    const key = name.toLowerCase().trim();
    const existing = this.memory.characters.get(key);
    if (existing) {
      if (updates.traits) existing.traits = [...new Set([...existing.traits, ...updates.traits])];
      if (updates.goals) existing.goals = [...new Set([...existing.goals, ...updates.goals])];
      if (updates.motives) existing.motives = [...new Set([...existing.motives, ...updates.motives])];
      if (updates.relationships) {
        for (const rel of updates.relationships) {
          const existingRel = existing.relationships.find(r => r.character.toLowerCase() === rel.character.toLowerCase());
          if (existingRel) {
            existingRel.type = rel.type;
            existingRel.notes = rel.notes;
          } else {
            existing.relationships.push(rel);
          }
        }
      }
      if (updates.injuries) existing.injuries.push(...updates.injuries);
      if (updates.voiceNotes) existing.voiceNotes.push(...updates.voiceNotes);
      if (updates.continuityNotes) existing.continuityNotes.push(...updates.continuityNotes);
      if (updates.description && updates.description.length > existing.description.length) {
        existing.description = updates.description;
      }
      if (updates.lastSeenChapter) existing.lastSeenChapter = Math.max(existing.lastSeenChapter, updates.lastSeenChapter);
      if (updates.aliases) existing.aliases = [...new Set([...existing.aliases, ...updates.aliases])];
    } else {
      this.memory.characters.set(key, {
        name,
        aliases: updates.aliases || [],
        description: updates.description || "",
        traits: updates.traits || [],
        goals: updates.goals || [],
        motives: updates.motives || [],
        relationships: updates.relationships || [],
        injuries: updates.injuries || [],
        voiceNotes: updates.voiceNotes || [],
        continuityNotes: updates.continuityNotes || [],
        lastSeenChapter: updates.lastSeenChapter || 0,
      });
    }
  }

  updatePlotThread(label: string, updates: Partial<PlotThreadEntry>) {
    const key = label.toLowerCase().trim();
    const existing = this.memory.plotThreads.get(key);
    if (existing) {
      if (updates.status) existing.status = updates.status;
      if (updates.notes) existing.notes.push(...updates.notes);
      if (updates.lastUpdatedChapter) existing.lastUpdatedChapter = updates.lastUpdatedChapter;
    } else {
      this.memory.plotThreads.set(key, {
        label,
        introducedInChapter: updates.introducedInChapter || 0,
        status: updates.status || "active",
        notes: updates.notes || [],
        lastUpdatedChapter: updates.lastUpdatedChapter || 0,
      });
    }
  }

  addWorldRule(rule: WorldRuleEntry) {
    const existing = this.memory.worldRules.find(
      r => r.rule.toLowerCase() === rule.rule.toLowerCase()
    );
    if (!existing) {
      this.memory.worldRules.push(rule);
    }
  }

  addContinuityNote(note: ContinuityEntry) {
    this.memory.continuity.push(note);
  }

  addIssue(issue: IssueMemoryEntry) {
    this.memory.issues.push(issue);
  }

  resolveIssue(issueTitle: string, resolvedAtChapter: number) {
    for (const issue of this.memory.issues) {
      if (issue.title.toLowerCase().includes(issueTitle.toLowerCase()) && issue.status === "active") {
        issue.status = "resolved_later";
        issue.resolvedAtChapter = resolvedAtChapter;
        this.memory.resolutionTimeline.push({
          issueTitle: issue.title,
          introducedChapter: issue.introducedAtChapter || 0,
          resolvedChapter: resolvedAtChapter,
          status: "resolved_later",
        });
      }
    }
  }

  getContextForChunk(chunkStartChapter: number): string {
    const parts: string[] = [];

    if (this.memory.outline.length > 0) {
      const relevant = this.memory.outline.filter(e => e.chapterNumber < chunkStartChapter);
      if (relevant.length > 0) {
        parts.push("STORY SO FAR (outline memory):");
        for (const entry of relevant) {
          parts.push(`  Ch${entry.chapterNumber} "${entry.title}": ${entry.summary}`);
        }
      }
    }

    if (this.memory.characters.size > 0) {
      parts.push("\nACTIVE CHARACTERS:");
      for (const [, char] of this.memory.characters) {
        const injuries = char.injuries.filter(i => !i.resolved);
        let line = `  ${char.name}: ${char.description}`;
        if (injuries.length > 0) line += ` [Active injuries: ${injuries.map(i => i.description).join(", ")}]`;
        parts.push(line);
      }
    }

    if (this.memory.plotThreads.size > 0) {
      const active = [...this.memory.plotThreads.values()].filter(t => t.status === "active");
      if (active.length > 0) {
        parts.push("\nACTIVE PLOT THREADS:");
        for (const thread of active) {
          parts.push(`  - ${thread.label} (introduced ch${thread.introducedInChapter})`);
        }
      }
    }

    const activeIssues = this.memory.issues.filter(i => i.status === "active" || i.status === "introduced");
    if (activeIssues.length > 0) {
      parts.push("\nKNOWN ISSUES TO WATCH:");
      for (const issue of activeIssues.slice(0, 10)) {
        parts.push(`  - [${issue.severity}] ${issue.title}`);
      }
    }

    return parts.join("\n");
  }

  getAllIssues(): IssueMemoryEntry[] {
    return [...this.memory.issues];
  }

  getAllCharacters(): CharacterMemoryEntry[] {
    return [...this.memory.characters.values()];
  }

  getAllPlotThreads(): PlotThreadEntry[] {
    return [...this.memory.plotThreads.values()];
  }

  getOutline(): OutlineMemoryEntry[] {
    return [...this.memory.outline];
  }

  getWorldRules(): WorldRuleEntry[] {
    return [...this.memory.worldRules];
  }

  getContinuityNotes(): ContinuityEntry[] {
    return [...this.memory.continuity];
  }

  getResolutionTimeline(): ResolutionTimelineEntry[] {
    return [...this.memory.resolutionTimeline];
  }

  toJSON(): object {
    return {
      outline: this.memory.outline,
      characters: Object.fromEntries(this.memory.characters),
      plotThreads: Object.fromEntries(this.memory.plotThreads),
      worldRules: this.memory.worldRules,
      continuity: this.memory.continuity,
      issues: this.memory.issues,
      resolutionTimeline: this.memory.resolutionTimeline,
    };
  }
}
