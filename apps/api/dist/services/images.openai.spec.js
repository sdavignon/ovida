import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { generateSceneImages, SceneImageError } from './images.openai';
const baseEnv = {
    NODE_ENV: 'test',
    PORT: 4000,
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    ELEVENLABS_API_KEY: undefined,
    ELEVENLABS_VOICE_ID: 'voice',
    ELEVENLABS_MODEL: 'model',
    ELEVENLABS_STREAMING: 'off',
    API_ORIGIN: 'http://localhost:4000',
    APP_ORIGIN: 'http://localhost:3000',
    OPENAI_API_KEY: 'test-key',
    OPENAI_API_BASE_URL: 'https://example.openai.com',
};
const mockImageResponse = (value) => ({
    ok: true,
    json: async () => ({ data: [{ b64_json: value }] }),
});
describe('generateSceneImages', () => {
    const request = {
        sceneTitle: 'Boarding the Wreck',
        pathLabel: 'Investigate the Captain\'s Quarters',
        pathSummary: 'Search for clues amid creaking boards.',
        prompt: 'Foggy harbor with spectral silhouettes and lantern light.',
        style: 'Oil painting with teal highlights',
    };
    let fetchSpy;
    beforeEach(() => {
        fetchSpy = vi.spyOn(global, 'fetch');
        fetchSpy
            .mockResolvedValueOnce(mockImageResponse('AAA'))
            .mockResolvedValueOnce(mockImageResponse('BBB'));
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('requests OpenAI image generations for full and thumbnail sizes', async () => {
        const result = await generateSceneImages(baseEnv, request);
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenNthCalledWith(1, 'https://example.openai.com/v1/images/generations', expect.objectContaining({
            method: 'POST',
        }));
        const firstCallBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body);
        const secondCallBody = JSON.parse(fetchSpy.mock.calls[1][1]?.body);
        expect(firstCallBody.size).toBe('1024x1024');
        expect(secondCallBody.size).toBe('512x512');
        expect(firstCallBody.prompt).toContain('Scene: Boarding the Wreck');
        expect(firstCallBody.prompt).toContain('Style: Oil painting');
        expect(result.full).toContain('AAA');
        expect(result.thumbnail).toContain('BBB');
    });
    it('throws a SceneImageError when OpenAI is not configured', async () => {
        const envWithoutKey = { ...baseEnv, OPENAI_API_KEY: undefined };
        await expect(generateSceneImages(envWithoutKey, request)).rejects.toBeInstanceOf(SceneImageError);
    });
});
