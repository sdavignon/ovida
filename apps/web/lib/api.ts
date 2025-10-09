import { apiOrigin } from './config';

type ApiOptions = RequestInit & { skipJson?: boolean };

export const api = {
  get: <T = any>(path: string, options?: ApiOptions): Promise<T> => request<T>('GET', path, options),
  post: <T = any>(path: string, options?: ApiOptions): Promise<T> => request<T>('POST', path, options),
  put: <T = any>(path: string, options?: ApiOptions): Promise<T> => request<T>('PUT', path, options),
  delete: <T = any>(path: string, options?: ApiOptions): Promise<T> => request<T>('DELETE', path, options),
  patch: <T = any>(path: string, options?: ApiOptions): Promise<T> => request<T>('PATCH', path, options),
};

// Legacy export for backwards compatibility with generic support
export const apiFetch = async <T = any>(path: string, options?: RequestInit): Promise<T> => {
  const url = `${apiOrigin}${path}`;
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
