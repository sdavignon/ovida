// src/beat.ts
import { z } from "zod";
var ChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1)
});
var BeatSchema = z.object({
  index: z.number().int().nonnegative(),
  narration: z.string().min(1),
  choices: z.array(ChoiceSchema).min(1)
});

// src/replay.ts
import { z as z2 } from "zod";
var ReplaySchema = z2.object({
  version: z2.string().min(1),
  story: z2.object({
    id: z2.string().min(1),
    title: z2.string().min(1)
  }),
  engine: z2.object({
    llm: z2.string().min(1),
    tts: z2.string().min(1)
  }),
  seed: z2.number().int(),
  beats: z2.array(BeatSchema),
  signature: z2.string().min(1)
});

// src/policy.ts
import { z as z3 } from "zod";
var PolicyRuleSchema = z3.object({
  id: z3.string().min(1),
  description: z3.string().min(1),
  severity: z3.enum(["info", "warn", "block"])
});
var PolicyConfigSchema = z3.object({
  version: z3.string().min(1),
  age_rating: z3.enum(["all", "teen", "mature"]).default("all"),
  disallowed_topics: z3.array(z3.string()),
  tone: z3.enum(["light", "dark", "serious", "whimsical"]).default("light"),
  rules: z3.array(PolicyRuleSchema)
});
export {
  BeatSchema,
  ChoiceSchema,
  PolicyConfigSchema,
  PolicyRuleSchema,
  ReplaySchema
};
