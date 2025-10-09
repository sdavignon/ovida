"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BeatSchema: () => BeatSchema,
  ChoiceSchema: () => ChoiceSchema,
  PolicyConfigSchema: () => PolicyConfigSchema,
  PolicyRuleSchema: () => PolicyRuleSchema,
  ReplaySchema: () => ReplaySchema
});
module.exports = __toCommonJS(index_exports);

// src/beat.ts
var import_zod = require("zod");
var ChoiceSchema = import_zod.z.object({
  id: import_zod.z.string().min(1),
  text: import_zod.z.string().min(1)
});
var BeatSchema = import_zod.z.object({
  index: import_zod.z.number().int().nonnegative(),
  narration: import_zod.z.string().min(1),
  choices: import_zod.z.array(ChoiceSchema).min(1)
});

// src/replay.ts
var import_zod2 = require("zod");
var ReplaySchema = import_zod2.z.object({
  version: import_zod2.z.string().min(1),
  story: import_zod2.z.object({
    id: import_zod2.z.string().min(1),
    title: import_zod2.z.string().min(1)
  }),
  engine: import_zod2.z.object({
    llm: import_zod2.z.string().min(1),
    tts: import_zod2.z.string().min(1)
  }),
  seed: import_zod2.z.number().int(),
  beats: import_zod2.z.array(BeatSchema),
  signature: import_zod2.z.string().min(1)
});

// src/policy.ts
var import_zod3 = require("zod");
var PolicyRuleSchema = import_zod3.z.object({
  id: import_zod3.z.string().min(1),
  description: import_zod3.z.string().min(1),
  severity: import_zod3.z.enum(["info", "warn", "block"])
});
var PolicyConfigSchema = import_zod3.z.object({
  version: import_zod3.z.string().min(1),
  age_rating: import_zod3.z.enum(["all", "teen", "mature"]).default("all"),
  disallowed_topics: import_zod3.z.array(import_zod3.z.string()),
  tone: import_zod3.z.enum(["light", "dark", "serious", "whimsical"]).default("light"),
  rules: import_zod3.z.array(PolicyRuleSchema)
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BeatSchema,
  ChoiceSchema,
  PolicyConfigSchema,
  PolicyRuleSchema,
  ReplaySchema
});
