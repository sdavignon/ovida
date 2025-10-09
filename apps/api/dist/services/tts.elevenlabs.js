import { ElevenLabsEngine } from '../audio/engines/elevenlabs';
const engine = new ElevenLabsEngine();
export const synthesizeBeat = async (env, beat) => {
    const synth = await engine.synthesize(beat.narration, {
        storyId: 'demo-story',
        seed: 0,
        beatIdx: beat.index,
        modelVersion: 'demo-llm-v1',
        policyVersion: 'demo-policy-v1',
        canonVersion: 'demo-canon-v1',
        voiceId: env.ELEVENLABS_VOICE_ID ?? undefined,
        persist: false,
    });
    if (synth.kind !== 'files') {
        throw new Error('Expected files for demo synthesis');
    }
    return {
        provider: synth.provider,
        urls: synth.urls,
        mime: synth.mime,
        soundstage: synth.soundstage,
        narrator: synth.narrator,
    };
};
