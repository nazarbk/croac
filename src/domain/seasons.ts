import { diffDays, type DateStr } from './dates';
import type { ShopItem } from './shop';

/**
 * Temporadas de la tienda: cada semana, una colección de complementos que solo se
 * puede comprar mientras dure. Lo que compres es tuyo para siempre.
 *
 * Para preparar una temporada nueva (ver docs/TEMPORADAS.md):
 *   1. Prepara sus imágenes con `python scripts/art/season_art.py` (complementos, fondos y
 *      cartel) y pon el encaje base de cada complemento en components/frog/art.ts.
 *   2. Añade un objeto al final de SEASONS con fechas que no se solapen. Se puede desplegar
 *      antes de tiempo: hasta su `start` nadie la ve en la tienda, salvo los administradores
 *      con la «Vista previa» de la tienda y el probador (#/admin/probador) para ajustarla.
 *   3. Añade su entrada en content/changelog.ts con `date` = día de estreno: Novedades no la
 *      enseña hasta ese día.
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
  /** Qué parte del cartel se ve cuando se recorta (CSS object-position). */
  bannerPosition?: string;
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
    bannerPosition: '62% center',
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
  {
    id: 's2',
    number: 2,
    name: 'Más allá del jardín',
    tagline: 'Farol en mano y hojas secas bajo las patas: el bosque espera.',
    start: '2026-11-26',
    // Desde la Temporada 2 duran dos semanas: más tiempo para ganar monedas.
    end: '2026-12-09',
    colors: ['#c2410c', '#1e3a3a'],
    banner: 'season/s2-banner.webp',
    bannerPosition: '72% 45%',
    // Los 3 más baratos suman 180, como en la Temporada 1.
    items: [
      { id: 'neck-s2-bird', slot: 'neck', name: 'Colgante de pajarito', price: 55, minLevel: 1, season: 's2', description: 'Un pajarito azul que sabe más de lo que cuenta.' },
      { id: 'eyes-s2-pumpkin', slot: 'eyes', name: 'Gafas de calabaza', price: 60, minLevel: 1, season: 's2', description: 'Recién cosechadas en el pueblo de las calabazas.' },
      { id: 'hat-s2-pointy', slot: 'hat', name: 'Gorro de poeta', price: 65, minLevel: 1, season: 's2', description: 'Rojo, puntiagudo y un poco dramático.' },
      { id: 'eyes-s2-branch', slot: 'eyes', name: 'Gafas de rama', price: 70, minLevel: 1, season: 's2', description: 'Talladas en madera del bosque, con hoja incluida.' },
      { id: 'hat-s2-teapot', slot: 'hat', name: 'Tetera por sombrero', price: 75, minLevel: 1, season: 's2', description: 'Protege de la lluvia y de las malas ideas.' },
      { id: 'neck-s2-lantern', slot: 'neck', name: 'Farol del bosque', price: 90, minLevel: 1, season: 's2', description: 'Que no se apague. Nunca.' },
      { id: 'bg-s2-pottsfield', slot: 'background', name: 'Atardecer de calabazas', price: 110, minLevel: 1, season: 's2', description: 'Una charca tranquila junto al granero. Demasiado tranquila.' },
      { id: 'bg-s2-forest', slot: 'background', name: 'Charca del bosque oscuro', price: 120, minLevel: 1, season: 's2', description: 'Hay alguien entre los árboles. Mejor no mirar.' },
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

/** La próxima temporada que todavía no ha empezado (la que se puede previsualizar). */
export function upcomingSeason(today: DateStr): Season | undefined {
  return SEASONS.filter((s) => visibleItems(s).length > 0 && s.start > today).sort((a, b) => a.start.localeCompare(b.start))[0];
}

/** ¿Todavía no ha empezado? (sus artículos aún no se pueden comprar). */
export function seasonNotStarted(item: Pick<ShopItem, 'season'>, today: DateStr): boolean {
  const s = seasonById(item.season);
  return !!s && today < s.start;
}

/** ¿Se puede comprar hoy? Los artículos normales siempre; los de temporada, solo en sus fechas. */
export function inSeason(item: Pick<ShopItem, 'season'>, today: DateStr): boolean {
  if (!item.season) return true;
  const s = seasonById(item.season);
  return !!s && today >= s.start && today <= s.end;
}

/** Días que quedan incluyendo hoy (1 = último día). */
/**
 * Último día de temporada: lo que se gana ese día se multiplica para dar un último empujón
 * antes de que cierre la tienda. Para dar también monedas dobles basta con `coins: 2`.
 */
export const LAST_DAY_BOOST = { xp: 2, coins: 1 } as const;

/** El multiplicador de hoy, o null si no hay (solo el último día de una temporada en curso). */
export function seasonBoost(today: DateStr): { season: Season; xp: number; coins: number } | null {
  const s = currentSeason(today);
  return s && today === s.end ? { season: s, ...LAST_DAY_BOOST } : null;
}

export function daysLeft(season: Season, today: DateStr): number {
  return diffDays(season.end, today) + 1;
}
