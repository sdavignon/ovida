import { z } from 'zod';

export const ChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const BeatSchema = z.object({
  index: z.number().int().nonnegative(),
  narration: z.string().min(1),
  choices: z.array(ChoiceSchema).min(1),
});

export type Choice = z.infer<typeof ChoiceSchema>;
export type Beat = z.infer<typeof BeatSchema>;
