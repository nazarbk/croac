import { createStore, useStore } from '../store/createStore';

/**
 * Router por hash (#/hoy). Funciona en cualquier hosting estático sin
 * configurar redirecciones. Si más adelante hace falta SSR o rutas reales,
 * se puede cambiar por React Router manteniendo `navigate` y `useRoute`.
 */
export type RouteName = 'hoy' | 'proximo' | 'tareas' | 'rana' | 'tienda' | 'estadisticas' | 'ajustes';

export interface Route {
  name: RouteName;
  params: URLSearchParams;
}

const ROUTES: RouteName[] = ['hoy', 'proximo', 'tareas', 'rana', 'tienda', 'estadisticas', 'ajustes'];

function parse(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  const [path, query = ''] = clean.split('?');
  const name = (ROUTES.includes(path as RouteName) ? path : 'hoy') as RouteName;
  return { name, params: new URLSearchParams(query) };
}

const routeStore = createStore<Route>(parse(typeof location !== 'undefined' ? location.hash : ''));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => routeStore.set(parse(location.hash)));
}

export const useRoute = () => useStore(routeStore, (r) => r);

export function href(name: RouteName, params?: Record<string, string>) {
  const q = params ? new URLSearchParams(params).toString() : '';
  return `#/${name}${q ? `?${q}` : ''}`;
}

export function navigate(name: RouteName, params?: Record<string, string>) {
  location.hash = href(name, params);
}
