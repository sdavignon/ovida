import os from 'node:os';
import path from 'node:path';
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
    VIDEO_API_KEY: z.string().min(1),
    VIDEO_TMP_DIR: z
        .string()
        .min(1)
        .default(path.join(os.tmpdir(), 'ovida-video-jobs')),
    VIDEO_OUTPUT_DIR: z.string().min(1).default(path.join(process.cwd(), 'videos')),
    VIDEO_PUBLIC_BASE_URL: z.string().url().optional(),
    VIDEO_MAX_INPUT_BYTES: z.coerce.number().positive().default(1_000_000_000),
    VIDEO_MAX_OVERLAY_BYTES: z.coerce.number().positive().default(50_000_000),
    VIDEO_MAX_AUDIO_BYTES: z.coerce.number().positive().default(200_000_000),
    VIDEO_CALLBACK_TIMEOUT_MS: z.coerce.number().positive().max(60000).default(10000),
});
export const loadEnv = () => {
    return EnvSchema.parse(process.env);
};
