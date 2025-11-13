import { z } from 'zod';

export const ChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const BeatAudioSchema = z.object({
  provider: z.string().min(1),
  urls: z.array(z.string().url()).min(1),
  mime: z.string().min(1),
});

export const BeatSchema = z.object({
  index: z.number().int().nonnegative(),
  narration: z.string().min(1),
  choices: z.array(ChoiceSchema).min(1),
  audio: BeatAudioSchema.optional(),
});

export type Choice = z.infer<typeof ChoiceSchema>;
export type BeatAudio = z.infer<typeof BeatAudioSchema>;
export type Beat = z.infer<typeof BeatSchema>;
