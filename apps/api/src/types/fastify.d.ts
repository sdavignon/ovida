import 'fastify';
import type { createSupabaseServer } from '../supa';
import type { loadEnv } from '../env';

declare module 'fastify' {
  interface FastifyInstance {
    env: ReturnType<typeof loadEnv>;
    supabase: ReturnType<typeof createSupabaseServer>;
  }
}
