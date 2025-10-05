# Ovida Specification Document (v0.2)

## 1. Product Concept

**Ovida: The Story That Lives.**

An interactive narrative medium blending deterministic AI-assisted generation, high-quality audio (via ElevenLabs), and replayable social storytelling. Users can:

- **Experience Runs:** deterministic story playthroughs with branching beats.
- **Save & share Replays:** portable, tamper-evident JSON run histories.
- **Remix stories:** fork any beat, creating new lineage.
- **Join Rooms:** synchronous/asynchronous co-play with voting.
- **Enjoy demos:** 3-step interactive demos before sign-up; upgrade to full accounts via Google Sign-In.

## 2. System Architecture

### Client (React Native / Web)

- Playback, choices, voting, Rooms.
- Demo flow (guest).
- Google Sign-In (OIDC, PKCE).

### API Edge (Node.js + TypeScript, Express/Fastify)

- Orchestrates LLM → Safety → TTS.
- Validates JSON beats.
- Stores Runs/Replays.
- Auth (Google, guest → user).
- WebSocket server (Rooms).

### Persistence

- **Postgres:** stories, runs, beats, users, rooms, votes.
- **Redis:** real-time state, pub/sub.
- **CDN/S3:** cached audio.

### External services

- **ElevenLabs TTS:** narration streaming.
- **Google OIDC:** authentication.

## 3. Database Schema (Key Tables)

```sql
-- Users
create table users (
  id text primary key,
  email text unique,
  email_verified boolean default false,
  google_sub text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  last_login_at timestamptz
);

-- Guests (demo users)
create table guests (
  id text primary key,
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- Runs (playthroughs)
create table runs (
  id text primary key,
  story_id text,
  user_id text references users(id),
  guest_id text references guests(id),
  created_at timestamptz default now(),
  seed int not null,
  signature text
);

-- Beats (moments in story)
create table beats (
  id text primary key,
  run_id text references runs(id),
  index int,
  content jsonb,
  choices jsonb,
  created_at timestamptz default now()
);

-- Rooms
create table rooms (
  id text primary key,
  run_id text references runs(id),
  host_id text references users(id),
  guest_id text references guests(id),
  state text, -- "lobby", "voting", "finished"
  created_at timestamptz default now()
);

-- Votes
create table votes (
  id text primary key,
  room_id text references rooms(id),
  user_id text references users(id),
  choice_id text,
  created_at timestamptz default now()
);

-- Sessions
create table sessions (
  id text primary key,
  user_id text references users(id),
  refresh_token_hash text not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);
```

## 4. Replay JSON Schema (Portable)

```json
{
  "version": "1.0",
  "story": { "id": "story123", "title": "Haunted Shore" },
  "engine": { "llm": "gpt-5", "tts": "elevenlabs-v2" },
  "seed": 981273,
  "beats": [
    {
      "index": 0,
      "narration": "You arrive at the shore...",
      "choices": [
        { "id": "c1", "text": "Explore the cave" },
        { "id": "c2", "text": "Stay on the beach" }
      ]
    }
  ],
  "signature": "base64-ed25519-signature"
}
```

## 5. Guardrails & Safety

- Policy-as-data JSON config: age ratings, disallowed topics, tone.
- Pipeline:
  1. LLM generates beat (JSON only).
  2. Validation (schema, profanity mask, policy).
  3. Optional revision pass.
  4. Stream to ElevenLabs TTS.
- Safe Mode: softens profanity, prevents disallowed branches.

## 6. Determinism & Caching

- Every run tied to seed + engine version.
- Deterministic branching enables reproducible replays.
- TTS caching keyed on (text, voice, style) reduces cost and latency.

## 7. Security & Compliance

- Auth: JWT access tokens + refresh tokens.
- Guest promotion: `guest_id` → `user_id` on Google sign-up.
- CSRF & OAuth: PKCE, state, SameSite cookies.
- PII: minimal, only email/profile.
- Age-gating: Safe Mode for users under 13.

## 8. OpenAPI 3.1 Spec (Excerpt)

```yaml
openapi: 3.1.0
info:
  title: Ovida API
  version: 0.2
paths:
  /v1/auth/google/start:
    get:
      summary: Start Google OAuth flow
  /v1/auth/google/callback:
    get:
      summary: OAuth callback
  /v1/auth/session:
    get:
      summary: Get current user session
  /v1/demos/start:
    post:
      summary: Start a 3-step demo
  /v1/demos/next:
    post:
      summary: Next demo beat
  /v1/demos/complete:
    post:
      summary: Complete demo and prompt sign-up
  /v1/stories:
    get:
      summary: List available stories
  /v1/runs:
    post:
      summary: Create a new run
  /v1/runs/{id}/next:
    post:
      summary: Get next beat in a run
  /v1/replays/{id}/verify:
    get:
      summary: Verify replay signature
  /v1/rooms:
    post:
      summary: Create co-play room
  /v1/rooms/{id}/vote:
    post:
      summary: Cast a vote in a room
```

## 9. WebSocket Protocol (Rooms)

Events:

- `room.join` – user enters.
- `room.state` – broadcast state change.
- `room.vote` – vote cast.
- `room.result` – winning choice.
- `room.beat` – broadcast next beat.
- `room.leave` – exit.

## 10. Observability

Collect metrics for:

- Latency (LLM, TTS, roundtrip).
- Engagement (beats/session, votes/room).
- Conversion (demo → signup).
- Safety (blocked/revised beats).

## 11. UX Flows

1. Guest demo → 3 beats → call-to-action to save.
2. Sign-up → Google → library/rooms unlocked.
3. Replay → deterministic, shareable.
4. Remix → fork from any beat.
5. Rooms → synchronous voting, asynchronous relay.

## 12. Next Steps

- Generate typed SDK (`ovida-js`).
- Repo scaffold: Node/TS orchestrator + Expo client.
- CI/CD with OpenAPI codegen + feature flags.
