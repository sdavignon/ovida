import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { chooseEngine, getEngine } from '../audio/select';
import { generateDemoBeat } from '../services/llm';
import { signReplay } from '../services/replay';

interface InMemoryRun {
  id: string;
  story_id: string;
  seed: number;
  model_version: string;
  policy_version: string;
  canon_version: string;
  visibility: string;
  voice_id?: string | null;
  nextBeatIdx: number;
}

const RUN_STORE = new Map<string, InMemoryRun>();

export async function registerRunRoutes(app: FastifyInstance) {
  app.post('/v1/runs', async (request, reply) => {
    const BodySchema = z.object({
      story_id: z.string(),
      seed: z.number().int().default(Date.now()),
    });
    const { story_id, seed } = BodySchema.parse(request.body);

    const run: InMemoryRun = {
      id: randomUUID(),
      story_id,
      seed,
      model_version: 'gpt-5',
      policy_version: 'policy-v1',
      canon_version: 'v1',
      visibility: 'public',
      voice_id: null,
      nextBeatIdx: 0,
    };

    RUN_STORE.set(run.id, run);

    reply.send({ run });
  });

  app.post('/v1/runs/:id/next', async (request, reply) => {
    const ParamsSchema = z.object({ id: z.string().uuid() });
    const { id } = ParamsSchema.parse(request.params);
    const QuerySchema = z.object({ index: z.coerce.number().int().optional() });
    const { index } = QuerySchema.parse(request.query);

    const run = RUN_STORE.get(id);
    if (!run) {
      reply.code(404).send({ error: 'run_not_found' });
      return;
    }

    const beatIdx = typeof index === 'number' ? index : run.nextBeatIdx;
    const beat = await generateDemoBeat(beatIdx);

    const engineName = chooseEngine({ mode: 'run', storyVoicePolicy: 'premium' });
    const engine = getEngine(engineName);
    const synth = await engine.synthesize(beat.narration, {
      storyId: run.story_id,
      seed: run.seed,
      beatIdx,
      modelVersion: run.model_version,
      policyVersion: run.policy_version,
      canonVersion: run.canon_version,
      voiceId: run.voice_id ?? undefined,
      persist: true,
    });

    if (synth.kind !== 'files') {
      throw new Error('Expected files for run mode');
    }

    run.nextBeatIdx = beatIdx + 1;

    reply.send({ beat, audio: { urls: synth.urls, mime: synth.mime } });
  });

  app.get('/v1/runs/:id/replay', async (request, reply) => {
    const ParamsSchema = z.object({ id: z.string() });
    const { id } = ParamsSchema.parse(request.params);
    const replay = signReplay({
      version: '1.0',
      story: { id: 'haunted-shore', title: 'Haunted Shore' },
      engine: { llm: 'gpt-5', tts: 'elevenlabs-v2' },
      seed: 42,
      beats: [await generateDemoBeat(0)],
      signature: '',
    });
    reply.send({ id, replay });
  });
}
