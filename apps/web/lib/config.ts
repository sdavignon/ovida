const inferBrowserApiOrigin = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  const url = new URL(window.location.origin);
  url.port = '4000';
  return url.toString().replace(/\/$/, '');
};

const resolveApiOrigin = () => {
  const configured = process.env.NEXT_PUBLIC_API_ORIGIN;
  if (typeof window === 'undefined') {
    return configured ?? 'http://localhost:4000';
  }

  if (!configured) {
    return inferBrowserApiOrigin();
  }

  try {
    if (new URL(configured).origin === window.location.origin) {
      return inferBrowserApiOrigin();
    }
  } catch {
    return inferBrowserApiOrigin();
  }

  return configured;
};

export const apiOrigin = resolveApiOrigin();

const defaultWsOrigin = process.env.NEXT_PUBLIC_WS_ORIGIN
  ?? (typeof window === 'undefined' ? 'ws://localhost:4001/ws' : '');
export const wsOrigin = defaultWsOrigin;
