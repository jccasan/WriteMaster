# StoryDossier & STORY FORGE

Two parallel apps in one repo: **StoryDossier** (AI writing studio) and **STORY FORGE** (manuscript analysis studio).

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui, served via Vite
- **Backend**: Express.js (TypeScript)
- **StoryDossier Storage**: File-based JSON (data/templates/, data/projects/, data/chapters/, data/books/)
- **STORY FORGE Storage**: Prisma ORM + SQLite (prisma/forge.db)
- **AI**: Replit AI Integrations (Anthropic) — Claude Sonnet 4.6 for complex tasks, Claude Haiku 4.5 for fast tasks
- **Navigation**: Shared `Layout` component with persistent top nav bar; `wouter` for routing

## StoryDossier Routes

- `/` — Dashboard home with five module cards + recent activity feed
- `/pipeline` — List of all pipeline projects with status
- `/pipeline/new` — Brain dump form + genre selection to start new pipeline
- `/pipeline/:id` — Pipeline execution view (11-step progress tracker)
- `/pipeline/:id/result` — Final dossier viewer with download/copy/edit/write-book
- `/chapter-writer` — Standalone chapter writer (prompt → polished chapter)
- `/chapter-analyzer` — Chapter analyzer sessions list + analysis flow
- `/chapter-analyzer/:id` — Deep-link to specific analyzer session
- `/books` — Book list with create/delete
- `/book/:id` — Full-screen book writer with split-panel layout

## STORY FORGE Routes

- `/forge` — FORGE dashboard with project cards
- `/forge/project/:id` — Project detail with tabbed views
- `/forge/project/:id/upload` — Manuscript/outline/story bible upload
- `/forge/project/:id/analyze` — Analysis config + progress tracking
- `/forge/project/:id/reports` — Report list
- `/forge/report/:reportId` — Full report detail
- `/forge/project/:id/issues` — Issue table (filterable by type/severity)
- `/forge/project/:id/characters` — Character tracking results
- `/forge/project/:id/structure` — Structure beat map
- `/forge/project/:id/scenes` — Scene purpose analysis
- `/forge/project/:id/fact-check` — Fact check results
- `/forge/project/:id/beta-readers` — Beta reader responses

## StoryDossier Modules

### Story Dossier Pipeline
11-step AI pipeline: brain dump + genre → subgenre detection → pitch generation → best pitch selection → dossier draft → emotional check → name check → revision → logic check → final polish.

### Chapter Writer
Standalone chapter generation from creative prompts with narrative sliders.

### Chapter Analyzer
Paste a chapter → extract 18 structural elements → edit → rewrite. Cross-module integration with BookWriter.

### Book Writer
Chapter-by-chapter book writing with autopilot mode (32-chapter loop), narrative sliders, running summaries.

## STORY FORGE Architecture

### Analysis Pipeline
1. **Upload**: Manuscript (txt/docx) + optional outline + story bible
2. **Parse**: Chapter detection (regex patterns for Chapter 1, Chapter One, Roman numerals, etc.)
3. **Chunk**: Group chapters into 3-5 chapter chunks for analysis
4. **Analyze**: Run selected modules on each chunk with accumulating memory context
5. **Synthesize**: Merge/dedup issues, generate editorial reports
6. **Report**: Render structured data into polished markdown reports

### Analysis Modules (9)
- **Editorial Assessment** — High-level editorial evaluation
- **Developmental Editor** — Pacing, stakes, causality, character arcs, scene construction
- **Copy Editor** — Prose clarity, voice consistency, dialogue, clichés, show-don't-tell
- **Proofreader** — Grammar, punctuation, formatting
- **Fact Checker** — Internal consistency + external accuracy
- **Beta Reader** — 5 simulated reader profiles (Genre Enthusiast, Casual Commercial, Emotion-First, Pacing-Sensitive, Critical Craft)
- **Structure Analyzer** — Narrative structure beats (3-act, Save the Cat, etc.)
- **Character Tracker** — Character state changes, relationships, injuries, continuity
- **Scene Scanner** — Scene purpose, conflict, change, necessity rating

### Memory Layer
Accumulates across chunks: outline, character profiles, plot threads, world rules, continuity notes, issues, resolution timeline. Each subsequent chunk analysis receives prior context.

