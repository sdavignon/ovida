import { apiOrigin } from './config';

type ApiOptions = RequestInit & { skipJson?: boolean };

export const api = {
  get: <T = any>(path: string, options?: ApiOptions): Promise<T> => request<T>('GET', path, options),
  post: <T = any>(path: string, options?: ApiOptions): Promise<T> => request<T>('POST', path, options),
  put: <T = any>(path: string, options?: ApiOptions): Promise<T> => request<T>('PUT', path, options),
  delete: <T = any>(path: string, options?: ApiOptions): Promise<T> => request<T>('DELETE', path, options),
  patch: <T = any>(path: string, options?: ApiOptions): Promise<T> => request<T>('PATCH', path, options),
};

// Mock data fallback for when API is unavailable
const getMockDemoResponse = () => ({
  guest_id: 'demo-' + Date.now(),
  run_id: 'run-' + Date.now(),
  beat: {
    index: 0,
    narration: "Welcome to the Haunted Shore! You find yourself standing on a mysterious coastline where the waves whisper ancient secrets. The air is thick with salt and mystery. What do you choose to do?",
    choices: [
      { id: 1, text: "Explore the abandoned lighthouse" },
      { id: 2, text: "Walk along the shoreline" },
      { id: 3, text: "Listen to the whispers in the wind" }
    ]
  },
  audio: null,
  guardrails: { sanitizedNarration: "Content is safe" }
});

const getMockReplayResponse = (runId: string) => ({
  id: runId,
  replay: {
    version: '1.0',
    story: { id: 'haunted-shore', title: 'Haunted Shore' },
    engine: { llm: 'mock-llm', tts: 'mock-tts' },
    seed: 42,
    beats: [
      {
        index: 0,
        narration:
          'Welcome to the Haunted Shore! You find yourself standing on a mysterious coastline where the waves whisper ancient secrets.',
        choices: [
          { id: 'explore', text: 'Explore the abandoned lighthouse' },
          { id: 'shoreline', text: 'Walk along the shoreline' },
        ],
        audio: {
          provider: 'mock',
          urls: ['https://upload.wikimedia.org/wikipedia/commons/0/0f/Beep-sound.ogg'],
          mime: 'audio/ogg',
        },
      },
      {
        index: 1,
        narration:
          'The lighthouse looms above you, its spiral staircase beckoning. Ancient mechanisms creak in the wind.',
        choices: [
          { id: 'climb', text: 'Climb to the top' },
          { id: 'listen', text: 'Listen for the whispers again' },
        ],
        audio: {
          provider: 'mock',
          urls: ['https://upload.wikimedia.org/wikipedia/commons/0/0f/Beep-sound.ogg'],
          mime: 'audio/ogg',
        },
      },
      {
        index: 2,
        narration:
          'From the lighthouse peak, you spot mysterious lights dancing across the water. The story continues…',
        choices: [
          { id: 'signal', text: 'Signal to the lights' },
          { id: 'retreat', text: 'Retreat to the shore' },
        ],
        audio: {
          provider: 'mock',
          urls: ['https://upload.wikimedia.org/wikipedia/commons/0/0f/Beep-sound.ogg'],
          mime: 'audio/ogg',
        },
      },
    ],
    signature: 'mock-signature',
  },
});

// Legacy export for backwards compatibility with generic support
export const apiFetch = async <T = any>(path: string, options?: RequestInit): Promise<T> => {
  const url = `${apiOrigin}${path}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json() as T;
  } catch (error) {
    // Fallback to mock data when API is unavailable
    if (path === '/v1/demos/start' && options?.method === 'POST') {
      console.warn('API unavailable, using mock data fallback for demo');
      return getMockDemoResponse() as T;
    }

    // Extract runId from replay endpoint path
    const replayMatch = path.match(/^\/v1\/runs\/([^/]+)\/replay$/);
    if (replayMatch) {
      console.warn('API unavailable, using mock data fallback for replay');
      return getMockReplayResponse(replayMatch[1]) as T;
    }

    throw error;
  }
};

async function request<T = any>(
  method: string,
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { skipJson, ...fetchOptions } = options;
  const url = `${apiOrigin}${path}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (skipJson) {
    return response as T;
  }

  return response.json() as T;
}
