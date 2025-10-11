import { Buffer } from 'node:buffer';
import { planSoundstage } from '../soundstage';
export class CoquiEngine {
    name() {
        return 'coqui-local';
    }
    async synthesize(text, opts) {
        const soundstage = planSoundstage(text, opts);
        const narrator = buildNarrationProfile(opts);
        const chunks = chunkText(text);
        const urls = [];
        for (const chunk of chunks.length > 0 ? chunks : [text]) {
            try {
                const wavData = await synthWithCoqui(chunk, {
                    soundstage,
                    narrator,
                });
                const dataUrl = bufferToDataUrl(wavData);
                urls.push(dataUrl);
            }
            catch (error) {
                console.error('[coqui] synthesis failed', error);
            }
        }
        if (urls.length === 0) {
            return createMockResponse(soundstage, narrator);
        }
        return {
            kind: 'files',
            provider: 'coqui',
            urls,
            mime: 'audio/wav',
            soundstage,
            narrator,
        };
    }
}
function chunkText(text) {
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
    return chunks;
}
async function synthWithCoqui(text, { soundstage, narrator }) {
    const endpoint = (process.env.COQUI_TTS_URL ?? 'http://127.0.0.1:5002/api/tts').replace(/\/$/, '');
    const requestBody = {
        text,
        audio_format: 'wav',
        enable_text_splitting: true,
    };
    const speaker = process.env.COQUI_TTS_SPEAKER ?? process.env.COQUI_TTS_VOICE ?? narrator.voice;
    if (speaker) {
        requestBody.speaker_id = speaker;
    }
    const language = process.env.COQUI_TTS_LANGUAGE;
    if (language) {
        requestBody.language_id = language;
    }
    const styleWav = process.env.COQUI_TTS_STYLE_WAV;
    if (styleWav) {
        requestBody.style_wav = styleWav;
    }
    const speed = process.env.COQUI_TTS_SPEED;
    if (speed) {
        const parsed = Number(speed);
        if (!Number.isNaN(parsed) && parsed > 0) {
            requestBody.speed = parsed;
        }
    }
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        throw new Error(`Coqui synthesis failed: ${response.status} ${errText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
function bufferToDataUrl(buffer) {
    const base64 = buffer.toString('base64');
    return `data:audio/wav;base64,${base64}`;
}
function buildNarrationProfile(opts) {
    return {
        voice: opts.voiceId || process.env.COQUI_TTS_SPEAKER || 'coqui-narrator',
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
