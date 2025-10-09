import { createClient } from '@supabase/supabase-js';
export const createSupabaseServer = (url, key) => createClient(url, key, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
    realtime: {
        params: { eventsPerSecond: 2 },
    },
});
