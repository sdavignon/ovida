export type AudioMode = "files" | "realtime" | "auto";

export function getAudioMode(): AudioMode {
  const m = (process.env.AUDIO_MODE || "auto").toLowerCase();
  return (["files", "realtime", "auto"] as const).includes(m as AudioMode)
    ? (m as AudioMode)
    : "auto";
}

export function realtimeEnabled(): boolean {
  return String(process.env.REALTIME_ENABLED || "false").toLowerCase() === "true";
}

export function isProdLike(): boolean {
  const env = (process.env.NODE_ENV || "development").toLowerCase();
  return env === "staging" || env === "production" || env === "prod";
}

