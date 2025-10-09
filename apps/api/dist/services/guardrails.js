import { PolicyConfigSchema } from '@ovida/schemas';
const defaultPolicy = PolicyConfigSchema.parse({
    version: 'policy-v1',
    rules: [],
    disallowed_topics: [],
});
export const applyGuardrails = async (narration) => {
    // Placeholder guardrail: enforce max length
    const trimmed = narration.slice(0, 500);
    return {
        flags: narration.length > 500 ? ['truncate'] : [],
        sanitizedNarration: trimmed,
    };
};
export const getPolicy = () => defaultPolicy;
