import type { AudioEngine, SynthesisOpts, StreamSynthResult, NarrationProfile } from '../engine';
import { planSoundstage } from '../soundstage';

export class OpenAIRealtimeEngine implements AudioEngine {
  name() {
    return 'openai-realtime';
  }

  async synthesize(text: string, opts: SynthesisOpts): Promise<StreamSynthResult> {
    const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17';
    const apiBase = process.env.OPENAI_REALTIME_BASE_URL?.replace(/\/$/, '') || 'https://api.openai.com';
    const soundstage = planSoundstage(text, opts);
    const narrator = this.buildNarrationProfile(opts);

    const session = await this.createRealtimeSession({
      text,
      opts,
      model,
      apiBase,
      soundstageInspiration: soundstage.inspiration,
      narrator,
    });

    return {
      kind: 'stream',
      provider: 'openai-realtime',
      session: {
        clientSecret: session.clientSecret,
        expiresAt: session.expiresAt,
        model,
        voice: narrator.voice,
        apiBase: `${apiBase}/v1/realtime`,
        sdpOffer: session.sdpOffer,
        iceServers: session.iceServers,
        connectionInstructions: session.instructions,
      },
      soundstage,
      narrator,
    };
  }

  private buildNarrationProfile(opts: SynthesisOpts): NarrationProfile {
    return {
      voice: opts.voiceId || process.env.OPENAI_REALTIME_VOICE || 'verse',
      style: 'Live radio show narrator with interactive flair',
      tempo: 'steady',
      treatment: 'Realtime WebRTC stream with subtle tape texture',
    };
  }

  private async createRealtimeSession(params: {
    text: string;
    opts: SynthesisOpts;
    model: string;
    apiBase: string;
    soundstageInspiration: string[];
    narrator: NarrationProfile;
  }): Promise<{
    clientSecret?: string;
    expiresAt?: string;
    sdpOffer?: string;
    iceServers?: Array<{ urls: string | string[]; username?: string; credential?: string }>;
    instructions: string;
  }> {
    const { model, apiBase, opts, soundstageInspiration, narrator } = params;

    if (!process.env.OPENAI_API_KEY) {
      return {
        instructions:
          'OpenAI realtime audio is disabled. Present a fallback UI using pre-rendered narration and Foley cues.',
      };
    }

    const response = await fetch(`${apiBase}/v1/realtime/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice: narrator.voice,
        instructions: this.buildRealtimeInstructions(soundstageInspiration, opts),
        input_audio_format: 'g711_ulaw',
        output_audio_format: 'pcm16',
        metadata: {
          story_id: opts.storyId,
          beat_index: opts.beatIdx,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`OpenAI realtime session failed: ${response.status} ${errText}`);
    }

    const data = (await response.json()) as {
      client_secret?: { value: string; expires_at: string };
      sdp?: { offer?: string };
      ice_servers?: Array<{ urls: string | string[]; username?: string; credential?: string }>;
    };

    return {
      clientSecret: data.client_secret?.value,
      expiresAt: data.client_secret?.expires_at,
      sdpOffer: data.sdp?.offer,
      iceServers: data.ice_servers,
      instructions:
        'Use the provided ephemeral key with WebRTC (set as bearer token) to negotiate a live narration stream. Layer local Foley cues in sync with provided timestamps.',
    };
  }

  private buildRealtimeInstructions(soundstageInspiration: string[], opts: SynthesisOpts): string {
    const base =
      'You are the live narrator of an interactive old-time radio drama. Deliver energetic, scene-setting descriptions, leave room for audience choice reveals, and acknowledge branching moments.';
    const cues = soundstageInspiration.length
      ? `Incorporate the mood of ${soundstageInspiration.join(', ')}.`
      : 'Maintain a gentle studio hum beneath your delivery.';
    return `${base} ${cues} Narration seed: ${opts.seed}. Beat index: ${opts.beatIdx}.`;
  }
}
