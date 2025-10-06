import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AudioEngine, SynthesisOpts } from '../engine';
import { audioCacheKey } from '../engine';
import type { SynthResult } from '../types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supa: SupabaseClient | null =
  supabaseUrl && supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : null;

const MOCK_RESPONSE: SynthResult = {
  kind: 'files',
  urls: [
    'https://upload.wikimedia.org/wikipedia/commons/3/3c/Beep-09.ogg',
    'https://upload.wikimedia.org/wikipedia/commons/0/0f/Beep-sound.ogg',
  ],
  mime: 'audio/ogg; codecs=vorbis',
};

export class ElevenLabsEngine implements AudioEngine {
  name() {
    return 'elevenlabs';
  }

  async synthesize(text: string, opts: SynthesisOpts): Promise<SynthResult> {
    if (!supa || !process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_STREAMING === 'off') {
      return MOCK_RESPONSE;
    }

    const voiceId = opts.voiceId || process.env.ELEVENLABS_VOICE_ID;
    if (!voiceId) {
      return MOCK_RESPONSE;
    }

    const cacheKey = audioCacheKey(opts, voiceId);
    const bucket = 'audio-cache';

    const { data: existing, error: listError } = await supa.storage
      .from(bucket)
      .list(cacheKey, { limit: 100 });
    if (listError) {
      throw listError;
    }

    if (existing && existing.length > 0) {
      const urls: string[] = [];
      const sorted = [...existing].sort((a, b) => a.name.localeCompare(b.name));
      for (const obj of sorted) {
        const path = `${cacheKey}/${obj.name}`;
        const { data: signed, error: signedError } = await supa.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60);
        if (signedError) {
          throw signedError;
        }
        if (signed?.signedUrl) {
          urls.push(signed.signedUrl);
        }
      }

      if (urls.length > 0) {
        return { kind: 'files', urls, mime: opts.mimeHint ?? 'audio/ogg; codecs=opus' };
      }
    }

    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const chunks: string[] = [];
    let buffer = '';
    for (const sentence of sentences) {
      const candidate = buffer ? `${buffer} ${sentence}` : sentence;
      if (candidate.length > 600 && buffer) {
        chunks.push(buffer);
        buffer = sentence;
      } else {
        buffer = candidate;
      }
    }
    if (buffer) {
      chunks.push(buffer);
    }

    const urls: string[] = [];
    let idx = 0;
    for (const chunk of chunks.length > 0 ? chunks : [text]) {
      const oggData = await synthWithElevenLabs(chunk, {
        voiceId,
        modelId: process.env.ELEVENLABS_MODEL || 'eleven_turbo_v2',
      });
      const path = `${cacheKey}/part-${String(idx).padStart(2, '0')}-${randomUUID()}.ogg`;
      const { error: uploadError } = await supa.storage.from(bucket).upload(path, oggData, {
        contentType: 'audio/ogg',
        upsert: false,
      });
      if (uploadError) {
        throw uploadError;
      }

      const { data: signed, error: signedError } = await supa.storage.from(bucket).createSignedUrl(path, 60 * 60);
      if (signedError) {
        throw signedError;
      }
      if (signed?.signedUrl) {
        urls.push(signed.signedUrl);
      }
      idx += 1;
    }

    if (urls.length === 0) {
      return MOCK_RESPONSE;
    }

    return { kind: 'files', urls, mime: 'audio/ogg; codecs=opus' };
  }
}

async function synthWithElevenLabs(
  text: string,
  { voiceId, modelId }: { voiceId: string; modelId: string },
): Promise<Buffer> {
  // Replace with real ElevenLabs HTTP request; return OGG/OPUS bytes
  // In a real impl: fetch('https://api.elevenlabs.io/v1/text-to-speech/...',{headers:{'xi-api-key':...},body:{text,voice_settings...}})
  void text;
  void voiceId;
  void modelId;
  return Buffer.from([]);
}
