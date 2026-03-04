# StoryDossier

AI-powered story development pipeline that transforms a writer's raw ideas into a polished Story Dossier, then writes the book chapter by chapter.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui, served via Vite
- **Backend**: Express.js (TypeScript), JSON file storage (no database)
- **AI**: Replit AI Integrations (Anthropic) — Claude Sonnet 4.6 for complex tasks, Claude Haiku 4.5 for fast tasks

## Modules

### Story Dossier Pipeline
11-step AI pipeline: brain dump + genre → subgenre detection → pitch generation → best pitch selection → dossier draft → emotional check → name check → revision → logic check → final polish.

### Chapter Analyzer
Standalone tool: paste a chapter → Claude extracts 18 structural elements → user edits/adds/removes → Claude rewrites chapter. Sessions persist to disk.

### Book Writer
Takes a completed dossier + brain dump, writes the book chapter by chapter. Each chapter uses running summaries of previous chapters (not full text) for context. Split-panel UI: chapter text on left, summary/high points/changes on right. Flow: generate outline → edit → write chapter → summarize → next chapter.

**Context strategy**: Each chapter prompt receives dossier (characters/world/themes/plot beats), brain dump, ALL previous chapter summaries (compact), and current chapter outline. Avoids token limits while maintaining narrative continuity.

## Key Files

### Backend
- `server/routes.ts` — API endpoints (pipeline, chapter analyzer, book writer)
- `server/pipeline.ts` — 11-step AI pipeline logic + ProjectState type
- `server/llm.ts` — Anthropic Claude wrapper (cheap/powerful mode)
- `server/storage.ts` — File-based storage for projects, chapter sessions, and books
- `server/writing-rules.ts` — Comprehensive AI writing rules system with 4 specialized rule sets:
  - `AI_WRITING_RULES` — Core anti-AI-tell rules (dialogue, prose, structure, characters) injected into all prose prompts
  - `SCENE_WRITING_RULES` — Scene engineering rules (Goal/Conflict/Outcome, double-up rule, mundane friction, pacing control, Cut the Author checklist) used in chapter writing and rewrite prompts
  - `STORY_ARCHITECTURE_RULES` — Story construction rules (Lie/Truth/Want/Need/Ghost character arcs, plot structure with pinch points, world-as-thematic-mirror, theme as moral argument) used in dossier and outline generation
  - `CHAPTER_SUMMARY_TEMPLATE` — Enhanced continuity snapshot template with timeline/location/injury/secrets/threats tracking for chapter summaries
  - Distilled from: Story Construction Codex, Reduce AI Tells research, Novel Construction Best Practices, Editorial Codex

### Frontend
- `client/src/pages/Home.tsx` — Main page with 3 views (init/pipeline/result)
- `client/src/pages/ChapterAnalyzer.tsx` — Chapter element extraction, editing, and rewrite with persistent sessions
- `client/src/pages/Books.tsx` — Book list with create/delete
- `client/src/pages/BookWriter.tsx` — Chapter-by-chapter book writing with split layout
- `client/src/components/StoryInit.tsx` — Brain dump form + genre selection + module links
- `client/src/components/StoryPipeline.tsx` — Real-time pipeline progress tracker
- `client/src/components/StoryResult.tsx` — Final dossier viewer with tabs + "Write the Book" button

### Data
- `data/templates/` — Genre template JSON files (fantasy_thriller, contemporary_thriller, dark_romance)
- `data/projects/` — Per-project state JSON files
- `data/chapters/` — Chapter analyzer session JSON files
- `data/books/` — Book project JSON files (chapters stored inline)

## API Endpoints

### Pipeline
- `GET /api/genres` — List available genres
- `POST /api/project/start` — Create project with brain_dump + genre
- `POST /api/project/:id/run-step` — Run next pipeline step
- `GET /api/project/:id/state` — Get full project state
- `GET /api/project/:id/final` — Get final dossier + best pitch

### Chapter Analyzer
- `GET /api/chapters` — List saved chapter analyzer sessions
- `GET /api/chapters/:id` — Get full chapter session
- `POST /api/chapters` — Save/update a chapter session
- `DELETE /api/chapters/:id` — Delete a chapter session
- `POST /api/chapter/extract` — Extract structural elements from chapter text
- `POST /api/chapter/rewrite` — Rewrite chapter with edited elements

### Book Writer
- `GET /api/books` — List all books
- `POST /api/books` — Create book manually (brain_dump + dossier)
- `POST /api/books/from-project/:projectId` — Create book from a completed pipeline project
- `GET /api/books/:id` — Get full book with all chapters
- `PUT /api/books/:id` — Update book metadata (title, dossier, brain_dump)
- `DELETE /api/books/:id` — Delete book
- `POST /api/books/:id/outline-chapter` — AI generates next chapter outline
- `POST /api/books/:id/write-chapter/:chapterNum` — AI writes chapter from outline
- `POST /api/books/:id/summarize-chapter/:chapterNum` — AI generates chapter summary
- `PUT /api/books/:id/chapters/:chapterNum` — Update chapter (outline, content, title)

## Pipeline Steps (0-10)
0. Project Init → 1. Subgenre Detection (Haiku) → 2. Pitch Generation (Sonnet) → 3. Best Pitch Selection (Sonnet) → 4. Pitch Extraction (Haiku) → 5. Story Dossier Draft (Sonnet) → 6. Emotional Check (Sonnet) → 7. Name Check (Haiku) → 8. Revision I (Haiku) → 9. Logic Check (Sonnet) → 10. Final Polish (Haiku)

## Environment Variables
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Auto-configured by Replit AI Integrations
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Auto-configured by Replit AI Integrations
