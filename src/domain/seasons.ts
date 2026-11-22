import { diffDays, type DateStr } from './dates';
import type { ShopItem } from './shop';

/**
 * Temporadas de la tienda: cada semana, una colección de complementos que solo se
 * puede comprar mientras dure. Lo que compres es tuyo para siempre.
 *
 * Para lanzar una temporada nueva:
 *   1. Añade sus imágenes a public/art/acc/ (su encaje base en components/frog/art.ts y, si
 *      hace falta, ajustes por etapa con el probador #/dev/wardrobe: docs/PROBADOR.md).
 *   2. Añade un objeto al final de SEASONS con fechas que no se solapen.
 *   3. Añade una entrada en content/changelog.ts para que salga en Novedades.
 *
 * Economía: completando tareas todos los días se ganan unas 150-200 monedas a la semana
 * (3-4 tareas fáciles o medias + el bonus de día perfecto). Los precios están pensados
 * para que eso dé para unos 3 artículos de la temporada.
 */
export interface Season {
  id: string;
  number: number;
  name: string;
  tagline: string;
  /** Primer y último día (incluidos) en que se puede comprar. */
  start: DateStr;
  end: DateStr;
  /** Dos colores para el degradado del cartel de la temporada (si no tiene ilustración). */
  colors: [string, string];
  /** Ilustración del cartel (ruta dentro de public/art/), apaisada ~4:1. */
  banner?: string;
  items: ShopItem[];
}

export const SEASONS: Season[] = [
  {
    id: 's1',
    number: 1,
    name: 'Hora de aventuras',
    tagline: 'Equipo para ranas que no le temen a ninguna misión.',
    start: '2026-11-19',
    end: '2026-11-25',
    colors: ['#38bdf8', '#fbbf24'],
    banner: 'season/s1-banner.webp',
    // Los 3 más baratos suman 180: lo que se gana en una semana haciendo tareas a diario.
    items: [
      { id: 'neck-s1-scarf', slot: 'neck', name: 'Bufanda perruna', price: 55, minLevel: 1, season: 's1', description: 'Amarilla, elástica y muy leal.' },
      { id: 'hat-s1-bear', slot: 'hat', name: 'Gorro de oso', price: 60, minLevel: 1, season: 's1', description: 'El uniforme oficial de los héroes.' },
      { id: 'eyes-s1-candy', slot: 'eyes', name: 'Gafas de caramelo', price: 65, minLevel: 1, season: 's1', description: 'Con corona de princesa científica.' },
      { id: 'eyes-s1-cloud', slot: 'eyes', name: 'Gafas de nube', price: 70, minLevel: 1, season: 's1', description: 'Moradas, abultadas y con mucha actitud.' },
      { id: 'neck-s1-axe', slot: 'neck', name: 'Colgante bajo-hacha', price: 80, minLevel: 1, season: 's1', description: 'Para tocar baladas a medianoche.' },
      { id: 'hat-s1-icecrown', slot: 'hat', name: 'Corona helada', price: 90, minLevel: 1, season: 's1', description: 'Da poderes de hielo. Y ganas de cantar.' },
      { id: 'bg-s1-treehouse', slot: 'background', name: 'Casa del árbol', price: 110, minLevel: 1, season: 's1', description: 'Una charca con vistas al mejor fuerte del mundo.' },
      { id: 'bg-s1-candy', slot: 'background', name: 'Reino de caramelo', price: 120, minLevel: 1, season: 's1', description: 'Nenúfares junto a un castillo de golosinas.' },
      // Pieles ocultas hasta revisar su diseño: quita "hidden: true" para sacarlas a la tienda.
      { id: 'skin-s1-jake', slot: 'skin', name: 'Piel perruna', price: 150, minLevel: 1, season: 's1', hidden: true, description: 'Dorada y lista para cualquier misión.' },
      { id: 'skin-s1-bmo', slot: 'skin', name: 'Piel consola', price: 150, minLevel: 1, season: 's1', hidden: true, description: '¿Alguien quiere jugar? De adulta le salen botones.' },
    ],
  },
];

/** Artículos de la temporada que se ven en la tienda. */
export const visibleItems = (season: Season) => season.items.filter((i) => !i.hidden);

export const seasonById = (id: string | undefined) => SEASONS.find((s) => s.id === id);

/** La temporada que está en la tienda hoy (si hay alguna). */
export function currentSeason(today: DateStr): Season | undefined {
  return SEASONS.find((s) => visibleItems(s).length > 0 && today >= s.start && today <= s.end);
}

/** ¿Se puede comprar hoy? Los artículos normales siempre; los de temporada, solo en sus fechas. */
export function inSeason(item: Pick<ShopItem, 'season'>, today: DateStr): boolean {
  if (!item.season) return true;
  const s = seasonById(item.season);
  return !!s && today >= s.start && today <= s.end;
}

/** Días que quedan incluyendo hoy (1 = último día). */
export function daysLeft(season: Season, today: DateStr): number {
  return diffDays(season.end, today) + 1;
}
