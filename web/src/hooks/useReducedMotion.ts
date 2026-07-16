import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

const getSnapshot = (): boolean => window.matchMedia(query).matches;

/** true quando o usuário pediu movimento reduzido — toda animação deve checar isto. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export const prefersReducedMotion = (): boolean => getSnapshot();
