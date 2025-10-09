import { ElevenLabsEngine } from './engines/elevenlabs';
import { OpenAIRealtimeEngine } from './engines/openai-realtime';
import { getAudioMode, isProdLike, realtimeEnabled } from './flags';
export function chooseEngine(params) {
    const audioMode = getAudioMode();
    if (audioMode === 'files') {
        return 'elevenlabs';
    }
    if (audioMode === 'realtime') {
        return 'openai-realtime';
    }
    if (params.storyVoicePolicy === 'premium') {
        return 'elevenlabs';
    }
    if (params.mode === 'room-live' && isProdLike() && realtimeEnabled()) {
        return 'openai-realtime';
    }
    return 'elevenlabs';
}
export function getEngine(choice) {
    return choice === 'openai-realtime' ? new OpenAIRealtimeEngine() : new ElevenLabsEngine();
}
