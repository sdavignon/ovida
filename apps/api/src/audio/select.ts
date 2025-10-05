import type { AudioEngine } from './engine';
import { ElevenLabsEngine } from './engines/elevenlabs';
import { OpenAIRealtimeEngine } from './engines/openai-realtime';

// Simple policy switch: per story, per mode
export type EngineChoice = 'elevenlabs' | 'openai-realtime';

export function chooseEngine(params: {
  mode: 'run' | 'replay' | 'room-live';
  storyVoicePolicy?: 'premium' | 'realtime-ok';
}): EngineChoice {
  if (params.mode === 'room-live') return 'openai-realtime';
  if (params.storyVoicePolicy === 'premium') return 'elevenlabs';
  return 'elevenlabs'; // default for Runs/Replays
}

export function getEngine(choice: EngineChoice): AudioEngine {
  if (choice === 'openai-realtime') return new OpenAIRealtimeEngine();
  return new ElevenLabsEngine(); // default
}
