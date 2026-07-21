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

- `/` — Dashboard home with seven module cards + recent activity feed
- `/pipeline` — List of all pipeline projects with status
- `/pipeline/new` — Brain dump form + genre selection to start new pipeline
- `/pipeline/:id` — Pipeline execution view (11-step progress tracker)
- `/pipeline/:id/result` — Final dossier viewer with download/copy/edit/write-book
- `/chapter-writer` — Standalone chapter writer (prompt → polished chapter)
- `/chapter-analyzer` — Chapter analyzer sessions list + analysis flow
- `/chapter-analyzer/:id` — Deep-link to specific analyzer session
- `/books` — Book list with create/delete
- `/book/:id` — Full-screen book writer with split-panel layout
- `/publishing` — Publishing Tools hub (trope research, blurb generator, title & keywords)
- `/publishing/trope-research` — AI-powered trope research for a niche/subgenre
- `/publishing/blurbs` — Blurb generator (book picker if no book ID)
- `/publishing/blurbs/:id` — Blurb generator for a specific book (3 variants)
- `/publishing/titles-keywords` — Title & keyword generator (book picker if no book ID)
- `/publishing/titles-keywords/:id` — Title & keyword generator for a specific book

## STORY FORGE Routes

- `/book/:id/studio` — Book Studio: prompt-driven chapter writing with story bible uploads, Google Docs import/sync, chapter editing, AI rewriting with full memory

- `/forge` — FORGE dashboard with project cards
- `/forge/quick-feedback` — Paste-and-analyze: editorial + beta reader feedback on any passage, with AI discussion chat
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
- `/forge/project/:id/chat` — Chat with AI about your manuscript (context-aware: characters, issues, editorial summaries)

## StoryDossier Modules

### Story Dossier Pipeline
11-step AI pipeline: brain dump + genre → subgenre detection → pitch generation → best pitch selection → dossier draft → emotional check → name check → revision → logic check → final polish.

### Chapter Writer
Standalone chapter generation from creative prompts with narrative sliders.

### Chapter Analyzer
Paste a chapter → extract 18 structural elements → edit → rewrite. Cross-module integration with BookWriter.

### Book Writer
Chapter-by-chapter book writing with autopilot mode (32-chapter loop), narrative sliders, running summaries. Contextual Publishing Tools links in the header (Blurb, Title & Keywords) appear when the book has sufficient content.

### Publishing Tools
Four KDP publishing tools:
- **Trope Research Tool** (`/publishing/trope-research`): Enter a niche/subgenre → get structured trope analysis: 4-6 recurring tropes, 2-4 unique tropes, 3-5 trending combinations, series branding strategy, KDP notes. Results downloadable as JSON.
- **Blurb Generator** (`/publishing/blurbs/:id`): From a book's dossier + chapter summaries → generates 3 blurb variants (Hook-First, Character-Led, Tension-Forward) following KDP best practices. Pick/edit/copy variants.
- **Title & Keyword Generator** (`/publishing/titles-keywords/:id`): Generates 7-10 trope-forward title+subtitle options with reasoning, plus exactly 7 Amazon-optimized keywords and 2 category recommendations.
- All tools accessible from "Publish" nav item + contextual links from BookWriter/BookStudio headers when book has sufficient content.

## STORY FORGE Architecture

### Analysis Pipeline
1. **Upload**: Manuscript (txt/docx) + optional outline + story bible
2. **Parse**: Chapter detection (markdown headings primary, regex patterns fallback)
3. **Chunk**: Group chapters into 4-12 chapter chunks (default 8) for analysis
4. **Analyze**: Run selected modules on each chunk with accumulating memory context
   - **Phase 1 (serial)**: Memory-updating modules run first (editorial_assessment → character_tracker) to build context
   - **Phase 2 (parallel)**: All remaining modules run concurrently (dev editor, copy editor, proofreader, fact checker, structure analyzer, scene scanner, beta reader)
   - Beta reader profiles also run in parallel within their module
5. **Synthesize**: Merge/dedup issues, generate editorial reports
6. **Report**: Render structured data into polished markdown reports

### Analysis Presets
- **Quick**: 3 core modules (editorial_assessment, character_tracker, developmental_editor) — ~10-15 min for a full novel
- **Full**: core editorial modules incl. subject-matter experts (all except beta_reader and publishing_review) — ~15-25 min for a full novel
- **Submission**: editorial_assessment + character_tracker + publishing_review (agent/acquisitions/positioning/package readers)
- **Custom**: User picks any combination of modules

