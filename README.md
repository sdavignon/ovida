# Ovida Monorepo

"The story that lives" — a deterministic, replayable, AI-assisted narrative platform. This monorepo provides:

- **apps/api** – Fastify OpenAPI-first service backed by Supabase Postgres and Auth
- **apps/ws** – WebSocket coordinator for live rooms and voting atop Supabase Realtime
- **apps/app** – Expo client (web + native) that drives demo, playback, and rooms
- **packages/schemas** – Shared zod models for beats, replays, and policy definitions
- **packages/sdk** – Typed SDK generated from the OpenAPI contract
- **supabase/** – SQL migrations, seeds, and RLS policies for core data structures

## Getting Started

1. Install dependencies

```bash
pnpm install
```

2. Start Supabase locally

```bash
make supabase.up
make supabase.mig
make seed
```

3. Run services

```bash
make dev
```

4. Launch the Expo app (`pnpm --filter @ovida/app dev`) and explore the 3-step demo.

See `.env.example` for required environment variables.
