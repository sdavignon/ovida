import { createClient } from '@supabase/supabase-js';
import type { Env } from './env';

export const createSupabaseServer = (env: Env) =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