### Analysis Modules (12)
Module prompts are built from Editorial Operating System skill definitions in `config/editorial-os/` (see below).
- **Editorial Assessment** — High-level editorial evaluation (memory-updating, runs first)
- **Character Tracker** — Character state changes, relationships, injuries, continuity (memory-updating, runs second)
- **Developmental Editor** — EOS developmental-editor skill: premise, causality, stakes, arcs, structure (parallel)
- **Line Editor** (`copy_editor`) — EOS line-editor skill: prose precision, voice, dialogue, clichés (parallel)
- **Copy Editor / Proofreader** (`proofreader`) — EOS novel-copy-editor skill: grammar, punctuation, consistency (parallel)
- **Continuity & Fact Auditor** (`fact_checker`) — EOS continuity-logic-auditor skill + external fact flagging (parallel)
- **Reader Panel** (`beta_reader`) — 12 reader profiles (5 legacy + 7 EOS personas), all run in parallel (parallel)
- **Structure Analyzer** — Narrative structure beats (3-act, Save the Cat, etc.) (parallel)
- **Scene Scanner** — Scene purpose, conflict, change, necessity rating (parallel)
- **Addiction Loop Audit** — Per-chapter stakes/question/head-fake/re-hook scoring (parallel)
- **Subject-Matter Experts** (`sme_reviewer`) — 7 EOS realism reviewers (federal procedure, intelligence tradecraft, legal, medical, military, forensics, cybersecurity). A router pass reads the manuscript first and activates only relevant domains unless the user picks explicitly (parallel)
- **Publishing Review Panel** (`publishing_review`) — 4 EOS publishing-stage readers (literary agent, acquisitions editor, market positioning, submission package auditor); runs once after the chunk loop using accumulated memory as a synopsis, produces one report per reader

### Editorial Operating System (config/editorial-os/)
Skill package powering FORGE's editorial brains: 25 skill definitions under `skills/`, shared references (editorial constitution, review output standard, issue memory protocol, novel bible schema) under `shared/`, orchestration docs (RUNBOOK, PANEL_SELECTION_MATRIX, MASTER_ORCHESTRATOR_PROMPT), and volume guides. Loaded at runtime by `server/forge/editorial-os/eos-skills.ts` (frontmatter stripped, cached). The Oracle Veil project pack lives in `data/editorial-os/oracle-veil/`.

Issue records now carry confidence (high/medium/low) and note type (objective/plausibility/genre/taste) appended to descriptions — a taste note is not a command.

### Revision Verification
`POST /api/forge/projects/:id/verify-revision` (file or pasted text) creates a new RevisionVersion, parses it, and runs the EOS revision-verifier against the previous draft's issue ledger. Each prior issue is classified fixed / partially_fixed / displaced / unchanged / worsened / intentionally_declined; unresolved issues carry forward to the new revision's ledger, fix side effects become new issues, and a Revision Verification Report is generated. UI lives on the Upload page ("Verify Revised Draft").

### Editorial Director Synthesis
Synthesis uses the EOS editorial-director skill + master orchestrator prompt: root-cause clusters with consensus strength (strong/moderate/weak/disputed), meaningful disagreements with tradeoffs, staged revision plan (structural → scene → prose → proofing), and defer/decline notes, all rendered into the Editorial Letter.

### Performance
- Chunk size: 8 chapters/chunk (was 4); 58-chapter novel → 7 chunks (was 14)
- Per chunk: 2 serial memory calls + 1 parallel batch of remaining modules
- Total serial steps: ~7 chunks × 3 steps = ~21 (was 183 serial calls)
- Estimated time: ~15-25 min full analysis (was 60+ min)

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
- `client/src/pages/Home.tsx` — Dashboard with seven module cards
- `client/src/pages/PublishingHub.tsx` — Publishing Tools hub landing page
- `client/src/pages/TropeResearch.tsx` — Trope Research Tool
- `client/src/pages/BlurbGenerator.tsx` — Blurb Generator (book-aware)
- `client/src/pages/PublishingTools.tsx` — Title & Keyword Generator (book-aware)

### Data & Config
- `config/prompts/*.ts` — 15 editorial prompt definitions
- `config/schemas/*.ts` — 9 output schema TypeScript interfaces
- `data/` — StoryDossier file storage
- `prisma/forge.db` — STORY FORGE SQLite database

## Publishing Tools API Endpoints

- `POST /api/publishing/trope-research` — `{ niche }` → structured trope analysis (recurring, unique, trending combos, series branding, KDP notes)
- `POST /api/publishing/blurb/:bookId` — Uses book dossier + chapter summaries → 3 blurb variants (Hook-First, Character-Led, Tension-Forward)
- `POST /api/publishing/titles-keywords/:bookId` — Uses book dossier + chapters → 7-10 title/subtitle options + 7 keywords + 2 categories

## FORGE API Endpoints

- `POST /api/forge/quick-feedback` — Instant editorial + beta reader feedback on pasted text (no project required)
- `POST /api/forge/quick-feedback/chat` — Multi-turn AI discussion about feedback results (uses Haiku for fast responses)
- `GET /api/forge/projects` — List all projects
- `POST /api/forge/projects` — Create new project
- `GET /api/forge/projects/:id` — Get project with revisions, chapters, chunks
- `DELETE /api/forge/projects/:id` — Delete project
- `POST /api/forge/projects/:id/upload` — Upload manuscript/outline/story_bible
- `GET /api/forge/projects/:id/revision` — Get latest revision
- `POST /api/forge/projects/:id/analyze` — Start analysis job (body: modules, betaReaderProfiles, smeReviewers, publishingReaders, genre)
- `POST /api/forge/projects/:id/verify-revision` — Upload revised draft, verify against prior issue ledger (returns jobId + new revisionId)
- `GET /api/forge/beta-reader-profile-catalog` — All 12 selectable reader profile keys/names
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
