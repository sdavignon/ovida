import { apiOrigin } from './config';

type ApiOptions = RequestInit & { skipJson?: boolean };

export async function apiFetch<T>(path: string, init?: ApiOptions): Promise<T> {
  const response = await fetch(`${apiOrigin}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await safeReadError(response);
    throw new Error(message);
  }

  if (init?.skipJson) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function safeReadError(res: Response) {
  try {
    const data = await res.json();
    if (typeof data?.message === 'string') {
      return data.message;
    }
  } catch (error) {
    // ignore
  }
  return `Request failed with status ${res.status}`;
}
