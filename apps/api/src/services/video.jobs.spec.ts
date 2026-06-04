import { EventEmitter } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../env';

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}));

const { VideoJobManager } = await import('./video.jobs');

const createEnv = (tmpRoot: string, outputRoot: string): Env => ({
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
  OPENAI_API_KEY: undefined,
  OPENAI_API_BASE_URL: undefined,
  VIDEO_API_KEY: 'video-secret',
  VIDEO_TMP_DIR: tmpRoot,
  VIDEO_OUTPUT_DIR: outputRoot,
  VIDEO_PUBLIC_BASE_URL: 'http://localhost:4000/videos/',
  VIDEO_MAX_INPUT_BYTES: 1_000_000,
  VIDEO_MAX_OVERLAY_BYTES: 1_000_000,
  VIDEO_MAX_AUDIO_BYTES: 1_000_000,
  VIDEO_CALLBACK_TIMEOUT_MS: 1000,
});

const createLogger = () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
});

const mockSuccessfulChild = () => {
  const child = new EventEmitter();
  process.nextTick(() => child.emit('close', 0));
  return child;
};

const mockFailedChild = (error: Error) => {
  const child = new EventEmitter();
  process.nextTick(() => child.emit('error', error));
  return child;
};

describe('VideoJobManager ffmpeg environment checks', () => {
  let tmpRoot: string;
  let outputRoot: string;
  let workspace: string;

  beforeEach(async () => {
    spawnMock.mockReset();
    workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'ovida-video-jobs-test-'));
    tmpRoot = path.join(workspace, 'tmp');
    outputRoot = path.join(workspace, 'out');
  });

  afterEach(async () => {
    await fs.rm(workspace, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('creates required directories and verifies ffmpeg and ffprobe are accessible', async () => {
    spawnMock.mockImplementation(mockSuccessfulChild);
    const manager = new VideoJobManager({ env: createEnv(tmpRoot, outputRoot), logger: createLogger() as any });

    await manager.prepareEnvironment();

    expect((await fs.stat(tmpRoot)).isDirectory()).toBe(true);
    expect((await fs.stat(outputRoot)).isDirectory()).toBe(true);
    expect(spawnMock).toHaveBeenCalledWith('ffmpeg', ['-version'], { stdio: 'ignore' });
    expect(spawnMock).toHaveBeenCalledWith('ffprobe', ['-version'], { stdio: 'ignore' });
  });

  it('fails with an actionable error when ffmpeg is unavailable', async () => {
    spawnMock.mockImplementation((command: string) => {
      if (command === 'ffmpeg') {
        return mockFailedChild(new Error('ENOENT'));
      }
      return mockSuccessfulChild();
    });
    const manager = new VideoJobManager({ env: createEnv(tmpRoot, outputRoot), logger: createLogger() as any });

    await expect(manager.prepareEnvironment()).rejects.toThrow(
      'Required executable "ffmpeg" is not available. Install it on the host and ensure it is in PATH. (ENOENT)',
    );
  });

  it('reads archived ffmpeg logs from the output directory', async () => {
    const manager = new VideoJobManager({ env: createEnv(tmpRoot, outputRoot), logger: createLogger() as any });
    await fs.mkdir(outputRoot, { recursive: true });
    await fs.writeFile(path.join(outputRoot, 'job_abc.log'), 'ffmpeg diagnostic output', 'utf8');

    await expect(manager.getJobLog('job_abc')).resolves.toBe('ffmpeg diagnostic output');
  });
});
