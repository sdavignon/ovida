import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { generateDemoBeat } from '../services/llm';
import { applyGuardrails } from '../services/guardrails';
import { synthesizeBeat } from '../services/tts.elevenlabs';

const DemoState = new Map<string, { runId: string; beatIndex: number }>();

export async function registerDemoRoutes(app: FastifyInstance) {
  app.post('/v1/demos/start', async (_request, reply) => {
    const guestId = randomUUID();
    const runId = randomUUID();
    DemoState.set(guestId, { runId, beatIndex: 0 });

    const beat = await generateDemoBeat(0);
    const guardrails = await applyGuardrails(beat.narration);
    const audio = await synthesizeBeat(app.env, beat);

    return reply.send({
      guest_id: guestId,
      run_id: runId,
      beat: { ...beat, narration: guardrails.sanitizedNarration },
      audio,
      guardrails,
    });
  });

  app.post('/v1/demos/next', async (request, reply) => {
    const BodySchema = z.object({
      guest_id: z.string().uuid(),
    });
    const { guest_id } = BodySchema.parse(request.body);
    const state = DemoState.get(guest_id);
    if (!state) {
      return reply.code(404).send({ message: 'Demo not found' });
    }

    const nextIndex = Math.min(state.beatIndex + 1, 2);
    state.beatIndex = nextIndex;
    DemoState.set(guest_id, state);

    const beat = await generateDemoBeat(nextIndex);
    const guardrails = await applyGuardrails(beat.narration);
    const audio = await synthesizeBeat(app.env, beat);

    return reply.send({
      run_id: state.runId,
      beat: { ...beat, narration: guardrails.sanitizedNarration },
      audio,
      guardrails,
      remaining: Math.max(0, 2 - nextIndex),
    });
  });

  app.post('/v1/demos/complete', async (request, reply) => {
    const BodySchema = z.object({
      guest_id: z.string().uuid(),
    });
    const { guest_id } = BodySchema.parse(request.body);
    DemoState.delete(guest_id);
    return reply.send({
      message: 'Demo complete. Sign in to save your Ovida.',
      cta: {
        web: `${app.env.APP_ORIGIN ?? ''}/login`,
        mobile: 'ovida://login',
      },
    });
  });
}
