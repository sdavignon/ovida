export function getAudioMode() {
    const value = (process.env.AUDIO_MODE ?? 'auto').toLowerCase();
    return value === 'files' || value === 'realtime' || value === 'auto' ? value : 'auto';
}
export function realtimeEnabled() {
    return String(process.env.REALTIME_ENABLED ?? 'false').toLowerCase() === 'true';
}
export function isProdLike() {
    const env = (process.env.NODE_ENV ?? 'development').toLowerCase();
    return env === 'staging' || env === 'production' || env === 'prod';
}
