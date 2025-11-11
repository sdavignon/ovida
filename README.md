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

## API access

- **Service entrypoint** – The Fastify service in `apps/api` listens on `PORT` (defaults to `4000`) and exposes JSON endpoints under `/v1`. A local bootstrap looks like:

  ```bash
  pnpm --filter @ovida/api dev  # starts only the API with live reload
  ```

- **Base URLs** – When running locally, use `http://localhost:4000/v1`. The frontends read `NEXT_PUBLIC_API_ORIGIN` and `NEXT_PUBLIC_WS_ORIGIN` from `.env` to talk to the API and websocket services.
- **Session handling** – Authentication is delegated to Supabase. Client apps obtain an `sb-access-token` via Supabase Auth; pass it as a cookie or `sb-access-token` header. The API exposes helper routes such as `GET /v1/auth/session` (validate a session), `POST /v1/auth/logout`, and demo/run helpers under `/v1/demos/*` and `/v1/runs/*`.
- **OpenAPI contract** – The HTTP surface is documented in `apps/api/src/openapi/ovida.yaml`. Regenerate the typed SDK with `pnpm --filter @ovida/sdk generate && pnpm --filter @ovida/sdk build`.
- **Video jobs** – Video rendering endpoints require `ffmpeg`/`ffprobe` on the host and a `VIDEO_API_KEY`. Job payloads accept overlay instructions and can optionally notify external systems via the `callbackUrl` field.
- **Quick check** – With Supabase running and the API booted, you can sanity check the service with:

  ```bash
  curl http://localhost:4000/v1/demos/start
  ```

  Add `-H "sb-access-token: <token>"` when exercising authenticated routes.

## Environment configuration

- **Environment files** – Copy `.env.example` to `.env` (or run `scripts/setup-local.sh`) and replace the placeholder values. The root `.env` is consumed by every workspace via `dotenv`.
- **Supabase** – Populate `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DB_URL`. You can copy these from the Supabase dashboard (`Settings → API` and `Settings → Database`). The service role key must stay server-side.
- **Origins** – Set `API_ORIGIN`, `APP_ORIGIN`, `NEXT_PUBLIC_API_ORIGIN`, and `NEXT_PUBLIC_WS_ORIGIN` to the URLs your web, expo, and websocket clients use. They default to local development ports.
- **Audio engines** – Control delivery with `AUDIO_MODE` (`files`, `realtime`, or `auto`) and `AUDIO_FILE_ENGINE` (`elevenlabs` or `coqui`). Provide provider credentials as needed:
  - ElevenLabs: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL`, `ELEVENLABS_BASE_URL`, `ELEVENLABS_STREAMING`.
  - Coqui (local TTS fallback): `COQUI_TTS_URL`, `COQUI_TTS_SPEAKER`, `COQUI_TTS_LANGUAGE`, and other optional tuning values.
  - OpenAI realtime audio: `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_BASE_URL`, `OPENAI_REALTIME_VOICE`.
- **Video rendering** – `VIDEO_API_KEY` is required. Storage and limits are controlled with `VIDEO_TMP_DIR`, `VIDEO_OUTPUT_DIR`, `VIDEO_PUBLIC_BASE_URL`, `VIDEO_MAX_INPUT_BYTES`, `VIDEO_MAX_OVERLAY_BYTES`, and `VIDEO_CALLBACK_TIMEOUT_MS`. Ensure the directories exist or let the service create them with writable permissions.
- **Auth providers** – Configure Supabase OAuth (e.g., Google) by setting `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- **Additional providers** – If you rely on OpenAI image generation, set `OPENAI_API_KEY` and (optionally) `OPENAI_API_BASE_URL`.
- **Runtime environment** – `NODE_ENV` defaults to `development`; adjust to `production` in deployed environments alongside hardened CORS settings.

Document any new environment variables in `.env.example` to keep this matrix current.

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
