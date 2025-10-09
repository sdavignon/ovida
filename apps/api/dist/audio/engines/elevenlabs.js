import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { audioCacheKey } from '../engine';
import { planSoundstage } from '../soundstage';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supa = supabaseUrl && supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : null;
export class ElevenLabsEngine {
    name() {
        return 'elevenlabs';
    }
    async synthesize(text, opts) {
        const soundstage = planSoundstage(text, opts);
        const narrator = buildNarrationProfile(opts);
        if (!supa || !process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_STREAMING === 'off') {
            return createMockResponse(soundstage, narrator);
        }
        const voiceId = opts.voiceId || process.env.ELEVENLABS_VOICE_ID;
        if (!voiceId) {
            return createMockResponse(soundstage, narrator);
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
            const urls = [];
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
                return {
                    kind: 'files',
                    provider: 'elevenlabs',
                    urls,
                    mime: opts.mimeHint ?? 'audio/ogg; codecs=opus',
                    soundstage,
                    narrator,
                };
            }
        }
        const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
        const chunks = [];
        let buffer = '';
        for (const sentence of sentences) {
            const candidate = buffer ? `${buffer} ${sentence}` : sentence;
            if (candidate.length > 600 && buffer) {
                chunks.push(buffer);
                buffer = sentence;
            }
            else {
                buffer = candidate;
            }
        }
        if (buffer) {
            chunks.push(buffer);
        }
        const urls = [];
        let idx = 0;
        for (const chunk of chunks.length > 0 ? chunks : [text]) {
            const oggData = await synthWithElevenLabs(chunk, {
                voiceId,
                modelId: process.env.ELEVENLABS_MODEL || 'eleven_turbo_v2',
                soundstage,
                narrator,
                opts,
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
            return createMockResponse(soundstage, narrator);
        }
        return {
            kind: 'files',
            provider: 'elevenlabs',
            urls,
            mime: 'audio/ogg; codecs=opus',
            soundstage,
            narrator,
        };
    }
}
async function synthWithElevenLabs(text, { voiceId, modelId, soundstage, narrator, opts, }) {
    const baseUrl = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io';
    const endpoint = `${baseUrl.replace(/\/$/, '')}/v1/text-to-speech/${voiceId}/stream`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY ?? '',
            'Content-Type': 'application/json',
            Accept: 'audio/ogg',
        },
        body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
                stability: 0.45,
                similarity_boost: 0.88,
                style: 0.72,
                use_speaker_boost: true,
            },
            generation_config: {
                chunk_length_schedule: [200, 240],
            },
            apply_audio_post_processing: 'vintage_radio',
            metadata: {
                story_id: opts.storyId,
                beat_index: opts.beatIdx,
                ambience: soundstage.ambience?.id ?? null,
                cues: soundstage.cues.map((c) => c.label),
                treatment: narrator.treatment,
            },
        }),
    });
    if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        throw new Error(`ElevenLabs synthesis failed: ${response.status} ${errText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
function buildNarrationProfile(opts) {
    return {
        voice: opts.voiceId || process.env.ELEVENLABS_VOICE_ID || 'golden-age-narrator',
        style: 'Old-time serial storyteller with dramatic flair',
        tempo: 'steady',
        treatment: 'Warm tube compression with vinyl crackle',
    };
}
function createMockResponse(soundstage, narrator) {
    return {
        kind: 'files',
        provider: 'mock',
        urls: [
            'https://upload.wikimedia.org/wikipedia/commons/3/3c/Beep-09.ogg',
            'https://upload.wikimedia.org/wikipedia/commons/0/0f/Beep-sound.ogg',
        ],
        mime: 'audio/ogg; codecs=vorbis',
        soundstage,
        narrator,
    };
}
