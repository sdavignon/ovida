# Ovida Monorepo

"The story that lives" — a deterministic, replayable, AI-assisted narrative platform.

## Applications

This repository is organised as a pnpm workspace with the following projects:

- **apps/api** – Fastify HTTP API backed by Supabase for persistence and auth.
- **apps/ws** – WebSocket coordinator for live rooms and voting.
- **apps/app** – Expo client for iOS, Android, and web.
- **apps/web** – Next.js operator console for demos, replays, rooms, and admin tooling.
- **packages/schemas** – Shared Zod models.
- **packages/sdk** – Generated SDK that mirrors the HTTP contract.
- **supabase/** – SQL migrations, seeds, and RLS policies.

## Prerequisites

- Node.js 18+
- pnpm 8 (install with `corepack enable` or from https://pnpm.io)
- Docker (for local Supabase)

## Getting started

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

3. Run the services you need

   ```bash
   pnpm --filter @ovida/api dev      # REST API
   pnpm --filter @ovida/ws dev       # WebSocket server
   pnpm --filter @ovida/web dev      # Next.js operator console
   pnpm --filter @ovida/app dev      # Expo app (press w/i/a to open targets)
   ```

See `.env.example` for the variables the services expect.

## DreamHost / SSH deployment

The repository ships with `scripts/deploy/dreamhost.sh` to automate deployment to a shell host such as DreamHost. The script:

1. Connects to the remote host over SSH.
2. Clones or updates the public repository (`https://github.com/ovida/ovida.git` by default).
3. Installs dependencies with `pnpm install --frozen-lockfile`.
4. Builds the Next.js operator console in production mode.
5. Copies the standalone build into the specified site directory (defaults to `~/ovida.1976.cloud`).

Run it from your machine:

```bash
./scripts/deploy/dreamhost.sh deployer@ovida.1976.cloud
```

Optional arguments let you override the target directory and checkout folder:

```bash
./scripts/deploy/dreamhost.sh deployer@ovida.1976.cloud ~/ovida.1976.cloud ~/ovida-deploy
```

Environment variables `REPO_URL` and `BRANCH` customise the repository clone, e.g. `BRANCH=work ./scripts/deploy/dreamhost.sh ...`.

### Remote host requirements

- SSH access with Git available (DreamHost provides both).
- Node.js 18+ and npm. The script will install pnpm using Corepack or npm if necessary.
- Enough space for both the checkout directory and the deployed standalone build.

After the script completes, start the server from the site directory:

```bash
cd ~/ovida.1976.cloud
NODE_ENV=production PORT=3000 node server.js
```

Adjust the port to match your process manager or proxy configuration.

## Testing

Use the workspace scripts provided by TurboRepo:

```bash
pnpm lint
pnpm test
```
