import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { chooseEngine, getEngine } from './select';
import { ElevenLabsEngine } from './engines/elevenlabs';
import { OpenAIRealtimeEngine } from './engines/openai-realtime';
const ORIGINAL_ENV = { ...process.env };
beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
});
afterAll(() => {
    process.env = ORIGINAL_ENV;
});
describe('chooseEngine', () => {
    it('prefers explicit audio mode overrides', () => {
        process.env.AUDIO_MODE = 'files';
        expect(chooseEngine({ mode: 'run' })).toBe('elevenlabs');
        process.env.AUDIO_MODE = 'realtime';
        expect(chooseEngine({ mode: 'run' })).toBe('openai-realtime');
    });
    it('returns elevenlabs when story policy requires premium voices', () => {
        process.env.AUDIO_MODE = 'auto';
        expect(chooseEngine({ mode: 'run', storyVoicePolicy: 'premium' })).toBe('elevenlabs');
    });
    it('enables realtime engine for live rooms in prod-like envs', () => {
        process.env.AUDIO_MODE = 'auto';
        process.env.NODE_ENV = 'production';
        process.env.REALTIME_ENABLED = 'true';
        expect(chooseEngine({ mode: 'room-live', storyVoicePolicy: 'realtime-ok' })).toBe('openai-realtime');
    });
    it('falls back to elevenlabs otherwise', () => {
        process.env.AUDIO_MODE = 'auto';
        process.env.NODE_ENV = 'development';
        process.env.REALTIME_ENABLED = 'false';
        expect(chooseEngine({ mode: 'room-live' })).toBe('elevenlabs');
    });
});
describe('getEngine', () => {
    it('instantiates the corresponding engine implementation', () => {
        expect(getEngine('elevenlabs')).toBeInstanceOf(ElevenLabsEngine);
        expect(getEngine('openai-realtime')).toBeInstanceOf(OpenAIRealtimeEngine);
    });
});
