import { Env } from '../env';

export interface SceneImageRequest {
  sceneTitle: string;
  pathLabel: string;
  pathSummary: string;
  prompt: string;
  style?: string;
}

export interface SceneImageResult {
  prompt: string;
  full: string;
  thumbnail: string;
  fullSize: string;
  thumbnailSize: string;
}

const OPENAI_DEFAULT_BASE = 'https://api.openai.com';
const OPENAI_IMAGE_MODEL = 'gpt-image-1';

const FULL_SIZE = '1024x1024';
const THUMBNAIL_SIZE = '512x512';

export class SceneImageError extends Error {}

const toDataUri = (base64: string) => `data:image/png;base64,${base64}`;

const buildPrompt = (request: SceneImageRequest) => {
  const segments = [
    `Scene: ${request.sceneTitle}`,
    `Path: ${request.pathLabel}`,
    request.pathSummary ? `Summary: ${request.pathSummary}` : undefined,
    request.prompt,
    request.style ? `Style: ${request.style}` : undefined,
    'Cinematic concept art, richly lit, high fidelity.',
  ].filter(Boolean);

  return segments.join('\n');
};

async function requestImage(env: Env, prompt: string, size: string): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    throw new SceneImageError('OpenAI API key missing');
  }

  const baseUrl = env.OPENAI_API_BASE_URL?.replace(/\/$/, '') ?? OPENAI_DEFAULT_BASE;
  const response = await fetch(`${baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size,
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const detail = await safeError(response);
    throw new SceneImageError(detail ?? 'Failed to generate image');
  }

  const payload = (await response.json()) as { data?: Array<{ b64_json?: string }>; };
  const base64 = payload.data?.[0]?.b64_json;
  if (!base64) {
    throw new SceneImageError('Image payload missing');
  }

  return toDataUri(base64);
}

async function safeError(res: Response) {
  try {
    const data = (await res.json()) as { error?: { message?: string } };
    return data.error?.message;
  } catch (error) {
    return undefined;
  }
}

export async function generateSceneImages(env: Env, request: SceneImageRequest): Promise<SceneImageResult> {
  const prompt = buildPrompt(request);

  const [full, thumbnail] = await Promise.all([
    requestImage(env, prompt, FULL_SIZE),
    requestImage(env, prompt, THUMBNAIL_SIZE),
  ]);

  return {
    prompt,
    full,
    thumbnail,
    fullSize: FULL_SIZE,
    thumbnailSize: THUMBNAIL_SIZE,
  };
}
