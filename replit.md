# StoryDossier

AI-powered story development pipeline that transforms a writer's raw ideas into a polished Story Dossier, then writes the book chapter by chapter.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui, served via Vite
- **Backend**: Express.js (TypeScript), JSON file storage (no database)
- **AI**: Replit AI Integrations (Anthropic) — Claude Sonnet 4.6 for complex tasks, Claude Haiku 4.5 for fast tasks
- **Navigation**: Shared `Layout` component with persistent top nav bar across all pages; `wouter` for routing

## App Structure & Routes

- `/` — Dashboard home with four module cards + recent activity feed
- `/pipeline` — List of all pipeline projects with status
- `/pipeline/new` — Brain dump form + genre selection to start new pipeline
- `/pipeline/:id` — Pipeline execution view (11-step progress tracker)
- `/pipeline/:id/result` — Final dossier viewer with download/copy/edit/write-book
- `/chapter-writer` — Standalone chapter writer (prompt → polished chapter)
- `/chapter-analyzer` — Chapter analyzer sessions list + analysis flow
- `/chapter-analyzer/:id` — Deep-link to specific analyzer session
- `/books` — Book list with create/delete
- `/book/:id` — Full-screen book writer with split-panel layout

## Modules

### Story Dossier Pipeline
11-step AI pipeline: brain dump + genre → subgenre detection → pitch generation → best pitch selection → dossier draft → emotional check → name check → revision → logic check → final polish.

### Chapter Writer
Standalone chapter generation: enter a creative prompt (scene description, characters, situation, mood) + optional genre hint + narrative sliders → AI writes a polished 2000-4000 word chapter. No pipeline or book required. Uses the same AUTHOR_VOICE_CONTRACT + Story Building Engine rules as the book writer.

### Chapter Analyzer
Paste a chapter → Claude extracts 18 structural elements → user edits/adds/removes → Claude rewrites chapter. Sessions persist to disk. Cross-module: BookWriter can send chapters directly to Analyzer via sessionStorage.

### Book Writer
Takes a completed dossier + brain dump, writes the book chapter by chapter. Each chapter uses running summaries of previous chapters (not full text) for context. Split-panel UI: chapter text on left, summary/high points/changes on right. Flow: generate outline → adjust narrative sliders → write chapter → summarize → next chapter.

**Autopilot mode**: "Write Entire Book" / "Write Remaining" button runs the full chapter loop automatically (outline → write → summarize → next) without user intervention. Cancellable mid-run. Shows live progress status in sidebar.

**Context strategy**: Each chapter prompt receives dossier (characters/world/themes/plot beats), brain dump, ALL previous chapter summaries (compact with sliding window), current chapter outline, and narrative slider values. Avoids token limits while maintaining narrative continuity.

## Key Files

### Backend
- `server/routes.ts` — API endpoints (pipeline, chapter analyzer, book writer)
- `server/pipeline.ts` — 11-step AI pipeline logic + ProjectState type
- `server/llm.ts` — Anthropic Claude wrapper (cheap/powerful mode)
- `server/storage.ts` — File-based storage for projects, chapter sessions, and books; includes NarrativeSliders interface
- `server/writing-rules.ts` — Comprehensive AI writing rules system with specialized rule sets:
  - `AI_WRITING_RULES` — Core anti-AI-tell rules (dialogue with action verbs: dodge/interrupt/imply/misread/conceal/pressure/deflect/contradict, prose style with em-dash ban and "not just X but Y" ban, structure, characters) injected into all prose prompts
  - `SCENE_WRITING_RULES` — Scene engineering rules (Goal/Conflict/Outcome, double-up rule, mundane friction, pacing control, Cut the Author checklist) used in chapter writing and rewrite prompts
  - `STORY_ARCHITECTURE_RULES` — Story construction rules (Lie/Truth/Want/Need/Ghost character arcs, plot structure with pinch points, world-as-thematic-mirror, theme as moral argument) used in dossier and outline generation
  - `CHAPTER_SUMMARY_TEMPLATE` — Enhanced continuity snapshot template with timeline/location/injury/secrets/threats tracking for chapter summaries
  - `AUTHOR_VOICE_CONTRACT` — Detailed voice profile extracted from the author's own writing sample
  - `NARRATIVE_SLIDER_RULES` — Dynamic per-scene character state system (tension, intimacy, violence_risk, wonder, dread 0-10; trust, stress, control, hope -10 to +10) that modifies character behavior through prose, not labels
  - `ANTI_SLOP_FILTER` — Post-generation checklist: cliché intensifiers, repeated metaphors, "suddenly" abuse, moralizing, fake-deep observations, tidy endings, robotic sentence balance, repeated rhetorical contrast
  - `CONTEXT_ENGINEERING_RULES` — Pre-writing discipline: silently determine POV character's knowledge/wants/obstacles/pressure/continuity before writing; minimum context principle
  - `DEFAULT_DECISION_RULE` — Decision heuristic: specific over vague, implied over explained, causal over convenient, scene-relevant over encyclopedic, character-true over dramatic, messy over tidy
  - `LAYERED_GENERATION_WORKFLOW` — 5-phase internal generation process (Scene Intelligence → Dialogue Skeleton → Prose Expansion → Dramatic Integration → Narrow Check Passes) embedded as instructions within single prompts to avoid multi-call cost
  - Distilled from: Story Construction Codex, Reduce AI Tells research, Novel Construction Best Practices, Editorial Codex, Story Building Engine, author's Oracle Veil alpha draft

