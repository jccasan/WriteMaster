import express from "express";
import { readFile, writeFile, readdir, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { storage } from "../storage";
import { callLLM } from "../llm";
import {
  AUTHOR_VOICE_CONTRACT, AI_WRITING_RULES, SCENE_WRITING_RULES,
  ANTI_SLOP_FILTER, CONTEXT_ENGINEERING_RULES, DEFAULT_DECISION_RULE,
  LAYERED_GENERATION_WORKFLOW, READER_VALUE_TEST, RAW_MATERIAL_MINDSET
} from "../writing-rules";
import { formatSlidersBlock, VARIANT_LENSES } from "./helpers";

const router = express.Router();

const DRAFTS_DIR = path.resolve("data/chapter-drafts");
if (!existsSync(DRAFTS_DIR)) mkdir(DRAFTS_DIR, { recursive: true }).catch(() => {});

const SAFE_ID = /^[a-zA-Z0-9_-]{1,64}$/;

interface ChapterDraft {
  id: string;
  title: string;
  prompt: string;
  genre: string;
  content: string;
  created_at: string;
  updated_at: string;
}

  router.get("/api/chapters", async (_req, res) => {
    try {
      const sessions = await storage.listChapterSessions();
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/chapters/:id", async (req, res) => {
    try {
      const session = await storage.getChapterSession(req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/chapters", async (req, res) => {
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

  router.delete("/api/chapters/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteChapterSession(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Session not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/chapter/extract", async (req, res) => {
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

  router.post("/api/chapter/rewrite", async (req, res) => {
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

${READER_VALUE_TEST}

${RAW_MATERIAL_MINDSET}

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

  router.post("/api/chapter/write-standalone", async (req, res) => {
    try {
      const { prompt, genre, sliders } = req.body;
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const slidersBlock = formatSlidersBlock(sliders);
      const genreHint = genre ? `\nGENRE CONTEXT: ${genre}\n` : "";

      const result = await callLLM(
        `You are a skilled novelist writing a standalone chapter from the author's creative prompt.

${CONTEXT_ENGINEERING_RULES}

AUTHOR'S CREATIVE PROMPT:
${prompt}
${genreHint}
${slidersBlock}

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

${SCENE_WRITING_RULES}

${DEFAULT_DECISION_RULE}

${LAYERED_GENERATION_WORKFLOW}

${READER_VALUE_TEST}

${RAW_MATERIAL_MINDSET}

INSTRUCTIONS:
- Write a complete, polished chapter (2000-4000 words) based on the author's prompt
- Extract characters, setting, conflict, and tone from whatever the author has given you — whether that's a detailed outline or just a raw idea
- Structure the chapter with proper scene engineering: Goal → Conflict → Outcome with value shifts
- Apply the double-up rule: each scene serves at least two functions simultaneously
- Begin scenes late, end them early — enter close to the conflict, exit before full resolution
- End the chapter on an open circuit (Zeigarnik effect) — leave the reader with an unresolved question
- Include concrete sensory details across multiple senses (sound, smell, texture, temperature), not just sight
- Write immersive, engaging fiction — not a summary or treatment
- Start with a chapter title as a heading
- Do NOT include author notes, meta-commentary, or section labels within the prose

SELF-EDIT PASS (apply before outputting):
- Remove lines that explain what behavior already shows
- Replace at least one abstract "meaning" line with concrete action or sensation
- Break any accidental sentence pattern symmetry
- Confirm action clarity in physical sequences

${ANTI_SLOP_FILTER}

Output only the chapter text.`,
        "powerful",
        undefined,
        16384
      );

      if (!result || !result.trim()) {
        return res.status(500).json({ error: "AI returned empty chapter. Please try again." });
      }

      res.json({ content: result });
    } catch (err: any) {
      console.error("[Standalone Chapter Write Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/chapter/write-standalone-variants", async (req, res) => {
    try {
      const { prompt, genre, sliders } = req.body;
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const slidersBlock = formatSlidersBlock(sliders);
      const genreHint = genre ? `\nGENRE CONTEXT: ${genre}\n` : "";

      const variantPromises = VARIANT_LENSES.map(lens =>
        callLLM(
          `You are a skilled novelist writing a standalone chapter from the author's creative prompt.

${lens.instruction}

${CONTEXT_ENGINEERING_RULES}

AUTHOR'S CREATIVE PROMPT:
${prompt}
${genreHint}
${slidersBlock}

${AUTHOR_VOICE_CONTRACT}

${AI_WRITING_RULES}

${SCENE_WRITING_RULES}

${DEFAULT_DECISION_RULE}

${LAYERED_GENERATION_WORKFLOW}

${READER_VALUE_TEST}

${RAW_MATERIAL_MINDSET}

INSTRUCTIONS:
- Write a complete, polished chapter (2000-4000 words) based on the author's prompt AND the creative lens above
- The creative lens should noticeably shape the output — this variant should feel different from other approaches
- Extract characters, setting, conflict, and tone from whatever the author has given you
- Structure the chapter with proper scene engineering: Goal → Conflict → Outcome with value shifts
- Apply the double-up rule: each scene serves at least two functions simultaneously
- Begin scenes late, end them early
- End the chapter on an open circuit
- Include concrete sensory details across multiple senses
- Write immersive, engaging fiction
- Start with a chapter title as a heading
- Do NOT include author notes, meta-commentary, or section labels within the prose

SELF-EDIT PASS (apply before outputting):
- Remove lines that explain what behavior already shows
- Replace at least one abstract "meaning" line with concrete action or sensation
- Break any accidental sentence pattern symmetry
- Confirm action clarity in physical sequences

${ANTI_SLOP_FILTER}

Output only the chapter text.`,
          "powerful",
          undefined,
          16384
        ).then(result => ({
          lens: lens.name,
          content: result?.trim() || "",
        })).catch(err => ({
          lens: lens.name,
          content: "",
          error: err.message,
        }))
      );

      const variants = await Promise.all(variantPromises);
      const successfulVariants = variants.filter(v => v.content);

      if (successfulVariants.length === 0) {
        return res.status(500).json({ error: "All variant generations failed. Please try again." });
      }

      res.json({ variants: successfulVariants });
    } catch (err: any) {
      console.error("[Standalone Variant Write Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/chapter-drafts", async (_req, res) => {
    try {
      if (!existsSync(DRAFTS_DIR)) { res.json([]); return; }
      const files = await readdir(DRAFTS_DIR);
      const drafts: ChapterDraft[] = [];
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const raw = await readFile(path.join(DRAFTS_DIR, file), "utf-8");
          drafts.push(JSON.parse(raw));
        } catch { continue; }
      }
      drafts.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      res.json(drafts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/chapter-drafts/:id", async (req, res) => {
    try {
      const id = req.params.id;
      if (!SAFE_ID.test(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
      const fp = path.join(DRAFTS_DIR, `${id}.json`);
      if (!existsSync(fp)) { res.status(404).json({ error: "Not found" }); return; }
      const raw = await readFile(fp, "utf-8");
      res.json(JSON.parse(raw));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/chapter-drafts", async (req, res) => {
    try {
      const { id, prompt, genre, content } = req.body;
      const now = new Date().toISOString();
      const draftId = (id && SAFE_ID.test(id)) ? id : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const titleLine = (prompt || "").split("\n")[0].slice(0, 80) || "Untitled Chapter";
      const existing = existsSync(path.join(DRAFTS_DIR, `${draftId}.json`));
      const draft: ChapterDraft = {
        id: draftId,
        title: titleLine,
        prompt: prompt || "",
        genre: genre || "",
        content: content || "",
        created_at: existing ? (JSON.parse(await readFile(path.join(DRAFTS_DIR, `${draftId}.json`), "utf-8")).created_at || now) : now,
        updated_at: now,
      };
      await writeFile(path.join(DRAFTS_DIR, `${draftId}.json`), JSON.stringify(draft, null, 2));
      res.json(draft);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete("/api/chapter-drafts/:id", async (req, res) => {
    try {
      const id = req.params.id;
      if (!SAFE_ID.test(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
      const fp = path.join(DRAFTS_DIR, `${id}.json`);
      if (!existsSync(fp)) { res.status(404).json({ error: "Not found" }); return; }
      await unlink(fp);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

export default router;
