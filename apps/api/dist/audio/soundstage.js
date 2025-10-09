import { randomUUID } from 'node:crypto';
const SOUND_LIBRARY = [
    {
        keywords: ['storm', 'thunder', 'lightning', 'rain'],
        label: 'Crackling Thunderclap',
        assetUrl: 'https://assets.ovida.fm/sfx/thunder-radio.ogg',
        intensity: 'big',
        offsetMs: 400,
    },
    {
        keywords: ['door', 'entrance', 'knock'],
        label: 'Wooden Door Creak',
        assetUrl: 'https://assets.ovida.fm/sfx/door-creak.ogg',
        intensity: 'medium',
        offsetMs: 120,
    },
    {
        keywords: ['footsteps', 'walk', 'hurry', 'run'],
        label: 'Footsteps on Cobblestone',
        assetUrl: 'https://assets.ovida.fm/sfx/footsteps.ogg',
        intensity: 'medium',
        offsetMs: 0,
    },
    {
        keywords: ['mystery', 'clue', 'reveal', 'secret'],
        label: 'Mystery Sting',
        assetUrl: 'https://assets.ovida.fm/sfx/mystery-sting.ogg',
        intensity: 'big',
        offsetMs: 50,
    },
    {
        keywords: ['car', 'drive', 'engine', 'chase'],
        label: 'Vintage Roadster Pass-By',
        assetUrl: 'https://assets.ovida.fm/sfx/vintage-car.ogg',
        intensity: 'medium',
        offsetMs: 300,
    },
    {
        keywords: ['radio', 'broadcast', 'transmission'],
        label: 'Shortwave Static',
        assetUrl: 'https://assets.ovida.fm/sfx/radio-static.ogg',
        intensity: 'subtle',
        offsetMs: 0,
    },
    {
        keywords: ['ghost', 'spirit', 'haunt'],
        label: 'Ethereal Whisper',
        assetUrl: 'https://assets.ovida.fm/sfx/ghost-whisper.ogg',
        intensity: 'subtle',
        offsetMs: 200,
    },
    {
        keywords: ['train', 'station', 'locomotive'],
        label: 'Steam Engine Fade',
        assetUrl: 'https://assets.ovida.fm/sfx/steam-train.ogg',
        intensity: 'big',
        offsetMs: 500,
    },
];
const AMBIENCE_LIBRARY = [
    {
        keywords: ['mystery', 'noir', 'shadow', 'midnight'],
        ambience: {
            id: 'noir-alley',
            label: 'Midnight Alley Underscore',
            assetUrl: 'https://assets.ovida.fm/beds/noir-alley-loop.ogg',
            loop: true,
            gain: -8,
        },
    },
    {
        keywords: ['space', 'cosmic', 'future', 'alien'],
        ambience: {
            id: 'orbital-hum',
            label: 'Orbital Engine Hum',
            assetUrl: 'https://assets.ovida.fm/beds/orbital-hum.ogg',
            loop: true,
            gain: -12,
        },
    },
    {
        keywords: ['jungle', 'forest', 'wild'],
        ambience: {
            id: 'jungle-night',
            label: 'Jungle Night Chorus',
            assetUrl: 'https://assets.ovida.fm/beds/jungle-night.ogg',
            loop: true,
            gain: -10,
        },
    },
    {
        keywords: ['ocean', 'shore', 'sea', 'harbor'],
        ambience: {
            id: 'harbor-tide',
            label: 'Harbor Tide',
            assetUrl: 'https://assets.ovida.fm/beds/harbor-tide.ogg',
            loop: true,
            gain: -14,
        },
    },
];
const DEFAULT_AMBIENCE = {
    id: 'broadcast-hum',
    label: 'Studio Broadcast Hum',
    assetUrl: 'https://assets.ovida.fm/beds/studio-hum.ogg',
    loop: true,
    gain: -18,
};
export function planSoundstage(text, opts) {
    const lowered = text.toLowerCase();
    const cues = [];
    const usedLabels = new Set();
    const inspiration = [];
    for (const entry of SOUND_LIBRARY) {
        if (entry.keywords.some((kw) => lowered.includes(kw))) {
            if (!usedLabels.has(entry.label)) {
                cues.push({
                    id: randomUUID(),
                    label: entry.label,
                    assetUrl: entry.assetUrl,
                    intensity: entry.intensity,
                    startMs: Math.max(0, opts.beatIdx * 200 + entry.offsetMs),
                });
                usedLabels.add(entry.label);
                inspiration.push(entry.label);
            }
        }
    }
    const ambience = AMBIENCE_LIBRARY.find((entry) => entry.keywords.some((kw) => lowered.includes(kw)))?.ambience ??
        DEFAULT_AMBIENCE;
    if (!inspiration.length) {
        inspiration.push('Studio Narration', 'Magnetic Tape Warmth');
    }
    return {
        ambience,
        cues,
        inspiration,
    };
}
