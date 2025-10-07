import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_VOICE_ID: z.string().min(1).default('placeholder_voice'),
  ELEVENLABS_MODEL: z.string().min(1).default('eleven_turbo_v2'),
  ELEVENLABS_STREAMING: z.enum(['on', 'off']).default('off'),
  API_ORIGIN: z.string().url().optional(),
  APP_ORIGIN: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_API_BASE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export const loadEnv = (): Env => {
  return EnvSchema.parse(process.env);
};
