# Ovida Monorepo

"The story that lives" — a deterministic, replayable, AI-assisted narrative platform. This monorepo provides the mobile, web, and backend pieces that power Ovida experiences.

## Applications

The workspace is managed with pnpm and contains:
- **apps/api** – Fastify OpenAPI-first service backed by Supabase Postgres and Auth
- **apps/ws** – WebSocket coordinator for live rooms and voting atop Supabase Realtime
- **apps/app** – Expo client (web + native) that drives demo, playback, and rooms
- **apps/web** – Next.js operator console for demos, replays, rooms, and admin tooling
- **packages/schemas** – Shared zod models for beats, replays, and policy definitions
- **packages/sdk** – Typed SDK generated from the OpenAPI contract
- **supabase/** – SQL migrations, seeds, and RLS policies for core data structures

- **apps/api** – Fastify HTTP API backed by Supabase for persistence and auth.
- **apps/ws** – WebSocket coordinator for live rooms and voting.
- **apps/app** – Expo client for iOS, Android, and web.
- **apps/web** – Next.js operator console for demos, replays, rooms, and admin tooling.
- **packages/schemas** – Shared Zod models.
- **packages/sdk** – Generated SDK mirroring the HTTP contract.
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

## Deployment options

### GitHub Actions SFTP workflow

The repository includes `.github/workflows/deploy.yml`, a reusable workflow that bundles the repository and pushes it to any SFTP-accessible host. It can run automatically on every push to `main` or be dispatched manually with different credentials.

Store the following values under **Settings → Secrets and variables → Actions** to supply defaults:

| Name | Type | Description |
|------|------|-------------|
| `SFTP_HOST` | Secret or variable | Default hostname of the SFTP server. |
| `SFTP_USERNAME` | Secret or variable | Default username used for authentication. |
| `SFTP_PASSWORD` | Secret | Password for the SFTP user (leave empty when using SSH keys). |
| `SFTP_SSH_KEY` | Secret | Private SSH key (PEM format). Leave empty when using passwords. |
| `SFTP_PORT` | Secret or variable | Optional port override (defaults to `22`). |
| `SFTP_REMOTE_DIR` | Secret or variable | Remote directory to upload into (e.g. `/var/www/html/`). |

> Provide **either** `SFTP_PASSWORD` **or** `SFTP_SSH_KEY`. Supplying both prefers the SSH key supplied through workflow dispatch or secrets.

When triggering the workflow manually from **Actions → Deploy via SFTP → Run workflow**, you can override any of the connection parameters (host, port, username, password, SSH key, remote directory). Leave fields blank to fall back to the stored secrets or variables.

Under the hood the workflow:

1. Checks out the repository.
2. Copies the contents into a temporary `deploy/` directory, excluding Git metadata and workflow files.
3. Uploads the bundle to the configured SFTP destination, deleting files on the server that no longer exist locally.

After the run succeeds, browse to your site's URL to confirm the new build and inspect the workflow logs for upload details.

### DreamHost / SSH deployment script

`scripts/deploy/dreamhost.sh` automates deployments to shell hosts (such as DreamHost). The script:

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

Environment variables `REPO_URL` and `BRANCH` customise the repository clone, e.g. `BRANCH=work ./scripts/deploy/dreamhost.sh deployer@ovida.1976.cloud`.

**Remote host requirements**

- SSH access with Git available.
- Node.js 18+ and npm. The script installs pnpm using Corepack or npm when required.
- Enough space for both the checkout directory and the deployed standalone build.

After the script completes, start the server from the site directory:

```bash
cd ~/ovida.1976.cloud
NODE_ENV=production PORT=3000 node server.js
```

Adjust the port to match your process manager or proxy configuration.

## Testing
4. Launch the web console (`pnpm --filter @ovida/web dev`) to explore the demo, player, room, replay, and admin surfaces in the browser.

5. Launch the Expo app (`pnpm --filter @ovida/app dev`) and explore the 3-step demo.

Use the workspace scripts provided by TurboRepo:

```bash
pnpm lint
pnpm test
```
