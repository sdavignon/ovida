const resolveApiOrigin = () => {
  const configured = process.env.NEXT_PUBLIC_API_ORIGIN;
  if (configured) {
    return configured;
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  // The deployed web app is a static export. Apache routes same-origin API
  // requests through public/api/index.php, avoiding /api/* static 404s.
  return window.location.origin;
};

export const apiOrigin = resolveApiOrigin();

const defaultWsOrigin = process.env.NEXT_PUBLIC_WS_ORIGIN
  ?? (typeof window === 'undefined' ? 'ws://localhost:4001/ws' : '');
export const wsOrigin = defaultWsOrigin;
