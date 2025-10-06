import { afterEach, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { planSoundstage } from './soundstage';
import type { SynthesisOpts } from './engine';
import * as crypto from 'node:crypto';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('planSoundstage', () => {
  const baseOpts: SynthesisOpts = {
    storyId: 'story-123',
    seed: 42,
    beatIdx: 2,
    modelVersion: 'v1',
    policyVersion: 'p1',
    canonVersion: 'c1',
  };

  it('selects matching cues and ambience based on keywords', () => {
    const uuidSequence = ['id-1', 'id-2'];
    let call = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => uuidSequence[call++] ?? 'fallback');

    const result = planSoundstage('The storm thunder shakes the door while lightning flashes.', baseOpts);

    expect(result.ambience?.id).toBe('noir-alley');
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0]).toMatchObject({
      id: 'id-1',
      label: 'Crackling Thunderclap',
      assetUrl: 'https://assets.ovida.fm/sfx/thunder-radio.ogg',
      intensity: 'big',
      startMs: 800,
    });
    expect(result.cues[1]).toMatchObject({
      id: 'id-2',
      label: 'Wooden Door Creak',
      startMs: 520,
    });
    expect(result.inspiration).toEqual([
      'Crackling Thunderclap',
      'Wooden Door Creak',
    ]);
  });

  it('falls back to default ambience and inspiration when no keywords match', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('unused');

    const result = planSoundstage('A calm narration with no special events.', {
      ...baseOpts,
      beatIdx: 0,
    });

    expect(result.ambience?.id).toBe('broadcast-hum');
    expect(result.cues).toHaveLength(0);
    expect(result.inspiration).toEqual(['Studio Narration', 'Magnetic Tape Warmth']);
  });
});
