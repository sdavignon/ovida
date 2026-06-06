const defaultApiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN
  ?? (typeof window === 'undefined' ? 'http://localhost:4000' : window.location.origin);
export const apiOrigin = defaultApiOrigin;

const defaultWsOrigin = process.env.NEXT_PUBLIC_WS_ORIGIN
  ?? (typeof window === 'undefined' ? 'ws://localhost:4001/ws' : '');
export const wsOrigin = defaultWsOrigin;
