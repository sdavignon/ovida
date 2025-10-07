import { describe, expect, it, beforeEach, afterAll } from 'vitest';
import { getAudioMode, realtimeEnabled, isProdLike } from './flags';

type Env = NodeJS.ProcessEnv;

const ORIGINAL_ENV: Env = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('getAudioMode', () => {
  it('returns validated audio mode when explicitly set', () => {
    process.env.AUDIO_MODE = 'files';
    expect(getAudioMode()).toBe('files');

    process.env.AUDIO_MODE = 'realtime';
    expect(getAudioMode()).toBe('realtime');
  });

  it('falls back to auto when value is missing or invalid', () => {
    delete process.env.AUDIO_MODE;
    expect(getAudioMode()).toBe('auto');

    process.env.AUDIO_MODE = 'unknown-mode';
    expect(getAudioMode()).toBe('auto');
  });
});

describe('realtimeEnabled', () => {
  it('interprets truthy values case-insensitively', () => {
    process.env.REALTIME_ENABLED = 'TrUe';
    expect(realtimeEnabled()).toBe(true);
  });

  it('treats other values as false', () => {
    process.env.REALTIME_ENABLED = 'nope';
    expect(realtimeEnabled()).toBe(false);

    delete process.env.REALTIME_ENABLED;
    expect(realtimeEnabled()).toBe(false);
  });
});

describe('isProdLike', () => {
  it('returns true for production-like environments', () => {
    process.env.NODE_ENV = 'Production';
    expect(isProdLike()).toBe(true);

    process.env.NODE_ENV = 'staging';
    expect(isProdLike()).toBe(true);

    process.env.NODE_ENV = 'prod';
    expect(isProdLike()).toBe(true);
  });

  it('returns false for non-production environments', () => {
    process.env.NODE_ENV = 'development';
    expect(isProdLike()).toBe(false);

    delete process.env.NODE_ENV;
    expect(isProdLike()).toBe(false);
  });
});
