import { describe, expect, it } from 'vitest';
import { audioCacheKey } from './engine';
describe('audioCacheKey', () => {
    it('builds a deterministic cache key using synthesis options and voice id', () => {
        const opts = {
            storyId: 'story-1',
            seed: 123,
            beatIdx: 4,
            modelVersion: 'model-v2',
            policyVersion: 'policy-v3',
            canonVersion: 'canon-v1',
            voiceId: 'ignored-in-function',
        };
        expect(audioCacheKey(opts, 'voice-abc')).toBe('ovida:story-1:123:4:model-v2:policy-v3:canon-v1:voice-abc');
    });
    it('defaults the voice component when no voice id is provided', () => {
        const opts = {
            storyId: 'story-2',
            seed: 99,
            beatIdx: 0,
            modelVersion: 'model-v1',
            policyVersion: 'policy-v1',
            canonVersion: 'canon-v1',
        };
        expect(audioCacheKey(opts, undefined)).toBe('ovida:story-2:99:0:model-v1:policy-v1:canon-v1:default');
    });
});
