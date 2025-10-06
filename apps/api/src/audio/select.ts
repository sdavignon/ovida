import type { AudioEngine } from './engine';
import { ElevenLabsEngine } from './engines/elevenlabs';
import { OpenAIRealtimeEngine } from './engines/openai-realtime';
import { getAudioMode, isProdLike, realtimeEnabled } from './flags';

export type EngineChoice = 'elevenlabs' | 'openai-realtime';

export function chooseEngine(params: {
  mode: 'run' | 'replay' | 'room-live';
  storyVoicePolicy?: 'premium' | 'realtime-ok';
}): EngineChoice {
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

export function getEngine(choice: EngineChoice): AudioEngine {
  return choice === 'openai-realtime' ? new OpenAIRealtimeEngine() : new ElevenLabsEngine();
}
