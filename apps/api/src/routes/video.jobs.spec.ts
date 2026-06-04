import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../env';
import { registerVideoJobRoutes } from './video.jobs';

const env: Env = {
  NODE_ENV: 'test',
  PORT: 4000,
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  ELEVENLABS_API_KEY: undefined,
  ELEVENLABS_VOICE_ID: 'voice',
  ELEVENLABS_MODEL: 'model',
  ELEVENLABS_STREAMING: 'off',
  API_ORIGIN: 'https://api.example.test',
  APP_ORIGIN: 'https://app.example.test',
  OPENAI_API_KEY: undefined,
  OPENAI_API_BASE_URL: undefined,
  VIDEO_API_KEY: 'video-secret',
  VIDEO_TMP_DIR: '/tmp/ovida-video-jobs-test',
  VIDEO_OUTPUT_DIR: '/tmp/ovida-video-output-test',
  VIDEO_PUBLIC_BASE_URL: 'https://cdn.example.test/videos/',
  VIDEO_MAX_INPUT_BYTES: 1_000_000,
  VIDEO_MAX_OVERLAY_BYTES: 1_000_000,
  VIDEO_MAX_AUDIO_BYTES: 1_000_000,
  VIDEO_CALLBACK_TIMEOUT_MS: 1000,
};

const createVideoJobsMock = () => ({
  createJob: vi.fn(() => ({
    job_id: 'job_123',
    status: 'queued',
    progress: 0,
    download_url: null,
    error: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  })),
  getJob: vi.fn(),
  getJobLog: vi.fn(),
});

const buildApp = async (videoJobs = createVideoJobsMock()) => {
  const app = Fastify({ logger: false });
  app.decorate('env', env);
  app.decorate('videoJobs', videoJobs);
  app.decorate('supabase', {});
  await registerVideoJobRoutes(app as FastifyInstance);
  return { app, videoJobs };
};

describe('video job API routes', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await app?.close();
    vi.restoreAllMocks();
  });

  it('rejects requests that do not include the video API bearer token', async () => {
    ({ app } = await buildApp());

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      payload: {
        source_url: 'https://media.example.test/input.mp4',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ message: 'Missing API key' });
  });

  it('accepts a valid ffmpeg video job request and returns the status URL', async () => {
    const setup = await buildApp();
    app = setup.app;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      headers: { authorization: 'Bearer video-secret' },
      payload: {
        source_url: 'https://media.example.test/input.mp4',
        overlays: [
          {
            type: 'text',
            text: 'Ovida',
            fontfile: '/fonts/inter.ttf',
            fontsize: 48,
            fontcolor: 'white',
            x: '(w-text_w)/2',
            y: 'h-120',
            start: 0,
            end: 3,
            shadow: true,
          },
        ],
        output_format: 'mp4',
        callback_url: 'https://hooks.example.test/video',
        audio_url: 'https://media.example.test/audio.mp3',
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      job_id: 'job_123',
      status: 'queued',
      status_url: 'https://api.example.test/api/v1/jobs/job_123',
    });
    expect(setup.videoJobs.createJob).toHaveBeenCalledWith({
      sourceUrl: 'https://media.example.test/input.mp4',
      overlays: [
        {
          type: 'text',
          text: 'Ovida',
          fontfile: '/fonts/inter.ttf',
          fontsize: 48,
          fontcolor: 'white',
          x: '(w-text_w)/2',
          y: 'h-120',
          start: 0,
          end: 3,
          shadow: true,
        },
      ],
      outputFormat: 'mp4',
      callbackUrl: 'https://hooks.example.test/video',
      audioUrl: 'https://media.example.test/audio.mp3',
    });
  });

  it('returns video job status for authenticated callers', async () => {
    const videoJobs = createVideoJobsMock();
    videoJobs.getJob.mockReturnValueOnce({
      job_id: 'job_done',
      status: 'completed',
      progress: 100,
      download_url: 'https://cdn.example.test/videos/job_done.mp4',
      error: undefined,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    ({ app } = await buildApp(videoJobs));

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/jobs/job_done',
      headers: { authorization: 'Bearer video-secret' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      job_id: 'job_done',
      status: 'completed',
      progress: 100,
      download_url: 'https://cdn.example.test/videos/job_done.mp4',
      error: null,
    });
  });

  it('redirects completed job downloads to the rendered ffmpeg output URL', async () => {
    const videoJobs = createVideoJobsMock();
    videoJobs.getJob.mockReturnValueOnce({
      job_id: 'job_done',
      status: 'completed',
      progress: 100,
      download_url: 'https://cdn.example.test/videos/job_done.mp4',
      error: undefined,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    ({ app } = await buildApp(videoJobs));

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/jobs/job_done/download',
      headers: { authorization: 'Bearer video-secret' },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('https://cdn.example.test/videos/job_done.mp4');
  });

  it('returns archived ffmpeg logs for authenticated callers', async () => {
    const videoJobs = createVideoJobsMock();
    videoJobs.getJobLog.mockResolvedValueOnce('ffmpeg version test\nframe=12 time=00:00:01.00');
    ({ app } = await buildApp(videoJobs));

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/jobs/job_done/log',
      headers: { authorization: 'Bearer video-secret' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.body).toContain('frame=12');
  });
});
