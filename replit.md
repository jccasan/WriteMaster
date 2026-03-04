# StoryDossier

AI-powered story development pipeline that transforms a writer's raw ideas into a polished Story Dossier.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui, served via Vite
- **Backend**: Express.js (TypeScript), JSON file storage (no database)
- **AI**: Anthropic Claude API (Haiku for fast tasks, Sonnet for complex tasks)

## Key Files

### Backend
- `server/routes.ts` — API endpoints
- `server/pipeline.ts` — 11-step AI pipeline logic + ProjectState type
- `server/llm.ts` — Anthropic Claude wrapper (cheap/powerful mode)
- `server/storage.ts` — File-based project storage (data/projects/*.json)

### Frontend
- `client/src/pages/Home.tsx` — Main page with 3 views (init/pipeline/result)
- `client/src/components/StoryInit.tsx` — Brain dump form + genre selection
- `client/src/components/StoryPipeline.tsx` — Real-time pipeline progress tracker
- `client/src/components/StoryResult.tsx` — Final dossier viewer with tabs

### Data
- `data/templates/` — Genre template JSON files (fantasy_thriller, contemporary_thriller, dark_romance)
- `data/projects/` — Per-project state JSON files

## API Endpoints
- `GET /api/genres` — List available genres
- `POST /api/project/start` — Create project with brain_dump + genre
- `POST /api/project/:id/run-step` — Run next pipeline step
- `GET /api/project/:id/state` — Get full project state
- `GET /api/project/:id/final` — Get final dossier + best pitch

## Pipeline Steps (0-10)
0. Project Init → 1. Subgenre Detection (Haiku) → 2. Pitch Generation (Sonnet) → 3. Best Pitch Selection (Sonnet) → 4. Pitch Extraction (Haiku) → 5. Story Dossier Draft (Sonnet) → 6. Emotional Check (Sonnet) → 7. Name Check (Haiku) → 8. Revision I (Haiku) → 9. Logic Check (Sonnet) → 10. Final Polish (Haiku)

## Environment Variables
- `ANTHROPIC_API_KEY` — Required for Claude API calls
