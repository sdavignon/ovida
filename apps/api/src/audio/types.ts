import type { SoundstagePlan } from './soundstage';

export type NarrationProfile = {
  voice: string;
  style: string;
  tempo: 'steady' | 'urgent' | 'dreamlike';
  treatment: string;
};

export type RealtimeSessionDescriptor = {
  clientSecret?: string;
  expiresAt?: string;
  model: string;
  voice?: string;
  apiBase: string;
  sdpOffer?: string;
  iceServers?: Array<{ urls: string | string[]; username?: string; credential?: string }>;
  connectionInstructions: string;
};

export type FileSynthResult = {
  kind: 'files';
  provider: 'elevenlabs' | 'coqui' | 'mock';
  urls: string[];
  mime: string;
  soundstage: SoundstagePlan;
  narrator: NarrationProfile;
};

export type StreamSynthResult = {
  kind: 'stream';
  provider: 'openai-realtime';
  session: RealtimeSessionDescriptor;
  soundstage: SoundstagePlan;
  narrator: NarrationProfile;
};

export type SynthResult = FileSynthResult | StreamSynthResult;
