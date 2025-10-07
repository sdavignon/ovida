import { randomUUID } from 'node:crypto';

export type InMemoryRun = {
  id: string;
  story_id: string;
  seed: number;
  model_version: string;
  policy_version: string;
  canon_version: string;
  visibility: string;
  voice_id?: string | null;
  nextBeatIdx: number;
};

const RUN_STORE = new Map<string, InMemoryRun>();

type CreateRunOptions = {
  id?: string;
  story_id: string;
  seed: number;
  model_version?: string;
  policy_version?: string;
  canon_version?: string;
  visibility?: string;
  voice_id?: string | null;
  nextBeatIdx?: number;
};

export function createRun(options: CreateRunOptions): InMemoryRun {
  const run: InMemoryRun = {
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

export function getRun(id: string) {
  return RUN_STORE.get(id);
}

export function saveRun(run: InMemoryRun) {
  RUN_STORE.set(run.id, run);
}

export function deleteRun(id: string) {
  RUN_STORE.delete(id);
}

export function resetRuns() {
  RUN_STORE.clear();
}
