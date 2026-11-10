import { useSyncExternalStore } from 'react';

/** true mientras la media query se cumple (se actualiza al redimensionar). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const MOBILE = '(max-width: 639px)';
