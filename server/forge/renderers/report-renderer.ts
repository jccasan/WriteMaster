export function renderReport(type: string, data: any): string {
  switch (type) {
    case "editorial_letter": return renderEditorialLetter(data);
    case "chapter_findings": return renderChapterFindings(data);
    case "character_report": return renderCharacterReport(data);
    case "structure_report": return renderStructureReport(data);
    case "scene_report": return renderSceneReport(data);
    case "fact_check_report": return renderFactCheckReport(data);
    case "beta_reader_report": return renderBetaReaderReport(data);
    default: return `# ${type}\n\nNo renderer available for this report type.`;
  }
}

function renderEditorialLetter(data: any): string {
  const { synthesis, issues, characters, beats, scenes, factChecks, betaResponses, genre } = data;
  const parts: string[] = [];

  parts.push("# Editorial Letter\n");
  parts.push(`**Genre**: ${genre}\n`);
  parts.push(`**Manuscript Health**: ${synthesis.manuscriptHealth || "Not assessed"}\n`);

  parts.push("## Overall Assessment\n");
  parts.push(synthesis.overallAssessment || "No assessment available.\n");

  if (synthesis.strengths?.length > 0) {
    parts.push("\n## Strengths to Preserve\n");
    for (const s of synthesis.strengths) parts.push(`- ${s}`);
  }

  if (synthesis.topPriorityIssues?.length > 0) {
    parts.push("\n## Top Priority Issues\n");
    synthesis.topPriorityIssues.forEach((issue: string, i: number) => {
      parts.push(`${i + 1}. ${issue}`);
    });
  }

  if (synthesis.revisionPriority?.length > 0) {
    parts.push("\n## Suggested Revision Order\n");
    synthesis.revisionPriority.forEach((item: string, i: number) => {
      parts.push(`${i + 1}. ${item}`);
    });
  }

  parts.push("\n## Issue Summary\n");
  parts.push(`| Severity | Count |`);
  parts.push(`|----------|-------|`);
  parts.push(`| Critical | ${issues.filter((i: any) => i.severity === "critical").length} |`);
  parts.push(`| Major | ${issues.filter((i: any) => i.severity === "major").length} |`);
  parts.push(`| Moderate | ${issues.filter((i: any) => i.severity === "moderate").length} |`);
  parts.push(`| Minor | ${issues.filter((i: any) => i.severity === "minor").length} |`);
  parts.push(`| **Total** | **${issues.length}** |`);

  parts.push(`\n**Characters Tracked**: ${characters.length}`);
  parts.push(`**Structure Beats**: ${beats.length}`);
  parts.push(`**Scenes Analyzed**: ${scenes.length}`);
  parts.push(`**Fact Checks**: ${factChecks.length}`);
  parts.push(`**Beta Reader Responses**: ${betaResponses.length}`);

  if (synthesis.encouragement) {
    parts.push(`\n---\n\n*${synthesis.encouragement}*`);
  }

  return parts.join("\n");
}

function renderChapterFindings(data: any): string {
  const { issues, chunks } = data;
  const parts: string[] = ["# Chapter-by-Chapter Findings\n"];

  for (const chunk of chunks) {
    parts.push(`## Chapters ${chunk.startChapter}–${chunk.endChapter}\n`);
    const chunkIssues = issues.filter((i: any) => i.chunkId === chunk.id);
    if (chunkIssues.length === 0) {
      parts.push("No issues found in this section.\n");
    } else {
      for (const issue of chunkIssues) {
        parts.push(`### [${issue.severity.toUpperCase()}] ${issue.title}`);
        parts.push(`**Type**: ${issue.type}`);
        parts.push(`${issue.description}`);
        const evidence = safeParseJson(issue.evidenceJson, []);
        if (evidence.length > 0) {
          parts.push(`**Evidence**:`);
          for (const e of evidence) parts.push(`> ${e}`);
        }
        if (issue.suggestion) parts.push(`**Suggestion**: ${issue.suggestion}`);
        parts.push("");
      }
    }
  }

  return parts.join("\n");
}

function renderCharacterReport(data: any): string {
  const { characters } = data;
  const parts: string[] = ["# Character Analysis Report\n"];

  for (const char of characters) {
    parts.push(`## ${char.name}\n`);
    if (char.description) parts.push(char.description + "\n");

    const aliases = safeParseJson(char.aliasesJson, []);
    if (aliases.length > 0) parts.push(`**Also known as**: ${aliases.join(", ")}`);

    const traits = safeParseJson(char.traitsJson, []);
    if (traits.length > 0) parts.push(`**Traits**: ${traits.join(", ")}`);

    const goals = safeParseJson(char.goalsJson, []);
    if (goals.length > 0) parts.push(`**Goals**: ${goals.join(", ")}`);

    const motives = safeParseJson(char.motivesJson, []);
    if (motives.length > 0) parts.push(`**Motives**: ${motives.join(", ")}`);

    const relationships = safeParseJson(char.relationshipsJson, []);
    if (relationships.length > 0) {
      parts.push("\n**Relationships**:");
      for (const r of relationships) parts.push(`- ${r.character} (${r.type}): ${r.notes || ""}`);
    }

    const injuries = safeParseJson(char.injuriesJson, []);
    if (injuries.length > 0) {
      parts.push("\n**Physical State**:");
      for (const inj of injuries) parts.push(`- ${inj.description} (Ch${inj.chapter}) ${inj.resolved ? "[Resolved]" : "[Active]"}`);
    }

    const voiceNotes = safeParseJson(char.voiceNotesJson, []);
    if (voiceNotes.length > 0) {
      parts.push("\n**Voice Notes**:");
      for (const n of voiceNotes) parts.push(`- ${n}`);
    }

    parts.push("");
  }

  return parts.join("\n");
}

