import { randomUUID } from 'node:crypto';
const RUN_STORE = new Map();
export function createRun(options) {
    const run = {
        id: options.id ?? randomUUID(),
        story_id: options.story_id,
        seed: options.seed,
        model_version: options.model_version ?? 'gpt-5',
        policy_version: options.policy_version ?? 'policy-v1',
        canon_version: options.canon_version ?? 'v1',
        visibility: options.visibility ?? 'public',
        voice_id: options.voice_id ?? null,
        nextBeatIdx: options.nextBeatIdx ?? 0,
    };
    RUN_STORE.set(run.id, run);
    return run;
}
export function getRun(id) {
    return RUN_STORE.get(id);
}
export function saveRun(run) {
    RUN_STORE.set(run.id, run);
}
export function deleteRun(id) {
    RUN_STORE.delete(id);
}
export function resetRuns() {
    RUN_STORE.clear();
}
