import 'fastify';
import type { createSupabaseServer } from '../supa';
import type { loadEnv } from '../env';
import type { VideoJobManager } from '../services/video.jobs';

declare module 'fastify' {
  interface FastifyInstance {
    env: ReturnType<typeof loadEnv>;
    supabase: ReturnType<typeof createSupabaseServer>;
    videoJobs: VideoJobManager;
  }
}
