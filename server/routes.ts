import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { BookChapter, NarrativeSliders } from "./storage";
import { runStep, getStepName } from "./pipeline";
import { callLLM } from "./llm";
import {
  AUTHOR_VOICE_CONTRACT, AI_WRITING_RULES, SCENE_WRITING_RULES, STORY_ARCHITECTURE_RULES,
  CHAPTER_SUMMARY_TEMPLATE, NARRATIVE_SLIDER_RULES, ANTI_SLOP_FILTER,
  CONTEXT_ENGINEERING_RULES, DEFAULT_DECISION_RULE, LAYERED_GENERATION_WORKFLOW
} from "./writing-rules";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/genres", async (_req, res) => {
    try {
      const genres = await storage.getGenres();
      res.json(genres);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/project/start", async (req, res) => {
    try {
      const { brain_dump, genre } = req.body;
      if (!brain_dump || !genre) {
        return res.status(400).json({ error: "brain_dump and genre are required" });
      }
      const state = await storage.createProject(brain_dump, genre);
      res.json({ project_id: state.project_id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/project/:projectId/run-step", async (req, res) => {
    try {
      const { projectId } = req.params;
      const state = await storage.getProject(projectId);
      if (!state) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (state.current_step > 10) {
        return res.json({
          step_completed: state.current_step,
          step_name: "Pipeline Complete",
          output_preview: "All steps complete.",
          is_complete: true,
        });
      }

      const stepName = getStepName(state.current_step);
      const { updatedState, outputPreview } = await runStep(state);
      await storage.saveProject(updatedState);

      res.json({
        step_completed: state.current_step,
        step_name: stepName,
        output_preview: outputPreview,
        current_step: updatedState.current_step,
        is_complete: updatedState.current_step > 10,
      });
    } catch (err: any) {
      console.error("[Pipeline Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/project/:projectId/state", async (req, res) => {
    try {
      const { projectId } = req.params;
      const state = await storage.getProject(projectId);
      if (!state) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(state);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/project/:projectId/final", async (req, res) => {
    try {
      const { projectId } = req.params;
      const state = await storage.getProject(projectId);
      if (!state) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (state.current_step <= 10) {
        return res.status(400).json({ error: "Pipeline not yet complete" });
      }
      res.json({
        best_pitch: state.best_pitch,
        dossier_final: state.dossier_final,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/project/:projectId/dossier", async (req, res) => {
    try {
      const { projectId } = req.params;
      const state = await storage.getProject(projectId);
      if (!state) {
        return res.status(404).json({ error: "Project not found" });
      }
      const { dossier } = req.body;
      if (typeof dossier !== "string" || !dossier.trim()) {
        return res.status(400).json({ error: "Dossier text is required" });
      }
      state.dossier_final = dossier;
      await storage.saveProject(state);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/chapters", async (_req, res) => {
    try {
      const sessions = await storage.listChapterSessions();
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/chapters/:id", async (req, res) => {
    try {
      const session = await storage.getChapterSession(req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chapters", async (req, res) => {
    try {
      const { id, title, chapter_text, elements, rewritten_chapter } = req.body;
      if (!id || !chapter_text) {
        return res.status(400).json({ error: "id and chapter_text are required" });
      }
      const now = new Date().toISOString();
      const existing = await storage.getChapterSession(id);
      const session = {
        id,
        title: title || chapter_text.substring(0, 60).replace(/\n/g, " ").trim() + "...",
        created_at: existing?.created_at || now,
        updated_at: now,
        chapter_text,
        elements: elements || [],
        rewritten_chapter: rewritten_chapter || null,
      };
      await storage.saveChapterSession(session);
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/chapters/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteChapterSession(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Session not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chapter/extract", async (req, res) => {
    try {
      const { chapter_text } = req.body;
      if (!chapter_text || !chapter_text.trim()) {
        return res.status(400).json({ error: "chapter_text is required" });
      }

      const result = await callLLM(
        `You are an expert fiction editor and story structure analyst. Analyze the following chapter and extract its key structural elements.

CHAPTER TEXT:
${chapter_text}

Extract the following elements. For each element, provide a concise but specific description based on what actually happens in the chapter. If an element is not present or not applicable, write "N/A".

You MUST respond in valid JSON format with this exact structure:
{
  "elements": [
    {"key": "focus_character", "label": "Focus Character", "value": "..."},
    {"key": "character_beginning_state", "label": "Character Beginning State", "value": "..."},
    {"key": "character_end_state", "label": "Character End State", "value": "..."},
    {"key": "emotional_arc", "label": "Emotional Arc", "value": "..."},
    {"key": "chapter_goal", "label": "Chapter Goal", "value": "..."},
    {"key": "central_problem", "label": "Central Problem", "value": "..."},
    {"key": "solution", "label": "Solution (if any)", "value": "..."},
    {"key": "new_problem", "label": "New Problem Introduced", "value": "..."},
    {"key": "key_conflict", "label": "Key Conflict", "value": "..."},
    {"key": "stakes", "label": "Stakes", "value": "..."},
    {"key": "setting", "label": "Setting / Location", "value": "..."},
    {"key": "tone", "label": "Tone / Atmosphere", "value": "..."},
    {"key": "key_revelation", "label": "Key Revelation or Discovery", "value": "..."},
    {"key": "relationship_shift", "label": "Relationship Shift", "value": "..."},
    {"key": "ends_on", "label": "Ends On (Action/Decision/Cliffhanger)", "value": "..."},
    {"key": "thematic_thread", "label": "Thematic Thread", "value": "..."},
    {"key": "foreshadowing", "label": "Foreshadowing", "value": "..."},
    {"key": "pacing_notes", "label": "Pacing Notes", "value": "..."}
  ]
}

When analyzing, also note if the chapter contains any AI writing "tells" — unnatural dialogue, manufactured drama, melodramatic cliches, or over-explaining. If so, flag these in the relevant element values so the user can address them.

Respond with ONLY the JSON, no other text.`,
        "powerful"
      );

      let parsed;
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      }

      if (!parsed.elements || !Array.isArray(parsed.elements)) {
        return res.status(500).json({ error: "AI returned an unexpected format. Please try again." });
      }

      const validElements = parsed.elements.filter(
        (e: any) => e && typeof e.key === "string" && typeof e.label === "string" && typeof e.value === "string"
      );

      if (validElements.length === 0) {
        return res.status(500).json({ error: "No valid elements extracted. Please try again." });
      }

      res.json({ elements: validElements });
    } catch (err: any) {
      console.error("[Chapter Extract Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chapter/rewrite", async (req, res) => {
    try {
      const { chapter_text, elements, sliders } = req.body;
      if (!chapter_text || !elements || !Array.isArray(elements)) {
        return res.status(400).json({ error: "chapter_text and elements array are required" });
      }

      const elementsList = elements
        .map((e: { label: string; value: string }) => `- **${e.label}**: ${e.value}`)
        .join("\n");

      const slidersBlock = formatSlidersBlock(sliders);

      const result = await callLLM(
        `You are a master fiction writer and editor. Your task is to rewrite the chapter below so that it faithfully incorporates ALL of the structural elements provided.

${CONTEXT_ENGINEERING_RULES}

ORIGINAL CHAPTER:
${chapter_text}

STRUCTURAL ELEMENTS TO INCORPORATE:
${elementsList}
${slidersBlock}

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

${SCENE_WRITING_RULES}

${DEFAULT_DECISION_RULE}

${LAYERED_GENERATION_WORKFLOW}

INSTRUCTIONS:
- Rewrite the entire chapter so it naturally embodies every element listed above
- Maintain the original voice, style, and point of view unless an element specifically changes it
- If an element contradicts the original, the element takes priority
- PRESERVE ORIGINAL DETAILS: The original chapter text is the authoritative source for specific world details, setting descriptions, character traits, and established facts. If the original says a road is "well-maintained" or a location is a "major trade corridor," those details MUST appear in the rewrite unless an element explicitly overrides them. Do not invent replacements for details the author already established.
- Apply scene engineering: ensure every scene has Goal → Conflict → Outcome with a clear value shift
- Apply the double-up rule: each scene should serve at least two narrative functions
- End the chapter on an open circuit — leave an unresolved question or tension
- Preserve the original's best qualities — strong prose, vivid imagery, good dialogue
- Do NOT add meta-commentary or notes — output ONLY the rewritten chapter text
- Match approximately the same length as the original (within 20%)
- Make the transitions between elements feel organic, not forced

SELF-EDIT PASS (apply before outputting):
- Remove lines that explain what behavior already shows
- Break any accidental sentence pattern symmetry
- Confirm action clarity in physical sequences

${ANTI_SLOP_FILTER}

Output the rewritten chapter text only, no preamble or commentary.`,
        "powerful",
        undefined,
        16384
      );

      if (!result || !result.trim()) {
        return res.status(500).json({ error: "AI returned an empty rewrite. Please try again." });
      }

      res.json({ rewritten_chapter: result });
    } catch (err: any) {
      console.error("[Chapter Rewrite Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ========== BOOK WRITER ROUTES ==========

  app.get("/api/books", async (_req, res) => {
    try {
      const books = await storage.listBooks();
      res.json(books);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books", async (req, res) => {
    try {
      const { source_project_id, brain_dump, dossier, title } = req.body;
      if (!brain_dump || !dossier) {
        return res.status(400).json({ error: "brain_dump and dossier are required" });
      }

      const book = await storage.createBook(
        source_project_id || null,
        brain_dump,
        dossier,
        title || "Untitled Book"
      );
      res.json(book);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/from-project/:projectId", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (!project.dossier_final) return res.status(400).json({ error: "Project pipeline not complete" });

      const book = await storage.createBook(
        project.project_id,
        project.brain_dump,
        project.dossier_final,
        req.body.title || "Untitled Book"
      );
      res.json(book);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/books/:id", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      res.json(book);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/books/:id", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      if (req.body.title !== undefined) book.title = req.body.title;
      if (req.body.dossier !== undefined) book.dossier = req.body.dossier;
      if (req.body.brain_dump !== undefined) book.brain_dump = req.body.brain_dump;

      await storage.saveBook(book);
      res.json(book);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/books/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBook(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Book not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  function buildPreviousSummariesContext(chapters: BookChapter[], upToChapter: number): string {
    const relevant = chapters
      .filter(c => c.chapter_number < upToChapter && c.summary)
      .sort((a, b) => a.chapter_number - b.chapter_number);

    if (relevant.length === 0) {
      return "No previous chapters yet — this is the first chapter.";
    }

    const RECENT_FULL_COUNT = 5;

    if (relevant.length <= RECENT_FULL_COUNT) {
      return relevant
        .map(c => `### Chapter ${c.chapter_number}: ${c.title}\n${c.summary}`)
        .join("\n\n");
    }

    const older = relevant.slice(0, relevant.length - RECENT_FULL_COUNT);
    const recent = relevant.slice(relevant.length - RECENT_FULL_COUNT);

    const compressedOlder = older.map(c => {
      const plotMatch = c.summary!.match(/\*\*Plot Summary:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      const changedMatch = c.summary!.match(/\*\*What Changed:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      const threadsMatch = c.summary!.match(/\*\*Open Threads:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      const continuityMatch = c.summary!.match(/\*\*Continuity Tracking:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      const parts = [`### Chapter ${c.chapter_number}: ${c.title} (compressed)`];
      if (plotMatch) parts.push(plotMatch[0].trim());
      if (changedMatch) parts.push(changedMatch[0].trim());
      if (threadsMatch) parts.push(threadsMatch[0].trim());
      if (continuityMatch) parts.push(continuityMatch[0].trim());
      if (parts.length === 1) parts.push(c.summary!.substring(0, 500) + "...");
      return parts.join("\n");
    }).join("\n\n");

    const fullRecent = recent
      .map(c => `### Chapter ${c.chapter_number}: ${c.title}\n${c.summary}`)
      .join("\n\n");

    return `[EARLIER CHAPTERS — compressed for context efficiency]\n\n${compressedOlder}\n\n[RECENT CHAPTERS — full detail]\n\n${fullRecent}`;
  }

  function formatSlidersBlock(sliders?: NarrativeSliders | null): string {
    if (!sliders) return "";
    return `
[NARRATIVE_SLIDERS] — Apply these dynamic values to character behavior in this scene:
- tension: ${sliders.tension}/10
- intimacy: ${sliders.intimacy}/10
- violence_risk: ${sliders.violence_risk}/10
- wonder: ${sliders.wonder}/10
- dread: ${sliders.dread}/10
- trust: ${sliders.trust} (range -10 to +10)
- stress: ${sliders.stress} (range -10 to +10)
- control: ${sliders.control} (range -10 to +10)
- hope: ${sliders.hope} (range -10 to +10)

${NARRATIVE_SLIDER_RULES}`;
  }

  app.post("/api/books/:id/outline-chapter", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const lastChapter = book.chapters[book.chapters.length - 1];
      if (lastChapter && (lastChapter.status !== "written" || !lastChapter.summary)) {
        return res.status(400).json({
          error: `Chapter ${lastChapter.chapter_number} must be written and summarized before generating the next outline.`
        });
      }

      const nextNum = book.chapters.length + 1;
      const previousSummaries = buildPreviousSummariesContext(book.chapters, nextNum);

      const result = await callLLM(
        `You are a master story architect working on a novel. Generate a detailed chapter outline for Chapter ${nextNum}.

STORY DOSSIER (characters, world, themes, plot beats):
${book.dossier}

AUTHOR'S ORIGINAL VISION:
${book.brain_dump}

PREVIOUS CHAPTER SUMMARIES:
${previousSummaries}

${STORY_ARCHITECTURE_RULES}

${CONTEXT_ENGINEERING_RULES}

${DEFAULT_DECISION_RULE}

INSTRUCTIONS:
- Based on the dossier's plot beats, determine what should happen in Chapter ${nextNum}
- Consider where the story is right now based on previous chapter summaries
- Apply the character arc engine: what stage of the protagonist's Lie→Truth journey is this chapter? Are they still in the grip of the Lie, getting a glimpse of the Truth, or being tested?
- Each scene in the outline must have a clear Goal, Conflict, and Outcome (value shift)
- Apply the double-up rule: each scene should serve at least two functions (plot + character, action + theme, etc.)
- Include 1-2 mundane frictions that ground the chapter in physical reality
- The chapter must end on an open circuit — an unresolved question or tension that propels the reader forward
- Check continuity: reference character locations, injuries, knowledge states, and active threats from previous chapter summaries
- Be specific — name characters, reference established world details, connect to ongoing threads
- Keep the outline to 300-500 words
- Include a suggested chapter title

Format as:
**Chapter Title:** [title]

**Chapter Goal:** [what this chapter accomplishes in the larger story]

**Arc Position:** [where we are in the protagonist's Lie→Truth journey and the overall plot structure]

**Key Scenes:**
1. [scene description — include Goal/Conflict/Outcome]
2. [scene description — include Goal/Conflict/Outcome]
...

**Emotional Beat:** [the emotional journey of this chapter]

**Mundane Frictions:** [1-2 physical-world complications that affect the action]

**Ends With:** [the open circuit — what unresolved question pulls the reader to the next chapter]`,
        "powerful"
      );

      const titleMatch = result.match(/\*\*Chapter Title:\*\*\s*(.+)/);
      const chapterTitle = titleMatch ? titleMatch[1].trim() : `Chapter ${nextNum}`;

      const newChapter: BookChapter = {
        chapter_number: nextNum,
        title: chapterTitle,
        outline: result,
        content: null,
        summary: null,
        status: "outlined",
        sliders: {
          tension: 5, intimacy: 3, violence_risk: 3, wonder: 3, dread: 3,
          trust: 0, stress: 0, control: 0, hope: 0,
        },
      };

      book.chapters.push(newChapter);
      await storage.saveBook(book);

      res.json({ chapter: newChapter, book });
    } catch (err: any) {
      console.error("[Outline Chapter Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/:id/write-chapter/:chapterNum", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      if (!chapter.outline) return res.status(400).json({ error: "Chapter has no outline" });

      chapter.status = "writing";
      await storage.saveBook(book);

      const previousSummaries = buildPreviousSummariesContext(book.chapters, chapterNum);
      const slidersBlock = formatSlidersBlock(chapter.sliders);

      const result = await callLLM(
        `You are a skilled novelist writing a chapter of a book. Write Chapter ${chapterNum} based on the outline and context below.

${CONTEXT_ENGINEERING_RULES}

STORY DOSSIER (characters, world, themes, plot beats):
${book.dossier}

AUTHOR'S ORIGINAL VISION:
${book.brain_dump}

PREVIOUS CHAPTER SUMMARIES (what has happened so far):
${previousSummaries}

CHAPTER ${chapterNum} OUTLINE:
${chapter.outline}
${slidersBlock}

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

${SCENE_WRITING_RULES}

${DEFAULT_DECISION_RULE}

${LAYERED_GENERATION_WORKFLOW}

INSTRUCTIONS:
- Write the full chapter as polished prose, ready for a reader
- Follow the outline's scenes and emotional beats faithfully
- Apply scene engineering: every scene must have Goal → Conflict → Outcome with a value shift
- Apply the double-up rule: each scene serves at least two functions simultaneously
- Begin scenes late, end them early — enter close to the conflict, exit before full resolution
- End the chapter on an open circuit (Zeigarnik effect) — leave the reader with an unresolved question
- Include concrete sensory details across multiple senses (sound, smell, texture, temperature), not just sight
- Use mundane frictions from the outline to ground action in physical reality
- Maintain continuity with everything in previous chapter summaries — check character locations, injuries, knowledge states, relationships, and active threats
- Use the character voices, world details, and tone established in the dossier
- The chapter should be 2000-4000 words
- Start with the chapter title as a heading
- Write immersive, engaging fiction — not a summary or treatment
- Do NOT include author notes, meta-commentary, or section labels within the prose

SELF-EDIT PASS (apply before outputting):
- Remove lines that explain what behavior already shows
- Replace at least one abstract "meaning" line with concrete action or sensation
- Break any accidental sentence pattern symmetry (three sentences with the same structure)
- Confirm action clarity in physical sequences: hands, objects, positions, cause-and-effect

${ANTI_SLOP_FILTER}

Output only the chapter text.`,
        "powerful",
        undefined,
        16384
      );

      if (!result || !result.trim()) {
        chapter.status = "outlined";
        await storage.saveBook(book);
        return res.status(500).json({ error: "AI returned empty chapter. Please try again." });
      }

      chapter.content = result;
      chapter.status = "written";
      await storage.saveBook(book);

      res.json({ chapter, book });
    } catch (err: any) {
      console.error("[Write Chapter Error]", err);
      const book = await storage.getBook(req.params.id);
      if (book) {
        const chapter = book.chapters.find(c => c.chapter_number === parseInt(req.params.chapterNum));
        if (chapter && chapter.status === "writing") {
          chapter.status = "outlined";
          await storage.saveBook(book);
        }
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/books/:id/summarize-chapter/:chapterNum", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });
      if (!chapter.content) return res.status(400).json({ error: "Chapter has no content to summarize" });

      const result = await callLLM(
        `You are a story continuity editor. Read the chapter below and produce a structured continuity snapshot that will be used as context for writing subsequent chapters.

CHAPTER ${chapterNum}: ${chapter.title}
${chapter.content}

${CHAPTER_SUMMARY_TEMPLATE}

CRITICAL: Be specific and factual. Reference character names and concrete details. This snapshot will be the ONLY context the next chapter's AI has about this chapter. Track every detail that could create a continuity error if forgotten — who knows what, who is where, what is damaged/lost/gained, what promises were made, what threats are active. The Continuity Tracking section is especially important for preventing contradictions in later chapters.`,
        "powerful"
      );

      chapter.summary = result;
      await storage.saveBook(book);

      res.json({ chapter, book });
    } catch (err: any) {
      console.error("[Summarize Chapter Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/books/:id/chapters/:chapterNum", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const chapterNum = parseInt(req.params.chapterNum);
      const chapter = book.chapters.find(c => c.chapter_number === chapterNum);
      if (!chapter) return res.status(404).json({ error: "Chapter not found" });

      if (req.body.title !== undefined) chapter.title = req.body.title;
      if (req.body.outline !== undefined) chapter.outline = req.body.outline;
      if (req.body.content !== undefined) {
        chapter.content = req.body.content;
        if (req.body.content) {
          chapter.status = "written";
        } else {
          chapter.status = "outlined";
          chapter.summary = null;
        }
      }
      if (req.body.summary !== undefined) chapter.summary = req.body.summary;
      if (req.body.sliders !== undefined) chapter.sliders = req.body.sliders;

      await storage.saveBook(book);
      res.json({ chapter, book });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
