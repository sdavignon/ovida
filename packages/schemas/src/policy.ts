import { z } from 'zod';

export const PolicyRuleSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['info', 'warn', 'block']),
});

export const PolicyConfigSchema = z.object({
  version: z.string().min(1),
  age_rating: z.enum(['all', 'teen', 'mature']).default('all'),
  disallowed_topics: z.array(z.string()),
  tone: z.enum(['light', 'dark', 'serious', 'whimsical']).default('light'),
  rules: z.array(PolicyRuleSchema),
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;
export type PolicyConfig = z.infer<typeof PolicyConfigSchema>;
