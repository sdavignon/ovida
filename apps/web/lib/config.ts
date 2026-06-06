const inferBrowserApiOrigin = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  const url = new URL(window.location.origin);
  url.port = '4000';
  return url.toString().replace(/\/$/, '');
};

const defaultApiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? inferBrowserApiOrigin();
export const apiOrigin = defaultApiOrigin;

const defaultWsOrigin = process.env.NEXT_PUBLIC_WS_ORIGIN
  ?? (typeof window === 'undefined' ? 'ws://localhost:4001/ws' : '');
export const wsOrigin = defaultWsOrigin;
