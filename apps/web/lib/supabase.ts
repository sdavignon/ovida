import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not configured');
}

const supabaseClientUrl = supabaseUrl || 'http://localhost:54321';
const supabaseClientAnonKey = supabaseAnonKey || 'local-anon-key';

export const supabase = createClient(supabaseClientUrl, supabaseClientAnonKey);
