import express from "express";
import { storage } from "../storage";
import { callLLM } from "../llm";

const router = express.Router();

  // ========== PUBLISHING TOOLS ROUTES ==========

  router.post("/api/publishing/trope-research", async (req, res) => {
    try {
      const { niche } = req.body;
      if (!niche || !niche.trim()) {
        return res.status(400).json({ error: "niche is required" });
      }

      const prompt = `You are an expert KDP publishing strategist with deep knowledge of romance and fiction subgenres, reader expectations, and Amazon marketplace dynamics.

A writer is building a series in this niche/subgenre: "${niche.trim()}"

Analyze this niche and provide comprehensive trope research following proven KDP publishing strategy. Return ONLY valid JSON with this exact structure:

{
  "niche": "the cleaned niche name",
  "recurring_tropes": [
    {
      "name": "Trope Name",
      "description": "Why readers expect this trope in this niche and how to execute it well",
      "series_frequency": "use in every book / use in 80% of books / use occasionally"
    }
  ],
  "unique_tropes": [
    {
      "name": "Trope Name",
      "description": "A fresher twist or less-saturated variation that differentiates your books",
      "combination_potential": "Works best paired with: X and Y tropes"
    }
  ],
  "trending_combinations": [
    {
      "combo": "Trope A + Trope B",
      "why": "Why this combination is resonating with readers right now",
      "title_example": "Example title that signals these tropes"
    }
  ],
  "series_branding": {
    "consistency_advice": "How to build brand consistency across a series using these tropes",
    "reader_promise": "What readers should always get from your books — your unbreakable promise",
    "differentiation": "How to vary book to book while staying on-brand",
    "title_pattern": "Suggested title pattern or formula for the series"
  },
  "kdp_notes": "Specific notes about Amazon reader behavior, search terms, and category positioning for this niche"
}

RULES:
- Provide exactly 4-6 recurring tropes (what readers expect in EVERY book)
- Provide exactly 2-4 unique tropes (fresher options that differentiate)
- Provide exactly 3-5 trending combinations
- All advice should be specific to the exact niche provided, not generic
- Think about what sells on Amazon specifically — reader intent, search behavior, category placement
- Respond with ONLY the JSON, no other text`;

      const result = await callLLM(prompt, "powerful");

      let parsed;
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      }

      if (!Array.isArray(parsed.recurring_tropes) || !Array.isArray(parsed.unique_tropes) ||
          !Array.isArray(parsed.trending_combinations) || !parsed.series_branding) {
        return res.status(500).json({ error: "AI returned unexpected format. Please try again." });
      }
      if (parsed.recurring_tropes.length < 4) {
        return res.status(500).json({ error: `AI returned only ${parsed.recurring_tropes.length} recurring tropes (need at least 4). Please try again.` });
      }
      if (parsed.unique_tropes.length < 2) {
        return res.status(500).json({ error: `AI returned only ${parsed.unique_tropes.length} unique tropes (need at least 2). Please try again.` });
      }
      if (parsed.trending_combinations.length < 2) {
        return res.status(500).json({ error: `AI returned only ${parsed.trending_combinations.length} trending combinations (need at least 2). Please try again.` });
      }
      parsed.recurring_tropes = parsed.recurring_tropes.slice(0, 6);
      parsed.unique_tropes = parsed.unique_tropes.slice(0, 4);
      parsed.trending_combinations = parsed.trending_combinations.slice(0, 5);

      res.json(parsed);
    } catch (err: any) {
      console.error("[Trope Research Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/publishing/blurb/:bookId", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.bookId);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const writtenChapters = book.chapters.filter(c => c.summary || c.content);
      if (!book.dossier && writtenChapters.length === 0) {
        return res.status(400).json({ error: "This book needs a dossier or at least one written chapter before generating blurbs." });
      }

      const chapterContext = writtenChapters
        .slice(0, 8)
        .map(c => `Chapter ${c.chapter_number} - ${c.title}: ${c.summary || (c.content || "").substring(0, 300)}`)
        .join("\n\n");

      const prompt = `You are an expert KDP copywriter who specializes in writing Amazon book blurbs that convert browsers into buyers.

BOOK INFORMATION:
Title: ${book.title}
${book.dossier ? `Story Dossier:\n${book.dossier.substring(0, 3000)}` : ""}
${chapterContext ? `\nChapter Summaries:\n${chapterContext}` : ""}

Generate 3 distinct blurb variants for this book following KDP best practices. Return ONLY valid JSON:

{
  "blurbs": [
    {
      "label": "Hook-First",
      "text": "The full blurb text...",
      "strategy": "Brief note on the approach taken"
    },
    {
      "label": "Character-Led",
      "text": "The full blurb text...",
      "strategy": "Brief note on the approach taken"
    },
    {
      "label": "Tension-Forward",
      "text": "The full blurb text...",
      "strategy": "Brief note on the approach taken"
    }
  ]
}

RULES FOR EVERY BLURB:
1. First line is a HOOK — a single punchy sentence that grabs attention immediately
2. Introduce the main character(s) with their stakes, not their biography
3. Show the central conflict and tension — what stands between them and what they want
4. Weave in trope signals that readers search for (e.g., "enemies to lovers," "forced proximity," "second chance")
5. End on a cliffhanger that compels the purchase — leave the reader NEEDING to know what happens
6. Each blurb should be 150-250 words
7. NO spoilers — reveal conflict, not resolution
8. Use present tense for the blurb text
9. Make the emotional stakes crystal clear — readers buy emotion, not plot
10. Respond with ONLY the JSON, no preamble`;

      const result = await callLLM(prompt, "powerful");

      let parsed;
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      }

      if (!parsed.blurbs || !Array.isArray(parsed.blurbs)) {
        return res.status(500).json({ error: "AI returned unexpected format. Please try again." });
      }
      if (parsed.blurbs.length < 2) {
        return res.status(500).json({ error: `AI returned only ${parsed.blurbs.length} blurb variant(s) (need at least 2). Please try again.` });
      }
      parsed.blurbs = parsed.blurbs.slice(0, 3);

      res.json(parsed);
    } catch (err: any) {
      console.error("[Blurb Generator Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/publishing/titles-keywords/:bookId", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.bookId);
      if (!book) return res.status(404).json({ error: "Book not found" });

      const hasContent = book.dossier || book.chapters.some(c => c.status === "written" || c.summary);
      if (!hasContent) {
        return res.status(400).json({ error: "This book needs a dossier or at least one written/summarized chapter before generating titles and keywords." });
      }

      const chapterContext = book.chapters
        .filter(c => c.summary)
        .slice(0, 5)
        .map(c => `Ch. ${c.chapter_number} (${c.title}): ${c.summary}`)
        .join("\n");

      const prompt = `You are an expert KDP publishing strategist who specializes in titles and Amazon keyword optimization.

BOOK INFORMATION:
Current Title: ${book.title}
${book.dossier ? `Story Dossier:\n${book.dossier.substring(0, 2500)}` : ""}
${chapterContext ? `\nChapter Context:\n${chapterContext}` : ""}

Generate title options and keyword strategy for this book. Return ONLY valid JSON:

{
  "titles": [
    {
      "title": "Main Title",
      "subtitle": "A Subtitle That Signals Tropes",
      "tropes_embedded": ["trope 1", "trope 2"],
      "reasoning": "Why this title works for this book and its readers"
    }
  ],
  "keywords": [
    {
      "phrase": "long-tail keyword phrase",
      "intent": "What reader is searching for with this phrase",
      "competition": "low / medium / high"
    }
  ],
  "categories": [
    {
      "path": "Kindle Store > Books > Romance > ...",
      "reasoning": "Why this category fits and how to rank in it"
    }
  ],
  "keyword_strategy": "Overall strategy note explaining how to use these keywords together"
}

TITLE RULES (generate 7-10 options):
- Each title must embed 2-3 tropes readers search for — be explicit and specific
- Subtitle should amplify the trope signals (e.g., "A Small Town Second Chance Romance")
- Examples of strong trope-forward titles: "The Enemy's Heir," "Second Chance at Sunrise," "Forced to Love the Billionaire"
- Avoid vague literary titles — readers on Amazon search for tropes, not metaphors
- Include some series-ready titles (e.g., "Silver Creek Falls Book 1")

KEYWORD RULES (generate exactly 7):
- Each keyword must be a multi-word phrase, NOT a single word
- Think like a reader: what exact phrase would someone type to find this book?
- Mix: subgenre phrases, trope combinations, character type phrases, emotional experience phrases
- Examples: "enemies to lovers small town romance," "billionaire forced proximity novel," "dark romance mafia enemies"
- Avoid: single words, publisher names, other author names, misleading terms

CATEGORY RULES (recommend exactly 2):
- Be specific to Amazon's actual category tree
- Choose categories where you can rank, not just ones that fit

Respond with ONLY the JSON, no preamble.`;

      const result = await callLLM(prompt, "powerful");

      let parsed;
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      }

      if (!Array.isArray(parsed.titles) || !Array.isArray(parsed.keywords) || !Array.isArray(parsed.categories)) {
        return res.status(500).json({ error: "AI returned unexpected format. Please try again." });
      }
      if (parsed.titles.length < 5) {
        return res.status(500).json({ error: `AI returned only ${parsed.titles.length} title option(s) (need at least 5). Please try again.` });
      }
      if (parsed.keywords.length < 7) {
        return res.status(500).json({ error: `AI returned only ${parsed.keywords.length} keywords (need 7). Please try again.` });
      }
      if (parsed.categories.length < 2) {
        return res.status(500).json({ error: `AI returned only ${parsed.categories.length} category recommendation(s) (need 2). Please try again.` });
      }
      parsed.titles = parsed.titles.slice(0, 10);
      parsed.keywords = parsed.keywords.slice(0, 7);
      parsed.categories = parsed.categories.slice(0, 2);

      res.json(parsed);
    } catch (err: any) {
      console.error("[Titles & Keywords Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

export default router;
