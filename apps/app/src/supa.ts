import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const { supabaseUrl, supabaseAnonKey } = Constants.expoConfig?.extra as {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
