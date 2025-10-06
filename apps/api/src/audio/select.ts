import type { AudioEngine } from './engine';
import { ElevenLabsEngine } from './engines/elevenlabs';
import { OpenAIRealtimeEngine } from './engines/openai-realtime';
import { getAudioMode, realtimeEnabled, isProdLike } from './flags';

// Simple policy switch: per story, per mode
export type EngineChoice = 'elevenlabs' | 'openai-realtime';

export function chooseEngine(params: {
  mode: 'run' | 'replay' | 'room-live';
  storyVoicePolicy?: 'premium' | 'realtime-ok';
}): EngineChoice {
  const audioMode = getAudioMode();

  // Hard overrides
  if (audioMode === 'files') return 'elevenlabs';
  if (audioMode === 'realtime') return 'openai-realtime';

  if (params.storyVoicePolicy === 'premium') {
    return 'elevenlabs';
  }

  // AUTO mode: dev uses files; prod/staging uses realtime for rooms if enabled
  if (params.mode === 'room-live' && isProdLike() && realtimeEnabled()) {
    return 'openai-realtime';
  }
  return 'elevenlabs';
}

export function getEngine(choice: EngineChoice): AudioEngine {
  return choice === 'openai-realtime' ? new OpenAIRealtimeEngine() : new ElevenLabsEngine();
}
