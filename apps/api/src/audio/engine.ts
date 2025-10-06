import type { SynthResult } from './types';

// Unified audio synthesis contract
export type SynthesisOpts = {
  storyId: string;
  seed: number;
  beatIdx: number;
  modelVersion: string;
  policyVersion: string;
  canonVersion: string;
  voiceId?: string; // optional: default per story
  mimeHint?: string; // e.g., "audio/ogg;codecs=opus"
  // when we want a signed, file-backed result (replay/offline)
  persist?: boolean; // default true for Runs
};

export type { SynthResult };

export interface AudioEngine {
  name(): string;
  synthesize(text: string, opts: SynthesisOpts): Promise<SynthResult>;
}

// Deterministic cache key (consistent across engines)
export function audioCacheKey(opts: SynthesisOpts, voiceId: string | undefined) {
  const v = voiceId ?? 'default';
  const { storyId, seed, beatIdx, modelVersion, policyVersion, canonVersion } = opts;
  return [
    'ovida',
    storyId,
    seed,
    beatIdx,
    modelVersion,
    policyVersion,
    canonVersion,
    v,
  ].join(':');
}
