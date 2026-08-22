# Base44 Dev Environment — WriteMaster

## What this is
A Replit-origin fullstack app: Express 5 API + Vite (middleware mode) + React 19 +
Prisma (SQLite). Single-origin — one Express server serves both the API and the
client on a single port.

## Run it
```
docker compose -f docker-compose.base44.yml up -d
```
- Web entry: host port **3000** → container port 5000 (`PORT=5000` inside).
- Health check: `curl -sf http://localhost:3000/` (returns the Vite-served HTML).
- Logs: `docker compose -f docker-compose.base44.yml logs -f app`.

## How the dev loop works
- The `app` service uses the plain `node:20-bookworm` image with the repo
  bind-mounted at `/app`. On start it runs `npm install && npx prisma db push &&
  npx tsx watch server/index.ts`.
- `tsx watch` reloads the server on server-side file changes; Vite (loaded as
  Express middleware in dev) provides HMR for the client. Both are live, so
  edits appear without image rebuilds.
- `node_modules` lives in a named volume (not the host repo) so installs persist
  across restarts.
- The SQLite DB is `prisma/forge.db` (bind-mounted onto the host repo; gitignored).

## Image choice
Use `node:20-bookworm` (full), **not** `-slim`: Prisma's schema engine needs
OpenSSL, which the slim image lacks (`prisma db push` fails with "Schema engine
error" on slim).

## Boot behavior
On startup the server restores the committed library snapshot
(`data/library-snapshot.json`) into an empty DB and seeds a demo project
("The Meridian Deception"). Both are no-ops when data already exists.

## Secrets
The AI features (LLM calls in `server/llm.ts` and the chat endpoints in
`server/forge/routes.ts`) run through Base44's built-in **InvokeLLM**
integration via `@base44/sdk`, which bills against the workspace's Base44
integration credits — no external API key is needed. They require one secret:
- `BASE44_APP_ID` — the Base44 app id (from the editor URL, between `/apps/`
  and `/editor/`).

The app UI and non-AI endpoints work **without** it. It is delivered via
`/run/base44/app.env` (last `env_file` in compose); `.env.base44-defaults`
holds an empty placeholder so the app boots before the id is provided.

Model mapping: `cheap` → `gpt_5_mini`, `powerful` → `claude_sonnet_4_6`
(Base44 model ids). The old Replit Anthropic env vars
(`AI_INTEGRATIONS_ANTHROPIC_*`) are no longer used.

## Things that won't work here
- Google Docs import (`server/google-docs.ts`) relies on Replit's connector
  hostname/token — not available outside Replit.
