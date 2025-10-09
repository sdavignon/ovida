# Ovida Monorepo

"The story that lives" — a deterministic, replayable, AI-assisted narrative platform.

## Repository layout

- **apps/api** – Fastify OpenAPI-first service backed by Supabase Postgres and Auth.
- **apps/ws** – WebSocket coordinator for live rooms and voting atop Supabase Realtime.
- **apps/app** – Expo client (web + native) that drives demo, playback, and rooms.
- **apps/web** – Next.js operator console for demos, replays, rooms, and admin tooling.
- **packages/schemas** – Shared zod models for beats, replays, and policy definitions.
- **packages/sdk** – Typed SDK generated from the OpenAPI contract.
- **supabase/** – SQL migrations, seeds, and RLS policies for core data structures.

## Getting started

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Start Supabase locally**

   ```bash
   make supabase.up
   make supabase.mig
   make seed
   ```

3. **Run services**

   ```bash
   make dev
   ```

   - Launch the web console with `pnpm --filter @ovida/web dev` to explore the demo, player, room, replay, and admin surfaces in the browser.
   - Launch the Expo app with `pnpm --filter @ovida/app dev` and explore the 3-step demo.

See `.env.example` for the environment variables required by each service.

## Deployment scripts and automation

### Local packaging helpers

- `make dev` – boots every workspace that participates in the development experience.
- `make supabase.up` / `make supabase.down` – manage the local Supabase containers.
- `make supabase.mig` – applies the latest Supabase migrations to keep the database schema in sync.
- `make seed` – loads baseline data for development and demo purposes.

### SFTP deployment workflow

This repository ships with a reusable GitHub Actions workflow that bundles the project files and deploys them to **any** SFTP-accessible web host. It can run automatically on every push to `main`, or manually with custom connection details.

- `.github/workflows/deploy.yml` – CI/CD workflow that builds the deployment package and publishes it to the remote server over SFTP.
- `.gitignore` – prevents the temporary `deploy/` directory created during the workflow from being committed.

#### Required secrets / variables

## Deployment options

### GitHub Actions SFTP workflow

The repository includes `.github/workflows/deploy.yml`, a reusable workflow that bundles the repository and pushes it to any SFTP-accessible host. It can run automatically on every push to `main` or be dispatched manually with different credentials.

Store the following values under **Settings → Secrets and variables → Actions** to supply defaults:

#### Manual overrides via workflow dispatch

> Provide **either** `SFTP_PASSWORD` **or** `SFTP_SSH_KEY`. Supplying both prefers the SSH key supplied through workflow dispatch or secrets.

When triggering the workflow manually from **Actions → Deploy via SFTP → Run workflow**, you can override any of the connection parameters (host, port, username, password, SSH key, remote directory). Leave fields blank to fall back to the stored secrets or variables.

Under the hood the workflow:

#### How the workflow works

After the run succeeds, browse to your site's URL to confirm the new build and inspect the workflow logs for upload details.

#### Running the workflow

`scripts/deploy/dreamhost.sh` automates deployments to shell hosts (such as DreamHost). The script:

#### Verifying the deployment

Run it from your machine:

#### Local validation (optional)

You can test SFTP credentials locally with `lftp` or a similar client. After connecting, change to the configured remote directory and confirm that you have write permissions. Never commit credentials to the repository; always store them as GitHub secrets or variables.

## Screen captures

Use the following checklist when capturing UI walkthroughs. Store images under `docs/images/` so they can be referenced from this document.

| Capture | Suggested filename | Description |
|---------|--------------------|-------------|
| Home screen | `docs/images/home-screen.png` | Landing surface showing the live narrative overview and quick-start actions. |
| Room management | `docs/images/room-management.png` | Operator console for creating rooms, managing participants, and monitoring votes in real time. |
| Replay timeline | `docs/images/replay-timeline.png` | Playback interface displaying the branching narrative timeline, beat metadata, and controls. |
| Admin tools | `docs/images/admin-tools.png` | Administrative dashboard highlighting content moderation, policy overrides, and deployment health. |

Update the table with additional rows as new surfaces are introduced. Embed each screenshot below with Markdown, for example:

```markdown
![Ovida home screen](docs/images/home-screen.png)
```

Include concise captions beneath each image describing the narrative context showcased in the capture.
