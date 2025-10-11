export function getAudioMode() {
    const m = (process.env.AUDIO_MODE || "auto").toLowerCase();
    return ["files", "realtime", "auto"].includes(m)
        ? m
        : "auto";
}
export function getFileAudioEngine() {
    const engine = (process.env.AUDIO_FILE_ENGINE ?? process.env.FILE_AUDIO_ENGINE ?? 'elevenlabs')
        .toLowerCase()
        .trim();
    return engine === 'coqui' ? 'coqui' : 'elevenlabs';
}
export function realtimeEnabled() {
    return String(process.env.REALTIME_ENABLED ?? 'false').toLowerCase() === 'true';
}
export function isProdLike() {
    const env = (process.env.NODE_ENV ?? 'development').toLowerCase();
    return env === 'staging' || env === 'production' || env === 'prod';
}
