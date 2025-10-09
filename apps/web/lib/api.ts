import { apiOrigin } from './config';

type ApiOptions = RequestInit & { skipJson?: boolean };

export const api = {
  get: (path: string, options?: ApiOptions) => request('GET', path, options),
  post: (path: string, options?: ApiOptions) => request('POST', path, options),
  put: (path: string, options?: ApiOptions) => request('PUT', path, options),
  delete: (path: string, options?: ApiOptions) => request('DELETE', path, options),
  patch: (path: string, options?: ApiOptions) => request('PATCH', path, options),
};

// Legacy export for backwards compatibility
export const apiFetch = async (path: string, options?: RequestInit): Promise<any> => {
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

  return response.json();
};

async function request(
  method: string,
  path: string,
  options: ApiOptions = {}
): Promise<any> {
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
    return response;
  }

  return response.json();
}
