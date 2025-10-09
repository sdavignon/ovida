import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { chooseEngine, getEngine } from '../audio/select';
export async function registerRoomRoutes(app) {
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
        if (error)
            throw error;
        reply.send({ room: data });
    });
}
export async function startLiveBeat(app, roomId, narration, ctx) {
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
    }
    else {
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
export async function finalizeLiveBeatToReplay(app, runId, narration, ctx) {
    const engine = getEngine('elevenlabs');
    const files = await engine.synthesize(narration, { ...ctx, persist: true });
    if (files.kind === 'files') {
        app.log.info({ runId, urls: files.urls }, 'finalized-live-beat');
    }
}
async function publishRoomEvent(app, roomId, payload) {
    app.log.info({ roomId, payload }, 'room-event');
}
