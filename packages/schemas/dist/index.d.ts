import { z } from 'zod';

declare const ChoiceSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    text: string;
}, {
    id: string;
    text: string;
}>;
declare const BeatSchema: z.ZodObject<{
    index: z.ZodNumber;
    narration: z.ZodString;
    choices: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        text: string;
    }, {
        id: string;
        text: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    index: number;
    narration: string;
    choices: {
        id: string;
        text: string;
    }[];
}, {
    index: number;
    narration: string;
    choices: {
        id: string;
        text: string;
    }[];
}>;
type Choice = z.infer<typeof ChoiceSchema>;
type Beat = z.infer<typeof BeatSchema>;

declare const ReplaySchema: z.ZodObject<{
    version: z.ZodString;
    story: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
    }, {
        id: string;
        title: string;
    }>;
    engine: z.ZodObject<{
        llm: z.ZodString;
        tts: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        llm: string;
        tts: string;
    }, {
        llm: string;
        tts: string;
    }>;
    seed: z.ZodNumber;
    beats: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        narration: z.ZodString;
        choices: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            text: string;
        }, {
            id: string;
            text: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        index: number;
        narration: string;
        choices: {
            id: string;
            text: string;
        }[];
    }, {
        index: number;
        narration: string;
        choices: {
            id: string;
            text: string;
        }[];
    }>, "many">;
    signature: z.ZodString;
}, "strip", z.ZodTypeAny, {
    version: string;
    story: {
        id: string;
        title: string;
    };
    engine: {
        llm: string;
        tts: string;
    };
    seed: number;
    beats: {
        index: number;
        narration: string;
        choices: {
            id: string;
            text: string;
        }[];
    }[];
    signature: string;
}, {
    version: string;
    story: {
        id: string;
        title: string;
    };
    engine: {
        llm: string;
        tts: string;
    };
    seed: number;
    beats: {
        index: number;
        narration: string;
        choices: {
            id: string;
            text: string;
        }[];
    }[];
    signature: string;
}>;
type Replay = z.infer<typeof ReplaySchema>;

declare const PolicyRuleSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    severity: z.ZodEnum<["info", "warn", "block"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    severity: "info" | "warn" | "block";
}, {
    id: string;
    description: string;
    severity: "info" | "warn" | "block";
}>;
declare const PolicyConfigSchema: z.ZodObject<{
    version: z.ZodString;
    age_rating: z.ZodDefault<z.ZodEnum<["all", "teen", "mature"]>>;
    disallowed_topics: z.ZodArray<z.ZodString, "many">;
    tone: z.ZodDefault<z.ZodEnum<["light", "dark", "serious", "whimsical"]>>;
    rules: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        severity: z.ZodEnum<["info", "warn", "block"]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        severity: "info" | "warn" | "block";
    }, {
        id: string;
        description: string;
        severity: "info" | "warn" | "block";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    version: string;
    age_rating: "all" | "teen" | "mature";
    disallowed_topics: string[];
    tone: "light" | "dark" | "serious" | "whimsical";
    rules: {
        id: string;
        description: string;
        severity: "info" | "warn" | "block";
    }[];
}, {
    version: string;
    disallowed_topics: string[];
    rules: {
        id: string;
        description: string;
        severity: "info" | "warn" | "block";
    }[];
    age_rating?: "all" | "teen" | "mature" | undefined;
    tone?: "light" | "dark" | "serious" | "whimsical" | undefined;
}>;
type PolicyRule = z.infer<typeof PolicyRuleSchema>;
type PolicyConfig = z.infer<typeof PolicyConfigSchema>;

export { type Beat, BeatSchema, type Choice, ChoiceSchema, type PolicyConfig, PolicyConfigSchema, type PolicyRule, PolicyRuleSchema, type Replay, ReplaySchema };
