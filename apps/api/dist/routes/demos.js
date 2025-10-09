import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { generateDemoBeat } from '../services/llm';
import { applyGuardrails } from '../services/guardrails';
import { synthesizeBeat } from '../services/tts.elevenlabs';
import { createRun, deleteRun, getRun, saveRun } from '../stores/runs';
const DemoState = new Map();
export async function registerDemoRoutes(app) {
    app.post('/v1/demos/start', async (_request, reply) => {
        const guestId = randomUUID();
        const run = createRun({ story_id: 'haunted-shore', seed: Date.now() });
        DemoState.set(guestId, { runId: run.id, beatIndex: 0 });
        const beat = await generateDemoBeat(0);
        const guardrails = await applyGuardrails(beat.narration);
        const audio = await synthesizeBeat(app.env, beat);
        run.nextBeatIdx = 1;
        saveRun(run);
        return reply.send({
            guest_id: guestId,
            run_id: run.id,
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
        const run = getRun(state.runId);
        if (run) {
            run.nextBeatIdx = beat.index + 1;
            saveRun(run);
        }
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
        const state = DemoState.get(guest_id);
        if (state) {
            deleteRun(state.runId);
        }
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
