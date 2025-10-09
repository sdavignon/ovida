// Deterministic cache key (consistent across engines)
export function audioCacheKey(opts, voiceId) {
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
