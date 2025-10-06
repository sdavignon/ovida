export type SynthResult =
  | { kind: 'files'; urls: string[]; mime: string }
  | { kind: 'stream'; sdpOffer?: string };