### Report Types
- Editorial Letter (synthesis of all findings)
- Chapter-by-Chapter Findings
- Character Analysis Report
- Structure Analysis Report
- Scene Purpose Report
- Fact Check Report
- Beta Reader Packet

### Prompt Registry
15 prompt files in config/prompts/ with editorial-craft-driven instructions.

### Output Schemas
9 TypeScript interfaces in config/schemas/ for structured analysis outputs.

## Key Files

### StoryDossier Backend
- `server/routes.ts` — StoryDossier API endpoints
- `server/pipeline.ts` — 11-step AI pipeline logic
- `server/llm.ts` — Anthropic Claude wrapper (cheap/powerful mode)
- `server/storage.ts` — File-based storage
- `server/writing-rules.ts` — AI writing rules system

### STORY FORGE Backend
- `server/forge/routes.ts` — All FORGE API routes
- `server/forge/db.ts` — Prisma client singleton
- `server/forge/parsing/manuscript-parser.ts` — Text extraction (txt/docx)
- `server/forge/parsing/chapter-detector.ts` — Chapter boundary detection
- `server/forge/parsing/chunker.ts` — Chapter grouping into chunks
- `server/forge/memory/types.ts` — Memory type definitions
- `server/forge/memory/memory-store.ts` — Memory accumulation engine
- `server/forge/analysis/job-runner.ts` — Background job orchestration
- `server/forge/analysis/analysis-runner.ts` — Per-chunk analysis pipeline
- `server/forge/analysis/synthesis-runner.ts` — Final synthesis + report generation
- `server/forge/analysis/modules/*.ts` — 9 analysis modules
- `server/forge/renderers/report-renderer.ts` — Markdown report rendering
- `server/forge/seed/seed-demo.ts` — Demo project seeder
- `prisma/schema.prisma` — Database schema (14 models)

### Frontend
- `client/src/App.tsx` — All route definitions
- `client/src/components/Layout.tsx` — StoryDossier layout with nav
- `client/src/components/forge/ForgeLayout.tsx` — FORGE layout with dark theme + amber accents
- `client/src/components/forge/NewProjectDialog.tsx` — New project creation dialog
- `client/src/pages/forge/*.tsx` — 12 FORGE pages (Dashboard, Project, Upload, Analysis, Reports, ReportDetail, Issues, Characters, Structure, Scenes, FactCheck, BetaReaders)
- `client/src/pages/Home.tsx` — Dashboard with five module cards

### Data & Config
- `config/prompts/*.ts` — 15 editorial prompt definitions
- `config/schemas/*.ts` — 9 output schema TypeScript interfaces
- `data/` — StoryDossier file storage
- `prisma/forge.db` — STORY FORGE SQLite database

## FORGE API Endpoints

- `GET /api/forge/projects` — List all projects
- `POST /api/forge/projects` — Create new project
- `GET /api/forge/projects/:id` — Get project with revisions, chapters, chunks
- `DELETE /api/forge/projects/:id` — Delete project
- `POST /api/forge/projects/:id/upload` — Upload manuscript/outline/story_bible
- `GET /api/forge/projects/:id/revision` — Get latest revision
- `POST /api/forge/projects/:id/analyze` — Start analysis job
- `GET /api/forge/jobs/:id` — Get job status
- `GET /api/forge/jobs` — List all active jobs
- `GET /api/forge/projects/:id/issues` — Get all issues
- `PATCH /api/forge/issues/:id` — Update issue status
- `GET /api/forge/projects/:id/reports` — Get all reports
- `GET /api/forge/reports/:id` — Get report detail
- `GET /api/forge/projects/:id/characters` — Get character records
- `GET /api/forge/projects/:id/structure` — Get structure beats
- `GET /api/forge/projects/:id/scenes` — Get scene analyses
- `GET /api/forge/projects/:id/fact-checks` — Get fact check items
- `GET /api/forge/projects/:id/beta-readers` — Get beta reader responses
- `GET /api/forge/beta-reader-profiles` — Get all beta reader profiles
- `POST /api/forge/seed` — Run demo seed

## Environment Variables
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Auto-configured by Replit AI Integrations
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Auto-configured by Replit AI Integrations