### Frontend
- `client/src/App.tsx` — Route definitions for all pages
- `client/src/components/Layout.tsx` — Shared layout with persistent top nav bar (Pipeline, Chapter, Analyzer, Books links with active state)
- `client/src/pages/Home.tsx` — Dashboard with four module cards + recent activity
- `client/src/pages/ChapterWriter.tsx` — Standalone chapter writer (prompt → chapter)
- `client/src/pages/PipelineNew.tsx` — Brain dump form + genre selection
- `client/src/pages/PipelineView.tsx` — Pipeline execution wrapper
- `client/src/pages/PipelineResult.tsx` — Dossier result wrapper
- `client/src/pages/PipelineList.tsx` — Pipeline projects list
- `client/src/pages/ChapterAnalyzer.tsx` — Chapter element extraction, editing, and rewrite with persistent sessions
- `client/src/pages/Books.tsx` — Book list with create/delete
- `client/src/pages/BookWriter.tsx` — Chapter-by-chapter book writing with split layout + "Analyze" button for cross-module
- `client/src/components/StoryPipeline.tsx` — Real-time pipeline progress tracker
- `client/src/components/StoryResult.tsx` — Final dossier viewer with tabs + "Write the Book" button + rich text editing
- `client/src/components/RichTextEditor.tsx` — TipTap-based rich text editor with toolbar
- `client/src/components/NarrativeSliders.tsx` — Collapsible "Scene Atmosphere" panel with 9 sliders; used in BookWriter and ChapterAnalyzer

### Data
- `data/templates/` — Genre template JSON files (fantasy_thriller, contemporary_thriller, dark_romance)
- `data/projects/` — Per-project state JSON files
- `data/chapters/` — Chapter analyzer session JSON files
- `data/books/` — Book project JSON files (chapters stored inline)

## API Endpoints

### Pipeline
- `GET /api/genres` — List available genres
- `GET /api/projects` — List all pipeline projects with status
- `POST /api/project/start` — Create project with brain_dump + genre
- `POST /api/project/:id/run-step` — Run next pipeline step
- `GET /api/project/:id/state` — Get full project state
- `GET /api/project/:id/final` — Get final dossier + best pitch
- `PUT /api/project/:id/dossier` — Update project dossier

### Chapter Analyzer
- `GET /api/chapters` — List saved chapter analyzer sessions
- `GET /api/chapters/:id` — Get full chapter session
- `POST /api/chapters` — Save/update a chapter session
- `DELETE /api/chapters/:id` — Delete a chapter session
- `POST /api/chapter/extract` — Extract structural elements from chapter text
- `POST /api/chapter/rewrite` — Rewrite chapter with edited elements + optional narrative sliders
- `POST /api/chapter/write-standalone` — Write a standalone chapter from a creative prompt + optional genre + sliders

### Book Writer
- `GET /api/books` — List all books
- `POST /api/books` — Create book manually (brain_dump + dossier)
- `POST /api/books/from-project/:projectId` — Create book from a completed pipeline project
- `GET /api/books/:id` — Get full book with all chapters
- `PUT /api/books/:id` — Update book metadata (title, dossier, brain_dump)
- `DELETE /api/books/:id` — Delete book
- `POST /api/books/:id/outline-chapter` — AI generates next chapter outline
- `POST /api/books/:id/write-chapter/:chapterNum` — AI writes chapter from outline (uses narrative sliders)
- `POST /api/books/:id/summarize-chapter/:chapterNum` — AI generates chapter summary
- `PUT /api/books/:id/chapters/:chapterNum` — Update chapter (outline, content, title, sliders)

## Cross-Module Connections
- Pipeline result → "Write the Book" creates a book and navigates to Book Writer
- Book Writer → "Analyze" button on written chapters sends text to Chapter Analyzer via sessionStorage
- Dashboard shows recent activity across all three modules

## Pipeline Steps (0-10)
0. Project Init → 1. Subgenre Detection (Haiku) → 2. Pitch Generation (Sonnet) → 3. Best Pitch Selection (Sonnet) → 4. Pitch Extraction (Haiku) → 5. Story Dossier Draft (Sonnet) → 6. Emotional Check (Sonnet) → 7. Name Check (Haiku) → 8. Revision I (Haiku) → 9. Logic Check (Sonnet) → 10. Final Polish (Haiku)

## Environment Variables
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Auto-configured by Replit AI Integrations
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Auto-configured by Replit AI Integrations
