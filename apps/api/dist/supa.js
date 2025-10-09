import { createClient } from '@supabase/supabase-js';
export const createSupabaseServer = (env) => createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
