import { z } from 'zod';
import { BeatSchema } from './beat';

export const ReplaySchema = z.object({
  version: z.string().min(1),
  story: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
  }),
  engine: z.object({
    llm: z.string().min(1),
    tts: z.string().min(1),
  }),
  seed: z.number().int(),
  beats: z.array(BeatSchema),
  signature: z.string().min(1),
});

export type Replay = z.infer<typeof ReplaySchema>;
