import { ElevenLabsEngine } from './engines/elevenlabs';
import { CoquiEngine } from './engines/coqui';
import { OpenAIRealtimeEngine } from './engines/openai-realtime';
import { getAudioMode, realtimeEnabled, isProdLike, getFileAudioEngine } from './flags';
export function chooseEngine(params) {
    const audioMode = getAudioMode();
    const fileEngine = getFileAudioEngine();
    // Hard overrides
    if (audioMode === 'files')
        return fileEngine;
    if (audioMode === 'realtime')
        return 'openai-realtime';
    if (params.storyVoicePolicy === 'premium') {
        return fileEngine;
    }
    // AUTO mode: dev uses files; prod/staging uses realtime for rooms if enabled
    if (params.mode === 'room-live' && isProdLike() && realtimeEnabled()) {
        return 'openai-realtime';
    }
    return fileEngine;
}
export function getEngine(choice) {
    if (choice === 'openai-realtime') {
        return new OpenAIRealtimeEngine();
    }
    if (choice === 'coqui') {
        return new CoquiEngine();
    }
    return new ElevenLabsEngine();
}
