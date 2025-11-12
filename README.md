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
- **Video jobs** – Video rendering endpoints require `ffmpeg`/`ffprobe` on the host and a `VIDEO_API_KEY`. Job payloads accept overlay instructions, can replace the source audio by supplying an `audio_url` (MP3 or WAV), and can optionally notify external systems via the `callbackUrl` field.
- **Quick check** – With Supabase running and the API booted, you can sanity check the service with:

  ```bash
  curl http://localhost:4000/v1/demos/start
  ```

  Add `-H "sb-access-token: <token>"` when exercising authenticated routes.

## Environment configuration

- **Environment files** – Copy `.env.example` to `.env` (or run `scripts/setup-local.sh`) and replace the placeholder values. The root `.env` is consumed by every workspace via `dotenv`.
- **Supabase** – Populate `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DB_URL`. You can copy these from the Supabase dashboard (`Settings → API` and `Settings → Database`). The service role key must stay server-side.
- **Origins** – Set `API_ORIGIN`, `APP_ORIGIN`, `WS_ORIGIN`, `NEXT_PUBLIC_API_ORIGIN`, and `NEXT_PUBLIC_WS_ORIGIN` to the URLs your web, expo, and websocket clients use. They default to local development ports.
- **Audio engines** – Control delivery with `AUDIO_MODE` (`files`, `realtime`, or `auto`), `AUDIO_FILE_ENGINE` (`elevenlabs` or `coqui`), and `REALTIME_ENABLED` (guards WebRTC flow). Provide provider credentials as needed:
  - ElevenLabs: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL`, `ELEVENLABS_BASE_URL`, `ELEVENLABS_STREAMING`.
  - Coqui (local TTS fallback): `COQUI_TTS_URL`, `COQUI_TTS_SPEAKER` (or `COQUI_TTS_VOICE`), `COQUI_TTS_LANGUAGE`, `COQUI_TTS_STYLE_WAV`, and `COQUI_TTS_SPEED`.
  - OpenAI realtime audio: `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_BASE_URL`, `OPENAI_REALTIME_VOICE`.
- **Video rendering** – `VIDEO_API_KEY` is required. Storage and limits are controlled with `VIDEO_TMP_DIR`, `VIDEO_OUTPUT_DIR`, `VIDEO_PUBLIC_BASE_URL`, `VIDEO_MAX_INPUT_BYTES`, `VIDEO_MAX_OVERLAY_BYTES`, `VIDEO_MAX_AUDIO_BYTES`, and `VIDEO_CALLBACK_TIMEOUT_MS`. Ensure the directories exist or let the service create them with writable permissions.
- **Auth providers** – Configure Supabase OAuth (e.g., Google) by setting `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- **Additional providers** – If you rely on OpenAI image generation, set `OPENAI_API_KEY` and (optionally) `OPENAI_API_BASE_URL`.
- **Runtime environment** – `NODE_ENV` defaults to `development`; adjust to `production` in deployed environments alongside hardened CORS settings. `PORT` controls the API server port (defaults to 4000).

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

### Production deployment architecture

Ovida consists of three main components that need to be deployed:

1. **Next.js Web App** (`apps/web`) - Static site deployed via SFTP
2. **API Service** (`apps/api`) - Fastify server on port 4000
3. **WebSocket Service** (`apps/ws`) - WebSocket server on port 4001

### Deploying the web app (static)

The repository includes `.github/workflows/deploy.yml`, a workflow that builds the Next.js app as static files and deploys to any SFTP-accessible host.

**Configuration**: Store these values under **Settings → Secrets and variables → Actions**:
- `SSH_HOST` - Your server hostname (e.g., ovida.1976.cloud)
- `SSH_USER` - SSH username
- `SSH_PASSWORD` or `SSH_KEY` - Authentication credentials
- `REMOTE_PATH` - Deployment directory on the server

The workflow runs automatically on pushes to `main` or can be triggered manually from the Actions tab.

### Deploying the API and WebSocket services

The API and WebSocket services require a Node.js runtime and are managed using PM2 (Process Manager 2).

#### Prerequisites on the server

1. **Node.js 20+** installed
2. **pnpm** installed (`npm install -g pnpm` or use corepack)
3. **PM2** installed globally: `npm install -g pm2`
4. **Environment configuration**: Create a `.env` file on the server with production values

#### Deployment script

Deploy services to production using the automated script:

```bash
scripts/deploy/services.sh user@ovida.1976.cloud
```

This script will:
1. Clone/update the repository on the server
2. Install dependencies
3. Build the API and WebSocket services
4. Start or reload services using PM2
5. Configure automatic restarts

**Options**:
```bash
# Deploy from a specific branch
BRANCH=production scripts/deploy/services.sh user@ovida.1976.cloud

# Deploy to a custom directory
scripts/deploy/services.sh --deploy-dir ~/custom-path user@ovida.1976.cloud

# Deploy without restarting (for maintenance)
scripts/deploy/services.sh --skip-restart user@ovida.1976.cloud
```

#### Manual service management

If you need to manage services manually on the server:

```bash
# View service status
pm2 status

# View logs
pm2 logs

# Restart services
pm2 restart all

# Stop services
pm2 stop all

# Start services
pm2 start ecosystem.config.cjs
```

#### Local service management

For local development with PM2 (alternative to `make dev`):

```bash
# Build services first
pnpm build

# Start services
scripts/services.sh start

# View logs
scripts/services.sh logs

# Restart services
scripts/services.sh restart

# Stop services
scripts/services.sh stop
```

#### Configuring services to start on boot

On the production server:

```bash
# Generate startup script
pm2 startup

# Run the command PM2 outputs, then save the process list
pm2 save
```

### Production environment variables

For production deployment, configure these in your server's `.env` file:

```bash
# Set to production
NODE_ENV=production

# Production URLs (example for ovida.1976.cloud)
API_ORIGIN=https://ovida.1976.cloud:4000
APP_ORIGIN=https://ovida.1976.cloud
WS_ORIGIN=wss://ovida.1976.cloud:4001/ws
NEXT_PUBLIC_API_ORIGIN=https://ovida.1976.cloud:4000
NEXT_PUBLIC_WS_ORIGIN=wss://ovida.1976.cloud:4001/ws

# Supabase production credentials
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# API keys and other production config
ELEVENLABS_API_KEY=your-production-key
OPENAI_API_KEY=your-production-key
# ... other production values
```

See `.env.example` for a complete list of configuration options.

### Firewall and port configuration

Ensure your server firewall allows traffic on:
- **Port 443** (HTTPS) - Web app
- **Port 4000** (HTTPS) - API service
- **Port 4001** (WSS) - WebSocket service

### Verifying deployment

After deployment:

1. **Web app**: Visit `https://ovida.1976.cloud/`
2. **API health**: `curl https://ovida.1976.cloud:4000/v1/demos/start`
3. **WebSocket**: Connect to `wss://ovida.1976.cloud:4001/ws`
4. **Service status**: `ssh user@ovida.1976.cloud "pm2 status"`
5. **View logs**: `ssh user@ovida.1976.cloud "pm2 logs"`

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
