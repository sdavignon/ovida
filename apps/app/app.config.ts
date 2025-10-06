import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Ovida',
  slug: 'ovida',
  scheme: 'ovida',
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    apiOrigin: process.env.API_ORIGIN ?? 'http://localhost:4000',
    wsOrigin: process.env.WS_ORIGIN ?? 'ws://localhost:4001/ws',
  },
};

export default config;