function renderStructureReport(data: any): string {
  const { beats } = data;
  const parts: string[] = ["# Structure Analysis Report\n"];

  const sortedBeats = [...beats].sort((a: any, b: any) => (a.chapterNumber || 0) - (b.chapterNumber || 0));

  parts.push("| Beat | Chapter | Confidence | Notes |");
  parts.push("|------|---------|------------|-------|");
  for (const beat of sortedBeats) {
    parts.push(`| ${beat.beatType} | ${beat.chapterNumber || "?"} | ${Math.round(beat.confidence * 100)}% | ${beat.notes} |`);
  }

  return parts.join("\n");
}

function renderSceneReport(data: any): string {
  const { scenes } = data;
  const parts: string[] = ["# Scene Purpose Report\n"];

  parts.push("| Chapter | Scene | Purpose | Conflict | Change | Rating |");
  parts.push("|---------|-------|---------|----------|--------|--------|");
  for (const scene of scenes) {
    const chNum = scene.chapter?.number || "?";
    parts.push(`| ${chNum} | ${scene.sceneIndex + 1} | ${scene.purpose} | ${scene.conflict} | ${scene.changeOccurred ? "Yes" : "No"} | ${scene.valueRating} |`);
  }

  return parts.join("\n");
}

function renderFactCheckReport(data: any): string {
  const { factChecks } = data;
  const parts: string[] = ["# Fact Check Report\n"];

  const internal = factChecks.filter((f: any) => f.type === "internal");
  const external = factChecks.filter((f: any) => f.type === "external");

  if (internal.length > 0) {
    parts.push("## Internal Consistency\n");
    for (const f of internal) {
      const icon = f.status === "verified" ? "✓" : f.status === "disputed" ? "⚠" : "✗";
      parts.push(`${icon} **${f.claim}**`);
      parts.push(`  ${f.finding} (confidence: ${Math.round(f.confidence * 100)}%)`);
      if (f.notes) parts.push(`  *${f.notes}*`);
      parts.push("");
    }
  }

  if (external.length > 0) {
    parts.push("## External Facts\n");
    for (const f of external) {
      const icon = f.status === "verified" ? "✓" : f.status === "disputed" ? "⚠" : "✗";
      parts.push(`${icon} **${f.claim}**`);
      parts.push(`  ${f.finding} (confidence: ${Math.round(f.confidence * 100)}%)`);
      parts.push("");
    }
  }

  return parts.join("\n");
}

function renderBetaReaderReport(data: any): string {
  const { betaResponses } = data;
  const parts: string[] = ["# Beta Reader Packet\n"];

  for (const response of betaResponses) {
    const resp = safeParseJson(response.responseJson, {});
    parts.push(`## ${resp.profileName || response.profile?.name || "Reader"}\n`);
    if (resp.hookedAt) parts.push(`**Hooked at**: ${resp.hookedAt}`);
    if (resp.attentionSaggedAt) parts.push(`**Attention sagged at**: ${resp.attentionSaggedAt}`);
    if (resp.wouldKeepReading !== undefined) parts.push(`**Would keep reading**: ${resp.wouldKeepReading ? "Yes" : "No"}`);
    if (resp.mightQuitAt) parts.push(`**Might quit at**: ${resp.mightQuitAt}`);

    if (resp.strongestMoments?.length > 0) {
      parts.push("\n**Strongest moments**:");
      for (const m of resp.strongestMoments) parts.push(`- ${m}`);
    }
    if (resp.confusionPoints?.length > 0) {
      parts.push("\n**Confusion points**:");
      for (const m of resp.confusionPoints) parts.push(`- ${m}`);
    }
    if (resp.leastCredibleMoments?.length > 0) {
      parts.push("\n**Least credible**:");
      for (const m of resp.leastCredibleMoments) parts.push(`- ${m}`);
    }
    if (resp.finalEmotionalReaction) parts.push(`\n**Final reaction**: ${resp.finalEmotionalReaction}`);
    if (resp.recommendation) parts.push(`**Recommendation**: ${resp.recommendation}`);
    parts.push("");
  }

  return parts.join("\n");
}

function safeParseJson(json: string, fallback: any): any {
  try { return JSON.parse(json); }
  catch { return fallback; }
}
