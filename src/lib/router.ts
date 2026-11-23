import { createStore, useStore } from '../store/createStore';

/**
 * Router por hash (#/hoy). Funciona en cualquier hosting estático sin
 * configurar redirecciones. Si más adelante hace falta SSR o rutas reales,
 * se puede cambiar por React Router manteniendo `navigate` y `useRoute`.
 */
export type RouteName = 'hoy' | 'proximo' | 'tareas' | 'historial' | 'rana' | 'charca' | 'amigos' | 'tienda' | 'estadisticas' | 'ajustes' | 'novedades' | 'patio';

export interface Route {
  name: RouteName;
  params: URLSearchParams;
  /** Ruta tal cual (p. ej. "dev/wardrobe"); las desconocidas caen en «hoy». */
  path: string;
}

const ROUTES: RouteName[] = ['hoy', 'proximo', 'tareas', 'historial', 'rana', 'charca', 'amigos', 'tienda', 'estadisticas', 'ajustes', 'novedades', 'patio'];

function parse(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  const [path, query = ''] = clean.split('?');
  const name = (ROUTES.includes(path as RouteName) ? path : 'hoy') as RouteName;
  return { name, params: new URLSearchParams(query), path };
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
