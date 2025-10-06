import type { Env } from '../env';
import type { Beat } from '@ovida/schemas';

type AudioResponse = {
  url: string;
  provider: 'elevenlabs' | 'mock';
};

export const synthesizeBeat = async (
  env: Env,
  beat: Beat
): Promise<AudioResponse> => {
  if (env.ELEVENLABS_STREAMING === 'off' || !env.ELEVENLABS_API_KEY) {
    return {
      url: `https://dummy.audio/beat-${beat.index}.mp3`,
      provider: 'mock',
    };
  }

  // In real implementation we would stream to ElevenLabs here.
  return {
    url: `https://api.elevenlabs.io/v1/audio/${beat.index}`,
    provider: 'elevenlabs',
  };
};
