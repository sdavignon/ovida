import type { AudioEngine, SynthesisOpts } from '../engine';
import type { SynthResult } from '../types';

/**
 * This engine does NOT produce files. It returns a "stream" handoff.
 * Your Room WS route will establish WebRTC between client <-> OpenAI Realtime.
 * The server here can mint a short-lived token/SDP offer if you proxy the session.
 */
export class OpenAIRealtimeEngine implements AudioEngine {
  name() {
    return 'openai-realtime';
  }

  async synthesize(_text: string, _opts: SynthesisOpts): Promise<SynthResult> {
    return {
      kind: 'stream',
      // Optional: include an SDP offer or a token for the client to initiate
      // sdpOffer: '...',
    };
  }
}
