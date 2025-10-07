import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { SynthesisOpts } from '../audio/engine';
import { chooseEngine, getEngine } from '../audio/select';

export async function registerRoomRoutes(app: FastifyInstance) {
  app.post('/v1/rooms', async (request, reply) => {
    const BodySchema = z.object({
      story_id: z.string().optional(),
      run_id: z.string().optional(),
      mode: z.enum(['duo', 'party', 'global']).default('party'),
    });
    const body = BodySchema.parse(request.body);
    const id = randomUUID();
    const { data, error } = await app.supabase
      .from('rooms')
      .insert({
        id,
        story_id: body.story_id ?? null,
        run_id: body.run_id ?? null,
        mode: body.mode,
        vote_window_ms: 12000,
      })
      .select()
      .maybeSingle();
    if (error) throw error;
    reply.send({ room: data });
  });
}

export async function startLiveBeat(
  app: FastifyInstance,
  roomId: string,
  narration: string,
  ctx: {
    storyId: string;
    seed: number;
    beatIdx: number;
    modelVersion: string;
    policyVersion: string;
    canonVersion: string;
  },
) {
  const engine = getEngine(chooseEngine({ mode: 'room-live', storyVoicePolicy: 'realtime-ok' }));
  const synth = await engine.synthesize(narration, { ...ctx, persist: false });

  if (synth.kind === 'stream') {
    await publishRoomEvent(app, roomId, {
      type: 'AUDIO_STREAM_START',
      provider: synth.provider,
      session: synth.session,
      soundstage: synth.soundstage,
      narrator: synth.narrator,
    });
  } else {
    await publishRoomEvent(app, roomId, {
      type: 'AUDIO_START',
      provider: synth.provider,
      urls: synth.urls,
      mime: synth.mime,
      soundstage: synth.soundstage,
      narrator: synth.narrator,
    });
  }

  return synth;
}

export async function finalizeLiveBeatToReplay(
  app: FastifyInstance,
  runId: string,
  narration: string,
  ctx: SynthesisOpts,
) {
  const engine = getEngine('elevenlabs');
  const files = await engine.synthesize(narration, { ...ctx, persist: true });
  if (files.kind === 'files') {
    app.log.info({ runId, urls: files.urls }, 'finalized-live-beat');
  }
}

async function publishRoomEvent(
  app: FastifyInstance,
  roomId: string,
  payload: Record<string, unknown>,
) {
  app.log.info({ roomId, payload }, 'room-event');
}
